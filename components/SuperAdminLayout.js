import Head from 'next/head';
import React from 'react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Home, Settings, Users, Book, FileText, Layers, MessageCircle, CreditCard, DoorOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { signOut } from 'next-auth/react';

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
  const [animateSidebar, setAnimateSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [togglePressed, setTogglePressed] = useState(false);
  // transform used for the floating toggle button; includes a small press animation
  const baseToggleTransform = 'translateY(-50%) translateX(-50%)';
  const toggleTransform = togglePressed ? `${baseToggleTransform} scale(0.96) rotate(8deg)` : baseToggleTransform;

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

  // initialise collapsed state from localStorage (client-side only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('superadmin_sidebar_collapsed');
      if (stored !== null) setSidebarCollapsed(JSON.parse(stored));
    } catch (e) {
      // ignore
    }
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
        setNotifications(data.filter(n => !n.read));
      } catch (err) {
        console.error(err);
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
      await signOut({ callbackUrl: '/login' });
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

      {/* Container with global font and flex layout */}
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          fontFamily: `'Poppins', sans-serif`,
          backgroundColor: '#f9f9f9',
        }}
      >
  {/* Fixed toggle button (placed outside sidebar to avoid blocking icons) */}
  {/* compute left position so it doesn't overlap the sidebar */}
  {/* small heuristic: when collapsed we sit near the collapsed width; when expanded we sit just right of the sidebar */}
  {/* Note: keep simple values to avoid SSR issues with window.* */}
        

        <button
          className="sa-toggle"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-expanded={!sidebarCollapsed}
          onMouseDown={() => setTogglePressed(true)}
          onMouseUp={() => setTogglePressed(false)}
          onMouseLeave={() => setTogglePressed(false)}
          style={{
            position: 'fixed',
            top: '50%',
            transform: `translateY(-50%) ${togglePressed ? 'scale(0.96) rotate(8deg)' : ''}`,
            /* place the button just outside the sidebar edge; when collapsed the sidebar is 72px, when expanded 240px */
            left: sidebarCollapsed ? '72px' : '280px',
            marginLeft: '24px', /* place the button fully outside the edge with small gap */
            zIndex: 1100,
            padding: 0,
            backgroundColor: 'rgba(0,0,0,0.64)',
            borderRadius: '12px',
            boxShadow: '0 6px 18px rgba(0,0,0,0.14)',
            border: '1px solid rgba(255,255,255,0.06)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            boxSizing: 'border-box',
            transition: 'transform 220ms cubic-bezier(0.2,0,0,1), left 220ms, box-shadow 260ms, background 260ms',
          }}
        >
          <div style={{ transform: 'translateX(1px)' }}>{sidebarCollapsed ? <ChevronRight size={18} color="#fff" /> : <ChevronLeft size={18} color="#fff" />}</div>
        </button>

        {/* Sidebar */}
        <aside
          style={{
            width: sidebarCollapsed ? '80px' : '240px',
            background: '#FEBE52',
            color: '#fff',
            padding: sidebarCollapsed ? '1rem 0.5rem' : '2rem',
            height: '100vh',
            position: 'fixed',
            top: 0,
            left: 0,
            overflowY: 'auto',
            boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'start',
            transition: 'width 600ms cubic-bezier(0.22,1,0.36,1), padding 600ms',
            alignItems: sidebarCollapsed ? 'center' : 'flex-start',
          }}
        >
          {/* ...existing code... */}
          {/* Header */}
          {!sidebarCollapsed && (
            <h2
              style={{
                marginTop: '8px',
                marginBottom: '2.5rem',
                fontSize: '1.7rem',
                color: '#000000ff',
                fontWeight: '700',
                textAlign: 'center',
                fontFamily: `'Poppins'`,
              }}
            >
              Super Admin Panel
            </h2>
          )}
          {/* Navigation */}
          <nav style={{ flex: 1, width: '100%' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, width: '100%' }}>
              {menu.map((item) => (
                <li key={item.key} style={{ marginBottom: sidebarCollapsed ? '18px' : '15px', width: '100%', display: 'flex', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
                  {sidebarCollapsed ? (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={item.label}
                      title={item.label}
                      onClick={() => router.push(item.path)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(item.path); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        background: activePage === item.key ? 'rgba(0,0,0,0.12)' : 'transparent',
                        cursor: 'pointer',
                        transition: 'background 200ms ease, transform 200ms ease, color 200ms ease',
                        color: '#333',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.backgroundColor = '#0060d0';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.color = '#fff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.backgroundColor = activePage === item.key ? 'rgba(0,0,0,0.12)' : 'transparent';
                        const svg = e.currentTarget.querySelector('svg');
                        if (svg) svg.style.color = '#333';
                      }}
                    >
                      {React.cloneElement(item.icon, { color: activePage === item.key ? '#fff' : '#333', size: 18 })}
                    </div>
                  ) : (
                    item.dropdown ? (
                      <>
                        <div style={{ position: 'relative', width: '100%' }}>
                          <Link
                            href={item.path}
                            style={{
                              display: 'block',
                              padding: '12px 16px',
                              borderRadius: '8px',
                              textDecoration: 'none',
                              backgroundColor: activePage === item.key ? '#00000049' : 'transparent',
                              color: activePage === item.key ? '#fff' : '#555',
                              fontWeight: activePage === item.key ? 'bold' : '400',
                              fontFamily: `'Poppins'`,
                              fontSize: '1rem',
                              transition: 'background-color 0.2s, color 0.2s',
                            }}
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
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#0060d0';
                              e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor =
                                activePage === item.key ? '#00000049' : 'transparent';
                              e.currentTarget.style.color =
                                activePage === item.key ? '#fff' : '#333';
                            }}
                          >
                            {item.label}
                          </Link>

                          {/* Floating panel anchored to the parent link */}
                          {item.key === 'reports' && reportsOpen && (
                            <ul
                              style={{
                                listStyle: 'none',
                                margin: '8px 0 0 0',
                                padding: '8px',
                                borderRadius: '8px',
                                boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                                background: '#ffffff52',
                                transition: 'opacity 160ms ease, transform 160ms ease',
                                zIndex: 1200,
                                width: '100%',
                                boxSizing: 'border-box',
                              }}
                            >
                              {item.dropdown.map((sub) => (
                                <li key={sub.label} style={{ marginBottom: '8px' }}>
                                  <div
                                    onClick={sub.onClick}
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      boxSizing: 'border-box',
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      background: 'transparent',
                                      color: '#333',
                                      cursor: 'pointer',
                                      transition: 'background 0.16s, color 0.16s',
                                      whiteSpace: 'normal',
                                      wordBreak: 'break-word',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#0060d0';
                                      e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = '#333';
                                    }}
                                  >
                                    {sub.label}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}

                          {item.key === 'config' && configOpen && (
                            <ul
                              style={{
                                listStyle: 'none',
                                margin: '8px 0 0 0',
                                padding: '8px',
                                borderRadius: '8px',
                                boxShadow: '0 6px 18px rgba(0,0,0,0.08)',
                                background: '#ffffff52',
                                transition: 'opacity 160ms ease, transform 160ms ease',
                                zIndex: 1200,
                                width: '100%',
                                boxSizing: 'border-box',
                              }}
                            >
                              {item.dropdown.map((sub) => (
                                <li key={sub.label} style={{ marginBottom: '8px' }}>
                                  <div
                                    onClick={sub.onClick}
                                    style={{
                                      display: 'block',
                                      width: '100%',
                                      boxSizing: 'border-box',
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      background: 'transparent',
                                      color: '#333',
                                      cursor: 'pointer',
                                      transition: 'background 0.16s, color 0.16s',
                                      whiteSpace: 'normal',
                                      wordBreak: 'break-word',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = '#0060d0';
                                      e.currentTarget.style.color = '#fff';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = '#333';
                                    }}
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
                        style={{
                          display: 'block',
                          padding: '12px 16px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          background: activePage === item.key ? '#00000049' : 'transparent',
                          color: activePage === item.key ? '#fff' : '#333',
                          fontWeight: activePage === item.key ? 'bold' : '400',
                          fontFamily: `Poppins`,
                          fontSize: '1rem',
                          transition: 'background-color 0.2s, color 0.2s',
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          router.push(item.path);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0060d0';
                          e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            activePage === item.key ? '#00000049' : 'transparent';
                          e.currentTarget.style.color = activePage === item.key ? '#fff' : '#333';
                        }}
                      >
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
        <div className="sa-main"
            style={{
              marginLeft: sidebarCollapsed ? (typeof window !== 'undefined' && window.innerWidth <= 1024 ? (window.innerWidth <= 768 ? '0' : '56px') : '72px') : (typeof window !== 'undefined' && window.innerWidth <= 1024 ? (window.innerWidth <= 768 ? '0' : '200px') : '220px'),
            width: sidebarCollapsed ? (typeof window !== 'undefined' && window.innerWidth <= 1024 ? '100%' : 'calc(100% - 72px)') : (typeof window !== 'undefined' && window.innerWidth <= 1024 ? '100%' : 'calc(100% - 220px)'),
            minHeight: '100vh',
            transition: 'margin-left 450ms cubic-bezier(0.2,0.8,0.2,1), width 450ms cubic-bezier(0.2,0.8,0.2,1)',
            padding: typeof window !== 'undefined' && window.innerWidth <= 768 ? '8px' : '20px',
            boxSizing: 'border-box',
            /* allow full width usage instead of centering inside a fixed maxWidth */
            maxWidth: 'none',
            marginRight: 0,
            marginTop: '0',
          }}
        >
          {/* Top right icons: notifications & profile */}
          <div
            style={{
              position: 'fixed',
              top: '20px',
              right: '30px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              zIndex: 900,
            }}
          >
            {/* Notifications Bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                <Bell size={22} color="#333" />
                {notifications.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: 'red',
                      color: 'white',
                      borderRadius: '50%',
                      width: '16px',
                      height: '16px',
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                    }}
                  >
                    {notifications.length}
                  </div>
                )}
              </button>
              {notifOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '30px',
                    right: 0,
                    width: '300px',
                    maxHeight: '350px',
                    overflowY: 'auto',
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 999,
                  }}
                >
                  {notifications.length > 0 ? (
                    notifications.map((n, i) => {
                      let displayMessage = n.message;

                      // Format messages based on type
                      if (n.type === 'booking_created') {
                        // Extract date from message if possible
                        const dateMatch = n.message.match(/from (.+) to (.+)$/);
                        if (dateMatch) {
                          displayMessage = `New booking created: ${dateMatch[1]}`;
                        }
                      } else if (n.type === 'payment_made') {
                        // Example message: "First Last name + role (CUSTOMER) has paid this booking"
                        displayMessage = n.message; // Assuming backend sends formatted message
                      } else if (n.type === 'booking_checked_out') {
                        // Example: "The check-in for (date range) has successfully checked-out"
                        displayMessage = n.message;
                      }

                      return (
                        <div key={i} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                          {displayMessage}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '10px', textAlign: 'center' }}>No new notifications</div>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setProfileOpen(!profileOpen)}
                style={{
                  width: '45px',
                  height: '45px',
                  borderRadius: '50%',
                  background: '#0070f3',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span style={{ fontSize: '1.4rem', color: '#fff' }}>👤</span>
                )}
              </div>
              {profileOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '55px',
                    right: 0,
                    width: '240px',
                    background: '#fff',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 1000,
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', fontFamily: `Poppins` }}>
                    Super Admin – {user?.name || 'Unknown'}
                  </div>
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      background: '#f0f0f0',
                      cursor: 'pointer',
                      marginBottom: '8px',
                      transition: 'background 0.2s',
                      fontFamily: `'Poppins', sans-serif`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                    onClick={() => fileInputRef.current.click()}
                  >
                    Change Picture
                  </div>
                  <div
                    style={{
                      padding: '8px',
                      borderRadius: '6px',
                      background: '#ffe0e0',
                      color: 'red',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      fontFamily: `'Poppins'`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8d0d0')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffe0e0')}
                    onClick={handleLogout}
                  >
                    Log Out
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

          {/* Main Content */}
          <div className="sa-content" style={{ marginTop: '80px', padding: '12px 12px 20px 12px', width: '100%', maxWidth: 'none', marginLeft: 0, marginRight: 0 }}>
            {children}
          </div>
        </div>
      </div>

      {/* Responsive CSS */}
      <style jsx>{`
        @media (max-width: 1024px) {
          /* Collapse sidebar into a menu button */
          aside {
            width: 200px;
            padding: 1.5rem;
          }
          /* Main content adjusts to full width and reduces padding */
          .sa-main {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 8px !important;
          }
          .sa-content { padding: 8px !important; }
        }

        @media (max-width: 768px) {
          /* Hide sidebar by default on small screens, toggle with button */
          aside {
            position: fixed;
            top: 0;
            left: 0;
            height: 100%;
            z-index: 999;
            transition: transform 0.3s ease;
            transform: translateX(-100%);
          }
          aside[style*='transform: translateX(0)'] {
            transform: translateX(0);
          }
          /* Main content takes full width with minimal padding */
          .sa-main { margin-left: 0 !important; width: 100% !important; padding: 6px !important; }
          .sa-content { padding: 6px 6px 14px 6px !important; }
          /* toggle is fixed outside the sidebar; move it to bottom-right on small screens */
          .sa-toggle {
            left: auto !important;
            right: 18px !important;
            top: auto !important;
            bottom: 18px !important;
            transform: none !important;
          }
          .sa-toggle:focus {
            outline: none;
            box-shadow: 0 0 0 4px rgba(0,96,208,0.18), 0 6px 18px rgba(0,0,0,0.18) !important;
          }
          .sa-toggle:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 10px 24px rgba(0,0,0,0.18) !important;
          }
        }
      `}</style>
    </>
  );
}