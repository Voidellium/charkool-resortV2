'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, LogOut } from 'lucide-react';

export default function AdminLayout({ children, activePage, role = 'admin' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  
  // Confirm modal state for logout
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  const showConfirmModal = useCallback((title, message, onConfirm) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/notifications?role=${role}`);
      const data = await res.json();
      const normalized = Array.isArray(data)
        ? data.map((n) => ({ ...n, isRead: typeof n.isRead === 'boolean' ? n.isRead : !!n.read }))
        : [];
      setNotifications(normalized.filter((n) => !n.isRead));
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
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleLogout = () => {
    showConfirmModal('Confirm Logout', 'Are you sure you want to log out?', () => {
      setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
      router.push('/login');
    });
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
      <aside style={{ width: '220px', background: '#1a1a1a', color: '#fff', padding: '20px', boxSizing: 'border-box' }}>
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
  <div className="admin-main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top navbar */}
  <header style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '10px 16px', background: '#fff', borderBottom: '1px solid #ddd', gap: '12px' }}>
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

        <main className="admin-content" style={{ flex: 1, padding: '12px 16px' }}>
          {children}
        </main>
      </div>

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #febe52 0%, #fcd34d 50%, #f6e27a 100%)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: '16px' }}>
              <LogOut size={48} color="#dc2626" />
            </div>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#5a3e00',
              fontSize: '20px',
              fontWeight: 'bold',
            }}>{confirmModal.title}</h3>
            <p style={{
              margin: '0 0 20px 0',
              color: '#6b4a00',
              fontSize: '14px',
              lineHeight: '1.5',
            }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })}
                style={{
                  backgroundColor: '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#6b7280'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#9ca3af'}
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Responsive tweaks for AdminLayout */
/* Use a style tag so this applies without adding external CSS files */
const adminStyles = `
  @media (max-width: 1024px) {
    .admin-main { margin-left: 0 !important; width: 100% !important; }
    aside { width: 200px !important; }
    .admin-content { padding: 10px !important; }
  }
  @media (max-width: 768px) {
    aside { transform: translateX(-100%); position: fixed; z-index: 999; }
    .admin-main { margin-left: 0 !important; width: 100% !important; }
    .admin-content { padding: 6px 8px !important; }
  }
`;

// Append the styles to the document (client-side only)
if (typeof window !== 'undefined') {
  const s = document.createElement('style');
  s.innerHTML = adminStyles;
  document.head.appendChild(s);
}
