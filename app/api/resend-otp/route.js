import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lowercasedEmail = email.toLowerCase().trim();

    // Find the latest pending OTP for the email
    const otpRecord = await prisma.OTP.findFirst({
      where: {
        email: lowercasedEmail,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: 'No pending registration found. Please register again.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate new OTP and update the record
    const newOtp = generateOTP();
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    await prisma.OTP.update({
      where: { id: otpRecord.id },
      data: {
        otp: newOtp,
        expiresAt: newExpiresAt,
      },
    });

    // Send OTP email using Resend
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('Resend API key is not configured.');
        return new Response(JSON.stringify({
          error: 'Email service is not configured. Please contact support.',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const { data, error: resendError } = await resend.emails.send({
        from: 'Charkool Resort <no-reply@charkoolresort.com>',
        to: [lowercasedEmail],
        subject: 'Your Charkool Resort OTP Code (Resent)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Charkool Leisure Beach Resort</h2>
            <p>Your new OTP code is: <strong>${newOtp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      });

      if (resendError) {
        console.error('Resend API Error:', resendError);
        return new Response(JSON.stringify({
          error: 'Failed to resend OTP email. Please try again later.',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log('OTP email resent successfully via Resend:', data);
      return new Response(JSON.stringify({ message: 'OTP resent to email' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (emailError) {
      console.error('Unexpected error during Resend call:', emailError);
      return new Response(JSON.stringify({
        error: 'An unexpected error occurred while resending the email.',
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('POST /api/resend-otp error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
