import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// DELETE: Remove a disabled date
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);

    // Authorization check
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only Super Admin can update this resource.' },
        { status: 403 }
      );
    }

    // Await params in Next.js 15
    const { id } = await params;
    const disabledDateId = parseInt(id);

    if (isNaN(disabledDateId)) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 }
      );
    }

    // Get the disabled date before deleting (for audit trail)
    const disabledDate = await prisma.disabledBookingDate.findUnique({
      where: { id: disabledDateId },
    });

    if (!disabledDate) {
      return NextResponse.json(
        { error: 'Disabled date not found' },
        { status: 404 }
      );
    }

    // Delete the disabled date
    await prisma.disabledBookingDate.delete({
      where: { id: disabledDateId },
    });

    // Format date for audit trail
    const dateStr = disabledDate.date.toISOString().split('T')[0];

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        actorId: session.user.id,
        actorName: `${session.user.firstName} ${session.user.lastName}`,
        actorRole: session.user.role,
        action: 'DELETE',
        entity: 'DisabledBookingDate',
        entityId: disabledDateId.toString(),
        details: `Re-enabled booking date: ${dateStr}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Date re-enabled successfully',
    });
  } catch (error) {
    console.error('Error deleting disabled date:', error);
    return NextResponse.json(
      { error: 'Failed to delete disabled date' },
      { status: 500 }
    );
  }
}
