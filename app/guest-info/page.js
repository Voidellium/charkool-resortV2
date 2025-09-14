'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function GuestForm() {
  const router = useRouter();
  const [guest, setGuest] = useState({ name: '', email: '', phone: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    const bookingData = JSON.parse(localStorage.getItem('bookingData'));

    // Merge guest info
    const fullBooking = {
      ...bookingData,
      guest,
      userType: 'guest',
    };

    localStorage.setItem('finalBooking', JSON.stringify(fullBooking));
    router.push('/confirmation');
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Guest Information</h2>
      <input
        type="text"
        placeholder="Full Name"
        required
        onChange={e => setGuest({ ...guest, name: e.target.value })}
      />
      <input
        type="email"
        placeholder="Email"
        required
        onChange={e => setGuest({ ...guest, email: e.target.value })}
      />
      <input
        type="tel"
        placeholder="Phone"
        required
        onChange={e => setGuest({ ...guest, phone: e.target.value })}
      />
      <button type="submit">Confirm Booking</button>
    </form>
  );
}
