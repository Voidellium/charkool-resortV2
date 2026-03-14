import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';

const prisma = new PrismaClient();

/**
 * GET - List all customer accounts
 * Only SuperAdmin can view customer list
 * Customers are view-only (no creation via admin panel)
 */
export async function GET(req) {
  try {
    // Require authenticated session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Only SuperAdmin can list customers
    if (session.user.role !== 'SUPERADMIN') {
      return new Response(JSON.stringify({ error: 'Access denied' }), { status: 403 });
    }

    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        createdAt: true,
        lastLogin: true,
        isVerified: true,
        contactNumber: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform to include booking count
    const transformedCustomers = customers.map(c => ({
      ...c,
      bookingCount: c._count.bookings,
      _count: undefined,
    }));

    return new Response(JSON.stringify(transformedCustomers), { status: 200 });
  } catch (err) {
    console.error('Customer list error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
