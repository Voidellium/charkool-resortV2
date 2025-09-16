'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function GuestHeader() {
  const router = useRouter();

  // Redirect to booking or current booking progress
  const handleBookNow = () => {
    // For simplicity, redirect to booking page
    router.push('/guest/booking');
  };

  return (
    <header className="guest-header">
      <nav className="nav-links">
        <Link href="/guest-info/page">Ask Us</Link>
        <Link href="/guest/3dview">View 3D</Link>
        <Link href="/guest/notifications">Notifications</Link>
        <Link href="/guest/booking">Reservations</Link>
        <Link href="/guest/dashboard">Dashboard</Link>
      </nav>
      <button className="book-now-btn" onClick={handleBookNow}>Book now</button>

      <style jsx>{`
        .guest-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #f7f7f7;
          padding: 0.75rem 2rem;
          border-bottom: 1px solid #e0e0e0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .nav-links {
          display: flex;
          gap: 1.5rem;
          font-weight: 600;
          font-size: 1rem;
          color: #555;
        }
        .nav-links a {
          color: #555;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.2s ease-in-out;
        }
        .nav-links a:hover {
          color: #000;
        }
        .book-now-btn {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 0.5rem 1.25rem;
          border-radius: 5px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out;
        }
        .book-now-btn:hover {
          background-color: #1d4ed8;
        }
      `}</style>
    </header>
  );
}
