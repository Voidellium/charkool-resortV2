'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Lock,
  LogOut,
  Menu,
  User,
  X,
} from 'lucide-react';
import ChangePasswordModal from './ChangePasswordModal';
import { FrontDeskNavProvider, useFrontDeskNav } from '@/components/staff/FrontDeskNavContext';
import { useFrontDeskNotifications } from '@/hooks/useFrontDeskNotifications';
import { useToast } from '@/components/Toast';
import styles from './CashierStaffLayout.module.css';

const MENU = [
  { key: 'payments', label: 'Payments', path: '/cashier', icon: CreditCard },
  { key: 'bookings', label: 'Bookings', path: '/cashier/reception', icon: BookOpen },
];

// Inner component that can consume FrontDeskNavContext
function CashierLayoutInner({ children, activePage }) {
  const pathname = usePathname();
  const resolvedActive =
    activePage ||
    (pathname?.startsWith('/cashier/reception') ? 'bookings' : 'payments');

  const { data: session } = useSession();
  const user = session?.user;
  const firstName = user?.name?.split(' ')[0] || 'Staff';

  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [togglePressed, setTogglePressed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // FrontDeskNav context for operational badges / shift summary
  const {
    operationalBadgeCount,
    onOperationalNotificationsClick,
    showShiftSummary,
    onShiftSummary,
    setNavExtras,
  } = useFrontDeskNav();

  // Toast
  const { info: toastInfo, success: toastSuccess, warning: toastWarning } = useToast();

  // Live pusher notifications
  const { notifications: pusherNotifications } = useFrontDeskNotifications((notification) => {
    const notifType = String(notification?.type || '').toLowerCase();
    const msg = notification?.message || 'New notification';
    if (notifType.includes('cancel') || notifType.includes('denied') || notifType.includes('failed')) {
      toastWarning(msg, { title: 'Notification' });
    } else if (
      notifType.includes('approved') ||
      notifType.includes('verified') ||
      notifType.includes('created') ||
      notifType.includes('check')
    ) {
      toastSuccess(msg, { title: 'Notification' });
    } else {
      toastInfo(msg, { title: 'Notification' });
    }
  });

  const pusherBadge = pusherNotifications.length;
  const totalBadge = operationalBadgeCount + pusherBadge;

  const showConfirmModal = useCallback((title, message, onConfirm) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((s) => {
      const next = !s;
      try {
        localStorage.setItem('cashier_sidebar_collapsed', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    try {
      const stored = localStorage.getItem('cashier_sidebar_collapsed');
      if (stored !== null) setSidebarCollapsed(JSON.parse(stored));
    } catch {
      // ignore
    }
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    showConfirmModal('Confirm Logout', 'Are you sure you want to log out?', async () => {
      setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
      setIsLoading(true);
      try {
        await signOut({ callbackUrl: '/login' });
      } catch (error) {
        console.error('Logout error:', error);
        setIsLoading(false);
      }
    });
  };

  const handleNotifClick = () => {
    if (onOperationalNotificationsClick) {
      onOperationalNotificationsClick();
    } else {
      setShowNotifPanel((v) => !v);
    }
  };

  return (
    <div className={styles.container}>
      {isMobile && sidebarVisible && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarVisible(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1100,
          }}
          aria-hidden
        />
      )}

      <button
        type="button"
        className={`${styles.toggleButton} ${togglePressed ? styles.toggleButtonPressed : ''}`}
        onClick={isMobile ? () => setSidebarVisible(!sidebarVisible) : toggleSidebar}
        aria-label={isMobile ? 'Toggle menu' : sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onMouseDown={() => setTogglePressed(true)}
        onMouseUp={() => setTogglePressed(false)}
        onMouseLeave={() => setTogglePressed(false)}
        style={{
          left: !mounted ? '285px' : isMobile ? 'auto' : sidebarCollapsed ? '89px' : '285px',
          right: mounted && isMobile ? '20px' : 'auto',
          bottom: mounted && isMobile ? '20px' : 'auto',
        }}
      >
        {isMobile ? (
          sidebarVisible ? <X size={20} color="#fff" /> : <Menu size={20} color="#fff" />
        ) : sidebarCollapsed ? (
          <ChevronRight size={18} color="#fff" />
        ) : (
          <ChevronLeft size={18} color="#fff" />
        )}
      </button>

      <aside
        className={`${styles.sidebar} ${
          sidebarCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
        }`}
        style={{
          transform: isMobile && !sidebarVisible ? 'translateX(-100%)' : 'translateX(0)',
        }}
      >
        {!sidebarCollapsed && (
          <h2 className={styles.sidebarHeader}>Cashier {firstName}</h2>
        )}
        <nav className={styles.navigation}>
          <ul className={styles.navigationList}>
            {MENU.map((item) => {
              const Icon = item.icon;
              const isActive = resolvedActive === item.key;
              return (
                <li
                  key={item.key}
                  className={`${styles.navigationItem} ${
                    sidebarCollapsed
                      ? styles.navigationItemCollapsed
                      : styles.navigationItemExpanded
                  }`}
                >
                  <Link
                    href={item.path}
                    className={`${
                      sidebarCollapsed ? styles.menuItemCollapsed : styles.menuItemExpanded
                    } ${isActive ? (sidebarCollapsed ? styles.menuItemCollapsedActive : styles.menuItemExpandedActive) : ''}`}
                    title={item.label}
                    onClick={() => isMobile && setSidebarVisible(false)}
                  >
                    {sidebarCollapsed ? (
                      <Icon size={20} color={isActive ? '#fff' : '#e5e7eb'} />
                    ) : (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon size={18} />
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>

      <div
        className={`${styles.mainContent} ${
          sidebarCollapsed ? styles.mainContentCollapsed : styles.mainContentExpanded
        }`}
      >
        {/* ── Single unified top bar ── */}
        <div
          className={styles.topBar}
          style={{
            left: mounted && !isMobile ? (sidebarCollapsed ? 84 : 280) : 0,
          }}
        >
          {/* Brand — left side */}
          <div className={styles.topBarBrand}>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span className={styles.brandName}>Charkool</span>
              <span className={styles.brandSub}>Beach Resort</span>
            </div>
          </div>

          {/* Right controls */}
          <div className={styles.topBarControls}>
            {/* User info display */}
            <div className={styles.topBarUserInfo}>
              <div className={styles.topBarAvatar}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div className={styles.topBarUserName}>
                  {user?.name || 'Cashier User'}
                </div>
                <div className={styles.topBarUserRole}>Front Desk</div>
              </div>
            </div>

            {/* Notification bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className={styles.notificationButton}
                title="Notifications"
                onClick={handleNotifClick}
                aria-label="Notifications"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width={20} height={20} aria-hidden>
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                {totalBadge > 0 && (
                  <span className={`${styles.notifBadge} ${operationalBadgeCount > 0 ? styles.notifBadgeCritical : styles.notifBadgeUrgent}`}>
                    {totalBadge > 99 ? '99+' : totalBadge}
                  </span>
                )}
              </button>

              {/* Inline notification panel (fallback when no operational handler) */}
              {showNotifPanel && !onOperationalNotificationsClick && (
                <div className={styles.notifPanel}>
                  <div className={styles.notifPanelHeader}>Notifications</div>
                  {pusherNotifications.length === 0 ? (
                    <p className={styles.notifEmpty}>No new notifications</p>
                  ) : (
                    pusherNotifications.slice(0, 12).map((n) => (
                      <div key={n.id || n.message} className={styles.notifItem}>
                        {n.message}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Shift summary button */}
            {showShiftSummary && onShiftSummary && (
              <button
                type="button"
                className={styles.notificationButton}
                onClick={onShiftSummary}
                title="Generate Shift Summary"
                aria-label="Shift Summary"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width={20} height={20} aria-hidden>
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
              </button>
            )}

            {/* Profile icon (Change Password / Logout) */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className={styles.profileButton}
                aria-label="Profile menu"
              >
                <User className={styles.profileIcon} size={22} />
              </button>

              {profileOpen && (
                <div className={styles.profilePanel}>
                  <div className={styles.profileHeader}>
                    {user?.name || user?.email || 'Front Desk'}
                  </div>
                  <div
                    className={`${styles.profileAction} ${styles.profileActionPrimary}`}
                    onClick={() => {
                      setShowChangePassword(true);
                      setProfileOpen(false);
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setShowChangePassword(true);
                        setProfileOpen(false);
                      }
                    }}
                  >
                    <Lock size={16} />
                    Change Password
                  </div>
                  <div
                    className={`${styles.profileAction} ${styles.profileActionDanger}`}
                    onClick={handleLogout}
                    role="button"
                    tabIndex={0}
                  >
                    {isLoading ? 'Logging out…' : 'Log Out'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.content}>
          {children}
        </div>
      </div>

      {/* Confirm modal */}
      {confirmModal.show && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #febe52 0%, #fcd34d 50%, #f6e27a 100%)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: '90%',
              textAlign: 'center',
            }}
          >
            <LogOut size={48} color="#dc2626" style={{ marginBottom: 16 }} />
            <h3 style={{ margin: '0 0 12px', color: '#5a3e00' }}>{confirmModal.title}</h3>
            <p style={{ margin: '0 0 20px', color: '#6b4a00', fontSize: 14 }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({ show: false, title: '', message: '', onConfirm: null })
                }
                style={{
                  background: '#9ca3af',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                style={{
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '12px 24px',
                  cursor: 'pointer',
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => setShowChangePassword(false)}
      />
    </div>
  );
}

export default function CashierStaffLayout({ children, activePage }) {
  return (
    <FrontDeskNavProvider>
      <CashierLayoutInner activePage={activePage}>
        {children}
      </CashierLayoutInner>
    </FrontDeskNavProvider>
  );
}
