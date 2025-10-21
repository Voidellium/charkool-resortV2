import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Find the existing account linking OTP record
    const existingOtpRecord = await prisma.OTP.findFirst({
      where: {
        email: email.toLowerCase(),
        firstName: 'account-linking',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!existingOtpRecord) {
      return NextResponse.json({ error: 'No account linking session found' }, { status: 404 });
    }

    // Generate new OTP
    const newOtp = generateOTP();
    const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Update the existing OTP record
    await prisma.OTP.update({
      where: { id: existingOtpRecord.id },
      data: {
        otp: newOtp,
        expiresAt: newExpiresAt,
      },
    });

    // Send new OTP email
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('Resend API key is not configured.');
        return NextResponse.json({
          error: 'Email service is not configured. Please contact support.',
        }, { status: 500 });
      }

      const { data, error: resendError } = await resend.emails.send({
        from: 'Charkool Resort <no-reply@charkoolresort.com>',
        to: [email.toLowerCase()],
        subject: 'New Account Linking Code - Charkool Resort',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #febe52; font-size: 28px; margin: 0;">Charkool Resort</h1>
              <h2 style="color: #6b4700; font-size: 24px; margin: 10px 0;">New Verification Code</h2>
            </div>
            
            <div style="background: linear-gradient(135deg, #febe52 0%, #f6a623 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
              <h3 style="color: #6b4700; margin: 0 0 15px; font-size: 20px;">Your New Verification Code</h3>
              <div style="background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px; margin: 15px 0;">
                <span style="font-size: 36px; font-weight: bold; color: #6b4700; letter-spacing: 8px;">${newOtp}</span>
              </div>
              <p style="color: #6b4700; margin: 15px 0 0; font-size: 16px;">This code will expire in 10 minutes</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <p style="color: #666; margin: 0; font-size: 14px;">
                You requested a new verification code for linking your Google account to your existing profile.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              If you didn't request this code, please ignore this email or contact our support team.
            </p>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                © 2025 Charkool Leisure Beach Resort. All Rights Reserved.
              </p>
            </div>
          </div>
        `,
      });

      if (resendError) {
        console.error('Resend API Error:', resendError);
        return NextResponse.json({
          error: 'Failed to send new verification code. Please try again.',
        }, { status: 500 });
      }

      return NextResponse.json({
        message: 'New verification code sent to email'
      });

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return NextResponse.json({
        error: 'Failed to send new verification code. Please try again.',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Resend OTP error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}