import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch current booking configuration
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);

    // Authorization check
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only Super Admin can access this resource.' },
        { status: 403 }
      );
    }

    // Get the first (and should be only) configuration record
    let config = await prisma.bookingDateConfiguration.findFirst();

    // If no config exists, create default one
    if (!config) {
      config = await prisma.bookingDateConfiguration.create({
        data: {
          maxBookingMonths: 2,
          updatedBy: session.user.id,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching booking configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking configuration' },
      { status: 500 }
    );
  }
}

// PATCH: Update booking configuration
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);

    // Authorization check
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only Super Admin can update this resource.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { maxBookingMonths } = body;

    // Validation
    if (typeof maxBookingMonths !== 'number' || maxBookingMonths < 1) {
      return NextResponse.json(
        { error: 'Invalid maxBookingMonths value. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Get existing config
    const existingConfig = await prisma.bookingDateConfiguration.findFirst();
    const oldValue = existingConfig?.maxBookingMonths || 2;

    // Update or create configuration
    const config = existingConfig
      ? await prisma.bookingDateConfiguration.update({
          where: { id: existingConfig.id },
          data: {
            maxBookingMonths,
            updatedBy: session.user.id,
          },
        })
      : await prisma.bookingDateConfiguration.create({
          data: {
            maxBookingMonths,
            updatedBy: session.user.id,
          },
        });

    // Create audit trail
    await prisma.auditTrail.create({
      data: {
        actorId: session.user.id,
        actorName: `${session.user.firstName} ${session.user.lastName}`,
        actorRole: session.user.role,
        action: 'UPDATE',
        entity: 'BookingConfiguration',
        entityId: config.id.toString(),
        details: `Changed max booking months from ${oldValue} to ${maxBookingMonths}`,
      },
    });

    return NextResponse.json({
      success: true,
      config,
      message: 'Booking configuration updated successfully',
    });
  } catch (error) {
    console.error('Error updating booking configuration:', error);
    return NextResponse.json(
      { error: 'Failed to update booking configuration' },
      { status: 500 }
    );
  }
}
