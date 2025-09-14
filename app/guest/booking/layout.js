'use client';
import Link from 'next/link';

export default function GuestLayout({ children }) {
  return (
    <div>
      <nav style={{ display: 'flex', gap: '1rem', padding: '1rem', background: '#f0f0f0' }}>
        <Link href="/guest">Home</Link>
        <Link href="/guest/booking">Book Now</Link>
        <Link href="/guest/history">My Bookings</Link>
        <Link href="/guest/profile">Profile</Link>
        <Link href="/guest/chat">Chat</Link>
      </nav>

      <main style={{ padding: '1rem' }}>
        {children}
      </main>
    </div>
  );
}
