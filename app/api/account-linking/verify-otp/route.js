import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP required' }, { status: 400 });
    }

    // Find the OTP record for account linking
    const otpRecord = await prisma.OTP.findFirst({
      where: {
        email: email.toLowerCase(),
        otp,
        expiresAt: {
          gt: new Date(),
        },
        firstName: 'account-linking', // This identifies it as account linking OTP
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    // Parse Google data from the browserFingerprint field
    let googleData;
    try {
      googleData = JSON.parse(otpRecord.browserFingerprint);
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid verification data' }, { status: 400 });
    }

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the OTP record
    await prisma.OTP.delete({ where: { id: otpRecord.id } });

    return NextResponse.json({
      message: 'OTP verified successfully',
      existingUser: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        contactNumber: existingUser.contactNumber,
        firstName: existingUser.firstName,
        middleName: existingUser.middleName,
        lastName: existingUser.lastName
      },
      googleData
    });

  } catch (error) {
    console.error('Account linking OTP verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}