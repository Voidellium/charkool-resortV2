import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all disabled dates
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

    const disabledDates = await prisma.disabledBookingDate.findMany({
      orderBy: { date: 'asc' },
      include: {
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json(disabledDates);
  } catch (error) {
    console.error('Error fetching disabled dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch disabled dates' },
      { status: 500 }
    );
  }
}

// POST: Add new disabled date(s)
export async function POST(req) {
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
    const { dates } = body; // Expecting array of date strings or single date string

    // Normalize to array
    const dateArray = Array.isArray(dates) ? dates : [dates];

    if (!dateArray || dateArray.length === 0) {
      return NextResponse.json(
        { error: 'No dates provided' },
        { status: 400 }
      );
    }

    const createdDates = [];
    const errors = [];

    // Process each date
    for (const dateStr of dateArray) {
      try {
        // Create date in UTC by appending 'Z' to force UTC interpretation
        const date = new Date(dateStr + 'T00:00:00.000Z');
        
        // Validate date
        if (isNaN(date.getTime())) {
          errors.push({ date: dateStr, error: 'Invalid date format' });
          continue;
        }

        // Check if already disabled
        const existing = await prisma.disabledBookingDate.findUnique({
          where: { date },
        });

        if (existing) {
          errors.push({ date: dateStr, error: 'Date already disabled' });
          continue;
        }

        // Create disabled date
        const disabledDate = await prisma.disabledBookingDate.create({
          data: {
            date,
            createdBy: session.user.id,
          },
        });

        createdDates.push(disabledDate);

        // Create audit trail
        await prisma.auditTrail.create({
          data: {
            actorId: session.user.id,
            actorName: `${session.user.firstName} ${session.user.lastName}`,
            actorRole: session.user.role,
            action: 'CREATE',
            entity: 'DisabledBookingDate',
            entityId: disabledDate.id.toString(),
            details: `Disabled booking date: ${dateStr}`,
          },
        });
      } catch (error) {
        console.error(`Error processing date ${dateStr}:`, error);
        errors.push({ date: dateStr, error: error.message });
      }
    }

    return NextResponse.json({
      success: true,
      created: createdDates,
      errors: errors.length > 0 ? errors : undefined,
      message: `Successfully disabled ${createdDates.length} date(s)`,
    });
  } catch (error) {
    console.error('Error creating disabled dates:', error);
    return NextResponse.json(
      { error: 'Failed to create disabled dates' },
      { status: 500 }
    );
  }
}
