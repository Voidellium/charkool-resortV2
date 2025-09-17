
// 'use client' directive is required for client components
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState(null);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data);
        }
      } catch (error) {
        console.error('Failed to fetch booking:', error);
      }
    }
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const goToDashboard = () => {
    router.push('/guest/dashboard');
  };

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '1rem', textAlign: 'center' }}>
      <h2>Booking Confirmed!</h2>
      {booking ? (
        <div>
          <p><strong>Guest:</strong> {booking.guestName || booking.user?.name || 'Guest'}</p>
          <p><strong>Email:</strong> {booking.user?.email || 'N/A'}</p>
          <p><strong>Room:</strong> {booking.room?.name || booking.room}</p>
          <p><strong>Check-in:</strong> {new Date(booking.checkIn).toLocaleDateString()}</p>
          <p><strong>Check-out:</strong> {new Date(booking.checkOut).toLocaleDateString()}</p>
          <p><strong>Amenities:</strong> {booking.amenities?.map(a => a.amenity.name).join(', ') || 'None'}</p>
        </div>
      ) : (
        <p>Loading booking details...</p>
      )}
      <button onClick={goToDashboard} style={{
        marginTop: '1.5rem',
        padding: '0.75rem 1.5rem',
        fontSize: '1rem',
        backgroundColor: '#FEBE54',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      }}>
        Go to Dashboard
      </button>
    </div>
  );
}
