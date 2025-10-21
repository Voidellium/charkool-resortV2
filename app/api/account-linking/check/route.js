import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

export async function POST(req) {
  try {
    const { email, googleData } = await req.json();

    if (!email || !googleData) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Check if user exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        accounts: {
          where: { provider: 'google' }
        }
      }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'No existing account found' }, { status: 404 });
    }

    // Check if Google account is already linked
    if (existingUser.accounts.length > 0) {
      return NextResponse.json({ error: 'Google account already linked' }, { status: 400 });
    }

    // Generate OTP for account linking verification
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Store OTP for account linking
    await prisma.OTP.create({
      data: {
        email: email.toLowerCase(),
        otp,
        expiresAt,
        firstName: 'account-linking',
        lastName: 'verification',
        birthdate: new Date(),
        contactNumber: 'account-linking',
        password: 'account-linking-otp',
        // Store Google data in unused fields for later use
        browserFingerprint: JSON.stringify(googleData),
      },
    });

    // Send OTP email
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
        subject: 'Account Linking Verification - Charkool Resort',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #febe52; font-size: 28px; margin: 0;">Charkool Resort</h1>
              <h2 style="color: #6b4700; font-size: 24px; margin: 10px 0;">Account Linking Verification</h2>
            </div>
            
            <div style="background: linear-gradient(135deg, #febe52 0%, #f6a623 100%); padding: 30px; border-radius: 15px; text-align: center; margin-bottom: 20px;">
              <h3 style="color: #6b4700; margin: 0 0 15px; font-size: 20px;">Your Verification Code</h3>
              <div style="background: rgba(255,255,255,0.9); padding: 20px; border-radius: 10px; margin: 15px 0;">
                <span style="font-size: 36px; font-weight: bold; color: #6b4700; letter-spacing: 8px;">${otp}</span>
              </div>
              <p style="color: #6b4700; margin: 15px 0 0; font-size: 16px;">This code will expire in 10 minutes</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
              <p style="color: #666; margin: 0; font-size: 14px;">
                <strong>What's happening?</strong><br>
                You're linking your Google account to your existing Charkool Resort profile. 
                This will allow you to sign in using either your password or Google.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; line-height: 1.5;">
              If you didn't request this linking, please ignore this email or contact our support team.
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
          error: 'Failed to send verification email. Please try again.',
        }, { status: 500 });
      }

      return NextResponse.json({
        message: 'Verification code sent to email',
        existingUser: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          contactNumber: existingUser.contactNumber
        }
      });

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return NextResponse.json({
        error: 'Failed to send verification email. Please try again.',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Account linking check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}