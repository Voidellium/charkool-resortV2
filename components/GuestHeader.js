'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, User, LogOut, Settings } from 'lucide-react';

export default function GuestHeader() {
  const router = useRouter();
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const notifications = [];
  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownRef, notificationDropdownRef]);

  const handleBookNow = () => {
    router.push('/booking');
  };

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };
  
  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const handleEditProfile = () => {
    router.push('/guest/profile');
  };

  const hasNotifications = notifications.length > 0;

  return (
    <header className="guest-header">
      {/* Logo Section */}
      <div className="logo-container">
        <Link href="/guest/dashboard">
          <Image
            src="/images/logo.png"
            alt="Resort Logo"
            width={40}
            height={40}
            className="logo"
          />
        </Link>
        <span className="resort-name">Charkool</span>
      </div>

      {/* Navigation Links */}
      <nav className="nav-links">
        <Link href="/guest/dashboard" className={pathname === '/guest/dashboard' ? 'active' : ''}>
          <span>Dashboard</span>
        </Link>
        <Link href="/guest/3dview" className={pathname === '/guest/3dview' ? 'active' : ''}>
          <span>3D View</span>
        </Link>
        <Link href="/guest/chat" className={pathname === '/guest/chat' ? 'active' : ''}>
          <span>Chat</span>
        </Link>
      </nav>

      {/* Actions and Profile */}
      <div className="action-links">
        {/* Notifications */}
        <div className="notification-container" ref={notificationDropdownRef}>
          <button
            className="notification-bell"
            onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
            aria-label="Notifications"
          >
            <Bell size={20} color="white" />
            {hasNotifications && <span className="notification-dot" />}
          </button>
          {isNotificationDropdownOpen && (
            <div className="notification-dropdown">
              {hasNotifications ? (
                <ul>
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

        {/* User Profile Dropdown */}
        <div className="profile-container" ref={profileDropdownRef}>
          <button
            className="profile-btn"
            onClick={handleProfileClick}
            aria-label="Profile"
          >
            <div className="menu-icon">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <User size={20} />
          </button>
          {isProfileDropdownOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                {session?.user?.name && <p className="font-bold">{session.user.name}</p>}
                {session?.user?.email && <p className="text-sm text-gray-500">{session.user.email}</p>}
              </div>
              <div className="dropdown-item" onClick={handleEditProfile}>
                <Settings size={16} />
                <span>Edit Profile</span>
              </div>
              <div className="dropdown-item" onClick={handleSignOut}>
                <LogOut size={16} />
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Styled JSX for component-specific styles */}
      <style jsx>{`
        .guest-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 2rem;
          background-color: #FEBE54; /* Corrected Navbar color */
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          min-height: 70px;
          position: relative;
        }

        .logo-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .resort-name {
          font-size: 1.25rem;
          font-weight: bold;
          color: white;
        }

        .nav-links {
          display: flex;
          gap: 2.5rem;
        }

        .nav-links a {
          color: white !important; /* Force white text */
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s ease-in-out;
          cursor: pointer;
          position: relative;
          padding: 0.5rem 0;
        }
        
        .nav-links a:hover {
          text-decoration: none; /* No underline on hover */
          color: white !important;
        }

        .nav-links a.active {
          color: white;
          text-decoration: underline;
          text-decoration-color: #f6a624; /* Underline color from image */
          text-decoration-thickness: 3px;
        }

        .action-links {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .notification-container, .profile-container {
          position: relative;
        }

        .notification-bell {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease-in-out;
        }
        
        .notification-bell:hover {
          color: #eee;
        }

        .notification-dot {
          position: absolute;
          top: 8px;
          right: 8px;
          height: 8px;
          width: 8px;
          background-color: #ef4444;
          border-radius: 50%;
        }

        .notification-dropdown, .profile-dropdown {
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
          min-width: 200px;
        }

        .profile-dropdown {
          padding: 0;
          overflow: hidden;
        }

        .dropdown-header {
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out;
        }

        .dropdown-item:hover {
          background-color: #f5f5f5;
        }

        .book-now-btn {
          background-color: #4b4b4b;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 20px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s ease-in-out, transform 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .book-now-btn:hover {
          background-color: #333;
          transform: translateY(-1px);
        }

        .profile-btn {
          background-color: #4b4b4b;
          border: none;
          cursor: pointer;
          padding: 0.75rem 1rem;
          border-radius: 20px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          transition: background-color 0.2s ease-in-out;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .profile-btn:hover {
          background-color: #333;
        }

        .menu-icon {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .menu-icon span {
          width: 18px;
          height: 2px;
          background-color: white;
          border-radius: 1px;
        }
      `}</style>
    </header>
  );
}
