'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import Loading, { TableLoading, ButtonLoading } from '@/components/Loading';
import { 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Eye, 
  Filter, 
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Search,
  X,
  Calendar,
  User,
  Building,
  Receipt,
  Shield,
  RotateCcw
} from 'lucide-react';

export default function Payments() {
  const { data: session } = useSession();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({ status: '', startDate: '', endDate: '' });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [report, setReport] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [activeFilter, setActiveFilter] = useState('all'); // for KPI card filtering

  useEffect(() => {
    fetchPayments();
    // Remove report fetching since we calculate everything from payments data
  }, []);

  // Audit logging function
  async function logAuditTrail(action, entityId, details) {
    try {
      await fetch('/api/audit-trails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          entity: 'Payment',
          entityId: String(entityId),
          details: JSON.stringify(details)
        }),
      });
    } catch (error) {
      console.error('Failed to log audit trail:', error);
    }
  }

  async function fetchPayments() {
    setLoading(true);
    try {
      console.log('Fetching payments from /api/payments...');
      const res = await fetch('/api/payments');
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      
      // Ensure we only set an array; backend may return an error object on failure
      if (Array.isArray(data)) {
        setPayments(data);
        console.log(`Successfully loaded ${data.length} payments`);
      } else {
        console.error('Unexpected payments response:', data);
        setPayments([]);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  async function refreshPayments() {
    setRefreshing(true);
    try {
      const res = await fetch('/api/payments');
      const data = await res.json();
      if (Array.isArray(data)) {
        setPayments(data);
        // Update selected payment if it exists
        if (selectedPayment) {
          const updated = data.find(p => p.id === selectedPayment.id);
          setSelectedPayment(updated || null);
        }
      }
    } catch (error) {
      console.error('Error refreshing payments:', error);
    } finally {
      setRefreshing(false);
    }
  }

  async function verifyPayment(paymentId, note) {
    setActionLoading(prev => ({...prev, [`verify_${paymentId}`]: true}));
    try {
      const res = await fetch('/api/cashier/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, note }),
      });
      const data = await res.json();
      if (data?.success) {
        // Log audit trail
        await logAuditTrail('VERIFY_PAYMENT', paymentId, {
          paymentId,
          note,
          verifiedBy: session?.user?.name,
          timestamp: new Date().toISOString()
        });
        
        // refresh list and selected payment
        await refreshPayments();
      } else {
        console.error('Verify failed', data);
      }
      return data;
    } catch (e) {
      console.error('Verify error', e);
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`verify_${paymentId}`]: false}));
    }
  }

  async function pollPaymentStatus(bookingId, paymentId) {
    setActionLoading(prev => ({...prev, [`poll_${paymentId}`]: true}));
    try {
      const res = await fetch('/api/payments/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
      const data = await res.json();
      
      // Log audit trail
      await logAuditTrail('POLL_PAYMENT_STATUS', paymentId, {
        paymentId,
        bookingId,
        result: data,
        polledBy: session?.user?.name,
        timestamp: new Date().toISOString()
      });
      
      // refresh payments to reflect status changes
      await refreshPayments();
      return data;
    } catch (e) {
      console.error('Poll error', e);
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`poll_${paymentId}`]: false}));
    }
  }

  async function flagPayment(paymentId, reason) {
    setActionLoading(prev => ({...prev, [`flag_${paymentId}`]: true}));
    try {
      const res = await fetch('/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'flag', flagReason: reason }),
      });
      const data = await res.json();
      if (data?.success) {
        await refreshPayments();
      }
      return data;
    } catch (e) {
      console.error('Flag error', e);
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`flag_${paymentId}`]: false}));
    }
  }

  async function addPaymentNote(paymentId, note) {
    setActionLoading(prev => ({...prev, [`note_${paymentId}`]: true}));
    try {
      const res = await fetch('/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'add_note', note }),
      });
      const data = await res.json();
      if (data?.success) {
        await refreshPayments();
      }
      return data;
    } catch (e) {
      console.error('Add note error', e);
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`note_${paymentId}`]: false}));
    }
  }

  function filterPayments() {
    if (!Array.isArray(payments)) return [];
    let filtered = payments.filter((p) => {
      const createdAt = new Date(p.createdAt);
      const startDateMatch = filters.startDate ? createdAt >= new Date(filters.startDate) : true;
      const endDateMatch = filters.endDate ? createdAt <= new Date(filters.endDate) : true;
      const statusMatch = filters.status ? p.status === filters.status : true;
      return statusMatch && startDateMatch && endDateMatch;
    });

    // Apply KPI card filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => {
        switch (activeFilter) {
          case 'paid': return p.status === 'Paid';
          case 'Paid': return p.status === 'Paid';
          case 'pending': return p.status === 'Pending';
          case 'Pending': return p.status === 'Pending';
          case 'failed': return p.status === 'Failed';
          case 'Failed': return p.status === 'Failed';
          case 'verified': return p.verificationStatus === 'Verified';
          default: return true;
        }
      });
    }

    return filtered;
  }

  function selectPayment(payment) {
    setSelectedPayment(payment);
    setShowModal(true);
  }

  function clearSelection() {
    setSelectedPayment(null);
    setShowModal(false);
  }

  function handleKpiCardClick(filterType) {
    setActiveFilter(filterType);
    
    // Map filter types to status filter
    let statusFilter = '';
    switch (filterType) {
      case 'pending':
        statusFilter = 'Pending';
        break;
      case 'paid':
        statusFilter = 'Paid';
        break;
      case 'failed':
        statusFilter = 'Failed';
        break;
      case 'verified':
        statusFilter = ''; // Don't set status filter for verification status
        break;
      default:
        statusFilter = '';
    }
    
    setFilters({ ...filters, status: statusFilter });
    
    // Log audit trail for filtering
    logAuditTrail('FILTER_PAYMENTS', 'dashboard', {
      filterType,
      filteredBy: session?.user?.name,
      timestamp: new Date().toISOString()
    });
  }

  if (loading) {
    return (
      <SuperAdminLayout activePage="payments" user={session?.user}>
        <Loading 
          fullPage={true} 
          text="Loading payments..." 
          size="large"
        />
      </SuperAdminLayout>
    );
  }

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
      <style jsx global>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>
            <CreditCard size={32} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Payment Management Center
          </h1>
          <p style={styles.subtitle}>Monitor and manage all payment transactions</p>
        </div>

        {/* Enhanced KPI Cards */}
        <div style={styles.kpiContainer}>
          <div 
            style={{
              ...styles.kpiCard, 
              ...styles.revenueCard,
              ...(activeFilter === 'all' ? styles.activeCard : {})
            }}
            onClick={() => handleKpiCardClick('all')}
          >
            <div style={styles.kpiIcon}>
              <DollarSign size={32} />
            </div>
            <div style={styles.kpiContent}>
              <h3 style={styles.kpiTitle}>Total Revenue</h3>
              <p style={styles.kpiValue}>
                ₱ {(() => {
                  // Calculate from actual payments data
                  const paidPayments = payments.filter(p => p.status === 'Paid');
                  const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                  return formatAmount(totalRevenue);
                })()}
              </p>
              <span style={styles.kpiChange}>
                <TrendingUp size={14} style={{ marginRight: '4px' }} />
                {payments.filter(p => p.status === 'Paid').length} paid transactions
              </span>
            </div>
          </div>
          <div 
            style={{
              ...styles.kpiCard, 
              ...styles.transactionCard,
              ...(activeFilter === 'all' ? styles.activeCard : {})
            }}
            onClick={() => handleKpiCardClick('all')}
          >
            <div style={styles.kpiIcon}>
              <BarChart3 size={32} />
            </div>
            <div style={styles.kpiContent}>
              <h3 style={styles.kpiTitle}>Total Transactions</h3>
              <p style={styles.kpiValue}>{payments.length}</p>
              <span style={styles.kpiChange}>
                <TrendingUp size={14} style={{ marginRight: '4px' }} />
                All payment records
              </span>
            </div>
          </div>
          <div 
            style={{
              ...styles.kpiCard, 
              ...styles.pendingCard,
              ...(activeFilter === 'pending' ? styles.activeCard : {})
            }}
            onClick={() => handleKpiCardClick('pending')}
          >
            <div style={styles.kpiIcon}>
              <Clock size={32} />
            </div>
            <div style={styles.kpiContent}>
              <h3 style={styles.kpiTitle}>Pending Payments</h3>
              <p style={styles.kpiValue}>{payments.filter(p => p.status === 'Pending').length}</p>
              <span style={styles.kpiChange}>
                <AlertTriangle size={14} style={{ marginRight: '4px' }} />
                Requires attention
              </span>
            </div>
          </div>
          <div 
            style={{
              ...styles.kpiCard, 
              ...styles.successCard,
              ...(activeFilter === 'verified' ? styles.activeCard : {})
            }}
            onClick={() => handleKpiCardClick('verified')}
          >
            <div style={styles.kpiIcon}>
              <CheckCircle size={32} />
            </div>
            <div style={styles.kpiContent}>
              <h3 style={styles.kpiTitle}>Verified Payments</h3>
              <p style={styles.kpiValue}>
                {payments.filter(p => p.verificationStatus === 'Verified').length}
              </p>
              <span style={styles.kpiChange}>
                <TrendingUp size={14} style={{ marginRight: '4px' }} />
                Admin verified
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div style={styles.filtersCard}>
          <div style={styles.filtersHeader}>
            <h3 style={styles.filtersTitle}>
              <Filter size={20} style={{ marginRight: '0.5rem' }} />
              Filter Payments
            </h3>
            <button
              onClick={refreshPayments}
              disabled={refreshing}
              style={{
                ...styles.refreshButton,
                opacity: refreshing ? 0.6 : 1,
                cursor: refreshing ? 'not-allowed' : 'pointer'
              }}
            >
              {refreshing ? (
                <ButtonLoading size="small" color="#3b82f6" />
              ) : (
                <RefreshCw size={16} />
              )}
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div style={styles.filtersContainer}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>Payment Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                style={styles.select}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>
                <Calendar size={14} style={{ marginRight: '4px' }} />
                From Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.filterGroup}>
              <label style={styles.label}>
                <Calendar size={14} style={{ marginRight: '4px' }} />
                To Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                style={styles.input}
              />
            </div>
            <div style={styles.filterGroup}>
              <button
                onClick={() => {
                  setFilters({ status: '', startDate: '', endDate: '' });
                  setActiveFilter('all');
                }}
                style={styles.clearButton}
              >
                <X size={16} style={{ marginRight: '4px' }} />
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Payments Table */}
        <div style={layoutStyle}>
          <div style={tableContainerStyle}>
            <div style={styles.tableCard}>
              <div style={styles.tableHeader}>
                <h3 style={styles.tableTitle}>
                  <CreditCard size={20} style={{ marginRight: '0.5rem' }} />
                  Payment Transactions
                </h3>
                <div style={styles.tableStats}>
                  {filterPayments().length} of {payments.length} payments
                </div>
              </div>
              <div style={styles.tableWrapper}>
                {refreshing && <TableLoading />}
                <table style={styles.table}>
                  <thead style={styles.thead}>
                    <tr>
                      <th style={styles.th}>Payment ID</th>
                      <th style={styles.th}>Booking</th>
                      <th style={styles.th}>Guest</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filterPayments().map((payment) => (
                      <tr
                        key={payment.id}
                        onClick={() => selectPayment(payment)}
                        style={{
                          ...styles.tr,
                          backgroundColor: selectedPayment?.id === payment.id ? '#E3F2FD' : 'white',
                          borderLeft: selectedPayment?.id === payment.id ? '4px solid #2196F3' : '4px solid transparent',
                        }}
                      >
                        <td style={styles.td}>
                          <div style={styles.paymentId}>#{payment.id.slice(-8)}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.bookingInfo}>
                            <span style={styles.bookingId}>#{payment.bookingId}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.guestInfo}>
                            <span style={styles.guestName}>{payment.booking?.user?.name || 'Walk-in Guest'}</span>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.amount}>₱{formatAmount(payment?.amount)}</div>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.statusBadge, ...getStatusStyle(payment.status) }}>
                            {getStatusIcon(payment.status)} {payment.status}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.dateInfo}>
                            <div>{new Date(payment.createdAt).toLocaleDateString()}</div>
                            <div style={styles.timeInfo}>{new Date(payment.createdAt).toLocaleTimeString()}</div>
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.quickActions}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectPayment(payment);
                              }}
                              style={styles.viewButton}
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Payment Details Modal */}
          {showModal && selectedPayment && (
            <div style={styles.modalOverlay} onClick={clearSelection}>
              <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeader}>
                  <h3 style={styles.modalTitle}>
                    <CreditCard size={24} style={{ marginRight: '0.5rem' }} />
                    Payment Details
                  </h3>
                  <button style={styles.closeButton} onClick={clearSelection}>
                    <X size={20} />
                  </button>
                </div>
                
                <div style={styles.modalBody}>
                  <div style={styles.paymentOverview}>
                    <div style={styles.paymentIdLarge}>#{selectedPayment.id.slice(-8)}</div>
                    <span style={{ ...styles.statusBadgeLarge, ...getStatusStyle(selectedPayment.status) }}>
                      {getStatusIcon(selectedPayment.status)} {selectedPayment.status}
                    </span>
                  </div>

                  <div style={styles.modalSection}>
                    <h4 style={styles.sectionTitle}>
                      <DollarSign size={18} style={{ marginRight: '0.5rem' }} />
                      Transaction Info
                    </h4>
                    <div style={styles.detailGrid}>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Amount:</span>
                        <span style={styles.amountLarge}>₱ {formatAmount(selectedPayment?.amount)}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Date Created:</span>
                        <span style={styles.detailValue}>{new Date(selectedPayment.createdAt).toLocaleString()}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Reference ID:</span>
                        <span style={styles.detailValue}>{selectedPayment.referenceId || 'N/A'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Provider:</span>
                        <span style={styles.detailValue}>{selectedPayment.provider || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.modalSection}>
                    <h4 style={styles.sectionTitle}>
                      <Building size={18} style={{ marginRight: '0.5rem' }} />
                      Booking Info
                    </h4>
                    <div style={styles.detailGrid}>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Booking ID:</span>
                        <span style={styles.detailValue}>#{selectedPayment.bookingId}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Guest Name:</span>
                        <span style={styles.detailValue}>{selectedPayment.booking?.user?.name || selectedPayment.booking?.guestName || 'Walk-in Guest'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Email:</span>
                        <span style={styles.detailValue}>{selectedPayment.booking?.user?.email || 'N/A'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Contact:</span>
                        <span style={styles.detailValue}>{selectedPayment.booking?.user?.contactNumber || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.modalSection}>
                    <h4 style={styles.sectionTitle}>
                      <Receipt size={18} style={{ marginRight: '0.5rem' }} />
                      Verification Status
                    </h4>
                    <div style={styles.detailGrid}>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Verification:</span>
                        <span style={styles.detailValue}>{selectedPayment.verificationStatus || 'Unverified'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Verified By:</span>
                        <span style={styles.detailValue}>{selectedPayment.verifiedBy?.name || 'N/A'}</span>
                      </div>
                      <div style={styles.detailRow}>
                        <span style={styles.detailLabel}>Verified At:</span>
                        <span style={styles.detailValue}>
                          {selectedPayment.verifiedAt ? new Date(selectedPayment.verifiedAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.actionSection}>
                    <h4 style={styles.sectionTitle}>
                      <Shield size={18} style={{ marginRight: '0.5rem' }} />
                      Quick Actions
                    </h4>
                    <div style={styles.actionButtons}>
                      <button
                        style={{
                          ...styles.modalActionButton,
                          ...styles.verifyButton,
                          opacity: actionLoading[`verify_${selectedPayment.id}`] ? 0.6 : 1
                        }}
                        onClick={async () => {
                          await verifyPayment(selectedPayment.id);
                        }}
                        disabled={actionLoading[`verify_${selectedPayment.id}`] || selectedPayment.verificationStatus === 'Verified'}
                      >
                        {actionLoading[`verify_${selectedPayment.id}`] ? (
                          <ButtonLoading size="small" color="#10b981" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                        {actionLoading[`verify_${selectedPayment.id}`] ? ' Verifying...' : ' Verify Payment'}
                      </button>
                      <button
                        style={{
                          ...styles.modalActionButton,
                          ...styles.pollButton,
                          opacity: actionLoading[`poll_${selectedPayment.id}`] ? 0.6 : 1
                        }}
                        onClick={async () => {
                          await pollPaymentStatus(selectedPayment.bookingId, selectedPayment.id);
                        }}
                        disabled={actionLoading[`poll_${selectedPayment.id}`]}
                      >
                        {actionLoading[`poll_${selectedPayment.id}`] ? (
                          <ButtonLoading size="small" color="#3b82f6" />
                        ) : (
                          <RefreshCw size={16} />
                        )}
                        {actionLoading[`poll_${selectedPayment.id}`] ? ' Checking...' : ' Check Status'}
                      </button>
                      <button
                        style={{
                          ...styles.modalActionButton,
                          backgroundColor: '#ef4444',
                          color: 'white',
                          opacity: actionLoading[`flag_${selectedPayment.id}`] ? 0.6 : 1
                        }}
                        onClick={async () => {
                          const reason = prompt('Enter flag reason (optional):');
                          if (reason !== null) {
                            await flagPayment(selectedPayment.id, reason || 'Flagged for review');
                          }
                        }}
                        disabled={actionLoading[`flag_${selectedPayment.id}`] || selectedPayment.verificationStatus === 'Flagged'}
                      >
                        {actionLoading[`flag_${selectedPayment.id}`] ? (
                          <ButtonLoading size="small" color="#ef4444" />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                        {actionLoading[`flag_${selectedPayment.id}`] ? ' Flagging...' : ' Flag Payment'}
                      </button>
                      <button
                        style={{
                          ...styles.modalActionButton,
                          backgroundColor: '#6366f1',
                          color: 'white',
                          opacity: actionLoading[`note_${selectedPayment.id}`] ? 0.6 : 1
                        }}
                        onClick={async () => {
                          const note = prompt('Enter note for this payment:');
                          if (note && note.trim()) {
                            await addPaymentNote(selectedPayment.id, note.trim());
                          }
                        }}
                        disabled={actionLoading[`note_${selectedPayment.id}`]}
                      >
                        {actionLoading[`note_${selectedPayment.id}`] ? (
                          <RotateCcw size={16} className="animate-spin" />
                        ) : (
                          <Receipt size={16} />
                        )}
                        {actionLoading[`note_${selectedPayment.id}`] ? ' Adding Note...' : ' Add Note'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </SuperAdminLayout>
  );
}

// Enhanced status styling and icons
const getStatusIcon = (status) => {
  switch (status) {
    case 'Pending': return <Clock size={16} />;
    case 'Paid': return <CheckCircle size={16} />;
    case 'Failed': return <XCircle size={16} />;
    case 'Refunded': return <RefreshCw size={16} />;
    default: return <AlertTriangle size={16} />;
  }
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'Pending':
      return { 
        backgroundColor: '#FFF3E0', 
        color: '#E65100', 
        borderColor: '#FFB74D' 
      };
    case 'Paid':
      return { 
        backgroundColor: '#E8F5E8', 
        color: '#2E7D32', 
        borderColor: '#4CAF50' 
      };
    case 'Failed':
      return { 
        backgroundColor: '#FFEBEE', 
        color: '#C62828', 
        borderColor: '#F44336' 
      };
    case 'Refunded':
      return { 
        backgroundColor: '#E3F2FD', 
        color: '#1565C0', 
        borderColor: '#2196F3' 
      };
    default:
      return { 
        backgroundColor: '#F5F5F5', 
        color: '#616161', 
        borderColor: '#9E9E9E' 
      };
  }
};

// Helper for status color coding (legacy - kept for compatibility)
const statusStyles = (status) => {
  switch (status) {
    case 'Pending':
      return { color: '#FFC107', fontWeight: 'bold' };
    case 'Paid':
      return { color: '#4CAF50', fontWeight: 'bold' };
    case 'Failed':
      return { color: '#F44336', fontWeight: 'bold' };
    default:
      return {};
  }
};

// Safely format amounts (input in cents). Returns string with two decimals.
function formatAmount(cents) {
  const n = Number(cents);
  if (!cents && cents !== 0) return '0.00';
  if (isNaN(n)) return '0.00';
  return (n / 100).toFixed(2);
}

// Enhanced modern styles
const styles = {
  container: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    fontFamily: `'Inter', 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif`,
    lineHeight: 1.6,
    color: '#1a1a1a',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '0.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#64748b',
    fontWeight: 400,
  },
  
  // Enhanced KPI Cards
  kpiContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  kpiCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden',
  },
  activeCard: {
    transform: 'scale(1.02)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    border: '2px solid #3b82f6',
  },
  revenueCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  transactionCard: {
    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    color: 'white',
  },
  pendingCard: {
    background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    color: '#8b4513',
  },
  successCard: {
    background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    color: '#2d5a27',
  },
  kpiIcon: {
    fontSize: '2.5rem',
    minWidth: '60px',
    textAlign: 'center',
  },
  kpiContent: {
    flex: 1,
  },
  kpiTitle: {
    fontSize: '0.9rem',
    fontWeight: 500,
    marginBottom: '0.5rem',
    opacity: 0.9,
  },
  kpiValue: {
    fontSize: '1.8rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
  },
  kpiChange: {
    fontSize: '0.8rem',
    opacity: 0.8,
    fontWeight: 500,
  },

  // Enhanced Filters
  filtersCard: {
    background: 'white',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  filtersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  filtersTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  refreshButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filtersContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    alignItems: 'end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: 'white',
  },
  select: {
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  clearButton: {
    padding: '0.75rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Enhanced Table
  tableCard: {
    background: 'white',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid #e2e8f0',
  },
  tableHeader: {
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableTitle: {
    fontSize: '1.3rem',
    fontWeight: 600,
    margin: 0,
  },
  tableStats: {
    fontSize: '0.9rem',
    opacity: 0.9,
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  thead: {
    backgroundColor: '#f8fafc',
  },
  th: {
    padding: '1rem',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: '0.85rem',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #e2e8f0',
  },
  tr: {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '1rem',
    borderBottom: '1px solid #f1f5f9',
    verticalAlign: 'middle',
  },
  paymentId: {
    fontFamily: 'Monaco, Consolas, monospace',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#6366f1',
  },
  bookingInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  bookingId: {
    fontWeight: 600,
    color: '#1e293b',
  },
  guestInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  guestName: {
    fontWeight: 600,
    color: '#1e293b',
  },
  amount: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#059669',
  },
  statusBadge: {
    padding: '0.375rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
    border: '2px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  statusBadgeLarge: {
    padding: '0.5rem 1rem',
    borderRadius: '25px',
    fontSize: '0.9rem',
    fontWeight: 600,
    border: '2px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  dateInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  timeInfo: {
    fontSize: '0.8rem',
    color: '#64748b',
  },
  quickActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  viewButton: {
    padding: '0.5rem',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
  },

  // Enhanced Detail Card
  detailCard: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    border: '1px solid #e2e8f0',
    maxWidth: '450px',
    width: '100%',
    position: 'sticky',
    top: '20px',
    alignSelf: 'flex-start',
    zIndex: 1000,
    overflow: 'hidden',
  },
  detailHeader: {
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: '1.3rem',
    fontWeight: 600,
    margin: 0,
  },
  closeIcon: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    color: 'white',
    fontSize: '1.2rem',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  detailContent: {
    padding: '1.5rem',
  },
  detailSection: {
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #f1f5f9',
  },
  paymentOverview: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  paymentIdLarge: {
    fontSize: '1.4rem',
    fontWeight: 700,
    fontFamily: 'Monaco, Consolas, monospace',
    color: '#6366f1',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  detailLabel: {
    fontSize: '0.9rem',
    color: '#64748b',
    fontWeight: 500,
  },
  detailValue: {
    fontSize: '0.9rem',
    color: '#1e293b',
    fontWeight: 600,
    textAlign: 'right',
    maxWidth: '60%',
    wordBreak: 'break-word',
  },
  amountLarge: {
    fontSize: '1.3rem',
    fontWeight: 700,
    color: '#059669',
  },
  actionSection: {
    borderBottom: 'none',
    paddingBottom: 0,
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  actionButton: {
    padding: '0.875rem 1.25rem',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  verifyButton: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  pollButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
  },
  closeButton: {
    backgroundColor: '#6b7280',
    color: 'white',
  },

  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(4px)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '20px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    animation: 'modalSlideIn 0.3s ease-out',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '1.4rem',
    fontWeight: 600,
    margin: 0,
    display: 'flex',
    alignItems: 'center',
  },
  modalBody: {
    padding: '1.5rem',
    maxHeight: 'calc(85vh - 120px)',
    overflowY: 'auto',
    flex: 1,
  },
  modalSection: {
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #f1f5f9',
  },
  detailGrid: {
    display: 'grid',
    gap: '1rem',
  },
  modalActionButton: {
    padding: '1rem 1.5rem',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    minHeight: '48px',
  },
};