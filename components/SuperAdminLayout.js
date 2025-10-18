import Head from 'next/head';
import React from 'react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ToastProvider } from './Toast';
import { 
  Bell, 
  Home, 
  Settings, 
  Users, 
  Book, 
  FileText, 
  Layers, 
  MessageCircle, 
  CreditCard, 
  DoorOpen, 
  ChevronLeft, 
  ChevronRight,
  User,
  Menu,
  X,
  Check
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import styles from './SuperAdminLayout.module.css';

export default function SuperAdminLayout({ children, activePage, reportMenu, user }) {
  const [reportsOpen, setReportsOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [notifications, setNotifications] = useState([]);
  const fileInputRef = useRef(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const router = useRouter();

  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [togglePressed, setTogglePressed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((s) => {
      const next = !s;
      try {
        localStorage.setItem('superadmin_sidebar_collapsed', JSON.stringify(next));
      } catch (e) {
        // ignore
      }
      return next;
    });
  };

  // Initialize collapsed state and mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    try {
      const stored = localStorage.getItem('superadmin_sidebar_collapsed');
      if (stored !== null) setSidebarCollapsed(JSON.parse(stored));
    } catch (e) {
      // ignore
    }
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (activePage === "reports") setReportsOpen(true);
    else setReportsOpen(false);
    if (activePage === "config") setConfigOpen(true);
    else setConfigOpen(false);
  }, [activePage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target))
        setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target))
        setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?role=superadmin`);
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data.filter(n => !n.read));
        } else {
          setNotifications([]);
        }
      } catch (err) {
        console.error(err);
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, []);

  const menu = [
    { key: 'dashboard', label: 'Dashboard', path: '/super-admin/dashboard', icon: <Home size={18} /> },
    { key: 'amenities', label: 'Amenities', path: '/super-admin/amenities', icon: <Layers size={18} /> },
    { key: 'rooms', label: 'Rooms', path: '/super-admin/rooms', icon: <DoorOpen size={18} /> },
    { key: 'bookings', label: 'Bookings', path: '/super-admin/bookings', icon: <Book size={18} /> },
    { key: 'payments', label: 'Payments', path: '/super-admin/payments', icon: <CreditCard size={18} /> },
    { key: 'users', label: 'Users', path: '/super-admin/users', icon: <Users size={18} /> },
    { key: 'audit-trails', label: 'Audit Trails', path: '/super-admin/audit-trails', icon: <FileText size={18} /> },
    { key: 'chatbot', label: 'Chatbot Management', path: '/super-admin/chatbot', icon: <MessageCircle size={18} /> },
    { key: 'config', label: 'Configurations', path: '/super-admin/configurations/promotions', icon: <Settings size={18} />, dropdown: [
      { label: 'Promotions', onClick: () => router.push('/super-admin/configurations/promotions') },
      { label: 'Policies', onClick: () => router.push('/super-admin/configurations/policies') }
    ] },
    { key: 'reports', label: 'Reports', path: '/super-admin/reports', icon: <FileText size={18} />, dropdown: reportMenu || [] },
  ];

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      setIsLoading(true);
      try {
        await signOut({ callbackUrl: '/login' });
      } catch (error) {
        console.error('Logout error:', error);
        setIsLoading(false);
      }
    }
  };

  const handleSwitchAccount = () => router.push('/account-switch');

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfileImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <ToastProvider>
      <>
        {/* Font imports */}
        <Head>
          {/* existing links */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin />
          <link href="https://fonts.googleapis.com/css2?family=Poppins&display=swap" rel="stylesheet" />
          <link href="https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap" rel="stylesheet" />
          <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet" />
          {/* set global font-family */}
          <style>{`
            body {
              font-family: 'Poppins', sans-serif;
          }
        `}</style>
      </Head>

      {/* Main Container */}
      <div className={styles.container}>
        {/* Mobile Overlay */}
        {isMobile && sidebarVisible && (
          <div 
            className={styles.overlay}
            onClick={() => setSidebarVisible(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 1100,
              backdropFilter: 'blur(4px)',
            }}
          />
        )}

        {/* Toggle Button */}
        <button
          className={`${styles.toggleButton} ${togglePressed ? styles.toggleButtonPressed : ''}`}
          onClick={isMobile ? () => setSidebarVisible(!sidebarVisible) : toggleSidebar}
          aria-label={isMobile ? 'Toggle Menu' : (sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar')}
          aria-expanded={isMobile ? sidebarVisible : !sidebarCollapsed}
          onMouseDown={() => setTogglePressed(true)}
          onMouseUp={() => setTogglePressed(false)}
          onMouseLeave={() => setTogglePressed(false)}
          style={{
            left: isMobile ? 'auto' : (sidebarCollapsed ? '104px' : '304px'),
            right: isMobile ? '20px' : 'auto',
            top: isMobile ? 'auto' : '50%',
            bottom: isMobile ? '20px' : 'auto',
          }}
        >
          {isMobile ? (
            sidebarVisible ? <X size={20} color="#fff" /> : <Menu size={20} color="#fff" />
          ) : (
            sidebarCollapsed ? <ChevronRight size={18} color="#fff" /> : <ChevronLeft size={18} color="#fff" />
          )}
        </button>

        {/* Sidebar */}
        <aside
          className={`${styles.sidebar} ${
            sidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
          } ${isMobile && sidebarVisible ? styles.sidebarVisible : ''}`}
          style={{
            transform: isMobile && !sidebarVisible ? 'translateX(-100%)' : 'translateX(0)',
          }}
        >
          {/* Header */}
          {!sidebarCollapsed && (
            <h2 className={styles.sidebarHeader}>
              Super Admin Panel
            </h2>
          )}
          {/* Navigation */}
          <nav className={styles.navigation}>
            <ul className={styles.navigationList}>
              {menu.map((item) => (
                <li 
                  key={item.key} 
                  className={`${styles.navigationItem} ${
                    sidebarCollapsed ? styles.navigationItemCollapsed : styles.navigationItemExpanded
                  }`}
                >
                  {sidebarCollapsed ? (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={item.label}
                      title={item.label}
                      onClick={() => router.push(item.path)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(item.path); }}
                      className={`${styles.menuItemCollapsed} ${
                        activePage === item.key ? styles.menuItemCollapsedActive : ''
                      }`}
                    >
                      {React.cloneElement(item.icon, { 
                        color: activePage === item.key ? '#fff' : '#333', 
                        size: 20 
                      })}
                    </div>
                  ) : (
                    item.dropdown ? (
                      <>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <Link
                            href={item.path}
                            className={`${styles.menuItemExpanded} ${
                              activePage === item.key ? styles.menuItemExpandedActive : ''
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              // Only toggle dropdown when the item has dropdown entries.
                              if (item.key === 'reports') {
                                if (item.dropdown && item.dropdown.length > 0) {
                                  setReportsOpen(!reportsOpen);
                                  setConfigOpen(false);
                                  return;
                                }
                                // If no dropdown items (clicked from other pages), navigate to reports page
                                router.push(item.path);
                                return;
                              }
                              if (item.key === 'config') {
                                if (item.dropdown && item.dropdown.length > 0) {
                                  setConfigOpen(!configOpen);
                                  setReportsOpen(false);
                                  return;
                                }
                                router.push(item.path);
                                return;
                              }
                              router.push(item.path);
                            }}
                          >
                            <span style={{ marginRight: '12px' }}>
                              {React.cloneElement(item.icon, { size: 18 })}
                            </span>
                            {item.label}
                          </Link>

                          {/* Dropdown panel */}
                          {item.key === 'reports' && reportsOpen && (
                            <ul className={styles.dropdown}>
                              {item.dropdown.map((sub) => (
                                <li key={sub.label} className={styles.dropdownItem}>
                                  <div
                                    onClick={sub.onClick}
                                    className={styles.dropdownLink}
                                  >
                                    {sub.label}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}

                          {item.key === 'config' && configOpen && (
                            <ul className={styles.dropdown}>
                              {item.dropdown.map((sub) => (
                                <li key={sub.label} className={styles.dropdownItem}>
                                  <div
                                    onClick={sub.onClick}
                                    className={styles.dropdownLink}
                                  >
                                    {sub.label}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    ) : (
                      <Link
                        href={item.path}
                        className={`${styles.menuItemExpanded} ${
                          activePage === item.key ? styles.menuItemExpandedActive : ''
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(item.path);
                        }}
                      >
                        <span style={{ marginRight: '12px' }}>
                          {React.cloneElement(item.icon, { size: 18 })}
                        </span>
                        {item.label}
                      </Link>
                    )
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <div 
          className={`${styles.mainContent} ${
            sidebarCollapsed ? styles.mainContentCollapsed : styles.mainContentExpanded
          }`}
          style={{
            marginLeft: isMobile ? '0' : undefined,
            width: isMobile ? '100%' : undefined,
          }}
        >
          {/* Top Bar */}
          <div className={styles.topBar}>
            <div className={styles.topBarControls}>
              {/* Notifications Bell */}
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className={styles.notificationButton}
                  aria-label="Notifications"
                >
                  <Bell size={22} color="#333" />
                  {notifications.length > 0 && (
                    <div className={styles.notificationBadge}>
                      {notifications.length}
                    </div>
                  )}
                </button>
                {notifOpen && (
                  <div className={styles.notificationPanel}>
                    {/* Header */}
                    <div className={styles.notificationHeader}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700', color: 'white' }}>
                          Notifications
                        </h3>
                        <p style={{ 
                          margin: '0.25rem 0 0 0', 
                          fontSize: '0.8rem', 
                          opacity: 0.9,
                          fontWeight: '400',
                          color: 'white'
                        }}>
                          {notifications.filter(n => !n.isRead).length} unread messages
                        </p>
                      </div>
                      <div style={{
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '20px',
                        padding: '0.5rem 1rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'white'
                      }}>
                        {notifications.length}
                      </div>
                    </div>

                    {/* Notifications List */}
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div className={styles.emptyNotifications}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem auto'
                          }}>
                            <Bell size={20} style={{ color: '#9ca3af' }} />
                          </div>
                          <h4 style={{ 
                            margin: '0 0 0.5rem 0', 
                            fontSize: '1rem', 
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            All caught up!
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.875rem', color: '#9ca3af' }}>
                            No new notifications at this time.
                          </p>
                        </div>
                      ) : (
                        notifications.slice(0, 6).map((notification, index) => {
                          let displayMessage = notification.message;

                          // Enhanced message formatting
                          if (notification.type === 'booking_created') {
                            const match = displayMessage.match(/Booking ID (\d+)/);
                            if (match) {
                              displayMessage = `New booking #${match[1]} has been created`;
                            }
                          } else if (notification.type === 'payment_received') {
                            const amountMatch = displayMessage.match(/₱([0-9,]+)/);
                            if (amountMatch) {
                              displayMessage = `Payment of ₱${amountMatch[1]} received`;
                            }
                          }

                          return (
                            <div
                              key={notification.id}
                              className={`${styles.notificationItem} ${!notification.isRead ? styles.unreadNotification : ''}`}
                              style={{ position: 'relative' }}
                              onClick={async () => {
                                if (!notification.isRead) {
                                  try {
                                    const response = await fetch(`/api/notifications/${notification.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ isRead: true })
                                    });
                                    if (response.ok) {
                                      setNotifications(prev => 
                                        prev.map(n => 
                                          n.id === notification.id ? { ...n, isRead: true } : n
                                        )
                                      );
                                    }
                                  } catch (error) {
                                    console.error('Failed to mark notification as read:', error);
                                  }
                                }
                              }}
                            >
                              {/* View Details for reschedule_request */}
                              {notification.type === 'reschedule_request' && (
                                <button
                                  style={{
                                    position: 'absolute',
                                    right: 12,
                                    top: 12,
                                    background: 'linear-gradient(135deg, #febe52 0%, #ebd591 100%)',
                                    color: '#6b4700',
                                    fontWeight: 700,
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '0.25rem 0.75rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px #ebd591',
                                    minWidth: 80,
                                    zIndex: 2
                                  }}
                                  onClick={e => {
                                    e.stopPropagation();
                                    window.location.href = '/super-admin/notifications';
                                  }}
                                >
                                  View Details
                                </button>
                              )}
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                {/* Notification Icon */}
                                <div style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '10px',
                                  background: notification.isRead 
                                    ? 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
                                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                  marginTop: '0.125rem'
                                }}>
                                  <Bell 
                                    size={16} 
                                    style={{ 
                                      color: notification.isRead ? '#9ca3af' : 'white' 
                                    }} 
                                  />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{
                                    margin: '0 0 0.25rem 0',
                                    fontSize: '0.875rem',
                                    fontWeight: notification.isRead ? '500' : '600',
                                    color: notification.isRead ? '#6b7280' : '#1f2937',
                                    lineHeight: '1.4'
                                  }}>
                                    {displayMessage}
                                  </p>
                                  
                                  <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                    <span style={{
                                      fontSize: '0.75rem',
                                      color: '#9ca3af',
                                      fontWeight: '400'
                                    }}>
                                      {(() => {
                                        const date = new Date(notification.createdAt);
                                        const now = new Date();
                                        const diffInSeconds = Math.floor((now - date) / 1000);
                                        
                                        if (diffInSeconds < 60) return 'Just now';
                                        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
                                        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
                                        return date.toLocaleDateString();
                                      })()}
                                    </span>
                                    
                                    {!notification.isRead && (
                                      <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: '#667eea',
                                        flexShrink: 0
                                      }} />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer Actions */}
                    {notifications.length > 0 && (
                      <div className={styles.notificationFooter}>
                        {notifications.filter(n => !n.isRead).length > 0 && (
                          <button
                            className={styles.markAllReadBtn}
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const unreadNotifications = notifications.filter(n => !n.isRead);
                                for (const notification of unreadNotifications) {
                                  await fetch(`/api/notifications/${notification.id}`, {
                                    method: 'PATCH',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ isRead: true })
                                  });
                                }
                                
                                setNotifications(prev => 
                                  prev.map(n => ({ ...n, isRead: true }))
                                );
                              } catch (error) {
                                console.error('Failed to mark all as read:', error);
                              }
                            }}
                          >
                            <Check size={12} />
                            Mark All Read
                          </button>
                        )}
                        
                        <button
                          className={styles.viewAllBtn}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.location.href = '/super-admin/notifications';
                          }}
                        >
                          View All
                          <ChevronRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Profile */}
              <div ref={profileRef} style={{ position: 'relative' }}>
                <div
                  onClick={() => setProfileOpen(!profileOpen)}
                  className={styles.profileButton}
                  aria-label="Profile menu"
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className={styles.profileImage}
                    />
                  ) : (
                    <User className={styles.profileIcon} size={24} />
                  )}
                </div>
                {profileOpen && (
                  <div className={styles.profilePanel}>
                    <div className={styles.profileHeader}>
                      Super Admin – {user?.name || 'Unknown'}
                    </div>
                    <div
                      className={`${styles.profileAction} ${styles.profileActionPrimary}`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Picture
                    </div>
                    <div
                      className={`${styles.profileAction} ${styles.profileActionDanger}`}
                      onClick={handleLogout}
                    >
                      {isLoading ? (
                        <span className={styles.loadingSpinner}></span>
                      ) : (
                        'Log Out'
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleImageUpload}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className={styles.content}>
            {children}
          </div>
        </div>
      </div>
      </>
    </ToastProvider>
  );
}