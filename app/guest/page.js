'use client';
import { useRouter } from 'next/navigation';

export default function GuestPage() {
  const router = useRouter();

  return (
    <div>
      <h2>Welcome Guest</h2>
      <button onClick={() => router.push('/guest/booking')}>Start Booking</button>
      <button onClick={() => router.push('/guest/history')}>View My Bookings</button>
    </div>
  );
}
