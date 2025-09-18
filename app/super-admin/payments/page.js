'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import SuperAdminLayout from '@/components/SuperAdminLayout';

export default function Payments() {
  const { data: session } = useSession();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetchPayments();
    fetchReport();
  }, []);

  async function fetchPayments() {
    setLoading(true);
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchReport() {
    try {
      const res = await fetch('/api/reports/payments');
      const data = await res.json();
      setReport(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    }
  }

  function filterPayments() {
    return payments.filter((p) => {
      const statusMatch = filters.status ? p.status === filters.status : true;
      const createdAt = new Date(p.createdAt);
      const startDateMatch = filters.startDate ? createdAt >= new Date(filters.startDate) : true;
      const endDateMatch = filters.endDate ? createdAt <= new Date(filters.endDate) : true;
      return statusMatch && startDateMatch && endDateMatch;
    });
  }

  function selectPayment(payment) {
    setSelectedPayment(payment);
  }

  function clearSelection() {
    setSelectedPayment(null);
  }

  if (loading) return <p>Loading payments...</p>;

  const content = (
    <div style={{ padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Super Admin Payment Oversight</h1>

      {/* KPIs */}
      {report && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ backgroundColor: '#4caf50', color: 'white', padding: '1rem', borderRadius: '8px', flex: 1 }}>
            <h3>Total Revenue</h3>
            <p>₱ {(report.totalRevenue / 100).toFixed(2)}</p>
          </div>
          <div style={{ backgroundColor: '#2196f3', color: 'white', padding: '1rem', borderRadius: '8px', flex: 1 }}>
            <h3>Total Transactions</h3>
            <p>{report.totalTransactions}</p>
          </div>
          <div style={{ backgroundColor: '#ff9800', color: 'white', padding: '1rem', borderRadius: '8px', flex: 1 }}>
            <h3>Pending Payments</h3>
            <p>{report.pendingTransactions}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '1rem' }}>
        <label>
          Status:
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            style={{ marginLeft: '0.5rem' }}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label style={{ marginLeft: '1rem' }}>
          Start Date:
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            style={{ marginLeft: '0.5rem' }}
          />
        </label>
        <label style={{ marginLeft: '1rem' }}>
          End Date:
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            style={{ marginLeft: '0.5rem' }}
          />
        </label>
      </div>

      {/* Payments Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#f0f0f0' }}>
          <tr>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>ID</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Booking ID</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Guest</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Amount (₱)</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Status</th>
            <th style={{ border: '1px solid #ccc', padding: '8px' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {filterPayments().map((payment) => (
            <tr
              key={payment.id}
              onClick={() => selectPayment(payment)}
              style={{ cursor: 'pointer', backgroundColor: selectedPayment?.id === payment.id ? '#d0eaff' : 'transparent' }}
            >
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{payment.id}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{payment.bookingId}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{payment.booking?.user?.name || 'N/A'}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{(payment.amount / 100).toFixed(2)}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{payment.status}</td>
              <td style={{ border: '1px solid #ccc', padding: '8px' }}>{new Date(payment.createdAt).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Selected Payment Details */}
      {selectedPayment && (
        <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Payment Details</h3>
          <p><strong>ID:</strong> {selectedPayment.id}</p>
          <p><strong>Booking ID:</strong> {selectedPayment.bookingId}</p>
          <p><strong>Guest:</strong> {selectedPayment.booking?.user?.name || 'N/A'}</p>
          <p><strong>Amount:</strong> ₱ {(selectedPayment.amount / 100).toFixed(2)}</p>
          <p><strong>Status:</strong> {selectedPayment.status}</p>
          <p><strong>Date:</strong> {new Date(selectedPayment.createdAt).toLocaleString()}</p>
          <button onClick={clearSelection} style={{ marginTop: '1rem' }}>Close</button>
        </div>
      )}
    </div>
  );

  return (
    <SuperAdminLayout activePage="payments" user={session?.user}>
      {content}
    </SuperAdminLayout>
  );
}
