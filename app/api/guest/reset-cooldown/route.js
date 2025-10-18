import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/auth';

// POST: Reset payment cooldown for current user
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Reset the cooldown and failed attempts
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        paymentCooldownUntil: null,
        failedPaymentAttempts: 0,
      },
    });

    console.log(`✅ Cooldown reset for user ${session.user.id}`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Payment cooldown has been reset. You can now make new bookings.' 
    });
  } catch (error) {
    console.error('❌ Cooldown Reset Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}