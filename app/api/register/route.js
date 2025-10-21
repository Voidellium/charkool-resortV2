import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Resend } from 'resend';
import { validateEmailWithDomain } from '@/lib/emailValidation';
import { withAuthSecurity, validateObject, validateString, validateEmail } from '@/lib/security';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

console.log("Resend API Key:", process.env.RESEND_API_KEY ? "Set" : "Not set");

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

// Secure registration handler with input validation
async function registerHandler(req) {
  try {
    const body = req.sanitizedBody || await req.json();

    // Enhanced validation with sanitization
    const schema = {
      firstName: { type: 'string', required: true, options: { minLength: 2, maxLength: 50 } },
      middleName: { type: 'string', required: false, options: { maxLength: 50 } },
      lastName: { type: 'string', required: true, options: { minLength: 2, maxLength: 50 } },
      birthdate: { type: 'date', required: true },
      contactNumber: { type: 'string', required: true, options: { minLength: 12, maxLength: 12 } },
      email: { type: 'email', required: true },
      password: { type: 'string', required: true, options: { minLength: 8, maxLength: 128 } }
    };

    const validation = validateObject(body, schema);
    if (!validation.isValid) {
      return new Response(JSON.stringify({ 
        error: 'Invalid input data', 
        details: validation.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { firstName, middleName, lastName, birthdate, contactNumber, email, password } = validation.data;

    // Additional validation for contact number (should be 12 digits: 639 + 9-digit number)
    if (!/^639\d{9}$/.test(contactNumber)) {
      return new Response(JSON.stringify({ error: 'Contact number must be a valid 12-digit number starting with 639.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Additional validation for birthdate (must be in the past and reasonable age)
    const birthDate = new Date(birthdate);
    const minAge = 13; // Minimum age requirement
    const maxAge = 120; // Maximum reasonable age
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < minAge || age > maxAge) {
      return new Response(JSON.stringify({ error: `Age must be between ${minAge} and ${maxAge} years.` }), {
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

// Export secured POST handler
export const POST = withAuthSecurity(registerHandler);
