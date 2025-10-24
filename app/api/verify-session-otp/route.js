import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';

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

    // Developer bypass: Check if user has DEVELOPER role and OTP is special bypass code
    if (token.role === 'DEVELOPER' && otp === 'DEV-BYPASS-2025') {
      const response = NextResponse.json({
        message: 'Developer bypass activated - OTP verified successfully',
        user: {
          id: token.id,
          name: token.name,
          email: token.email,
          role: token.role
        },
        developerBypass: true
      }, { status: 200 });

      // Set cookie to indicate browser is trusted for this session
      response.cookies.set('isBrowserTrusted', 'true', {
        path: '/',
        maxAge: 3600, // 1 hour
        httpOnly: false,
      });

      return response;
    }

    // Find the latest session OTP for the user's email
    const otpRecord = await prisma.OTP.findFirst({
      where: {
        email: token.email,
        password: 'session-verification',
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpRecord) {
      return new Response(JSON.stringify({ error: 'No OTP found or OTP has expired. Please request a new one.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if OTP is disabled due to too many failed attempts
    if (otpRecord.isDisabled) {
      return new Response(JSON.stringify({ 
        error: 'This OTP has been disabled due to too many incorrect attempts. Please request a new OTP.',
        requiresNewOTP: true 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate browser fingerprint if provided and stored
    if (browserFingerprint && otpRecord.browserFingerprint && browserFingerprint !== otpRecord.browserFingerprint) {
      return new Response(JSON.stringify({ error: 'Device fingerprint mismatch. Please try resending the OTP.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate user agent if provided and stored
    if (userAgent && otpRecord.userAgent && userAgent !== otpRecord.userAgent) {
      return new Response(JSON.stringify({ error: 'Browser mismatch. Please try resending the OTP.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if OTP matches
    if (otpRecord.otp !== otp) {
      // Increment attempt count
      const updatedAttemptCount = otpRecord.attemptCount + 1;
      const maxAttempts = 3;

      if (updatedAttemptCount >= maxAttempts) {
        // Disable this OTP
        await prisma.OTP.update({
          where: { id: otpRecord.id },
          data: { 
            attemptCount: updatedAttemptCount,
            isDisabled: true 
          }
        });

        return new Response(JSON.stringify({ 
          error: 'Too many incorrect attempts. This OTP has been disabled. Please request a new OTP.',
          requiresNewOTP: true 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Just increment the count
        await prisma.OTP.update({
          where: { id: otpRecord.id },
          data: { attemptCount: updatedAttemptCount }
        });

        const attemptsLeft = maxAttempts - updatedAttemptCount;
        return new Response(JSON.stringify({ 
          error: `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
          attemptsLeft 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // OTP is correct - Mark browser as trusted if fingerprint is provided and not in incognito mode (only if matched)
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

    const response = NextResponse.json({
      message: 'OTP verified successfully',
      user: {
        id: token.id,
        name: token.name,
        email: token.email,
        role: token.role
      }
    }, { status: 200 });

    // Set cookie to indicate browser is trusted for this session
    response.cookies.set('isBrowserTrusted', 'true', {
      path: '/',
      maxAge: 3600, // 1 hour
      httpOnly: false, // Allow client-side access if needed
    });

    return response;
  } catch (error) {
    console.error('Session OTP verification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
