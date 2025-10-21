import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const { message } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    await prisma.notification.create({
      data: {
        message: message.trim(),
        type: 'inquiry',
        role: 'SUPERADMIN',
        userId: session?.user?.id || null,
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/inquiries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
