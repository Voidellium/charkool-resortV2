'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import '@/app/receptionist/receptionist-styles.css';
import { useFrontDeskNotifications } from '@/hooks/useFrontDeskNotifications';
import { useFrontDeskNav } from './FrontDeskNavContext';
import { useToast } from '@/components/Toast';

export default function FrontDeskNavbar() {
  const { data: session } = useSession();
  const {
    operationalBadgeCount,
    onOperationalNotificationsClick,
    showShiftSummary,
    onShiftSummary,
  } = useFrontDeskNav();

  const { info: toastInfo, success: toastSuccess, warning: toastWarning } = useToast();
  const [showPusherPanel, setShowPusherPanel] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notifications?role=cashier');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          // Fetched list is merged in hook via parent if needed; pusher hook holds live items
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pusherBadge = pusherNotifications.length;
  const totalBadge = operationalBadgeCount + pusherBadge;

  return (
    <>
      <nav className="top-navbar">
        <div className="navbar-left">
          <div className="brand-section">
            <div className="brand-copy" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span className="brand-text" style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#c4871d',
                letterSpacing: '0.01em',
              }}>Charkool</span>
              <span className="brand-subtitle" style={{
                fontSize: '10px',
                fontWeight: '600',
                color: '#92400E',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>Beach Resort</span>
            </div>
          </div>
        </div>

        <div className="navbar-center" />

        <div className="navbar-right">
          {/* User profile info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginRight: '8px',
          }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #c4871d 0%, #febe52 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '700',
              fontSize: '14px',
              flexShrink: 0,
            }}>
              {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'F'}
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937', whiteSpace: 'nowrap' }}>
                {session?.user?.name || 'Front Desk'}
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                Front Desk
              </div>
            </div>
          </div>
          <button
            type="button"
            className="navbar-action-btn notifications"
            title="Notifications"
            onClick={() => {
              if (onOperationalNotificationsClick) {
                onOperationalNotificationsClick();
              } else {
                setShowPusherPanel((v) => !v);
              }
            }}
          >
            <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            {totalBadge > 0 && (
              <span className={`notification-badge ${operationalBadgeCount > 0 ? 'critical' : 'urgent'}`}>
                {totalBadge > 99 ? '99+' : totalBadge}
              </span>
            )}
          </button>

          {showShiftSummary && onShiftSummary && (
            <button
              type="button"
              className="navbar-action-btn shift-summary"
              onClick={onShiftSummary}
              title="Generate Shift Summary"
            >
              <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </button>
          )}
        </div>
      </nav>

      {showPusherPanel && !onOperationalNotificationsClick && (
        <div
          style={{
            position: 'fixed',
            top: 72,
            right: 16,
            width: 'min(95vw, 380px)',
            maxHeight: '60vh',
            overflowY: 'auto',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
            zIndex: 1200,
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 600 }}>
            Notifications
          </div>
          {pusherNotifications.length === 0 ? (
            <p style={{ padding: 16, color: '#6b7280', margin: 0 }}>No new notifications</p>
          ) : (
            pusherNotifications.slice(0, 12).map((n) => (
              <div key={n.id || n.message} style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                {n.message}
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
