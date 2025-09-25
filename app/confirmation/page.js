// 'use client' directive is required for client components
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function ConfirmationPageInner() {
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
          <p><strong>Payment Status:</strong> <span style={{
            color: booking.paymentStatus === 'Paid' ? 'green' : '#FEBE52'
          }}>
            {booking.paymentStatus}
          </span></p>

          <p><strong>Booking Status:</strong> <span style={{
            color: booking.status === 'Confirmed' ? 'green' : booking.status === 'Pending' ? '#FEBE52' : 'red'
          }}>
            {booking.status}
          </span></p>

          <p><strong>Extra Amenities:</strong> {
            booking.paymentStatus === 'Pending' ?
              'Amenities reserved (payment pending)' :
            [
              ...(booking.optionalAmenities?.map(a => `${a.optionalAmenity.name} (x${a.quantity})`) || []),
              ...(booking.rentalAmenities?.map(a => `${a.rentalAmenity.name} (x${a.quantity})`) || [])
            ].join(', ') || 'None'
          }</p>

          {booking.paymentStatus === 'Pending' && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '4px',
              padding: '1rem',
              margin: '1rem 0'
            }}>
              <p style={{ margin: 0, color: '#856404' }}>
                <strong>Note:</strong> Your reservation is confirmed, but amenities will be activated once payment is completed.
              </p>
            </div>
          )}
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

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<p>Loading booking details...</p>}>
      <ConfirmationPageInner />
    </Suspense>
  );
}