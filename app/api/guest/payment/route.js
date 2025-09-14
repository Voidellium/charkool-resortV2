import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getToken } from 'next-auth/jwt';

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

// GET: fetch payments for logged-in guest
export const GET = async (req) => {
  try {
    const token = await getToken({ req, secret: JWT_SECRET });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = parseInt(token.sub);

    const payments = await prisma.payment.findMany({
      where: {
        booking: {
          userId,
        },
      },
      include: {
        booking: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error('❌ Guest Payment GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
