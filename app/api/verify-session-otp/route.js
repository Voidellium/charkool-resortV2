import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const { otp, browserFingerprint, userAgent } = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip;
    const isIncognito = req.headers.get('x-is-incognito') === 'true';
    const token = await getToken({ req });

    if (!token?.email || !otp) {
      return new Response(JSON.stringify({ error: 'Invalid request' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
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
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update user with verified status
    await prisma.user.update({
      where: { email: token.email },
      data: {
        emailVerified: new Date(),
      },
    });

    // Mark browser as trusted if fingerprint is provided and not in incognito mode
    if (browserFingerprint && !isIncognito) {
      const existingTrustedBrowser = await prisma.trustedBrowser.findUnique({
        where: { browserFingerprint },
      });

      if (!existingTrustedBrowser) {
        await prisma.trustedBrowser.create({
          data: {
            userId: token.id,
            browserFingerprint,
            userAgent,
            ipAddress,
            lastUsed: new Date(),
          },
        });
      } else {
        // Update last used time for existing trusted browser
        await prisma.trustedBrowser.update({
          where: { id: existingTrustedBrowser.id },
          data: { lastUsed: new Date() },
        });
      }
    }

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
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
