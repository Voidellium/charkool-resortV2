import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import sgMail from '@sendgrid/mail';

const prisma = new PrismaClient();

// Set the SendGrid API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

console.log("SendGrid API Key:", process.env.SENDGRID_API_KEY);
console.log("SendGrid Sender Email:", process.env.SENDGRID_SENDER_EMAIL);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit OTP
}

export async function POST(req) {
  try {
    const { firstName, middleName, lastName, birthdate, contactNumber, email, password } = await req.json();

    // Validate required fields
    if (!firstName || !lastName || !birthdate || !contactNumber || !email || !password) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Validate contact number (11 digits)
    if (contactNumber.length !== 11 || !/^\d+$/.test(contactNumber)) {
      return new Response(JSON.stringify({ error: 'Contact number must be exactly 11 digits.' }), { status: 400 });
    }

    // Validate birthdate (must be in the past)
    const birthDate = new Date(birthdate);
    if (isNaN(birthDate.getTime()) || birthDate >= new Date()) {
      return new Response(JSON.stringify({ error: 'Please enter a valid birthdate.' }), { status: 400 });
    }

    // Lowercase email for consistency
    const lowercasedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email: lowercasedEmail } });
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), { status: 400 });
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

    // Send OTP email using SendGrid
    const msg = {
      to: lowercasedEmail,
      from: process.env.SENDGRID_SENDER_EMAIL, // This is the sender email you verified in your SendGrid account
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. It expires in 10 minutes.`,
    };

    await sgMail.send(msg);

    return new Response(JSON.stringify({ message: 'OTP sent to email' }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}