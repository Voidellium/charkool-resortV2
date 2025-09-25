import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function SuperAdminLayout({ children, activePage, reportMenu, user }) {
  const [reportsOpen, setReportsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [notifications, setNotifications] = useState([]);
  const fileInputRef = useRef(null);
  const profileRef = useRef(null);
  const notifRef = useRef(null);
  const router = useRouter();

  // Sidebar state
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [animateSidebar, setAnimateSidebar] = useState(false);

  const toggleSidebar = () => {
    if (sidebarVisible) {
      setAnimateSidebar(true);
      setTimeout(() => {
        setSidebarVisible(false);
        setAnimateSidebar(false);
      }, 300);
    } else {
      setSidebarVisible(true);
      setTimeout(() => {
        setAnimateSidebar(false);
      }, 10);
    }
  };

  useEffect(() => {
    if (activePage === "reports") setReportsOpen(true);
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
    { key: 'amenities', label: 'Amenities', path: '/super-admin/amenities' },
    { key: 'audit-trails', label: 'Audit Trails', path: '/super-admin/audit-trails' },
    { key: 'chatbot', label: 'Chatbot Management', path: '/super-admin/chatbot' },
    { key: 'bookings', label: 'Bookings', path: '/super-admin/bookings' },
    { key: 'config', label: 'Configurations', path: '/super-admin/config' },
    { key: 'dashboard', label: 'Dashboard', path: '/super-admin/dashboard' },
    { key: 'payments', label: 'Payments', path: '/super-admin/payments' },
    { key: 'reports', label: 'Reports', path: '/super-admin/reports', dropdown: reportMenu || [] },
    { key: 'rooms', label: 'Rooms', path: '/super-admin/rooms' },
    { key: 'users', label: 'Users', path: '/super-admin/users' },
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
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Poppins&display=swap" rel="stylesheet" />
        {/* Header font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display&display=swap"
          rel="stylesheet"
        />
        {/* Body font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* Container with global font */}
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          fontFamily: `'Poppins', sans-serif`, // Set the default font for all children
          backgroundColor: '#f9f9f9',
        }}
      >
        {/* Toggle Sidebar Button */}
        <button
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            zIndex: 1100,
            padding: '8px 12px',
            backgroundColor: '#0070f3',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
        </button>

        {/* Sidebar */}
        {(sidebarVisible || animateSidebar) && (
          <aside
            style={{
              width: '240px',
              background: '#FEBE52',
              color: '#fff',
              padding: '30px 20px',
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
              transition: 'transform 1.0s ease',
              transform: sidebarVisible ? 'translateX(0)' : 'translateX(-100%)',
            }}
          >
            {/* Header */}
            <h2
              style={{
                marginBottom: '2.5rem',
                fontSize: '1.5',
                fontWeight: '700',
                textAlign: 'center',
                fontFamily: `'Poppins'`,
              }}
            >
              Super Admin Panel
            </h2>
            {/* Navigation */}
            <nav style={{ flex: 1 }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {menu.map((item) => (
                  <li key={item.key} style={{ marginBottom: '15px' }}>
                    {item.dropdown ? (
                      <>
                        <Link
                          href={item.path}
                          style={{
                            display: 'block',
                            padding: '12px 16px',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            backgroundColor: activePage === item.key ? '#00000049' : 'transparent',
                            color: activePage === item.key ? '#0070f3' : '#555',
                            fontWeight: activePage === item.key ? 'bold' : '400',
                            fontFamily: `'Poppins'`,
                            fontSize: '1.2rem',
                            transition: 'background-color 0.2s, color 0.2s',
                          }}
                          onClick={(e) => {
                            if (activePage === 'reports') {
                              e.preventDefault();
                              setReportsOpen(!reportsOpen);
                            }
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#0060d0';
                            e.currentTarget.style.color = '#fff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              activePage === 'reports' ? '#0070f3' : 'transparent';
                            e.currentTarget.style.color =
                              activePage === 'reports' ? '#fff' : '#333';
                          }}
                        >
                          {item.label}
                        </Link>
                        {reportsOpen && (
                          <ul
                            style={{
                              listStyle: 'none',
                              paddingLeft: '20px',
                              marginTop: '8px',
                              borderRadius: '8px',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                              transition: 'max-height 0.3s ease',
                              overflow: 'hidden',
                            }}
                          >
                            {item.dropdown.map((sub) => (
                              <li key={sub.label} style={{ marginBottom: '8px' }}>
                                <div
                                  onClick={sub.onClick}
                                  style={{
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    background: '#FEBE52',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#0060d0')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  {sub.label}
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
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
                          fontSize: '1.2rem',
                          transition: 'background-color 0.2s, color 0.2s',
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
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <div
          style={{
            marginLeft: sidebarVisible ? '240px' : '0',
            width: sidebarVisible ? 'calc(100% - 240px)' : '100%',
            minHeight: '100vh',
            transition: 'margin-left 0.3s ease, width 0.3s ease',
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
                    notifications.map((n, i) => (
                      <div key={i} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                        {n.message}
                      </div>
                    ))
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
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
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
                      background: '#f0f0f0',
                      cursor: 'pointer',
                      marginBottom: '8px',
                      transition: 'background 0.2s',
                      fontFamily: `'Poppins', sans-serif`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0e0e0')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0f0f0')}
                    onClick={handleSwitchAccount}
                  >
                    Switch Account
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
          <div style={{ padding: '20px', marginTop: '80px' }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}