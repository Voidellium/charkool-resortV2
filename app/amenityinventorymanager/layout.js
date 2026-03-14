'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Home, Layers, ListTree, Clock, Menu, X, ChevronLeft, ChevronRight, User as UserIcon, LogOut } from 'lucide-react';
import styles from './AmenityManagerLayout.module.css';

export default function AmenityManagerLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  // Confirm modal state for logout
  const [confirmModal, setConfirmModal] = useState({ show: false });

  const showLogoutConfirm = useCallback(() => {
    setConfirmModal({ show: true });
  }, []);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    try {
      const stored = localStorage.getItem('amenity_sidebar_collapsed');
      if (stored !== null) setSidebarCollapsed(JSON.parse(stored));
    } catch {}
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((s) => {
      const next = !s;
      try { localStorage.setItem('amenity_sidebar_collapsed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const navItems = [
    { name: 'Dashboard', href: '/amenityinventorymanager', icon: <Home size={18} /> },
    { name: 'Amenities', href: '/amenityinventorymanager/amenities', icon: <Layers size={18} /> },
    { name: 'Categorization', href: '/amenityinventorymanager/categorization', icon: <ListTree size={18} /> },
    { name: 'Usage Logs', href: '/amenityinventorymanager/logs', icon: <Clock size={18} /> },
  ];

  return (
    <div className={styles.container}>
      {/* Toggle Button */}
      <button
        className={styles.toggleButton}
        onClick={isMobile ? () => setSidebarVisible(!sidebarVisible) : toggleSidebar}
        aria-label={isMobile ? 'Toggle Menu' : (sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar')}
        style={{ left: isMobile ? 'auto' : (sidebarCollapsed ? '104px' : '304px'), right: isMobile ? 20 : 'auto' }}
      >
        {isMobile ? (sidebarVisible ? <X size={20} color="#fff" /> : <Menu size={20} color="#fff" />) : (sidebarCollapsed ? <ChevronRight size={18} color="#fff" /> : <ChevronLeft size={18} color="#fff" />)}
      </button>

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded} ${isMobile && sidebarVisible ? styles.sidebarVisible : ''}`}
        style={{ transform: isMobile && !sidebarVisible ? 'translateX(-100%)' : 'translateX(0)' }}
      >
        {!sidebarCollapsed && <h2 className={styles.brand}>Amenity Manager</h2>}
        <nav>
          <ul className={styles.navList}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href} className={styles.navItem}>
                  {sidebarCollapsed ? (
                    <div className={styles.navIconOnly} role="button" tabIndex={0} title={item.name} onClick={() => router.push(item.href)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(item.href); }}>
                      {item.icon}
                    </div>
                  ) : (
                    <Link href={item.href} className={`${styles.navLink} ${isActive ? styles.navActive : ''}`} onClick={(e) => { e.preventDefault(); router.push(item.href); }}>
                      <span>{item.icon}</span>
                      {item.name}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      {/* Main */}
      <div className={`${styles.main} ${sidebarCollapsed ? styles.mainCollapsed : styles.mainExpanded}`} style={{ marginLeft: isMobile ? 0 : undefined, width: isMobile ? '100%' : undefined }}>
        {/* Top bar with profile button */}
        <div className={styles.topBar}>
          <div style={{ position: 'relative' }}>
            <div className={styles.profileButton} onClick={() => setProfileOpen(!profileOpen)} aria-label="Profile menu">
              <UserIcon size={24} color="#fff" />
            </div>
            {profileOpen && (
              <div className={styles.profilePanel}>
                <div className={styles.profileHeader}>Amenity Manager</div>
                <div className={`${styles.profileAction} ${styles.profileActionPrimary}`} onClick={() => fileInputRef.current?.click()}>Change Picture</div>
                <div className={`${styles.profileAction} ${styles.profileActionDanger}`} onClick={showLogoutConfirm}>Log out</div>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} />
              </div>
            )}
          </div>
        </div>

        <div className={styles.content}>{children}</div>
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
            }}>Confirm Logout</h3>
            <p style={{
              margin: '0 0 20px 0',
              color: '#6b4a00',
              fontSize: '14px',
              lineHeight: '1.5',
            }}>Are you sure you want to log out?</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmModal({ show: false })}
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
                onClick={() => {
                  setConfirmModal({ show: false });
                  signOut();
                }}
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