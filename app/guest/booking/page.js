'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GuestBookingPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/booking');
  }, [router]);

  return (
    <div>
      <p>Redirecting to booking page...</p>
    </div>
  );
}
