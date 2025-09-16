'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ConfirmationContent() {
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    async function fetchBooking() {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (!res.ok) throw new Error('Failed to fetch booking');
        const data = await res.json();
        setBooking(data);
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [bookingId]);

  if (loading) return <p>Loading booking details...</p>;
  if (!booking) return <p>Booking not found.</p>;

  return (
    <div>
      <h2>Booking Confirmed!</h2>
      <p><strong>Guest:</strong> {booking.guestName || booking.user?.name || 'Guest'}</p>
      <p><strong>Email:</strong> {booking.user?.email || 'N/A'}</p>
      <p><strong>Room:</strong> {booking.room?.name || booking.room}</p>
      <p><strong>Check-in:</strong> {new Date(booking.checkIn).toLocaleDateString()}</p>
      <p><strong>Check-out:</strong> {new Date(booking.checkOut).toLocaleDateString()}</p>
      <p><strong>Amenities:</strong> {booking.amenities?.map(a => a.amenity.name).join(', ') || 'None'}</p>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <ConfirmationContent />
    </Suspense>
  );
}
