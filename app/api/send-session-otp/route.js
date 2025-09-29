import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { browserFingerprint, userAgent } = body;
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Invalidate existing non-expired session OTPs
    await prisma.OTP.deleteMany({
      where: {
        email: token.email,
        password: 'session-verification',
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Get user details for OTP record
    const user = await prisma.user.findUnique({
      where: { email: token.email },
      select: {
        firstName: true,
        middleName: true,
        lastName: true,
        birthdate: true,
        contactNumber: true,
      },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Create OTP record
    await prisma.OTP.create({
      data: {
        email: token.email,
        otp,
        expiresAt,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        birthdate: user.birthdate,
        contactNumber: user.contactNumber,
        browserFingerprint: browserFingerprint || null,
        userAgent: userAgent || null,
        password: 'session-verification', // Placeholder for session OTP
      },
    });

    // Send OTP email using Resend
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('Resend API key is not configured.');
        // We still return a success response to not leak server config details,
        // but the OTP won't be sent.
        return new Response(JSON.stringify({
          message: 'OTP generated. Please check your email.',
          warning: 'Email service is not configured.',
          expiresIn: 10,
        }), { status: 200 });
      }

      await resend.emails.send({
        from: 'Charkool Resort <no-reply@charkoolresort.com>',
        to: [token.email],
        subject: 'Your Charkool Resort Session Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Charkool Leisure Beach Resort</h2>
            <p>Your session verification code is: <strong>${otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      console.log(`Session OTP for ${token.email} sent successfully.`);

      return new Response(JSON.stringify({
        message: 'OTP sent successfully',
        expiresIn: 10, // minutes
      }), { status: 200 });
    } catch (emailError) {
      console.error('Resend email sending error:', emailError);
      // Even if email fails, the OTP is in the DB. Don't block the user.
      return new Response(JSON.stringify({ message: 'OTP generated successfully. Please check your email.' }), { status: 200 });
    }
  } catch (error) {
    console.error('Send session OTP error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
