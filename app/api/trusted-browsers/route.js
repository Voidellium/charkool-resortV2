import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const token = await getToken({ req });

    if (!token?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { browserFingerprint, userAgent, ipAddress } = await req.json();

    if (!browserFingerprint) {
      return new Response(JSON.stringify({ error: 'Browser fingerprint required' }), { status: 400 });
    }

    // Check if this browser is already trusted
    const existingTrustedBrowser = await prisma.trustedBrowser.findUnique({
      where: { browserFingerprint },
    });

    if (existingTrustedBrowser) {
      // Update last used time
      await prisma.trustedBrowser.update({
        where: { id: existingTrustedBrowser.id },
        data: { lastUsed: new Date() },
      });

      return new Response(JSON.stringify({
        message: 'Browser already trusted',
        isTrusted: true
      }), { status: 200 });
    }

    // Create new trusted browser entry
    const trustedBrowser = await prisma.trustedBrowser.create({
      data: {
        userId: token.id,
        browserFingerprint,
        userAgent,
        ipAddress,
        lastUsed: new Date(),
      },
    });

    return new Response(JSON.stringify({
      message: 'Browser marked as trusted',
      isTrusted: true,
      trustedBrowser
    }), { status: 201 });
  } catch (error) {
    console.error('Trusted browser creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

export async function GET(req) {
  try {
    const token = await getToken({ req });

    if (!token?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const trustedBrowsers = await prisma.trustedBrowser.findMany({
      where: {
        userId: token.id,
        isActive: true,
      },
      orderBy: { lastUsed: 'desc' },
    });

    return new Response(JSON.stringify({ trustedBrowsers }), { status: 200 });
  } catch (error) {
    console.error('Trusted browsers fetch error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const token = await getToken({ req });

    if (!token?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { browserFingerprint } = await req.json();

    if (!browserFingerprint) {
      return new Response(JSON.stringify({ error: 'Browser fingerprint required' }), { status: 400 });
    }

    // Soft delete by setting isActive to false
    await prisma.trustedBrowser.updateMany({
      where: {
        userId: token.id,
        browserFingerprint,
      },
      data: { isActive: false },
    });

    return new Response(JSON.stringify({ message: 'Browser removed from trusted list' }), { status: 200 });
  } catch (error) {
    console.error('Trusted browser removal error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
