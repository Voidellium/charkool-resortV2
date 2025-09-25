import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { validateEmailWithDomain } from '@/lib/emailValidation';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

console.log("Resend API Key:", process.env.RESEND_API_KEY ? "Set" : "Not set");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

export async function POST(req) {
  try {
    const { firstName, middleName, lastName, birthdate, contactNumber, email, password } = await req.json();

    // Validate required fields
    if (!firstName || !lastName || !birthdate || !contactNumber || !email || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate contact number (11 digits)
    if (contactNumber.length !== 11 || !/^\d+$/.test(contactNumber)) {
      return new Response(JSON.stringify({ error: 'Contact number must be exactly 11 digits.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate birthdate (must be in the past)
    const birthDate = new Date(birthdate);
    if (isNaN(birthDate.getTime()) || birthDate >= new Date()) {
      return new Response(JSON.stringify({ error: 'Please enter a valid birthdate.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Lowercase email for consistency
    const lowercasedEmail = email.toLowerCase().trim();

    // Validate email domain
    const domainValidation = validateEmailWithDomain(lowercasedEmail);
    if (!domainValidation.isValid) {
      return new Response(JSON.stringify({ error: domainValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: lowercasedEmail } });
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
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

    // Send OTP email using Resend
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('Resend API key is not configured.');
        return new Response(JSON.stringify({
          error: 'Email service is not configured. Please contact support.',
          message: 'OTP generated but email service is not configured',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data, error: resendError } = await resend.emails.send({
        from: 'Charkool Resort <no-reply@charkoolresort.com>',
        to: [lowercasedEmail],
        subject: 'Your Charkool Resort OTP Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Charkool Leisure Beach Resort</h2>
            <p>Your OTP code is: <strong>${otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      if (resendError) {
        console.error('Resend API Error:', resendError);
        // Still return a 200 so the user can proceed with OTP verification,
        // but log the issue and inform them about the email problem.
        return new Response(JSON.stringify({
          message: 'OTP generated, but failed to send email. Please try again later or contact support.',
          warning: 'There was an issue sending the email.',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      console.log('OTP email sent successfully via Resend:', data);
      return new Response(JSON.stringify({ message: 'OTP sent to email' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (emailError) {
      console.error('Unexpected error during Resend call:', emailError);

      return new Response(JSON.stringify({
        message: 'OTP generated successfully. Please check your email.',
        warning: 'An unexpected error occurred while sending the email.',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('POST /api/register error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
