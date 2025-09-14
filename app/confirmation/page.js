'use client';
import { useEffect, useState } from 'react';

export default function ConfirmationPage() {
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('finalBooking'));
    setBooking(data);
  }, []);

  if (!booking) return <p>Loading...</p>;

  return (
    <div>
      <h2>Booking Confirmed!</h2>
      <p><strong>Guest:</strong> {booking.guest.name}</p>
      <p><strong>Email:</strong> {booking.guest.email}</p>
      <p><strong>Room:</strong> {booking.room}</p>
      <p><strong>Check-in:</strong> {booking.checkIn}</p>
      <p><strong>Check-out:</strong> {booking.checkOut}</p>
      <p><strong>Amenities:</strong> {booking.amenities?.join(', ')}</p>
    </div>
  );
}
