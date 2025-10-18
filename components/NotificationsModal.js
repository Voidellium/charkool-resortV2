'use client';
import React, { useState } from 'react';
import { Bell, X, Check, AlertCircle, Info, CalendarCheck2, CreditCard } from 'lucide-react';

// Global modal styles
const ModalGlobalStyles = () => (
  <style jsx global>{`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 1200;
      display: flex;
      justify-content: center;
      align-items: center;
      background: rgba(0,0,0,0.18);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      transition: background 0.2s;
    }
    .modal-content {
      position: relative;
      margin: 0 auto;
      top: 0;
      left: 0;
      transform: none;
    }
    .fade-in {
      animation: fadeIn 0.2s ease-in;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `}</style>
);

// Hook for Notifications Modal (Guest)
export function useNotificationsModal() {
  const [modal, setModal] = useState({ show: false, notifications: [], loading: false, error: '' });
  return [modal, setModal];
}

// Notifications Modal Component
export function NotificationsModal({ 
  isOpen, 
  onClose, 
  notifications = [], 
  loading = false, 
  error = '', 
  onMarkAsRead,
  onMarkAllAsRead 
}) {
  // Helper function for notification icons
  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'info': return <Info size={16} />;
      case 'booking': return <CalendarCheck2 size={16} />;
      case 'payment': return <CreditCard size={16} />;
      case 'alert': return <AlertCircle size={16} />;
      default: return <Bell size={16} />;
    }
  };

  // Helper function for notification colors
  const getNotificationAccent = (type) => {
    switch (type?.toLowerCase()) {
      case 'info': return 'linear-gradient(135deg, #3B82F6, #1D4ED8)';
      case 'booking': return 'linear-gradient(135deg, #10B981, #059669)';
      case 'payment': return 'linear-gradient(135deg, #F59E0B, #D97706)';
      case 'alert': return 'linear-gradient(135deg, #EF4444, #DC2626)';
      default: return 'linear-gradient(135deg, #6B7280, #4B5563)';
    }
  };

  // Helper function for time formatting
  const timeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now - date;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <>
      <ModalGlobalStyles />
      <div className="modal-overlay fade-in" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="notification-modal">
            <div className="modal-header">
              <h2>All Notifications</h2>
              <button className="modal-close" onClick={onClose}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              {loading ? (
                <div className="modal-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading notifications...</p>
                </div>
              ) : error ? (
                <div className="modal-error">
                  <AlertCircle size={48} />
                  <h3>Error loading notifications</h3>
                  <p>{error}</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="modal-empty">
                  <Bell size={48} />
                  <h3>No notifications yet</h3>
                  <p>You'll see booking updates and important information here.</p>
                </div>
              ) : (
                <div className="modal-notifications">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`modal-notification-item ${!notification.isRead ? 'unread' : ''}`}
                      onClick={() => onMarkAsRead && onMarkAsRead(notification)}
                    >
                      <div className="notification-icon" style={{ background: getNotificationAccent(notification.type) }}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="notification-content">
                        <div className="notification-message">{notification.message}</div>
                        <div className="notification-time">{timeAgo(notification.createdAt)}</div>
                      </div>
                      {!notification.isRead && <div className="unread-dot"></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="modal-footer">
                <button 
                  className="modal-mark-all-read"
                  onClick={onMarkAllAsRead}
                >
                  <Check size={16} />
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        </div>

        <style jsx>{`
          .notification-modal {
            background: white;
            border-radius: 16px;
            width: 90vw;
            max-width: 600px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }

          .modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .modal-header h2 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
            color: #1f2937;
          }

          .modal-close {
            background: none;
            border: none;
            cursor: pointer;
            padding: 0.5rem;
            border-radius: 8px;
            transition: background 0.2s;
            color: #6b7280;
          }

          .modal-close:hover {
            background: #f3f4f6;
            color: #374151;
          }

          .modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
          }

          .modal-loading,
          .modal-empty,
          .modal-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem 1rem;
            text-align: center;
          }

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 3px solid #f3f4f6;
            border-top: 3px solid #FEBE52;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .modal-empty h3,
          .modal-error h3 {
            margin: 1rem 0 0.5rem;
            font-size: 1.125rem;
            font-weight: 500;
            color: #374151;
          }

          .modal-empty p,
          .modal-error p {
            margin: 0;
            color: #6b7280;
            font-size: 0.9rem;
          }

          .modal-notifications {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }

          .modal-notification-item {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
            padding: 1rem;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.2s;
            border: 1px solid transparent;
            position: relative;
          }

          .modal-notification-item:hover {
            background: #f9fafb;
            border-color: #e5e7eb;
          }

          .modal-notification-item.unread {
            background: linear-gradient(135deg, rgba(254, 190, 82, 0.05), rgba(252, 211, 77, 0.03));
            border-color: rgba(254, 190, 82, 0.2);
          }

          .notification-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
          }

          .notification-content {
            flex: 1;
            min-width: 0;
          }

          .notification-message {
            font-size: 0.9rem;
            color: #374151;
            line-height: 1.5;
            margin-bottom: 0.25rem;
          }

          .notification-time {
            font-size: 0.8rem;
            color: #6b7280;
          }

          .unread-dot {
            width: 8px;
            height: 8px;
            background: #FEBE52;
            border-radius: 50%;
            flex-shrink: 0;
            margin-top: 0.5rem;
          }

          .modal-footer {
            padding: 1rem 1.5rem;
            border-top: 1px solid #f3f4f6;
            display: flex;
            justify-content: flex-end;
          }

          .modal-mark-all-read {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, #FEBE52, #f0c14b);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 0.9rem;
            font-weight: 500;
            transition: transform 0.2s, box-shadow 0.2s;
          }

          .modal-mark-all-read:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(254, 190, 82, 0.3);
          }

          @media (max-width: 640px) {
            .notification-modal {
              width: 95vw;
              max-height: 85vh;
            }

            .modal-header {
              padding: 1rem;
            }

            .modal-header h2 {
              font-size: 1.125rem;
            }

            .modal-notification-item {
              padding: 0.75rem;
            }

            .notification-icon {
              width: 32px;
              height: 32px;
            }
          }
        `}</style>
      </div>
    </>
  );
}