'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Home, Layers, ListTree, Clock, Menu, X, ChevronLeft, ChevronRight, User as UserIcon } from 'lucide-react';
import styles from './AmenityManagerLayout.module.css';

export default function AmenityManagerLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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
                <div className={`${styles.profileAction} ${styles.profileActionDanger}`} onClick={() => { if (confirm('Are you sure you want to log out?')) signOut(); }}>Log out</div>
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} />
              </div>
            )}
          </div>
        </div>

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}