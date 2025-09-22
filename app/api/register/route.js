import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import sgMail from '@sendgrid/mail';
import { validateEmailWithDomain } from '@/lib/emailValidation';

const prisma = new PrismaClient();

// Set the SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

console.log("SendGrid API Key:", process.env.SENDGRID_API_KEY ? "Set" : "Not set");
console.log("SendGrid Sender Email:", process.env.SENDGRID_SENDER_EMAIL ? "Set" : "Not set");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
}

export async function POST(req) {
  try {
    const { firstName, middleName, lastName, birthdate, contactNumber, email, password } = await req.json();

    // Validate required fields
    if (!firstName || !lastName || !birthdate || !contactNumber || !email || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate contact number (11 digits)
    if (contactNumber.length !== 11 || !/^\d+$/.test(contactNumber)) {
      return new Response(JSON.stringify({ error: 'Contact number must be exactly 11 digits.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate birthdate (must be in the past)
    const birthDate = new Date(birthdate);
    if (isNaN(birthDate.getTime()) || birthDate >= new Date()) {
      return new Response(JSON.stringify({ error: 'Please enter a valid birthdate.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Lowercase email for consistency
    const lowercasedEmail = email.toLowerCase().trim();

    // Validate email domain
    const domainValidation = validateEmailWithDomain(lowercasedEmail);
    if (!domainValidation.isValid) {
      return new Response(JSON.stringify({ error: domainValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: lowercasedEmail } });
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    // Generate OTP and save to DB with user data
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await prisma.OTP.create({
      data: {
        email: lowercasedEmail,
        otp,
        expiresAt,
        firstName: firstName.trim(),
        middleName: middleName ? middleName.trim() : null,
        lastName: lastName.trim(),
        birthdate: birthDate,
        contactNumber,
        password: hashedPassword,
      },
    });

    // Send OTP email using SendGrid with error handling
    try {
      if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_SENDER_EMAIL) {
        console.error('SendGrid configuration missing');
        return new Response(JSON.stringify({
          error: 'Email service not configured. Please contact support.',
          message: 'OTP generated but email service is not configured'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const msg = {
        to: lowercasedEmail,
        from: process.env.SENDGRID_SENDER_EMAIL,
        subject: 'Your OTP Code',
        text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Charkool Leisure Beach Resort</h2>
            <p>Your OTP code is: <strong>${otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log('OTP email sent successfully to:', lowercasedEmail);

      return new Response(JSON.stringify({ message: 'OTP sent to email' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (emailError) {
      console.error('SendGrid error:', emailError);

      // Return success but log the email error - OTP is still saved in DB
      return new Response(JSON.stringify({
        message: 'OTP generated successfully. Please check your email.',
        warning: 'There was an issue sending the email, but your OTP is ready for verification.'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}