import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { notifyStaff } from '@/lib/pusher-server';

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, botResponse, isBotMatched, guestEmail } = body;

    // For non-logged-in guests, store with email only
    // For logged-in guests, store with userId
    const session = await getServerSession();

    const chatMessage = await prisma.chatMessage.create({
      data: {
        message,
        botResponse,
        isBotMatched,
        guestEmail: guestEmail || session?.user?.email,
        userId: session?.user?.id ? parseInt(session.user.id) : null,
        senderType: 'guest',
        isEscalated: !isBotMatched // Auto-escalate if no bot match
      }
    });

    // If escalated, notify Super Admin via Pusher
    if (!isBotMatched) {
      await notifyStaff('SUPERADMIN', {
        event: 'CHAT_UNANSWERED',
        type: 'chat_question',
        message: `Unanswered question from ${guestEmail || 'guest'}`,
        chatId: chatMessage.id,
        userMessage: message
      });
    }

    return NextResponse.json({ success: true, id: chatMessage.id });
  } catch (error) {
    console.error('Failed to store chat message:', error);
    return NextResponse.json(
      { error: 'Failed to store message' },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const session = await getServerSession();
    const url = new URL(req.url);
    
    // Only admins can fetch escalated questions
    if (!session || session.user?.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const isEscalated = url.searchParams.get('escalated') === 'true';
    
    const messages = await prisma.chatMessage.findMany({
      where: isEscalated ? { isEscalated: true, adminReply: null } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}
