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

  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellColor, setBellColor] = useState('white');

  // Fetch notifications for user and update bell color and count
  useEffect(() => {
    async function fetchNotifications() {
      if (!session?.user?.id) return;
      try {
        const res = await fetch(`/api/notifications?userId=${session.user.id}`, {
          method: 'GET',
        });
        if (res.ok) {
          const data = await res.json();
          setNotifications(data || []);
          const unread = (data || []).filter(n => !n.isRead).length;
          setUnreadCount(unread);
          setBellColor(unread > 0 ? '#ef4444' : 'white'); // red if unread, else white
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    }
    fetchNotifications();

    function handleClickOutside(event) {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileDropdownOpen(false);
      }
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target)) {
        setIsNotificationDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [session?.user?.id]); // Depend on user id

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

  const handleNotificationBellClick = () => {
    setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
  };

  const hasNotifications = notifications.length > 0;

  return (
    <header className="guest-header">
      <div className="guest-header-container">
        {/* Left Section - Logo */}
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

        {/* Center Section - Navigation */}
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

        {/* Right Section - Actions */}
        <div className="action-links">
          {/* Notifications */}
          <div className="notification-container" ref={notificationDropdownRef}>
            <button
              className="notification-bell"
              onClick={handleNotificationBellClick}
              aria-label="Notifications"
            >
              <Bell size={20} color={bellColor} />
              {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
            </button>
            {isNotificationDropdownOpen && (
              <div className="notification-dropdown">
                {hasNotifications ? (
                  <>
                    <ul>
                      {notifications.map((notif, index) => (
                        <li key={index}>{notif.message}</li>
                      ))}
                    </ul>
                    {unreadCount > 0 && (
                      <button
                        className="mark-read-btn"
                        onClick={async () => {
                          const unreadNotifications = notifications.filter(n => !n.isRead);
                          for (const notif of unreadNotifications) {
                            try {
                              await fetch(`/api/notifications/${notif.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ isRead: true }),
                              });
                            } catch (err) {
                              console.error('Error marking notification as read:', err);
                            }
                          }
                          // Update local state
                          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                          setUnreadCount(0);
                          setBellColor('white');
                        }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </>
                ) : (
                  <p>No new notifications.</p>
                )}
              </div>
            )}
          </div>

          {/* Book Now Button */}
          <button className="book-now-btn" onClick={handleBookNow}>
            Book now
          </button>

          {/* Profile Dropdown */}
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
      </div>

      {/* Component Styles */}
      <style jsx>{`
        .guest-header {
          background-color: #FEBE54;
          padding: 1rem 2rem;
          min-height: 70px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .guest-header-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          max-width: 1200px;
        }

        /* Logo */
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

        /* Navigation Links */
        .nav-links {
          display: flex;
          gap: 2.5rem;
          flex: 1;
          justify-content: center;
        }

        .nav-links :global(a) {
          color: #333;
          text-decoration: none;
          font-weight: 500;
          cursor: pointer;
          position: relative;
          padding: 0.5rem 0;
          transition: color 0.3s ease, transform 0.3s ease;
        }
        
        .nav-links :global(a):hover {
          color: #fff;
          transform: translateY(-2px);
        }

        .nav-links :global(a)::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 100%;
          height: 2px;
          background-color: #fff;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        .nav-links :global(a):hover::after,
        .nav-links :global(a).active::after {
          transform: scaleX(1);
        }

        /* Right-side actions */
        .action-links {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        /* Notifications */
        .notification-container {
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
        }

        .notification-count {
          position: absolute;
          top: 4px;
          right: 4px;
          background-color: #ef4444;
          color: white;
          border-radius: 50%;
          padding: 2px 6px;
          font-size: 0.75rem;
          font-weight: bold;
          min-width: 16px;
          text-align: center;
        }

        .notification-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #ccc;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          padding: 1rem;
          width: 250px;
          z-index: 10;
        }

        .notification-dropdown p {
          color: #333;
          font-size: 0.9rem;
        }

        .mark-read-btn {
          background-color: #4b4b4b;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-size: 0.8rem;
          cursor: pointer;
          margin-top: 0.5rem;
          width: 100%;
          transition: background-color 0.2s ease;
        }

        .mark-read-btn:hover {
          background-color: #333;
        }

        /* Book Now Button */
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

        /* Profile Container */
        .profile-container {
          position: relative;
        }

        /* Profile Button */
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
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .profile-btn:hover {
          background-color: #333;
        }

        /* Dropdown Menu */
        .profile-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border: 1px solid #ccc;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          min-width: 200px;
          overflow: hidden;
          z-index: 10;
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

        /* Hamburger icon */
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
