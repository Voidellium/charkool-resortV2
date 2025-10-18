'use client';
import { useEffect, useState } from 'react';
import { 
  BarChart3, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Building2, 
  Users, 
  TrendingUp, 
  Search 
} from 'lucide-react';
import SuperAdminLayout from '../../../components/SuperAdminLayout';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    fetchStats();
    
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth > 768 && window.innerWidth <= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('/api/bookings');
      const data = await res.json();
      if (!Array.isArray(data)) {
        setStats({ total: 0, confirmed: 0, pending: 0, cancelled: 0 });
        return;
      }
      const total = data.length;
      const confirmed = data.filter((b) => b.status === 'Confirmed').length;
      const pending = data.filter((b) => b.status === 'Pending').length;
      const cancelled = data.filter((b) => b.status === 'Cancelled').length;
      setStats({ total, confirmed, pending, cancelled });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      setStats({ total: 0, confirmed: 0, pending: 0, cancelled: 0 });
    }
  }

  return (
    <SuperAdminLayout activePage="dashboard">
      <div
        style={{
          padding: isMobile ? '0.75rem' : isTablet ? '1rem 1.25rem' : '1.5rem 2rem',
          background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
          minHeight: '100vh',
        }}
      >
        {/* Header Section */}
        <div style={{ marginBottom: isMobile ? '1rem' : '2rem' }}>
          <h1
            style={{
              fontSize: isMobile ? '1.75rem' : isTablet ? '2rem' : '2.5rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          >
            Dashboard Overview
          </h1>
          <p style={{ 
            fontSize: isMobile ? '0.9rem' : '1.1rem', 
            color: 'rgba(255,255,255,0.9)', 
            lineHeight: '1.5' 
          }}>
            Complete system analytics and real-time booking management
          </p>
        </div>

        {/* Stats Grid - Full Width */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile 
              ? '1fr' 
              : isTablet 
                ? 'repeat(auto-fit, minmax(250px, 1fr))' 
                : 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: isMobile ? '1rem' : '1.5rem',
            marginBottom: isMobile ? '1rem' : '2rem',
          }}
        >
          <StatCard title="Total Bookings" value={stats.total} color="#4A90E2" icon={<BarChart3 size={24} />} />
          <StatCard title="Confirmed" value={stats.confirmed} color="#7ED321" icon={<CheckCircle size={24} />} />
          <StatCard title="Pending" value={stats.pending} color="#FEBE52" icon={<Clock size={24} />} />
          <StatCard title="Cancelled" value={stats.cancelled} color="#D0021B" icon={<XCircle size={24} />} />
        </div>

        {/* Quick Actions Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          <QuickActionCard 
            title="Manage Bookings" 
            description="View, edit, and process all reservations"
            icon={<Building2 size={24} />}
            action={() => window.location.href = '/super-admin/bookings'}
          />
          <QuickActionCard 
            title="User Management" 
            description="Control user accounts and permissions"
            icon={<Users size={24} />}
            action={() => window.location.href = '/super-admin/users'}
          />
          <QuickActionCard 
            title="System Analytics" 
            description="View detailed reports and insights"
            icon={<TrendingUp size={24} />}
            action={() => window.location.href = '/super-admin/reports'}
          />
          <QuickActionCard 
            title="Audit Trails" 
            description="Monitor all system activities"
            icon={<Search size={24} />}
            action={() => window.location.href = '/super-admin/audit-trails'}
          />
        </div>

        {/* Recent Activity Section */}
        <div
          style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem', color: '#333' }}>
            Recent System Activity
          </h2>
          <p style={{ color: '#666', fontSize: '1rem' }}>
            Real-time activity monitoring will be displayed here. This space utilizes the full width for maximum information density.
          </p>
        </div>
      </div>
    </SuperAdminLayout>
  );
}

function StatCard({ title, value, color, icon }) {
  return (
    <div
      style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
        e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '2rem', marginRight: '1rem' }}>{icon}</span>
        <h3
          style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#333',
            margin: 0,
            letterSpacing: '0.3px',
          }}
        >
          {title}
        </h3>
      </div>
      <p
        style={{
          fontSize: '3rem',
          fontWeight: '700',
          color: color,
          margin: 0,
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        {value}
      </p>
      {/* Decorative background element */}
      <div
        style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 80,
          height: 80,
          background: `linear-gradient(135deg, ${color}20, ${color}10)`,
          borderRadius: '50%',
          zIndex: 0,
        }}
      />
    </div>
  );
}

function QuickActionCard({ title, description, icon, action }) {
  return (
    <div
      onClick={action}
      style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.2)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.boxShadow = '0 16px 40px rgba(0, 0, 0, 0.15)';
        e.currentTarget.style.background = 'rgba(255,255,255,1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.1)';
        e.currentTarget.style.background = 'rgba(255,255,255,0.95)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '2.5rem', marginRight: '1rem' }}>{icon}</span>
        <h3
          style={{
            fontSize: '1.3rem',
            fontWeight: '600',
            color: '#333',
            margin: 0,
          }}
        >
          {title}
        </h3>
      </div>
      <p
        style={{
          fontSize: '1rem',
          color: '#666',
          lineHeight: '1.5',
          margin: 0,
        }}
      >
        {description}
      </p>
      {/* Arrow indicator */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          fontSize: '1.5rem',
          color: '#999',
          transition: 'all 0.3s ease',
        }}
      >
        →
      </div>
    </div>
  );
}