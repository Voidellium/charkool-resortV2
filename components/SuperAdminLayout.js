'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { signOut } from 'next-auth/react'; // Import signOut

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

  useEffect(() => { if (activePage === "reports") setReportsOpen(true); }, [activePage]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const role = 'superadmin';
    const fetchNotifications = async () => {
      try {
        // Use relative path for local API calls
        const res = await fetch(`/api/notifications?role=${role}`);
        if (!res.ok) throw new Error('Failed to fetch notifications');
        const data = await res.json();
        setNotifications(data.filter(n => !n.read));
      } catch (error) {
        console.error('Fetch Notifications Error:', error);
      }
    };
    fetchNotifications();
  }, []);

  const menu = [
    { key: 'amenities', label: 'Amenities', path: '/super-admin/amenities' },
    { key: 'audit-trails', label: 'Audit Trails', path: '/super-admin/audit-trails' },
    { key: 'bookings', label: 'Bookings', path: '/super-admin/bookings' },
    { key: 'config', label: 'Configurations', path: '/super-admin/config' },
    { key: 'dashboard', label: 'Dashboard', path: '/super-admin/dashboard' },
    { key: 'payments', label: 'Payments', path: '/super-admin/payments' },
    { key: 'reports', label: 'Reports', path: '/super-admin/reports', dropdown: reportMenu || [] },
    { key: 'rooms', label: 'Rooms', path: '/super-admin/rooms' },
    { key: 'users', label: 'Users', path: '/super-admin/users' },
  ];

  // CORRECTED: Use signOut() from next-auth/react
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
    <div style={{ display: 'flex', minHeight: '100vh', gap: '20px' }}>
      {/* Sidebar */}
      <aside style={{ width: '220px', background: '#111', color: '#fff', padding: '20px', position: 'sticky', top: '20px', alignSelf: 'flex-start', height: 'fit-content' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Super Admin Panel</h2>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {menu.map((item) => (
              <li key={item.key} style={{ marginBottom: '12px' }}>
                {item.dropdown ? (
                  <>
                    <Link href={item.path} onClick={(e) => {
                      if (activePage === "reports") {
                        e.preventDefault();
                        setReportsOpen(!reportsOpen);
                      }
                    }} style={{
                      display: 'block',
                      padding: '10px 15px',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      background: activePage === item.key ? '#0070f3' : 'transparent',
                      color: activePage === item.key ? '#fff' : '#ddd',
                      fontWeight: activePage === item.key ? 'bold' : 'normal',
                      cursor: 'pointer'
                    }}>
                      {item.label}
                    </Link>
                    {reportsOpen && (
                      <ul style={{ listStyle: 'none', paddingLeft: '15px', marginTop: '5px' }}>
                        {item.dropdown.map((sub) => (
                          <li key={sub.label} style={{ marginBottom: '5px' }}>
                            <div onClick={sub.onClick} style={{ padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', background: '#222', color: '#ddd' }}>
                              {sub.label}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link href={item.path} style={{
                    display: 'block',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    background: activePage === item.key ? '#0070f3' : 'transparent',
                    color: activePage === item.key ? '#fff' : '#ddd',
                    fontWeight: activePage === item.key ? 'bold' : 'normal'
                  }}>
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main Content + Profile + Notifications */}
      <main style={{ flex: 1, padding: '20px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
          {/* Notifications Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button onClick={() => setNotifOpen(!notifOpen)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative' }}>
              <Bell size={22} color="#333" />
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: '#fff', borderRadius: '50%', fontSize: '10px', padding: '2px 6px' }}>
                  {notifications.length}
                </span>
              )}
            </button>
            {notifOpen && (
              <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '280px', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 50, maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length > 0 ? notifications.map((n, i) => (
                  <div key={i} style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '0.9rem' }}>{n.message}</div>
                )) : (
                  <div style={{ padding: '10px', textAlign: 'center' }}>No new notifications</div>
                )}
              </div>
            )}
          </div>

          {/* Profile Circle */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <div onClick={() => setProfileOpen(!profileOpen)} style={{ width: '45px', height: '45px', borderRadius: '50%', background: '#0070f3', cursor: 'pointer', overflow: 'hidden' }}>
              {profileImage ? (
                <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ display: 'block', textAlign: 'center', lineHeight: '45px', color: '#fff' }}>👤</span>
              )}
            </div>
            {profileOpen && (
              <div style={{ position: 'absolute', right: 0, marginTop: '10px', background: '#fff', color: '#000', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', width: '220px', padding: '10px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Super Admin – {user?.name || 'Unknown'}</p>
                <div style={{ padding: '8px', cursor: 'pointer', borderRadius: '5px' }} onClick={() => fileInputRef.current.click()}>Change Picture</div>
                <div style={{ padding: '8px', cursor: 'pointer', borderRadius: '5px' }} onClick={handleSwitchAccount}>Switch Account</div>
                <div style={{ padding: '8px', cursor: 'pointer', borderRadius: '5px', color: 'red' }} onClick={handleLogout}>Log Out</div>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImageUpload} />
              </div>
            )}
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}