'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GuestBookingPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/booking');
  }, [router]);

  return (
    <div className="redirect-message">
      <p>Redirecting to booking page...</p>
      <style jsx>{`
        .redirect-message {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 70vh;
          font-size: 1.5rem;
          color: #555;
          text-align: center;
        }
      `}</style>
    </div>
  );
}