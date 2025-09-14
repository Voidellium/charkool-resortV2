'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function History() {
  const [bookings, setBookings] = useState([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch('/api/bookings');
        if (!res.ok) throw new Error('Failed to fetch bookings');
        const data = await res.json();
        setBookings(data.bookings || []);
      } catch (err) {
        console.error(err);
        router.push('/login');
      }
    }
    fetchBookings();
  }, [router]);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Booking History</h1>
      {bookings.length > 0 ? (
        bookings.map((booking) => (
          <div key={booking.id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <p><strong>Room:</strong> {booking.room.name}</p>
            <p><strong>Check-in:</strong> {booking.checkIn}</p>
            <p><strong>Check-out:</strong> {booking.checkOut}</p>
            <p><strong>Status:</strong> {booking.status}</p>
          </div>
        ))
      ) : (
        <p>No booking history available.</p>
      )}
    </div>
  );
}
