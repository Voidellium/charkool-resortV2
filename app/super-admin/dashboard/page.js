'use client';
import { useEffect, useState } from 'react';
import SuperAdminLayout from '../../../components/SuperAdminLayout';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    total: 0,
    confirmed: 0,
    pending: 0,
    cancelled: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch('http://localhost:3000/api/bookings');
      const data = await res.json();

      const total = data.length;
      const confirmed = data.filter((b) => b.status === 'Confirmed').length;
      const pending = data.filter((b) => b.status === 'Pending').length;
      const cancelled = data.filter((b) => b.status === 'Cancelled').length;

      setStats({ total, confirmed, pending, cancelled });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  }

  return (
    <SuperAdminLayout activePage="dashboard">
      <div
        style={{
          padding: '2rem 0.5rem',
          backgroundColor: '#fafafa',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Header Section */}
        <div style={{ maxWidth: '700px', textAlign: 'center', marginBottom: '2rem' }}>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: '600',
              marginBottom: '0.25rem',
              color: '#222',
            }}
          >
            Welcome to the Dashboard
          </h1>
          <p style={{ fontSize: '1rem', color: '#555', lineHeight: '1.5' }}>
            A quick glance at your current bookings and their statuses.
          </p>
        </div>

        {/* Statistic Cards Container */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
            width: '100%',
            maxWidth: '800px',
            padding: '0 0.5rem',
          }}
        >
          <StatCard title="Total Bookings" value={stats.total} color="#4A90E2" />
          <StatCard title="Confirmed" value={stats.confirmed} color="#7ED321" />
          <StatCard title="Pending" value={stats.pending} color="#FEBE52" />
          <StatCard title="Cancelled" value={stats.cancelled} color="#D0021B" />
        </div>
      </div>
    </SuperAdminLayout>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div
      style={{
        flex: '1 1 160px',
        minWidth: '160px',
        backgroundColor: '#fff',
        borderRadius: '10px',
        padding: '1.5rem 1rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        transition: 'transform 0.3s, box-shadow 0.3s',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        borderLeft: `5px solid ${color}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
      }}
    >
      <h3
        style={{
          fontSize: '1rem',
          marginBottom: '0.7rem',
          color: '#555',
          letterSpacing: '0.3px',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: '2rem',
          fontWeight: '600',
          color: '#222',
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}