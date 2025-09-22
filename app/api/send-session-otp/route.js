import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req) {
  try {
    const token = await getToken({ req });

    if (!token?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

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
        password: 'session-verification', // Placeholder for session OTP
      },
    });

    // TODO: Send OTP via email/SMS
    // For now, we'll just return success
    console.log(`Session OTP for ${token.email}: ${otp}`);

    return new Response(JSON.stringify({
      message: 'OTP sent successfully',
      expiresIn: 10 // minutes
    }), { status: 200 });
  } catch (error) {
    console.error('Send session OTP error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
