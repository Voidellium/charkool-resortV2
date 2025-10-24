"use client";

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useUser } from '../context/UserContext';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, User, LogOut, Settings, Check, AlertCircle, Info, CalendarCheck2, CreditCard, Menu, X, ChevronDown } from 'lucide-react';
import { NotificationsModal } from './NotificationsModal';
import { useNavigationGuard } from '../hooks/useNavigationGuard.simple';
import { useNavigationContext } from '../context/NavigationContext';
import { NavigationConfirmationModal } from './CustomModals';

function GuestHeader({ sessionUser }) {
  const router = useRouter();
  const pathname = usePathname();
  
  // ALL HOOKS MUST BE DECLARED FIRST - Before any conditional logic
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bellColor, setBellColor] = useState('white');
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showAllNotificationsModal, setShowAllNotificationsModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  const profileDropdownRef = useRef(null);
  const notificationDropdownRef = useRef(null);

  // Try to get user from context, fallback to sessionUser prop
  let contextUser = null;
  try {
    const { user } = useUser();
    contextUser = user;
  } catch (error) {
    // UserContext not available, will use sessionUser instead
    contextUser = null;
  }
  
  // Use context user if available, otherwise use session user
  const user = contextUser || sessionUser;

  // Navigation Guard Setup - only protect when there's actual booking progress
  const navigationContext = useNavigationContext();
  const isOnBookingPage = pathname?.includes('/booking');
  
  // Check if there's actual booking progress that needs protection
  const hasActiveBooking = navigationContext?.bookingState?.isActive && navigationContext?.bookingState?.hasData;
  
  const navigationGuard = useNavigationGuard({
    customMessage: 'You have an active booking in progress. Leaving now may lose your selection and require starting over.'
  });

  // Role validation - only CUSTOMER should see this header
  useEffect(() => {
    if (user && user.role !== 'CUSTOMER') {
      // Non-customer user accessing guest header, redirect to appropriate dashboard
      const role = user.role;
      switch (role) {
        case 'SUPERADMIN':
          router.push('/super-admin/dashboard');
          break;
        case 'ADMIN':
          router.push('/admin/dashboard');
          break;
        case 'RECEPTIONIST':
          router.push('/receptionist');
          break;
        case 'CASHIER':
          router.push('/cashier');
          break;
        case 'AMENITYINVENTORYMANAGER':
          router.push('/amenityinventorymanager');
          break;
        default:
          router.push('/unauthorized');
          break;
      }
    }
  }, [user, router]);

  // Don't render header for non-customers - but still call all hooks
  const shouldRender = user && user.role === 'CUSTOMER';

  // Ensure component is mounted before rendering dynamic content
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch and update profile image from user context or localStorage
  useEffect(() => {
    if (!isMounted || !user) return;
    
    // Priority: user context image > localStorage > null
    if (user.image) {
      setProfileImage(user.image);
    } else {
      const savedImage = localStorage.getItem('profileImage');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    }
  }, [isMounted, user, user?.image]);

  // Listen for profile image updates from localStorage and custom events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'profileImage') {
        setProfileImage(e.newValue);
      }
    };

    const handleProfileUpdate = (e) => {
      if (e.detail?.image) {
        setProfileImage(e.detail.image);
      }
    };

    // Check localStorage periodically for updates
    const checkLocalStorage = () => {
      const savedImage = localStorage.getItem('profileImage');
      if (savedImage && savedImage !== profileImage) {
        setProfileImage(savedImage);
      }
      // Also check if user context has updated image
      if (user?.image && user.image !== profileImage) {
        setProfileImage(user.image);
      }
    };

    // Handle page visibility change - refresh image when user returns to page
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkLocalStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('profileImageUpdated', handleProfileUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Poll localStorage every 2 seconds when on dashboard
    const interval = setInterval(checkLocalStorage, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileImageUpdated', handleProfileUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [profileImage, user?.image]);

  // Sticky header effect
  useEffect(() => {
    if (!isMounted) return;
    
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMounted]);

  // Fetch notifications for user and update bell color and count
  useEffect(() => {
    if (!isMounted || !shouldRender) return;
    
    let isMountedLocal = true;
    
    async function fetchNotifications() {
      if (!user?.id) return;
      
      try {
        setLoadingNotifications(true);
        setNotifError('');
        const res = await fetch(`/api/notifications?role=CUSTOMER&userId=${user.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (!isMountedLocal) return;
          setNotifications(data || []);
          const unread = (data || []).filter(n => !n.isRead).length;
          setUnreadCount(unread);
          setBellColor(unread > 0 ? '#ef4444' : 'white');
        } else {
          console.error('Failed to fetch notifications:', res.status);
          if (isMountedLocal) setNotifError('Failed to load notifications');
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
        if (isMountedLocal) setNotifError('Unable to load notifications');
      } finally {
        if (isMountedLocal) setLoadingNotifications(false);
      }
    }
    
    fetchNotifications();
    
    // Poll for new notifications every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);

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
      isMountedLocal = false;
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [user?.id, isMounted, shouldRender]);

  // Helper functions for notifications
  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'info': return <Info size={16} />;
      case 'booking': return <CalendarCheck2 size={16} />;
      case 'payment': return <CreditCard size={16} />;
      case 'alert': return <AlertCircle size={16} />;
      default: return <Bell size={16} />;
    }
  };

  const getNotificationAccent = (type) => {
    switch (type?.toLowerCase()) {
      case 'info': return 'linear-gradient(135deg, #3B82F6, #1D4ED8)';
      case 'booking': return 'linear-gradient(135deg, #10B981, #059669)';
      case 'payment': return 'linear-gradient(135deg, #F59E0B, #D97706)';
      case 'alert': return 'linear-gradient(135deg, #EF4444, #DC2626)';
      default: return 'linear-gradient(135deg, #6B7280, #4B5563)';
    }
  };

  const timeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now - date;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleBookNow = () => {
    // If we're on booking page with active booking, show confirmation before navigating
    if (hasActiveBooking && isOnBookingPage) {
      navigationGuard.navigate('/booking');
    } else {
      // Not on booking page or no active booking, use router directly
      router.push('/booking');
    }
  };

  const handleProfileClick = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
  };

  const handleSignOut = async () => {
    // Check if there's actual booking progress that needs protection
    if (hasActiveBooking) {
      // Show logout confirmation modal
      setShowLogoutModal(true);
    } else {
      // No active booking, proceed with logout directly
      await signOut({ callbackUrl: '/' });
    }
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutModal(false);
    navigationContext?.clearAllStates?.();
    await signOut({ callbackUrl: '/' });
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  // Mark single notification as read
  const handleMarkAsRead = async (notification) => {
    if (notification.isRead) return;

    try {
      const res = await fetch(`/api/notifications/${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      
      if (res.ok) {
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, isRead: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (unreadCount - 1 <= 0) setBellColor('white');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(notification =>
          fetch(`/api/notifications/${notification.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true })
          })
        )
      );
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      setBellColor('white');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleEditProfile = () => {
    // If we're on booking page with active booking, show confirmation before navigating
    if (hasActiveBooking && isOnBookingPage) {
      navigationGuard.navigate('/guest/profile');
    } else {
      // Not on booking page or no active booking, use router directly
      router.push('/guest/profile');
    }
  };

  // Custom Link wrapper that uses navigation guard only when ON booking page with progress
  const GuardedLink = ({ href, children, className, ...props }) => {
    const handleClick = (e) => {
      e.preventDefault();
      
      // Only use navigation guard if we're ON the booking page with active booking
      // and trying to navigate away from it
      if (hasActiveBooking && isOnBookingPage) {
        navigationGuard.navigate(href);
      } else {
        // Not on booking page or no active booking, use router directly
        router.push(href);
      }
    };

    return (
      <a href={href} onClick={handleClick} className={className} {...props}>
        {children}
      </a>
    );
  };

  const handleNotificationBellClick = async () => {
    const nextOpen = !isNotificationDropdownOpen;
    setIsNotificationDropdownOpen(nextOpen);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    
    // Refresh notifications when opening
    if (nextOpen && user?.id) {
      try {
        setLoadingNotifications(true);
        const res = await fetch('/api/notifications?role=CUSTOMER');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data || []);
          const unread = (data || []).filter(n => !n.isRead).length;
          setUnreadCount(unread);
          setBellColor(unread > 0 ? '#ef4444' : 'white');
        }
      } catch (e) {
        // Handle silently
      } finally {
        setLoadingNotifications(false);
      }
    }
  };

  // Helper functions

  const hasNotifications = notifications.length > 0;

  // Don't render header for non-customers
  if (!shouldRender) {
    return null;
  }

  // Prevent hydration mismatch - always render the same structure
  if (!isMounted) {
    return null;
  }

  return (
    <header className={`guest-header ${hasScrolled ? 'scrolled' : ''}`}>
      <div className="guest-header-container">
        {/* Left Section - Brand */}
        <div className="logo-container">
          <button
            className="mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <GuardedLink href="/guest/dashboard" className="logo-link">
            <div className="brand-text-container">
              <span className="brand-title">
                Charkool
                <span className="brand-glow"></span>
              </span>
              <span className="brand-subtitle">Beach Resort</span>
            </div>
          </GuardedLink>
        </div>

        {/* Right Section - Navigation & Actions */}
        <div className="action-links">
          {/* Navigation Links */}
          <nav className={`nav-links ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
            <GuardedLink href="/guest/dashboard" className={pathname === '/guest/dashboard' ? 'active' : ''}>
              <span>Dashboard</span>
            </GuardedLink>
            <GuardedLink href="/guest/3dview" className={pathname === '/guest/3dview' ? 'active' : ''}>
              <span>Virtual Tour</span>
            </GuardedLink>
            <GuardedLink href="/guest/chat" className={pathname === '/guest/chat' ? 'active' : ''}>
              <span>Chat</span>
            </GuardedLink>
            
            {/* Mobile-only Book Now */}
            <div className="mobile-book-container">
              <button className="mobile-book-btn" onClick={() => { setIsMobileMenuOpen(false); handleBookNow(); }}>
                Book Now
              </button>
            </div>
          </nav>

          {/* Book Now Button */}
          <button className="book-now-btn" onClick={handleBookNow}>
            Book Now
          </button>

          {/* Notifications */}
          <div className="notification-container" ref={notificationDropdownRef}>
            <button
              className="notification-bell"
              onClick={handleNotificationBellClick}
              aria-label="Notifications"
            >
              <Bell size={20} color={bellColor} />
              {unreadCount > 0 && (
                <span className="notification-count" aria-live="polite">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            {isNotificationDropdownOpen && (
              <div className="notification-dropdown" role="dialog" aria-label="Notifications">
                <div className="notification-header">
                  <div>
                    <h3 className="notification-title">Notifications</h3>
                    <p className="notification-subtitle">{unreadCount} unread</p>
                  </div>
                  <div className="notification-badge">{notifications.length}</div>
                </div>

                <div className="notification-body">
                  {loadingNotifications && (
                    <div className="notification-loading">
                      <div className="skeleton-item"></div>
                      <div className="skeleton-item"></div>
                      <div className="skeleton-item"></div>
                    </div>
                  )}

                  {!loadingNotifications && notifError && (
                    <div className="notification-error">
                      <AlertCircle size={16} />
                      <span>{notifError}</span>
                    </div>
                  )}

                  {!loadingNotifications && !notifError && (
                    hasNotifications ? (
                      <ul className="notification-list">
                        {notifications.slice(0, 6).map((notif) => (
                          <li
                            key={notif.id}
                            className={`notification-item ${!notif.isRead ? 'unread' : ''} ${notif.type}`}
                            onClick={async () => {
                              if (!notif.isRead) {
                                try {
                                  const res = await fetch(`/api/notifications/${notif.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ isRead: true }),
                                  });
                                  if (res.ok) {
                                    setNotifications(prev => prev.map(n => 
                                      n.id === notif.id ? { ...n, isRead: true } : n
                                    ));
                                    setUnreadCount(prev => Math.max(0, prev - 1));
                                    if (unreadCount - 1 <= 0) setBellColor('white');
                                  }
                                } catch (e) {
                                  // Handle silently
                                }
                              }
                            }}
                          >
                            <div className="notification-icon" style={{ background: getNotificationAccent(notif.type) }}>
                              {getNotificationIcon(notif.type)}
                            </div>
                            <div className="notification-content">
                              <div className="notification-message">{notif.message}</div>
                              <div className="notification-time">{timeAgo(notif.createdAt)}</div>
                            </div>
                            {!notif.isRead && (
                              <button
                                className="quick-mark-read"
                                title="Mark as read"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const res = await fetch(`/api/notifications/${notif.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ isRead: true }),
                                    });
                                    if (res.ok) {
                                      setNotifications(prev => prev.map(n => 
                                        n.id === notif.id ? { ...n, isRead: true } : n
                                      ));
                                      setUnreadCount(prev => Math.max(0, prev - 1));
                                      if (unreadCount - 1 <= 0) setBellColor('white');
                                    }
                                  } catch {}
                                }}
                              >
                                <Check size={12} />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="notification-empty">
                        <div className="empty-icon">
                          <Bell size={24} />
                        </div>
                        <div className="empty-title">All caught up!</div>
                        <div className="empty-subtitle">No new notifications</div>
                      </div>
                    )
                  )}
                </div>

                <div className="notification-footer">
                  {hasNotifications && (
                    <button
                      className="mark-all-read"
                      disabled={unreadCount === 0 || loadingNotifications}
                      onClick={async () => {
                        const unreadNotifications = notifications.filter(n => !n.isRead);
                        if (unreadNotifications.length === 0) return;
                        try {
                          await Promise.all(
                            unreadNotifications.map(n => fetch(`/api/notifications/${n.id}`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ isRead: true }),
                            }))
                          );
                          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                          setUnreadCount(0);
                          setBellColor('white');
                        } catch (e) {
                          // Handle silently
                        }
                      }}
                    >
                      Mark all as read
                    </button>
                  )}
                  <button 
                    onClick={() => setShowAllNotificationsModal(true)}
                    className="view-all-link"
                  >
                    View all
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="profile-container" ref={profileDropdownRef}>
            <button
              className="profile-btn"
              onClick={handleProfileClick}
              aria-label="Profile"
            >
              {profileImage ? (
                <Image
                  src={profileImage}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="profile-avatar"
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <div className="profile-avatar-fallback">
                  {user?.name ? (
                    user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                  ) : (
                    <User size={18} />
                  )}
                </div>
              )}
              <ChevronDown size={16} className="profile-chevron" />
            </button>
            {isProfileDropdownOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-header">
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt="Profile"
                      width={50}
                      height={50}
                      className="profile-avatar-large"
                      style={{ borderRadius: '50%', objectFit: 'cover', marginBottom: '0.5rem' }}
                    />
                  ) : (
                    <div className="profile-avatar-fallback-large">
                      {user?.name ? (
                        user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                  )}
                  {user?.name && <p className="font-bold">{user.name}</p>}
                  {user?.email && <p className="text-sm text-gray-500">{user.email}</p>}
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

      {/* All Notifications Modal */}
      <NotificationsModal
        isOpen={showAllNotificationsModal}
        onClose={() => setShowAllNotificationsModal(false)}
        notifications={notifications}
        loading={loadingNotifications}
        error={notifError}
        onMarkAsRead={handleMarkAsRead}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      {/* Component Styles */}
      <style jsx>{`
        .guest-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: linear-gradient(135deg, rgba(240, 176, 53, 0.55), rgba(252, 211, 77, 0.12));
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.18);
          padding: 1rem 0;
          transition: background 0.4s ease, box-shadow 0.4s ease, padding 0.4s ease;
          height: auto;
        }

        .guest-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, #febe52, #EDCA60);
          pointer-events: none;
          opacity: 0.7;
          transition: opacity 0.4s ease;
        }

        .guest-header.scrolled {
          background: linear-gradient(135deg, rgba(240, 176, 53, 0.95), rgba(251, 146, 60, 0.95));
          padding: 0.8rem 0;
          box-shadow: 0 12px 35px rgba(251, 146, 60, 0.28);
        }

        .guest-header.scrolled::before {
          opacity: 0.2;
        }

        .guest-header-container {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          gap: 1.5rem;
          height: 60px;
        }

        /* Logo Section */
        .logo-container {
          display: flex;
          align-items: center;
          position: relative;
        }

        .logo-link {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          text-decoration: none !important;
          position: relative;
          padding: 0.3rem 0;
          border-bottom: none !important;
        }

        .brand-text-container {
          display: flex;
          flex-direction: column;
          margin-left: 0.4rem;
          justify-content: center;
          align-items: flex-start;
        }

        .brand-title {
          position: relative;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          background: linear-gradient(120deg, #ffffff 10%, #fef3c7 45%, #fde68a 90%);
          -webkit-background-clip: text;
          color: transparent;
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .brand-glow {
          position: absolute;
          inset: 45% -18px auto auto;
          width: 36px;
          height: 36px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(253, 230, 138, 0));
          filter: blur(12px);
          opacity: 0;
          transition: transform 0.5s ease, opacity 0.5s ease;
        }

        .brand-subtitle {
          margin-top: -0.1rem;
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.65rem;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
          text-decoration: none;
        }

        .logo-link:hover .brand-glow,
        .guest-header.scrolled .brand-glow {
          opacity: 1;
          transform: scale(1.1);
        }

        .mobile-menu-toggle {
          display: none;
          background: rgba(255, 255, 255, 0.08);
          border: none;
          border-radius: 12px;
          padding: 0.5rem;
          color: white;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(12px);
        }

        .mobile-menu-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        /* Navigation */
        .nav-links {
          display: flex;
          gap: 1.4rem;
          align-items: center;
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .nav-links :global(a) {
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none !important;
          font-size: 1rem;
          font-weight: 600;
          padding: 0.45rem 0.95rem;
          border-radius: 999px;
          transition: transform 0.3s ease, background 0.3s ease, color 0.3s ease;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          border-bottom: none !important;
        }

        .nav-links :global(a):hover,
        .nav-links :global(a).active {
          color: #ffffff;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.08));
          transform: translateY(-3px);
          box-shadow: 0 8px 18px rgba(255, 255, 255, 0.16);
          text-decoration: none !important;
          border-bottom: none !important;
        }

        .mobile-book-container {
          display: none;
        }

        .mobile-book-btn {
          background: rgba(255, 255, 255, 0.95);
          color: #d97706;
          border: 2px solid rgba(217, 119, 6, 0.2);
          padding: 0.75rem 1.75rem;
          border-radius: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(255, 255, 255, 0.2), 
                      0 2px 8px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
          letter-spacing: 0.25px;
          backdrop-filter: blur(20px);
        }

        .mobile-book-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 0;
          height: 100%;
          background: linear-gradient(135deg, #d97706, #b45309);
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: -1;
        }

        .mobile-book-btn:hover::before {
          width: 100%;
        }

        .mobile-book-btn:hover {
          color: white;
          border-color: #d97706;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(217, 119, 6, 0.3), 
                      0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Action Links */
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
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 12px;
          padding: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
          position: relative;
        }

        .notification-bell:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .notification-count {
          position: absolute;
          top: 2px;
          right: 2px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          border-radius: 50%;
          padding: 0.125rem 0.375rem;
          font-size: 0.7rem;
          font-weight: 700;
          min-width: 18px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.4);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(30px);
          border: 1px solid rgba(254, 190, 84, 0.2);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12), 
                      0 8px 24px rgba(254, 190, 84, 0.1);
          width: 380px;
          max-height: 500px;
          overflow: hidden;
          z-index: 1000;
          animation: dropdownSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .notification-header {
          background: linear-gradient(135deg, #febe54, #f5a623);
          color: white;
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .notification-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .notification-subtitle {
          margin: 0.25rem 0 0 0;
          font-size: 0.8rem;
          opacity: 0.9;
        }

        .notification-badge {
          background: rgba(255, 255, 255, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.8rem;
        }

        .notification-body {
          max-height: 320px;
          overflow-y: auto;
          padding: 0.5rem;
        }

        .notification-loading {
          padding: 1rem;
        }

        .skeleton-item {
          height: 60px;
          background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%);
          background-size: 400% 100%;
          border-radius: 12px;
          margin-bottom: 0.5rem;
          animation: shimmer 1.5s ease infinite;
        }

        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: 0 0; }
        }

        .notification-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          color: #dc2626;
          background: #fee2e2;
          border-radius: 12px;
          margin: 0.5rem;
        }

        .notification-list {
          list-style: none;
          margin: 0;
          padding: 0.25rem;
        }

        .notification-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 0.25rem;
          position: relative;
        }

        .notification-item:hover {
          background: rgba(99, 102, 241, 0.05);
          transform: translateX(4px);
        }

        .notification-item.unread {
          background: rgba(99, 102, 241, 0.08);
          border-left: 3px solid #6366f1;
          animation: fadeInSlide 0.3s ease;
        }

        .notification-item.booking-confirmed {
          border-left-color: #10b981;
        }

        .notification-item.booking-approved {
          border-left-color: #059669;
        }

        .notification-item.booking-cancelled,
        .notification-item.booking-disapproved {
          border-left-color: #ef4444;
        }

        .notification-item.payment-received {
          border-left-color: #3b82f6;
        }

        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .notification-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          flex-shrink: 0;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-message {
          font-size: 0.9rem;
          font-weight: 600;
          color: #111827;
          line-height: 1.4;
          margin-bottom: 0.25rem;
        }

        .notification-time {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .quick-mark-read {
          position: absolute;
          top: 8px;
          right: 8px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          opacity: 0;
        }

        .notification-item:hover .quick-mark-read {
          opacity: 1;
        }

        .quick-mark-read:hover {
          background: #059669;
          transform: scale(1.1);
        }

        .notification-empty {
          text-align: center;
          padding: 2rem 1rem;
          color: #6b7280;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        }

        .empty-title {
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: #374151;
        }

        .empty-subtitle {
          font-size: 0.85rem;
          color: #9ca3af;
        }

        .notification-footer {
          padding: 0.875rem 1.25rem;
          border-top: 1px solid rgba(0, 0, 0, 0.05);
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .mark-all-read {
          flex: 1;
          background: linear-gradient(135deg, #f5a623, #febe54);
          color: white;
          border: none;
          padding: 0.625rem 1rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(245, 166, 35, 0.2);
        }

        .mark-all-read:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mark-all-read:hover:not(:disabled) {
          background: linear-gradient(135deg, #e09612, #f5a623);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(245, 166, 35, 0.4);
        }

        .view-all-link {
          color: #f5a623;
          background: none;
          border: none;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.85rem;
          padding: 0.5rem;
          transition: all 0.3s ease;
          border-radius: 8px;
          cursor: pointer;
        }

        .view-all-link:hover {
          color: #febe54;
          background: rgba(254, 190, 84, 0.1);
          transform: translateY(-1px);
        }

        /* Action Links Container */
        .action-links {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        /* Book Now Button */
        .book-now-btn {
          /* Premium amber-gold gradient that blends with the navbar palette */
          background: linear-gradient(135deg, #b45309 0%, #f59e0b 52%, #fcd34d 100%);
          color: #fff;
          font-size: 1.08rem;
          font-weight: 800;
          padding: 0.65em 1.9em;
          border-radius: 999px;
          /* Subtle border for definition */
          border: 1px solid rgba(253, 230, 138, 0.6);
          /* Gentle glow for depth */
          box-shadow: 0 18px 35px -16px rgba(245, 158, 11, 0.55), 0 0 0 1px rgba(253, 230, 138, 0.18) inset;
          cursor: pointer;
          transition: transform 0.35s ease, box-shadow 0.35s ease, background 0.35s ease;
          letter-spacing: 0.14em;
          margin-right: 0.5rem;
          min-width: 150px;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
          /* Subtle outline to make it stand out without being loud */
          outline: 1px solid rgba(255, 255, 255, 0.12);
          outline-offset: 2px;
        }

        .book-now-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0));
          transform: translateX(-100%);
          transition: transform 0.45s ease;
        }

        .book-now-btn:hover,
        .book-now-btn:focus {
          transform: translateY(-4px) scale(1.04);
          /* Slightly brighter glow and a gentle halo to separate from background */
          box-shadow: 0 22px 44px -14px rgba(245, 158, 11, 0.6), 0 0 0 2px rgba(253, 230, 138, 0.32);
        }

        .book-now-btn:hover::after,
        .book-now-btn:focus::after {
          transform: translateX(0);
        }

        .book-now-btn:active {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 16px 28px -18px rgba(245, 158, 11, 0.55);
        }

        /* Stronger, accessible focus ring without being distracting */
        .book-now-btn:focus-visible {
          outline: 2px solid rgba(253, 230, 138, 0.65);
          outline-offset: 3px;
        }

        /* Profile */
        .profile-container {
          position: relative;
        }

        .profile-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 12px;
          padding: 0.5rem 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: white;
          transition: all 0.2s ease;
          backdrop-filter: blur(10px);
        }

        .profile-btn:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.02);
        }

        .profile-avatar,
        .profile-avatar-fallback {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8rem;
          font-weight: 700;
          object-fit: cover;
        }

        .profile-avatar-fallback {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .profile-avatar-large,
        .profile-avatar-fallback-large {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          font-weight: 700;
          margin: 0 auto 0.5rem;
          object-fit: cover;
        }

        .profile-avatar-fallback-large {
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
        }

        .profile-chevron {
          transition: transform 0.2s ease;
        }

        .profile-btn:hover .profile-chevron {
          transform: rotate(180deg);
        }

        .profile-dropdown {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          min-width: 240px;
          overflow: hidden;
          z-index: 1000;
          animation: dropdownSlide 0.2s ease;
        }

        .dropdown-header {
          padding: 1.25rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
          background: linear-gradient(135deg, #f8fafc, #f1f5f9);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .dropdown-header p {
          margin: 0;
          color: #374151;
        }

        .font-bold {
          font-weight: 700;
        }

        .text-sm {
          font-size: 0.875rem;
        }

        .text-gray-500 {
          color: #6b7280;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #374151;
          font-weight: 500;
        }

        .dropdown-item:hover {
          background: rgba(99, 102, 241, 0.05);
          color: #111827;
          transform: translateX(4px);
        }

        .menu-icon {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .menu-icon span {
          width: 16px;
          height: 2px;
          background-color: white;
          border-radius: 1px;
          transition: all 0.2s ease;
        }

        /* Mobile Styles */
        @media (max-width: 1024px) {
          .guest-header-container {
            padding: 0 1.2rem;
            gap: 1rem;
          }

          .nav-links {
            gap: 1rem;
          }

          .brand-title {
            font-size: 1.8rem;
          }

          .brand-subtitle {
            font-size: 0.8rem;
            letter-spacing: 0.5rem;
          }
        }

        @media (max-width: 820px) {
          .guest-header {
            padding: 0.8rem 0;
          }

          .guest-header-container {
            flex-direction: column;
            align-items: center;
            padding: 0.8rem 1rem;
          }

          .nav-links {
            justify-content: center;
          }

          .book-now-btn {
            order: -1;
            margin-right: 0;
            margin-bottom: 0.4rem;
            font-size: 1rem;
            padding: 0.55em 1.6em;
            min-width: 140px;
          }

          .mobile-menu-toggle {
            display: flex;
          }

          .nav-links {
            position: fixed;
            top: calc(100% + 1rem);
            left: 0;
            right: 0;
            background: linear-gradient(135deg, rgba(240, 176, 53, 0.98), rgba(252, 211, 77, 0.98));
            backdrop-filter: blur(20px);
            flex-direction: column;
            padding: 1.5rem;
            transform: translateY(-100%);
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
            border-radius: 0 0 1rem 1rem;
          }

          .nav-links.mobile-open {
            transform: translateY(0);
            opacity: 1;
            visibility: visible;
          }

          .nav-links :global(a) {
            width: 100%;
            text-align: center;
            padding: 1rem;
            margin-bottom: 0.5rem;
            background: rgba(255, 255, 255, 0.1);
          }

          .mobile-book-container {
            display: block;
            margin-top: 1rem;
            padding-top: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
          }

          .action-links {
            gap: 0.5rem;
          }

          .notification-dropdown {
            width: 340px;
            right: -1rem;
          }

          .profile-dropdown {
            right: -0.5rem;
          }
        }

        @media (max-width: 600px) {
          .guest-header {
            padding: 0.75rem 0;
          }

          .guest-header-container {
            padding: 0.6rem 0.9rem;
            gap: 0.8rem;
          }

          .brand-title {
            font-size: 1.5rem;
            letter-spacing: 0.5px;
          }

          .brand-subtitle {
            font-size: 0.7rem;
            letter-spacing: 0.35rem;
          }

          .nav-links {
            gap: 0.6rem;
          }

          .nav-links :global(a) {
            font-size: 0.95rem;
            padding: 0.4rem 0.75rem;
          }

          .book-now-btn {
            font-size: 1rem;
            padding: 0.55em 1.6em;
            letter-spacing: 0.1em;
            min-width: 140px;
          }

          .notification-dropdown {
            width: calc(100vw - 2rem);
            right: -1rem;
          }
        }

        @media (max-width: 420px) {
          .brand-title {
            font-size: 1.35rem;
          }

          .brand-subtitle {
            font-size: 0.6rem;
            letter-spacing: 0.28rem;
          }

          .nav-links :global(a) {
            font-size: 0.85rem;
            padding: 0.35rem 0.65rem;
          }

          .book-now-btn {
            font-size: 0.95rem;
            min-width: 125px;
          }
        }

        /* All Notifications Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          padding: 1rem;
          animation: modalFadeIn 0.3s ease-out;
        }

        @keyframes modalFadeIn {
          from {
            opacity: 0;
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            backdrop-filter: blur(8px);
          }
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow: hidden;
          animation: modalSlideIn 0.3s ease-out;
          position: relative;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          background: linear-gradient(135deg, rgba(240, 176, 53, 0.95), rgba(252, 211, 77, 0.95));
          color: white;
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          position: relative;
        }

        .modal-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, #febe52, #EDCA60);
          pointer-events: none;
          opacity: 0.7;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.025em;
          position: relative;
          z-index: 1;
        }

        .modal-close {
          background: rgba(255, 255, 255, 0.08);
          border: none;
          color: white;
          padding: 0.5rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(12px);
          position: relative;
          z-index: 1;
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: rotate(90deg) scale(1.05);
        }

        .modal-body {
          max-height: 60vh;
          overflow-y: auto;
          padding: 0;
        }

        .modal-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #6b7280;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top: 3px solid #febe54;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .modal-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #6b7280;
          text-align: center;
        }

        .modal-empty svg {
          color: #d1d5db;
          margin-bottom: 1rem;
        }

        .modal-empty h3 {
          margin: 0 0 0.5rem 0;
          color: #374151;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .modal-empty p {
          margin: 0;
          font-size: 0.875rem;
        }

        .modal-notifications {
          padding: 0;
        }

        .modal-notification-item {
          display: flex;
          align-items: flex-start;
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
          gap: 1rem;
        }

        .modal-notification-item:hover {
          background: linear-gradient(135deg, rgba(254, 190, 84, 0.05), rgba(245, 166, 35, 0.05));
        }

        .modal-notification-item.unread {
          background: linear-gradient(135deg, rgba(254, 190, 84, 0.1), rgba(245, 166, 35, 0.1));
          border-left: 4px solid #febe54;
        }

        .modal-notification-item:last-child {
          border-bottom: none;
        }

        .notification-icon {
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-content h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          line-height: 1.4;
        }

        .notification-content p {
          margin: 0 0 0.75rem 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
        }

        .notification-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .notification-time {
          font-size: 0.75rem;
          color: #9ca3af;
          font-weight: 500;
        }

        .notification-type-badge {
          font-size: 0.625rem;
          font-weight: 700;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .notification-type-badge.booking_created {
          background: rgba(254, 190, 84, 0.2);
          color: #92400e;
        }

        .notification-type-badge.booking_confirmed {
          background: rgba(34, 197, 94, 0.2);
          color: #166534;
        }

        .notification-type-badge.booking_cancelled {
          background: rgba(239, 68, 68, 0.2);
          color: #991b1b;
        }

        .notification-type-badge.booking_approved {
          background: rgba(16, 185, 129, 0.2);
          color: #065f46;
        }

        .notification-type-badge.booking_disapproved {
          background: rgba(245, 158, 11, 0.2);
          color: #92400e;
        }

        .notification-type-badge.payment_received {
          background: rgba(34, 197, 94, 0.2);
          color: #166534;
        }

        .notification-type-badge.payment_failed {
          background: rgba(239, 68, 68, 0.2);
          color: #991b1b;
        }

        .notification-type-badge.system_alert {
          background: rgba(59, 130, 246, 0.2);
          color: #1e40af;
        }

        .unread-dot {
          width: 8px;
          height: 8px;
          background: #febe54;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 0.375rem;
        }

        .modal-footer {
          background: #f9fafb;
          padding: 1.5rem 2rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: center;
        }

        .modal-mark-all-read {
          background: linear-gradient(135deg, #f97316 0%, #facc15 40%, #fb923c 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 999px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
          letter-spacing: 0.05em;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
        }

        .modal-mark-all-read::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0));
          transform: translateX(-100%);
          transition: transform 0.45s ease;
        }

        .modal-mark-all-read:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 6px 16px rgba(249, 115, 22, 0.4);
        }

        .modal-mark-all-read:hover::after {
          transform: translateX(0);
        }

        /* Modal Mobile Responsive */
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 0.5rem;
          }

          .modal-content {
            max-height: 90vh;
            border-radius: 16px;
          }

          .modal-header {
            padding: 1.25rem 1.5rem;
          }

          .modal-header h2 {
            font-size: 1.25rem;
          }

          .modal-notification-item {
            padding: 1.25rem 1.5rem;
          }

          .notification-content h4 {
            font-size: 0.925rem;
          }

          .notification-meta {
            flex-direction: column;
            align-items: flex-start;
          }

          .modal-footer {
            padding: 1.25rem 1.5rem;
          }
        }
      `}</style>

      {/* Navigation Confirmation Modal - only show when ON booking page with active booking */}
      {hasActiveBooking && isOnBookingPage && (
        <NavigationConfirmationModal 
          show={navigationGuard.showModal}
          onStay={navigationGuard.handleStay}
          onLeave={navigationGuard.handleLeave}
          context={navigationGuard.context}
          message={navigationGuard.message}
        />
      )}

      {/* Logout Confirmation Modal - show when there's active booking from any page */}
      {hasActiveBooking && (
        <NavigationConfirmationModal 
          show={showLogoutModal}
          onStay={handleLogoutCancel}
          onLeave={handleLogoutConfirm}
          context="logout"
          message="You have an active booking in progress. Logging out will lose your current selection. Are you sure you want to logout?"
        />
      )}
    </header>
  );
}

export default GuestHeader;

