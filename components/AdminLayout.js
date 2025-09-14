'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';

export default function AdminLayout({ children, activePage, role = 'admin' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?role=${role}`);
      const data = await res.json();
      setNotifications(data.filter(n => !n.read));
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' });
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      router.push('/login');
    }
  };

  const menu = [
    { key: 'dashboard', label: 'Dashboard', path: '/admin/dashboard' },
    { key: 'bookings', label: 'Bookings', path: '/admin/bookings' },
    { key: 'amenities', label: 'Amenities', path: '/admin/amenities' },
    { key: 'notifications', label: 'Notifications', path: '/admin/notifications' },
    { key: 'chatbot', label: 'Chatbot', path: '/admin/chatbot' },
    { key: 'payments', label: 'Payments', path: '/admin/payments' },
    { key: 'guests', label: 'Guest Management', path: '/admin/guests' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: '220px', background: '#1a1a1a', color: '#fff', padding: '20px' }}>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.2rem' }}>Admin Panel</h2>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {menu.map(item => (
              <li key={item.key} style={{ marginBottom: '12px' }}>
                <Link
                  href={item.path}
                  style={{
                    display: 'block',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    background: activePage === item.key ? '#0070f3' : 'transparent',
                    color: activePage === item.key ? '#fff' : '#ddd',
                    fontWeight: activePage === item.key ? 'bold' : 'normal',
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top navbar */}
        <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '10px 20px', background: '#fff', borderBottom: '1px solid #ddd', gap: '15px' }}>
          {/* Notification Bell */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button onClick={() => setNotifOpen(!notifOpen)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative' }}>
              <Bell size={22} strokeWidth={2} color="#333" />
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'red', color: '#fff', borderRadius: '50%', fontSize: '10px', padding: '2px 6px' }}>
                  {notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '250px', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 50, maxHeight: '300px', overflowY: 'auto' }}>
                {notifications.length > 0 ? (
                  notifications.map(n => (
                    <div key={n.id} style={{ padding: '10px', borderBottom: '1px solid #eee', fontSize: '0.9rem', cursor: 'pointer' }} onClick={() => markAsRead(n.id)}>
                      {n.message}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '10px', textAlign: 'center' }}>No new notifications</div>
                )}
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)} style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #ccc', cursor: 'pointer', background: '#f0f0f0', padding: 0 }}>
              <img src="/default-avatar.png" alt="User Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>

            {open && (
              <div style={{ position: 'absolute', right: 0, marginTop: '8px', width: '180px', background: '#fff', border: '1px solid #ddd', borderRadius: '6px', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 50 }}>
                <button style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={() => alert('Change Picture clicked')}>
                  Change Picture
                </button>
                <button style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'left', color: 'red', background: 'transparent', border: 'none', cursor: 'pointer' }} onClick={handleLogout}>
                  Log Out
                </button>
              </div>
            )}
          </div>
        </header>

        <main style={{ flex: 1, padding: '20px' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
