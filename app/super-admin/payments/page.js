'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import SuperAdminLayout from '@/components/SuperAdminLayout';

export default function Payments() {
  const { data: session } = useSession();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', startDate: '', endDate: '' });
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
      const createdAt = new Date(p.createdAt);
      const startDateMatch = filters.startDate ? createdAt >= new Date(filters.startDate) : true;
      const endDateMatch = filters.endDate ? createdAt <= new Date(filters.endDate) : true;
      const statusMatch = filters.status ? p.status === filters.status : true;
      return statusMatch && startDateMatch && endDateMatch;
    });
  }

  function selectPayment(payment) {
    setSelectedPayment(payment);
  }

  function clearSelection() {
    setSelectedPayment(null);
  }

  if (loading) return <p style={styles.loadingText}>Loading payments...</p>;

  const isDetailOpen = Boolean(selectedPayment);

  const layoutStyle = {
    display: 'flex',
    flexDirection: isDetailOpen ? 'row' : 'column',
    gap: '2rem',
    alignItems: isDetailOpen ? 'flex-start' : 'center',
    justifyContent: 'center',
  };

  const tableContainerStyle = {
    flex: 1,
    maxWidth: isDetailOpen ? '65%' : '100%',
  };

  const detailContainerStyle = {
    flex: 1,
    maxWidth: '35%',
  };

  return (
    <SuperAdminLayout activePage="payments" user={session?.user}>
      <div style={styles.container}>
        <h1 style={styles.title}>Super Admin Payment Oversight</h1>

        {/* KPIs */}
        {report && (
          <div style={styles.kpiContainer}>
            <div
              style={{ ...styles.kpiCard, backgroundColor: '#4CAF50' }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(76,175,80,0.18)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = styles.kpiCard.boxShadow;
              }}
            >
              <h3 style={styles.kpiTitle}>Total Revenue</h3>
              <p style={styles.kpiValue}>₱ {(report.totalRevenue / 100).toFixed(2)}</p>
            </div>
            <div
              style={{ ...styles.kpiCard, backgroundColor: '#2196F3' }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(33,150,243,0.18)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = styles.kpiCard.boxShadow;
              }}
            >
              <h3 style={styles.kpiTitle}>Total Transactions</h3>
              <p style={styles.kpiValue}>{report.totalTransactions}</p>
            </div>
            <div
              style={{ ...styles.kpiCard, backgroundColor: '#FFC107' }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,193,7,0.18)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = styles.kpiCard.boxShadow;
              }}
            >
              <h3 style={styles.kpiTitle}>Pending Payments</h3>
              <p style={styles.kpiValue}>{report.pendingTransactions}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={styles.filtersContainer}>
          {/* Status Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              style={styles.select}
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          {/* Start Date Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>Start Date:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={styles.input}
            />
          </div>
          {/* End Date Filter */}
          <div style={styles.filterGroup}>
            <label style={styles.label}>End Date:</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={styles.input}
            />
          </div>
        </div>

        {/* Main layout: table and details side-by-side or stacked */}
        <div style={layoutStyle}>
          {/* Payments Table */}
          <div style={tableContainerStyle}>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead style={styles.thead}>
                  <tr>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Booking ID</th>
                    <th style={styles.th}>Guest</th>
                    <th style={styles.th}>Amount (₱)</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filterPayments().map((payment) => (
                    <tr
                      key={payment.id}
                      onClick={() => selectPayment(payment)}
                      style={{
                        ...styles.tr,
                        backgroundColor: selectedPayment?.id === payment.id ? '#E0F7FA' : 'white',
                        transition: 'background-color 0.2s',
                      }}
                    >
                      <td style={styles.td}>{payment.id}</td>
                      <td style={styles.td}>{payment.bookingId}</td>
                      <td style={styles.td}>{payment.booking?.user?.name || 'N/A'}</td>
                      <td style={styles.td}>{(payment.amount / 100).toFixed(2)}</td>
                      <td style={{ ...styles.td, ...statusStyles(payment.status) }}>{payment.status}</td>
                      <td style={styles.td}>{new Date(payment.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Details Sidebar */}
          {selectedPayment && (
            <div style={styles.detailBox}>
              <h3 style={styles.sectionTitle}>Payment Details</h3>
              <p><strong>ID:</strong> {selectedPayment.id}</p>
              <p><strong>Booking ID:</strong> {selectedPayment.bookingId}</p>
              <p><strong>Guest:</strong> {selectedPayment.booking?.user?.name || 'N/A'}</p>
              <p><strong>Amount:</strong> ₱ {(selectedPayment.amount / 100).toFixed(2)}</p>
              <p><strong>Status:</strong> {selectedPayment.status}</p>
              <p><strong>Date:</strong> {new Date(selectedPayment.createdAt).toLocaleString()}</p>
              <button style={styles.closeButton} onClick={clearSelection}>Close</button>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}

// Helper for status color coding
const statusStyles = (status) => {
  switch (status) {
    case 'Pending':
      return { color: '#FFC107', fontWeight: 'bold' }; // Amber for pending
    case 'Paid':
      return { color: '#4CAF50', fontWeight: 'bold' }; // Green for success
    case 'Failed':
      return { color: '#F44336', fontWeight: 'bold' }; // Red for errors
    default:
      return {};
  }
};

// Styles object for modern look
const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: `'Helvetica Neue', Helvetica, Arial, sans-serif`,
    lineHeight: 1.6,
    color: '#333',
  },
  title: {
    textAlign: 'center',
    fontSize: '2rem',
    marginBottom: '2rem',
    fontWeight: 700,
    color: '#222',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: '3rem',
    fontSize: '1.2rem',
    color: '#555',
  },
  kpiContainer: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '2rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  kpiCard: {
    flex: '1 1 200px',
    padding: '1rem',
    borderRadius: '12px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    textAlign: 'center',
    color: '#fff',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
  },
  kpiTitle: {
    marginBottom: '0.5rem',
    fontSize: '1rem',
    fontWeight: 600,
  },
  kpiValue: {
    fontSize: '1.2rem',
    fontWeight: 700,
  },
  filtersContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    marginBottom: '2rem',
    justifyContent: 'center',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  label: {
    marginBottom: '0.5rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#555',
  },
  input: {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '0.95rem',
    minWidth: '150px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '0.95rem',
    minWidth: '150px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  tableWrapper: {
    overflowX: 'auto',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: `'Helvetica Neue', Helvetica, Arial, sans-serif`,
    fontSize: '0.95rem',
  },
  thead: {
    backgroundColor: '#f0f0f0',
  },
  th: {
    padding: '12px',
    border: '1px solid #ddd',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: '0.95rem',
    color: '#555',
  },
  tr: {
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  td: {
    padding: '12px',
    border: '1px solid #eee',
    textAlign: 'center',
  },
  detailBox: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    maxWidth: '600px',
    width: '100%',
    marginTop: '1rem',
    position: 'sticky',
    top: '20px',
    alignSelf: 'flex-start',
    zIndex: 1000,
  },
  sectionTitle: {
    fontSize: '1.2rem',
    marginBottom: '1rem',
    fontWeight: 700,
    color: '#222',
  },
  closeButton: {
    marginTop: '1.5rem',
    padding: '0.75rem 1.5rem',
    backgroundColor: '#007BFF',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 600,
    transition: 'background-color 0.2s',
  },
};