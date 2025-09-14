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
      const confirmed = data.filter((b) => b.status.toLowerCase() === 'confirmed').length;
      const pending = data.filter((b) => b.status.toLowerCase() === 'pending').length;
      const cancelled = data.filter((b) => b.status.toLowerCase() === 'cancelled').length;

      setStats({ total, confirmed, pending, cancelled });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  }

  return (
    <SuperAdminLayout activePage="dashboard">
      <div style={{ padding: '2rem' }}>
        <h1> Super Admin Dashboard Overview</h1>
        <p style={{ marginBottom: '2rem', color: '#555' }}>
          Quick insights on current bookings.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <StatCard title="Total Bookings" value={stats.total} color="#007bff" />
          <StatCard title="Confirmed" value={stats.confirmed} color="#28a745" />
          <StatCard title="Pending" value={stats.pending} color="#ffc107" />
          <StatCard title="Cancelled" value={stats.cancelled} color="#dc3545" />
        </div>
      </div>
    </SuperAdminLayout>
  );
}

function StatCard({ title, value, color }) {
  return (
    <div
      style={{
        background: '#fff',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        borderLeft: `6px solid ${color}`,
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>{title}</h3>
      <p style={{ margin: '0.5rem 0 0', fontSize: '1.8rem', fontWeight: 'bold', color }}>
        {value}
      </p>
    </div>
  );
}
