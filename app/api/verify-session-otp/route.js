import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { otp } = await req.json();
    const token = await getToken({ req });

    if (!token?.email || !otp) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
    }

    // Find the latest OTP for the user's email
    const otpRecord = await prisma.OTP.findFirst({
      where: {
        email: token.email,
        otp,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), { status: 400 });
    }

    // Update user with verified status
    await prisma.user.update({
      where: { email: token.email },
      data: {
        emailVerified: new Date(),
      },
    });

    // Delete the OTP
    await prisma.OTP.delete({ where: { id: otpRecord.id } });

    return new Response(JSON.stringify({
      message: 'OTP verified successfully',
      user: {
        id: token.id,
        name: token.name,
        email: token.email,
        role: token.role
      }
    }), { status: 200 });
  } catch (error) {
    console.error('Session OTP verification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
