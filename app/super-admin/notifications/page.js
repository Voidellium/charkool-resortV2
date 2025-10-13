'use client';
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { 
  Bell, 
  Check, 
  CheckCircle2, 
  Clock, 
  Filter,
  Search,
  Eye,
  Trash2,
  Calendar,
  User,
  CreditCard,
  DoorOpen,
  Settings,
  AlertCircle,
  Info,
  BookOpen,
  ChevronRight,
  MoreVertical
} from 'lucide-react';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, filter, searchTerm]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications?role=superadmin');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    // Apply filter
    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (filter === 'read') {
      filtered = filtered.filter(n => n.isRead);
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(n => 
        n.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        n.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
    setCurrentPage(1);
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true })
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, isRead: true } : n
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      for (const notification of unreadNotifications) {
        await fetch(`/api/notifications/${notification.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true })
        });
      }
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, isRead: true }))
      );
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const iconProps = { size: 20, className: "notification-icon" };
    
    switch (type) {
      case 'booking_created':
      case 'booking_updated':
      case 'booking_cancelled':
        return <BookOpen {...iconProps} style={{ color: '#3b82f6' }} />;
      case 'payment_received':
      case 'payment_failed':
        return <CreditCard {...iconProps} style={{ color: '#10b981' }} />;
      case 'user_registered':
      case 'user_updated':
        return <User {...iconProps} style={{ color: '#8b5cf6' }} />;
      case 'room_maintenance':
      case 'room_cleaned':
        return <DoorOpen {...iconProps} style={{ color: '#f59e0b' }} />;
      case 'system_alert':
        return <AlertCircle {...iconProps} style={{ color: '#ef4444' }} />;
      case 'system_info':
        return <Info {...iconProps} style={{ color: '#06b6d4' }} />;
      default:
        return <Bell {...iconProps} style={{ color: '#febe52' }} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'booking_created':
      case 'booking_updated':
        return 'rgba(59, 130, 246, 0.1)';
      case 'booking_cancelled':
        return 'rgba(239, 68, 68, 0.1)';
      case 'payment_received':
        return 'rgba(16, 185, 129, 0.1)';
      case 'payment_failed':
        return 'rgba(239, 68, 68, 0.1)';
      case 'user_registered':
      case 'user_updated':
        return 'rgba(139, 92, 246, 0.1)';
      case 'room_maintenance':
      case 'room_cleaned':
        return 'rgba(245, 158, 11, 0.1)';
      case 'system_alert':
        return 'rgba(239, 68, 68, 0.1)';
      case 'system_info':
        return 'rgba(6, 182, 212, 0.1)';
      default:
        return 'rgba(107, 114, 128, 0.1)';
    }
  };

  const formatNotificationMessage = (notification) => {
    let message = notification.message;
    
    // Enhanced message formatting
    if (notification.type === 'booking_created') {
      const match = message.match(/Booking ID (\d+)/);
      if (match) {
        return `New booking #${match[1]} has been created`;
      }
    } else if (notification.type === 'payment_received') {
      const amountMatch = message.match(/₱([0-9,]+)/);
      if (amountMatch) {
        return `Payment of ₱${amountMatch[1]} received`;
      }
    }
    
    return message;
  };

  const getRelativeTime = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return notificationDate.toLocaleDateString();
  };

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentNotifications = filteredNotifications.slice(startIndex, endIndex);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <SuperAdminLayout>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #febe52',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
        <style jsx>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div style={{
        width: '100%',
        padding: '2rem 1.5rem',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        minHeight: '100vh'
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '2rem',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.75rem',
            background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '25px',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '1rem',
            boxShadow: '0 4px 12px #E8D343'
          }}>
            <Bell size={18} />
            NOTIFICATION CENTER
          </div>
          
          <h1 style={{
            color: '#1f2937',
            fontSize: '2.5rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(135deg, #febe52 0%, #E8D381 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: '1.2'
          }}>
            Notifications & Alerts
          </h1>
          
          <p style={{
            color: '#febe52',
            fontSize: '1.1rem',
            margin: 0,
            lineHeight: '1.6'
          }}>
            Stay updated with all system activities and important alerts
          </p>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <Bell size={24} />
              <div>
                <div style={{ fontSize: '2rem', fontWeight: '700' }}>
                  {notifications.length}
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  Total Notifications
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                background: '#fef3c7',
                borderRadius: '8px',
                padding: '0.5rem',
                
              }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>
                  {unreadCount}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Unread Messages
                </div>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                background: '#d1fae5',
                borderRadius: '8px',
                padding: '0.5rem',
                color: '#10b981'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>
                  {notifications.length - unreadCount}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  Read Messages
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          padding: '1.5rem 2rem',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Search */}
              <div style={{ position: 'relative', minWidth: '300px' }}>
                <Search 
                  size={20} 
                  style={{
                    position: 'absolute',
                    left: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#febe52'}
                  onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>

              {/* Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Filter size={16} style={{ color: '#6b7280' }} />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  style={{
                    padding: '0.75rem 1rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    background: 'white',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="all">All Notifications</option>
                  <option value="unread">Unread Only</option>
                  <option value="read">Read Only</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <CheckCircle2 size={16} />
                  Mark All Read
                </button>
              )}
              
              <button
                onClick={fetchNotifications}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: '#ffffff',
                  color: '#374151',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Bell size={16} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#1f2937',
              margin: 0
            }}>
              Recent Activity
            </h3>
            <span style={{
              fontSize: '0.875rem',
              color: '#febe52'
            }}>
              {filteredNotifications.length} notifications
            </span>
          </div>

          {currentNotifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {currentNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                  style={{
                    background: notification.isRead ? '#ffffff' : getNotificationColor(notification.type),
                    border: `2px solid ${notification.isRead ? '#febe52' : '#e8d391'}`,
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    cursor: notification.isRead ? 'default' : 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!notification.isRead) {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!notification.isRead) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem'
                  }}>
                    {/* Icon */}
                    <div style={{
                      background: '#febe52',
                      borderRadius: '10px',
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '0.5rem'
                      }}>
                        <h4 style={{
                          fontSize: '1rem',
                          fontWeight: notification.isRead ? '500' : '600',
                          color: '#1f2937',
                          margin: 0,
                          lineHeight: '1.4'
                        }}>
                          {formatNotificationMessage(notification)}
                        </h4>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            whiteSpace: 'nowrap'
                          }}>
                            {getRelativeTime(notification.createdAt)}
                          </span>
                          
                          {!notification.isRead && (
                            <div style={{
                              width: '8px',
                              height: '8px',
                              background: '#febe52',
                              borderRadius: '50%',
                              flexShrink: 0
                            }} />
                          )}
                        </div>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          textTransform: 'capitalize'
                        }}>
                          {notification.type.replace(/_/g, ' ')}
                        </span>
                        
                        {!notification.isRead && (
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#febe52',
                            fontWeight: '500'
                          }}>
                            Click to mark as read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#9ca3af'
            }}>
              <Bell size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                color: '#374151',
                margin: '0 0 0.5rem 0' 
              }}>
                No notifications found
              </h3>
              <p style={{ margin: 0 }}>
                {searchTerm || filter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'You\'re all caught up! No new notifications at this time.'}
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #f3f4f6'
            }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                Showing {startIndex + 1} to {Math.min(endIndex, filteredNotifications.length)} of {filteredNotifications.length}
              </span>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: currentPage === 1 ? '#f9fafb' : 'white',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                
                <span style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  color: '#374151'
                }}>
                  {currentPage} of {totalPages}
                </span>
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '0.5rem 0.75rem',
                    background: currentPage === totalPages ? '#f9fafb' : 'white',
                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Responsive Styles */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
          
          div[style*="minWidth: '300px'"] {
            min-width: auto !important;
          }
          
          div[style*="padding: 2rem"] {
            padding: 1rem !important;
          }
          
          div[style*="flexWrap: 'wrap'"] {
            flex-direction: column !important;
            align-items: stretch !important;
          }
        }
      `}</style>
    </SuperAdminLayout>
  );
}