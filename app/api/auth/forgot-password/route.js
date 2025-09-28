import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // For security, don't reveal whether the email exists or not
      return NextResponse.json({ message: 'If the email exists, a reset code has been sent' }, { status: 200 });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    // Store OTP in database
    await prisma.user.update({
      where: { email },
      data: {
        resetToken: otp,
        resetTokenExpiry: otpExpiry,
      },
    });

    // Send OTP via email using Resend
    try {
      if (!process.env.RESEND_API_KEY) {
        console.error('Resend API key is not configured.');
        // We still return a success response to not leak server config details,
        // but the OTP won't be sent.
        return NextResponse.json({
          message: 'Reset code generated. Please check your email.',
          warning: 'Email service is not configured.',
          expiresIn: 15,
        }, { status: 200 });
      }

      await resend.emails.send({
        from: 'Charkool Resort <no-reply@charkoolresort.com>',
        to: [email],
        subject: 'Your Charkool Resort Password Reset Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Charkool Leisure Beach Resort</h2>
            <p>Your password reset code is: <strong>${otp}</strong></p>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
          </div>
        `,
      });

      console.log(`Password reset OTP for ${email} sent successfully.`);

      return NextResponse.json({
        message: 'Reset code sent successfully',
        expiresIn: 15, // minutes
      }, { status: 200 });
    } catch (emailError) {
      console.error('Resend email sending error:', emailError);
      // Even if email fails, the OTP is in the DB. Don't block the user.
      return NextResponse.json({ message: 'Reset code generated successfully. Please check your email.' }, { status: 200 });
    }
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json(
      { message: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}