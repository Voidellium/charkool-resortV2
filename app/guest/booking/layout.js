'use client';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function GuestLayout({ children }) {
  const router = useRouter();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="layout-container">
      <header className="header">
        <div className="logo">
          <img src="/logo.png" alt="Logo" />
          <span>Resort Name</span>
        </div>
        <nav className="nav">
          <span onClick={() => router.push('/guest/dashboard')}>Dashboard</span>
          <span onClick={() => router.push('/guest/history')}>History</span>
          <span onClick={() => router.push('/guest/payment')}>Payment</span>
          <span onClick={() => router.push('/guest/chat')}>Chat</span>
          <button className="book-now-btn" onClick={() => router.push('/guest/booking')}>Book now</button>
        </nav>
        <div className="user-info">
          <button onClick={() => router.push('/guest/profile')} className="profile-button">Profile</button>
          <button onClick={handleSignOut} className="signout-button">Sign Out</button>
        </div>
      </header>
      <main className="main-content">
        {children}
      </main>

      <style jsx>{`
        .layout-container {
          background-color: #f0f2f5;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #f7f7f7;
          padding: 1rem 2rem;
          border-bottom: 1px solid #e0e0e0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          color: #333;
        }
        .logo {
          display: flex;
          align-items: center;
          font-weight: bold;
          font-size: 1.5rem;
        }
        .logo img {
          height: 40px;
          margin-right: 10px;
        }
        .nav {
          display: flex;
          gap: 2rem;
        }
        .nav span {
          cursor: pointer;
          font-size: 1rem;
          color: #555;
          transition: color 0.2s ease-in-out;
        }
        .nav span:hover {
          color: #000;
        }
        .user-info {
          display: flex;
          gap: 1rem;
        }
        .book-now-btn {
          background-color: #2563eb;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 5px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out;
          margin-left: 1rem;
        }
        .book-now-btn:hover {
          background-color: #1d4ed8;
        }
        .profile-button, .signout-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 500;
          transition: background-color 0.2s ease-in-out;
        }
        .profile-button {
          background-color: #ffc107;
          color: #333;
        }
        .profile-button:hover {
          background-color: #e0a800;
        }
        .signout-button {
          background-color: #dc3545;
          color: white;
        }
        .signout-button:hover {
          background-color: #c82333;
        }
        .main-content {
          padding: 2rem;
        }
      `}</style>
    </div>
  );
}