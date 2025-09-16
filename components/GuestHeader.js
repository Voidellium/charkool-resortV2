'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bell, User, LayoutDashboard, MessageCircle, Eye } from 'lucide-react';

export default function GuestHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]); // Assuming notifications are fetched or managed elsewhere

  const handleBookNow = () => {
    router.push('/booking'); // Change from /guest/booking to /booking for consistency
  };

  const handleProfileClick = () => {
    // You can redirect to the profile page
    router.push('/guest/profile');
  };

  const hasNotifications = notifications.length > 0;

  return (
    <header className="guest-header">
      {/* Logo Section */}
      <div className="logo-container">
        <Link href="/guest/dashboard">
          <Image
            src="/images/logo.png" // Replace with your actual logo path if different
            alt="Resort Logo"
            width={40}
            height={40}
            className="logo"
          />
        </Link>
        <span className="resort-name">Resort Name</span>
      </div>

      {/* Navigation Links */}
      <nav className="nav-links">
        <Link href="/guest/dashboard">
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/guest/3dview">
          <Eye size={20} />
          <span>3D View</span>
        </Link>
        <Link href="/guest/chat">
          <MessageCircle size={20} />
          <span>Chat</span>
        </Link>
      </nav>

      {/* Actions and Profile */}
      <div className="action-links">
        {/* Notifications */}
        <div className="notification-container">
          <button
            className="notification-bell"
            onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {hasNotifications && <span className="notification-dot" />}
          </button>
          {isNotificationDropdownOpen && (
            <div className="notification-dropdown">
              {hasNotifications ? (
                <ul>
                  {/* Map over notifications and display them */}
                  {notifications.map((notif, index) => (
                    <li key={index}>{notif.message}</li>
                  ))}
                </ul>
              ) : (
                <p>No new notifications.</p>
              )}
            </div>
          )}
        </div>

        {/* Book Now Button */}
        <button
          className="book-now-btn"
          onClick={handleBookNow}
        >
          Book now
        </button>

        {/* User Profile */}
        <button
          className="profile-btn"
          onClick={handleProfileClick}
          aria-label="Profile"
        >
          <User size={20} />
        </button>
      </div>

      {/* Styled JSX for component-specific styles */}
      <style jsx>{`
        .guest-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background-color: #f0f0f0;
          border-bottom: 1px solid #e0e0e0;
          color: #333;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          min-height: 70px; /* Ensures consistent height */
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .resort-name {
          font-size: 1.25rem;
          font-weight: bold;
          color: #1a1a1a;
        }

        .nav-links {
          display: flex;
          gap: 2rem;
        }

        .nav-links a {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #555;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s ease-in-out, transform 0.2s ease;
          cursor: pointer;
        }
        
        .nav-links a:hover {
          color: #000;
          transform: translateY(-2px);
        }

        .action-links {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .notification-container {
          position: relative;
        }

        .notification-bell, .profile-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease-in-out;
        }
        
        .notification-bell:hover, .profile-btn:hover {
          color: #000;
        }

        .notification-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          height: 8px;
          width: 8px;
          background-color: #ef4444; /* red-500 */
          border-radius: 50%;
        }

        .notification-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background-color: white;
          border: 1px solid #ccc;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          border-radius: 8px;
          padding: 1rem;
          width: 250px;
          z-index: 100;
        }
        
        .notification-dropdown ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .notification-dropdown li {
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }
        
        .notification-dropdown li:last-child {
          border-bottom: none;
        }

        .book-now-btn {
          background-color: #0c4a6e; /* Darker blue, similar to image */
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out, transform 0.2s ease;
        }

        .book-now-btn:hover {
          background-color: #072a44;
          transform: translateY(-1px);
        }
      `}</style>
    </header>
  );
}