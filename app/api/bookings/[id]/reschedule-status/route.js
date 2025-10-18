import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Get reschedule request status for a booking (for guest UI)
export async function GET(req, { params }) {
  try {
    const { id } = params;
    const reqObj = await prisma.rescheduleRequest.findFirst({
      where: {
        bookingId: parseInt(id),
      },
      orderBy: { requestedAt: 'desc' },
    });
    if (!reqObj) return NextResponse.json({ status: null });
    let info = null;
    if (reqObj.status === 'DENIED') info = reqObj.adminContext;
    return NextResponse.json({ status: reqObj.status, info });
  } catch (error) {
    return NextResponse.json({ status: null });
  }
}
