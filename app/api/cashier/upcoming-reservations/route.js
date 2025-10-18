import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    
    console.log('[Upcoming Reservations] Session role:', role);
    
    if (!role || (role !== 'CASHIER' && role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Start of today

    console.log('[Upcoming Reservations] Fetching bookings with current date:', currentDate);

    // Fetch bookings with reservation payments and future check-in dates
    const upcomingReservations = await prisma.booking.findMany({
      where: {
        AND: [
          { paymentStatus: 'Reservation' }, // Bookings with reservation payment status
          {
            checkIn: {
              gte: currentDate // Future check-in dates
            }
          }
        ]
      },
      include: {
        user: true,
        payments: true
      },
      orderBy: {
        checkIn: 'asc' // Sort by check-in date (soonest first)
      }
    });
    
    console.log('[Upcoming Reservations] Found bookings:', upcomingReservations.length);

    // Calculate totals and remaining balances
    const reservationsWithCalculations = upcomingReservations.map(booking => {
      const totalPaid = booking.payments
        .filter(p => p.status === 'Paid')
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      
      const totalAmount = Number(booking.totalPrice) * 100; // Convert to cents for consistency
      const remainingBalance = totalAmount - totalPaid;
      
      // Calculate days until check-in
      const checkInDate = new Date(booking.checkIn);
      const today = new Date();
      const timeDiff = checkInDate.getTime() - today.getTime();
      const daysUntilCheckIn = Math.ceil(timeDiff / (1000 * 3600 * 24));

      return {
        id: booking.id,
        guestName: booking.user?.name || booking.guestName || 'N/A',
        guestEmail: booking.user?.email || booking.guestEmail || '',
        checkInDate: booking.checkIn,
        checkOutDate: booking.checkOut,
        totalAmount: totalAmount,
        totalPaid: totalPaid,
        remainingBalance: remainingBalance,
        daysUntilCheckIn: daysUntilCheckIn,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        rooms: booking.rooms,
        amenities: booking.amenities,
        cottage: booking.cottage
      };
    });

    return NextResponse.json({
      reservations: reservationsWithCalculations,
      count: reservationsWithCalculations.length
    });

  } catch (error) {
    console.error('Error fetching upcoming reservations:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}