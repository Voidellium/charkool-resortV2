import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    const token = await getToken({ req });

    if (!token?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const { browserFingerprint } = await req.json();

    if (!browserFingerprint) {
      return new Response(JSON.stringify({ error: 'Browser fingerprint required' }), { status: 400 });
    }

    // Check if this browser is trusted for this user
    const trustedBrowser = await prisma.trustedBrowser.findFirst({
      where: {
        userId: token.id,
        browserFingerprint,
        isActive: true,
      },
    });

    if (trustedBrowser) {
      // Update last used time
      await prisma.trustedBrowser.update({
        where: { id: trustedBrowser.id },
        data: { lastUsed: new Date() },
      });

      return new Response(JSON.stringify({
        isTrusted: true,
        trustedBrowser
      }), { status: 200 });
    }

    return new Response(JSON.stringify({
      isTrusted: false,
      message: 'Browser not trusted'
    }), { status: 200 });
  } catch (error) {
    console.error('Check trusted browser error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
