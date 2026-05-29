"use client";
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle,
  Clock, 
  User,
  RefreshCw,
  AlertCircle,
  Info,
  ChevronDown,
  FileText,
  Ban
} from 'lucide-react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import Loading from '@/components/Loading';
import { useToast } from '@/components/Toast';
import { useStaffNotifications } from '@/hooks/usePusher';

export default function RescheduleCancellationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();

  // State management
  const [currentTab, setCurrentTab] = useState('reschedule');
  const [loading, setLoading] = useState(false);
  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [cancellationRequests, setCancellationRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, approved, denied
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const ITEMS_PER_PAGE = 10;

  // Fetch reschedule requests
  const fetchRescheduleRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reschedule-requests/all');
      if (res.ok) {
        const data = await res.json();
        setRescheduleRequests(data.requests || []);
      } else {
        console.error('Failed to fetch reschedule requests');
        if (toast && toast.error) {
          toast.error('Failed to fetch reschedule requests');
        }
        setRescheduleRequests([]);
      }
    } catch (err) {
      console.error('Error fetching reschedule requests:', err);
      if (toast && toast.error) {
        toast.error('Error loading reschedule requests');
      }
      setRescheduleRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cancellation requests (placeholder for future implementation)
  const fetchCancellationRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cancellation-requests/all');
      if (res.ok) {
        const data = await res.json();
        setCancellationRequests(data.requests || []);
      } else {
        setCancellationRequests([]);
      }
    } catch (err) {
      console.error('Error fetching cancellation requests:', err);
      setCancellationRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (currentTab === 'reschedule') {
      fetchRescheduleRequests();
    } else if (currentTab === 'cancellation') {
      fetchCancellationRequests();
    } else {
      fetchRescheduleRequests();
      fetchCancellationRequests();
    }
  }, [currentTab]);

  // 🔔 PUSHER: Listen for real-time notifications (cancellation/reschedule updates)
  useStaffNotifications('SUPERADMIN', (notification) => {
    if (!notification) return;
    const type = notification.type || 'notification';
    const message = notification.message || 'New super admin update received';
    if (type.includes('denied') || type.includes('cancelled')) {
      toast.warning(message, { title: 'Live Update' });
    } else if (type.includes('approved')) {
      toast.success(message, { title: 'Live Update' });
    } else {
      toast.info(message, { title: 'Live Update' });
    }
    
    // Handle cancellation request notifications
    if (notification.type === 'cancellation_request') {
      console.log('[Pusher] New cancellation request received, refreshing list');
      fetchCancellationRequests();
    }
    // Handle cancellation approval/denial notifications
    else if (notification.type === 'cancellation_approved' || notification.type === 'cancellation_denied') {
      console.log(`[Pusher] Cancellation ${notification.type}, refreshing list`);
      fetchCancellationRequests();
    }
    // Handle reschedule request notifications (if applicable)
    else if (notification.type === 'reschedule_request' || notification.type === 'reschedule_approved' || notification.type === 'reschedule_denied') {
      console.log('[Pusher] Reschedule request update, refreshing list');
      fetchRescheduleRequests();
    }
  });

  // Approve reschedule request
  const handleApprove = async (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      // Determine if this is a reschedule or cancellation request
      const isCancellation = currentTab === 'cancellation';
      const endpoint = isCancellation 
        ? `/api/cancellation-requests/${selectedRequest.id}`
        : `/api/bookings/${selectedRequest.bookingId}/reschedule`;
      
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE' })
      });

      if (res.ok) {
        if (toast && toast.success) {
          toast.success(isCancellation 
            ? 'Cancellation request approved successfully'
            : 'Reschedule request approved successfully'
          );
        }
        if (isCancellation) {
          fetchCancellationRequests();
        } else {
          fetchRescheduleRequests();
        }
      } else {
        const data = await res.json();
        if (toast && toast.error) {
          toast.error(data.error || `Failed to approve ${isCancellation ? 'cancellation' : 'reschedule'} request`);
        }
      }
    } catch (err) {
      console.error('Error approving request:', err);
      if (toast && toast.error) {
        toast.error('Error approving request');
      }
    } finally {
      setShowApproveModal(false);
      setSelectedRequest(null);
    }
  };

  // Deny reschedule request
  const handleDeny = async (request) => {
    setSelectedRequest(request);
    setDenyReason('');
    setShowDenyModal(true);
  };

  const confirmDeny = async () => {
    if (!selectedRequest) return;
    if (!denyReason.trim()) {
      if (toast && toast.warning) {
        toast.warning('Please provide a reason for denial');
      }
      return;
    }

    try {
      // Determine if this is a reschedule or cancellation request
      const isCancellation = currentTab === 'cancellation';
      const endpoint = isCancellation 
        ? `/api/cancellation-requests/${selectedRequest.id}`
        : `/api/bookings/${selectedRequest.bookingId}/reschedule`;
      
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DENY', adminContext: denyReason })
      });

      if (res.ok) {
        if (toast && toast.success) {
          toast.success(isCancellation 
            ? 'Cancellation request denied'
            : 'Reschedule request denied'
          );
        }
        if (isCancellation) {
          fetchCancellationRequests();
        } else {
          fetchRescheduleRequests();
        }
      } else {
        const data = await res.json();
        if (toast && toast.error) {
          toast.error(data.error || `Failed to deny ${isCancellation ? 'cancellation' : 'reschedule'} request`);
        }
      }
    } catch (err) {
      console.error('Error denying request:', err);
      if (toast && toast.error) {
        toast.error('Error denying request');
      }
    } finally {
      setShowDenyModal(false);
      setSelectedRequest(null);
      setDenyReason('');
    }
  };

  const pendingReschedules = rescheduleRequests.filter(r => r.status === 'PENDING');
  const pendingCancellations = cancellationRequests.filter(r => r.status === 'PENDING');
  const completedRequests = [
    ...rescheduleRequests.filter(r => r.status !== 'PENDING').map(r => ({ type: 'Reschedule', request: r })),
    ...cancellationRequests.filter(r => r.status !== 'PENDING').map(r => ({ type: 'Cancellation', request: r }))
  ];

  // Filter and search logic
  const getFilteredRequests = () => {
    let filtered = [];

    if (currentTab === 'reschedule') {
      filtered = pendingReschedules;
    } else if (currentTab === 'cancellation') {
      filtered = pendingCancellations;
    } else {
      filtered = completedRequests;
    }

    // Apply status filter (completed tab only)
    if (currentTab === 'completed' && filterStatus !== 'all') {
      filtered = filtered.filter(item => item.request.status.toLowerCase() === filterStatus.toLowerCase());
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const req = currentTab === 'completed' ? item.request : item;
        const guestName = req.booking?.guestName || (req.booking?.user ? `${req.booking.user.firstName} ${req.booking.user.lastName}` : '');
        const email = req.booking?.user?.email || '';
        
        return req.bookingId?.toString().toLowerCase().includes(query) ||
          guestName.toLowerCase().includes(query) ||
          email.toLowerCase().includes(query);
      });
    }

    return filtered;
  };

  // Pagination
  const filteredRequests = getFilteredRequests();
  const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, currentTab]);

  useEffect(() => {
    if (currentTab === 'completed') {
      setFilterStatus('all');
    } else {
      setFilterStatus('pending');
    }
  }, [currentTab]);

  return (
    <SuperAdminLayout activePage="bookings">
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerBadge}>
            <RefreshCw size={18} />
            RESCHEDULE & CANCELLATION
          </div>
          
          <h1 style={styles.headerTitle}>
            Reschedule & Cancellation Management
          </h1>
          
          <p style={styles.headerSubtitle}>
            Manage guest reschedule requests and cancellation approvals
          </p>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <Clock size={24} color="#fbbf24" />
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Pending Reschedules</p>
              <p style={styles.statValue}>
                {pendingReschedules.length}
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <CheckCircle size={24} color="#10b981" />
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Pending Cancellations</p>
              <p style={styles.statValue}>
                {pendingCancellations.length}
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <XCircle size={24} color="#ef4444" />
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Completed Requests</p>
              <p style={styles.statValue}>
                {completedRequests.length}
              </p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <Ban size={24} color="#f97316" />
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Total Requests</p>
              <p style={styles.statValue}>
                {rescheduleRequests.length + cancellationRequests.length}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={styles.tabsCard}>
          <div style={styles.tabsContainer}>
            <div style={styles.tabsList}>
              <button
                onClick={() => setCurrentTab('reschedule')}
                style={{
                  ...styles.tabButton,
                  ...(currentTab === 'reschedule' ? styles.tabButtonActive : {})
                }}
              >
                <RefreshCw size={18} />
                Reschedule Requests
                <span style={styles.tabBadge}>
                  {pendingReschedules.length}
                </span>
              </button>
              <button
                onClick={() => setCurrentTab('cancellation')}
                style={{
                  ...styles.tabButton,
                  ...(currentTab === 'cancellation' ? styles.tabButtonActive : {})
                }}
              >
                <Ban size={18} />
                Cancellation Approvals
                <span style={styles.tabBadge}>
                  {pendingCancellations.length}
                </span>
              </button>
              <button
                onClick={() => setCurrentTab('completed')}
                style={{
                  ...styles.tabButton,
                  ...(currentTab === 'completed' ? styles.tabButtonActive : {})
                }}
              >
                <CheckCircle size={18} />
                Completed Requests
                <span style={styles.tabBadge}>
                  {completedRequests.length}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div style={styles.controlsCard}>
          <div style={styles.searchContainer}>
            <Search size={20} color="#6b7280" />
            <input
              type="text"
              placeholder="Search by booking ID, guest name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterContainer}>
            <Filter size={18} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={styles.filterSelect}
            >
              {currentTab === 'completed' ? (
                <>
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                </>
              ) : (
                <option value="pending">Pending</option>
              )}
            </select>
          </div>

          <button
            onClick={() => {
              if (currentTab === 'reschedule') {
                fetchRescheduleRequests();
              } else if (currentTab === 'cancellation') {
                fetchCancellationRequests();
              } else {
                fetchRescheduleRequests();
                fetchCancellationRequests();
              }
            }}
            style={styles.refreshButton}
          >
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>

        {/* Content Area */}
        {loading ? (
          <div style={styles.loadingContainer}>
            <Loading />
          </div>
        ) : (
          <>
            {currentTab === 'reschedule' ? (
              <RescheduleRequestsTable
                requests={paginatedRequests}
                onApprove={handleApprove}
                onDeny={handleDeny}
              />
            ) : currentTab === 'cancellation' ? (
              <CancellationApprovalsTable 
                requests={paginatedRequests}
                onApprove={handleApprove}
                onDeny={handleDeny}
              />
            ) : (
              <CompletedRequestsTable requests={paginatedRequests} />
            )}

            {/* Pagination */}
            {filteredRequests.length > 0 && (
              <div style={styles.pagination}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
                  }}
                >
                  Previous
                </button>
                
                <span style={styles.paginationInfo}>
                  Page {currentPage} of {totalPages} ({filteredRequests.length} total)
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    ...styles.paginationButton,
                    ...(currentPage === totalPages ? styles.paginationButtonDisabled : {})
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {/* Approve Modal */}
        {showApproveModal && (
          <div style={styles.modalOverlay} onClick={() => setShowApproveModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>
                {currentTab === 'cancellation' ? 'Approve Cancellation Request' : 'Approve Reschedule Request'}
              </h3>
              <p style={styles.modalText}>
                {currentTab === 'cancellation' 
                  ? 'Are you sure you want to approve this cancellation request? The booking will be cancelled and no refund will be issued (as per policy for requests within 7 days of check-in).'
                  : 'Are you sure you want to approve this reschedule request?'
                }
              </p>
              {selectedRequest && (
                <div style={styles.modalDetails}>
                  <p><strong>Booking ID:</strong> {selectedRequest.bookingId}</p>
                  <p><strong>Guest:</strong> {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}</p>
                  {currentTab === 'cancellation' ? (
                    <>
                      <p><strong>Check-in:</strong> {new Date(selectedRequest.booking?.checkInDate).toLocaleDateString()}</p>
                      <p><strong>Check-out:</strong> {new Date(selectedRequest.booking?.checkOutDate).toLocaleDateString()}</p>
                      <p><strong>Reason:</strong> {selectedRequest.reason}</p>
                      <p><strong>Requested:</strong> {new Date(selectedRequest.requestedAt).toLocaleString()}</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Old Dates:</strong> {new Date(selectedRequest.oldCheckIn).toLocaleDateString()} - {new Date(selectedRequest.oldCheckOut).toLocaleDateString()}</p>
                      <p><strong>New Dates:</strong> {new Date(selectedRequest.newCheckIn).toLocaleDateString()} - {new Date(selectedRequest.newCheckOut).toLocaleDateString()}</p>
                    </>
                  )}
                </div>
              )}
              <div style={styles.modalActions}>
                <button onClick={confirmApprove} style={styles.modalConfirmButton}>
                  Approve
                </button>
                <button onClick={() => setShowApproveModal(false)} style={styles.modalCancelButton}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deny Modal */}
        {showDenyModal && (
          <div style={styles.modalOverlay} onClick={() => setShowDenyModal(false)}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>
                {currentTab === 'cancellation' ? 'Deny Cancellation Request' : 'Deny Reschedule Request'}
              </h3>
              <p style={styles.modalText}>
                {currentTab === 'cancellation'
                  ? 'Please provide a reason for denying this cancellation request. The guest will be able to reschedule their booking one time without admin approval.'
                  : 'Please provide a reason for denying this reschedule request:'
                }
              </p>
              {selectedRequest && (
                <div style={styles.modalDetails}>
                  <p><strong>Booking ID:</strong> {selectedRequest.bookingId}</p>
                  <p><strong>Guest:</strong> {selectedRequest.user?.firstName} {selectedRequest.user?.lastName}</p>
                  {currentTab === 'cancellation' && (
                    <>
                      <p><strong>Check-in:</strong> {new Date(selectedRequest.booking?.checkInDate).toLocaleDateString()}</p>
                      <p><strong>Reason:</strong> {selectedRequest.reason}</p>
                    </>
                  )}
                </div>
              )}
              <textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="Enter reason for denial..."
                style={styles.modalTextarea}
                rows={4}
              />
              <div style={styles.modalActions}>
                <button onClick={confirmDeny} style={styles.modalDenyButton}>
                  Deny Request
                </button>
                <button onClick={() => setShowDenyModal(false)} style={styles.modalCancelButton}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

// Reschedule Requests Table Component
function RescheduleRequestsTable({ requests, onApprove, onDeny }) {
  if (requests.length === 0) {
    return (
      <div style={styles.emptyState}>
        <RefreshCw size={48} color="#d1d5db" />
        <h3 style={styles.emptyStateTitle}>No Reschedule Requests</h3>
        <p style={styles.emptyStateText}>
          There are no reschedule requests at the moment.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.tableCard}>
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.tableHead}>
            <tr>
              <th style={styles.tableHeader}>Booking ID</th>
              <th style={styles.tableHeader}>Guest Name</th>
              <th style={styles.tableHeader}>Old Dates</th>
              <th style={styles.tableHeader}>New Requested Dates</th>
              <th style={styles.tableHeader}>Reason</th>
              <th style={styles.tableHeader}>Status</th>
              <th style={styles.tableHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request) => (
              <tr key={request.id} style={styles.tableRow}>
                <td style={styles.tableCell}>
                  <span style={styles.bookingId}>#{request.bookingId}</span>
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.guestInfo}>
                    <User size={16} color="#6b7280" />
                    <span>{request.booking?.guestName || (request.booking?.user ? `${request.booking.user.firstName} ${request.booking.user.lastName}` : 'Unknown Guest')}</span>
                  </div>
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.dateInfo}>
                    {new Date(request.oldCheckIn).toLocaleDateString()} -<br />
                    {new Date(request.oldCheckOut).toLocaleDateString()}
                  </div>
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.dateInfo}>
                    {new Date(request.newCheckIn).toLocaleDateString()} -<br />
                    {new Date(request.newCheckOut).toLocaleDateString()}
                  </div>
                </td>
                <td style={styles.tableCell}>
                  <div style={styles.reasonText}>
                    {request.context || 'No reason provided'}
                  </div>
                </td>
                <td style={styles.tableCell}>
                  <span style={{
                    ...styles.statusBadge,
                    ...(request.status === 'PENDING' ? styles.statusPending :
                        request.status === 'APPROVED' ? styles.statusApproved :
                        styles.statusDenied)
                  }}>
                    {request.status}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  {request.status === 'PENDING' ? (
                    <div style={styles.actionButtons}>
                      <button
                        onClick={() => onApprove(request)}
                        style={styles.approveButton}
                        title="Approve"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => onDeny(request)}
                        style={styles.denyButton}
                        title="Deny"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  ) : (
                    <span style={styles.noAction}>-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Cancellation Approvals Table Component (Placeholder)
function CancellationApprovalsTable({ requests, onApprove, onDeny }) {
  if (!requests || requests.length === 0) {
    return (
      <div style={styles.emptyState}>
        <Ban size={48} color="#d1d5db" />
        <h3 style={styles.emptyStateTitle}>No Cancellation Requests</h3>
        <p style={styles.emptyStateText}>
          There are currently no pending cancellation requests.
        </p>
        <div style={styles.infoBox}>
          <Info size={20} color="#3b82f6" />
          <p style={styles.infoText}>
            Guest cancellation requests for bookings within 7 days of check-in will appear here for approval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>Booking ID</th>
            <th style={styles.tableHeader}>Guest</th>
            <th style={styles.tableHeader}>Check-in Date</th>
            <th style={styles.tableHeader}>Reason</th>
            <th style={styles.tableHeader}>Requested</th>
            <th style={styles.tableHeader}>Status</th>
            <th style={styles.tableHeader}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => {
            const statusColors = {
              PENDING: { bg: '#fef3c7', text: '#92400e', border: '#fbbf24' },
              APPROVED: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
              DENIED: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' }
            };
            const colors = statusColors[request.status] || statusColors.PENDING;

            return (
              <tr key={request.id} style={styles.tableRow}>
                <td style={styles.tableCell}>{request.bookingId}</td>
                <td style={styles.tableCell}>
                  {request.user?.firstName} {request.user?.lastName}
                  <br />
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {request.user?.email}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  {request.booking?.checkIn ? new Date(request.booking.checkIn).toLocaleDateString() : 'N/A'}
                </td>
                <td style={styles.tableCell}>
                  <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {request.reason}
                  </div>
                </td>
                <td style={styles.tableCell}>
                  {new Date(request.requestedAt).toLocaleDateString()}
                  <br />
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {new Date(request.requestedAt).toLocaleTimeString()}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`
                  }}>
                    {request.status}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  {request.status === 'PENDING' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => onApprove(request)}
                        style={styles.approveButton}
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => onDeny(request)}
                        style={styles.denyButton}
                      >
                        <XCircle size={16} />
                        Deny
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {request.status === 'APPROVED' ? 'Approved' : 'Denied'}
                      {request.decidedAt && (
                        <>
                          <br />
                          {new Date(request.decidedAt).toLocaleDateString()}
                        </>
                      )}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CompletedRequestsTable({ requests }) {
  if (!requests || requests.length === 0) {
    return (
      <div style={styles.emptyState}>
        <CheckCircle size={48} color="#d1d5db" />
        <h3 style={styles.emptyStateTitle}>No Completed Requests</h3>
        <p style={styles.emptyStateText}>
          Approved or denied requests will appear here.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.tableHeader}>Type</th>
            <th style={styles.tableHeader}>Booking ID</th>
            <th style={styles.tableHeader}>Guest</th>
            <th style={styles.tableHeader}>Details</th>
            <th style={styles.tableHeader}>Status</th>
            <th style={styles.tableHeader}>Decided</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((item) => {
            const request = item.request;
            const statusColors = {
              APPROVED: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
              DENIED: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' }
            };
            const colors = statusColors[request.status] || statusColors.APPROVED;
            const guestName = request.booking?.guestName || (request.booking?.user ? `${request.booking.user.firstName} ${request.booking.user.lastName}` : 'Unknown Guest');

            const formatMaybeDate = (value) => {
              if (!value) return 'N/A';
              const dt = new Date(value);
              return Number.isNaN(dt.getTime()) ? 'N/A' : dt.toLocaleDateString();
            };

            const details = item.type === 'Reschedule'
              ? `${formatMaybeDate(request.oldCheckIn)} → ${formatMaybeDate(request.newCheckIn)}`
              : `${formatMaybeDate(request.booking?.checkIn || request.booking?.checkInDate)} • ${request.reason || 'No reason provided'}`;

            return (
              <tr key={`${item.type}-${request.id}`} style={styles.tableRow}>
                <td style={styles.tableCell}>{item.type}</td>
                <td style={styles.tableCell}>#{request.bookingId}</td>
                <td style={styles.tableCell}>
                  {guestName}
                  <br />
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                    {request.booking?.user?.email || ''}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  <div style={{ maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {details}
                  </div>
                </td>
                <td style={styles.tableCell}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    backgroundColor: colors.bg,
                    color: colors.text,
                    border: `1px solid ${colors.border}`
                  }}>
                    {request.status}
                  </span>
                </td>
                <td style={styles.tableCell}>
                  {request.decidedAt ? new Date(request.decidedAt).toLocaleDateString() : 'N/A'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Styles
const styles = {
  container: {
    width: '100%',
    padding: '2rem 1.5rem',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    minHeight: '100vh'
  },
  header: {
    background: 'rgba(255,255,255,0.95)',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    marginBottom: '2rem',
    textAlign: 'center'
  },
  headerBadge: {
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
    boxShadow: '0 4px 12px rgba(254, 190, 82, 0.3)'
  },
  headerTitle: {
    color: '#1f2937',
    fontSize: '2.5rem',
    fontWeight: '700',
    margin: '0 0 0.5rem 0',
    background: 'linear-gradient(135deg, #febe52 0%, #E8D381 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: '1.2'
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: '1.1rem',
    margin: 0,
    lineHeight: '1.6'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem'
  },
  statCard: {
    background: 'rgba(255,255,255,0.95)',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default'
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statContent: {
    flex: 1
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0 0 0.25rem 0'
  },
  statValue: {
    fontSize: '1.75rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0
  },
  tabsCard: {
    background: 'rgba(255,255,255,0.95)',
    padding: '1rem',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    marginBottom: '1.5rem'
  },
  tabsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  tabsList: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  tabButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative'
  },
  tabButtonActive: {
    background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
    color: 'white',
    boxShadow: '0 4px 12px rgba(254, 190, 82, 0.3)'
  },
  tabBadge: {
    background: 'rgba(255,255,255,0.3)',
    padding: '0.15rem 0.5rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '700'
  },
  controlsCard: {
    background: 'rgba(255,255,255,0.95)',
    padding: '1.25rem',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  searchContainer: {
    flex: '1 1 300px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#f9fafb',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    fontSize: '0.95rem',
    outline: 'none'
  },
  filterContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: '#f9fafb',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    border: '1px solid #e5e7eb'
  },
  filterSelect: {
    border: 'none',
    background: 'transparent',
    fontSize: '0.95rem',
    outline: 'none',
    cursor: 'pointer',
    fontWeight: '500'
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(254, 190, 82, 0.3)'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '4rem',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '12px'
  },
  tableCard: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '12px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    marginBottom: '1.5rem'
  },
  tableContainer: {
    overflowX: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHead: {
    background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
    color: 'white'
  },
  tableHeader: {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.875rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background 0.2s'
  },
  tableCell: {
    padding: '1rem',
    fontSize: '0.9rem',
    color: '#374151'
  },
  bookingId: {
    fontWeight: '600',
    color: '#febe52'
  },
  guestInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  dateInfo: {
    fontSize: '0.875rem',
    color: '#6b7280',
    lineHeight: '1.4'
  },
  reasonText: {
    maxWidth: '200px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: '0.875rem',
    color: '#6b7280'
  },
  statusBadge: {
    padding: '0.375rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  statusPending: {
    background: '#fef3c7',
    color: '#92400e'
  },
  statusApproved: {
    background: '#d1fae5',
    color: '#065f46'
  },
  statusDenied: {
    background: '#fee2e2',
    color: '#991b1b'
  },
  actionButtons: {
    display: 'flex',
    gap: '0.5rem'
  },
  approveButton: {
    padding: '0.5rem',
    background: 'linear-gradient(135deg, #10b981 0%, #6ee7b7 100%)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  denyButton: {
    padding: '0.5rem',
    background: 'linear-gradient(135deg, #ef4444 0%, #fca5a5 100%)',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noAction: {
    color: '#d1d5db',
    fontSize: '1.25rem'
  },
  emptyState: {
    background: 'rgba(255,255,255,0.95)',
    padding: '4rem 2rem',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
  },
  emptyStateTitle: {
    color: '#1f2937',
    fontSize: '1.5rem',
    fontWeight: '600',
    margin: '1rem 0 0.5rem 0'
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: '1rem',
    margin: 0
  },
  infoBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    marginTop: '2rem',
    padding: '1rem',
    background: '#eff6ff',
    borderRadius: '8px',
    border: '1px solid #bfdbfe'
  },
  infoText: {
    color: '#1e40af',
    fontSize: '0.9rem',
    margin: 0
  },
  pagination: {
    background: 'rgba(255,255,255,0.95)',
    padding: '1rem',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
  },
  paginationButton: {
    padding: '0.5rem 1.25rem',
    background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  paginationButtonDisabled: {
    background: '#e5e7eb',
    color: '#9ca3af',
    cursor: 'not-allowed'
  },
  paginationInfo: {
    fontSize: '0.9rem',
    color: '#6b7280',
    fontWeight: '500'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    background: 'white',
    padding: '2rem',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
  },
  modalTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 1rem 0'
  },
  modalText: {
    fontSize: '1rem',
    color: '#6b7280',
    margin: '0 0 1rem 0'
  },
  modalDetails: {
    background: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
    color: '#374151'
  },
  modalTextarea: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    marginBottom: '1rem',
    outline: 'none'
  },
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end'
  },
  modalConfirmButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #10b981 0%, #6ee7b7 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  modalDenyButton: {
    padding: '0.75rem 1.5rem',
    background: 'linear-gradient(135deg, #ef4444 0%, #fca5a5 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  modalCancelButton: {
    padding: '0.75rem 1.5rem',
    background: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  }
};
