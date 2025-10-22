import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !['SUPERADMIN', 'CASHIER', 'ADMIN'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    console.log('Fetching payments from database...');
    const payments = await prisma.payment.findMany({
      include: {
        booking: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                contactNumber: true,
              }
            },
            rooms: {
              include: {
                room: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    price: true,
                  }
                },
              },
            },
          },
        },
        verifiedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${payments.length} payments in database`);

    // Serialize BigInt values (Prisma BigInt -> JSON-safe)
    const serialized = JSON.parse(JSON.stringify(payments, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));

    return NextResponse.json(serialized);
  } catch (error) {
    console.error('Fetch Payments Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}
