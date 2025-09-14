'use client';
import { useEffect, useState } from 'react';

export default function CashierDashboard() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  async function fetchPayments() {
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      setPayments(data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  }

  // === Metrics ===
  const totalPayments = payments.length;
  const totalRevenue = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const pendingPayments = payments.filter((p) => p.status === 'pending').length;

  if (loading) return <p>Loading cashier dashboard...</p>;

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Cashier Dashboard</h1>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={cardStyle}>
          <h3>Total Payments</h3>
          <p style={metricStyle}>{totalPayments}</p>
        </div>
        <div style={cardStyle}>
          <h3>Total Revenue</h3>
          <p style={metricStyle}>₱{(totalRevenue / 100).toLocaleString()}</p>
        </div>
        <div style={cardStyle}>
          <h3>Pending Payments</h3>
          <p style={metricStyle}>{pendingPayments}</p>
        </div>
      </div>

      {/* Recent Payments Table */}
      <h2 style={{ marginBottom: '0.5rem' }}>Recent Transactions</h2>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <thead>
          <tr>
            <th>Payment ID</th>
            <th>Booking ID</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Created At</th>
          </tr>
        </thead>
        <tbody>
          {payments.slice(0, 5).map((p) => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.bookingId}</td>
              <td>₱{(p.amount / 100).toLocaleString()}</td>
              <td>{p.status}</td>
              <td>{p.provider}</td>
              <td>{new Date(p.createdAt).toLocaleString()}</td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center' }}>No payments found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// === Styles ===
const cardStyle = {
  background: '#f3f4f6',
  padding: '1rem',
  borderRadius: '10px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const metricStyle = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  marginTop: '0.5rem',
};
