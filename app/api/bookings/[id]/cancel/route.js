import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

// POST - Direct cancellation is DISABLED
// All cancellations now require admin approval via /api/bookings/[id]/cancel-request
export async function POST(req, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Direct cancellation is no longer allowed - all cancellations require admin approval
    return NextResponse.json({ 
      error: 'Direct cancellation is not available. All cancellations require admin approval. Please submit a cancellation request instead.' 
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Cancel booking error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}
