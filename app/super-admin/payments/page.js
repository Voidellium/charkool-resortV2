'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import Loading, { TableLoading, ButtonLoading } from '@/components/Loading';
import { useToast } from '@/components/Toast';
import {
  CreditCard,
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
  Bell,
  Receipt,
  Shield,
  RotateCcw,
  CalendarDays,
  BookOpen,
  AlertCircle,
  Info
} from 'lucide-react';

// Helper: last 7 days YYYY-MM-DD
const getPast7Days = () => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

const TAB_PAGE_SIZE = 10;

const STATUS_TABS = [
  { key: 'to_process', label: 'To Process Payment' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'investigation', label: 'Under Investigation' },
  { key: 'verified', label: 'Verified' },
  { key: 'cleared', label: 'Cleared Case' },
  { key: 'fraud', label: 'Fraud' },
  { key: 'all', label: 'All Payments' },
];

function paymentMatchesTab(payment, tabKey) {
  const verificationStatus = String(payment?.verificationStatus || '').toLowerCase();
  const status = String(payment?.status || '').toLowerCase();
  const flagReason = String(payment?.flagReason || '').toUpperCase();

  switch (tabKey) {
    case 'to_process':
      return status === 'pending';
    case 'flagged':
      return verificationStatus === 'flagged' && !flagReason.startsWith('UNDER_INVESTIGATION') && !flagReason.startsWith('CONFIRMED_FRAUD');
    case 'investigation':
      return flagReason.startsWith('UNDER_INVESTIGATION');
    case 'verified':
      return verificationStatus === 'verified';
    case 'cleared':
      return flagReason.startsWith('CLEARED');
    case 'fraud':
      return flagReason.startsWith('CONFIRMED_FRAUD');
    case 'all':
    default:
      return true;
  }
}

function applyStatusTab(paymentsList, tabKey) {
  return (paymentsList || []).filter((payment) => paymentMatchesTab(payment, tabKey));
}

export default function Payments() {
  const { data: session } = useSession();
  const { success, error, warning, info } = useToast();
  const isSuperAdmin = session?.user?.role === 'SUPERADMIN';

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({ status: '', startDate: '', endDate: '' });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [report, setReport] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  const [activeFilter, setActiveFilter] = useState('all'); // for KPI card filtering
  const [activeStatusTab, setActiveStatusTab] = useState('to_process');
  const [showSupervisorActions, setShowSupervisorActions] = useState(false);
  const [statusTabPage, setStatusTabPage] = useState(() =>
    STATUS_TABS.reduce((acc, tab) => {
      acc[tab.key] = 1;
      return acc;
    }, {})
  );

  // Payment processing state (like cashier)
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [amountTendered, setAmountTendered] = useState("");
  const [amountCustomerPaid, setAmountCustomerPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [noteText, setNoteText] = useState("");
  const [eReceiptModal, setEReceiptModal] = useState({ show: false, receiptData: null });
  const [overrideStatusModal, setOverrideStatusModal] = useState({
    show: false,
    payment: null,
    newStatus: 'Paid',
    reason: '',
  });
  
  // Search and advanced filters
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Checkouts and Reservations state
  const [checkoutTransactions, setCheckoutTransactions] = useState([]);
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [pendingPaymentBookings, setPendingPaymentBookings] = useState([]);
  const [checkoutsLoading, setCheckoutsLoading] = useState(false);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [pendingPaymentsLoading, setPendingPaymentsLoading] = useState(false);

  // Alert Modal state (replaces browser alert())
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info' });
  const showAlert = useCallback((title, message, type = 'info') => {
    setAlertModal({ show: true, title, message, type });
    if (type === 'success') success(message, { title });
    else if (type === 'error') error(message, { title });
    else if (type === 'warning') warning(message, { title });
    else info(message, { title });
  }, [success, error, warning, info]);

  useEffect(() => {
    fetchPayments();
    fetchCheckoutTransactions();
    fetchUpcomingReservations();
    fetchPendingPaymentBookings();
    // Remove report fetching since we calculate everything from payments data
  }, []);

  async function fetchAllBookingsForAdmin() {
    const all = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const res = await fetch(`/api/bookings?page=${page}&limit=100`);
      if (!res.ok) {
        throw new Error(`Failed to fetch bookings page ${page}`);
      }
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.bookings || []);
      all.push(...rows);

      const next = data?.pagination?.hasNextPage;
      hasNext = Boolean(next);
      page += 1;
      if (!data?.pagination) {
        hasNext = false;
      }
    }

    return all;
  }

  async function fetchCheckoutTransactions() {
    // Checkout actions are handled in Booking Management, not Payment Management.
    setCheckoutTransactions([]);
    setCheckoutsLoading(false);
  }

  async function fetchUpcomingReservations() {
    setReservationsLoading(true);
    try {
      // SuperAdmin sees ALL upcoming reservations (no date limit), across paginated results.
      const bookings = await fetchAllBookingsForAdmin();
        
        // Filter for future check-in dates only
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        const upcoming = bookings.filter(booking => {
          const checkIn = booking.checkInDate || booking.checkIn || booking.startDate;
          if (!checkIn) return false;
          
          const checkInDate = new Date(checkIn);
          const checkInDateOnly = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
          
          // Include all future bookings
          const isFuture = checkInDateOnly >= today;
          const isNotCancelled = !booking.status || booking.status.toLowerCase() !== 'cancelled';
          
          return isFuture && isNotCancelled;
        });
        
        // Sort by check-in date (earliest first)
        upcoming.sort((a, b) => {
          const dateA = new Date(a.checkInDate || a.checkIn || a.startDate);
          const dateB = new Date(b.checkInDate || b.checkIn || b.startDate);
          return dateA - dateB;
        });
        
      setUpcomingReservations(upcoming);
      console.log('Fetched upcoming reservations:', upcoming.length);
    } catch (e) {
      console.error('Failed to fetch upcoming reservations:', e);
      setUpcomingReservations([]);
    } finally {
      setReservationsLoading(false);
    }
  }

  async function fetchPendingPaymentBookings() {
    setPendingPaymentsLoading(true);
    try {
      // Fetch all bookings with Confirmed status and Pending payment, across paginated results.
      const bookings = await fetchAllBookingsForAdmin();
        
        // Filter for Confirmed bookings with Pending payments
        const pending = bookings.filter(booking => {
          const isConfirmed = booking.status === 'Confirmed';
          const isPendingPayment = booking.paymentStatus === 'Pending';
          return isConfirmed && isPendingPayment;
        });
        
        // Sort by check-in date (most recent first)
        pending.sort((a, b) => {
          const dateA = new Date(a.checkInDate || a.checkIn || a.startDate || a.createdAt);
          const dateB = new Date(b.checkInDate || b.checkIn || b.startDate || b.createdAt);
          return dateB - dateA;
        });
        
      setPendingPaymentBookings(pending);
      console.log('Fetched pending payment bookings:', pending.length);
    } catch (e) {
      console.error('Failed to fetch pending payment bookings:', e);
      setPendingPaymentBookings([]);
    } finally {
      setPendingPaymentsLoading(false);
    }
  }

  // Cashier revenue tracker state (inside component)
  const [selectedDate, setSelectedDate] = useState(getPast7Days()[0]);
  const [cashierRevenue, setCashierRevenue] = useState([]);
  const [cashiers, setCashiers] = useState([]);

  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueError, setRevenueError] = useState("");
  useEffect(() => {
    async function fetchCashierRevenue(date) {
      setRevenueLoading(true);
      setRevenueError("");
      try {
        const res = await fetch(`/api/superadmin/cashier-revenue?date=${date}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setCashierRevenue(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Revenue fetch error", e);
        setCashierRevenue([]);
        setRevenueError("Unable to load revenue data.");
      } finally {
        setRevenueLoading(false);
      }
    }
    fetchCashierRevenue(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    async function fetchCashiers() {
      try {
        const res = await fetch('/api/superadmin/cashiers');
        const data = await res.json();
        setCashiers(Array.isArray(data) ? data : []);
      } catch (e) {
        setCashiers([]);
      }
    }
    fetchCashiers();
  }, []);

  // UI for cashier daily revenue tracking
  const renderCashierRevenueSection = () => (
    <div style={{ marginBottom: '1rem', background: 'white', borderRadius: '12px', padding: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#1e293b' }}>
        <CreditCard size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
        Cashier Daily Revenue Tracker
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
        <label htmlFor="date-select" style={{ fontWeight: 500 }}>Select Date:</label>
        <select id="date-select" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {getPast7Days().map(date => (
            <option key={date} value={date}>{date}</option>
          ))}
        </select>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Cashier</th>
            <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Total Revenue (₱)</th>
          </tr>
        </thead>
        <tbody>
          {revenueLoading ? (
            <tr><td colSpan={2} style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>Loading…</td></tr>
          ) : revenueError ? (
            <tr><td colSpan={2} style={{ textAlign: 'center', padding: '1rem', color: '#b91c1c' }}>{revenueError}</td></tr>
          ) : cashierRevenue.length === 0 ? (
            <tr><td colSpan={2} style={{ textAlign: 'center', padding: '1rem', color: '#64748b' }}>No records for this date.</td></tr>
          ) : (
            cashierRevenue.map((row, idx) => (
              <tr key={row.cashier || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '0.75rem' }}>{row.cashier}</td>
                <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700 }}>{Number(row.total / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.5rem' }}>
        Only records from the past 7 days are available. Older records are automatically removed.
      </div>
    </div>
  );

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
      // Also refresh checkout transactions and pending payment bookings
      await fetchCheckoutTransactions();
      await fetchPendingPaymentBookings();
    } catch (error) {
      console.error('Error refreshing payments:', error);
    } finally {
      setRefreshing(false);
    }
  }

  // Superadmin actions mirroring cashier
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
        await logAuditTrail('VERIFY_PAYMENT', paymentId, {
          paymentId,
          note,
          verifiedBy: session?.user?.name,
          timestamp: new Date().toISOString()
        });
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
      await logAuditTrail('POLL_PAYMENT_STATUS', paymentId, {
        paymentId,
        bookingId,
        result: data,
        polledBy: session?.user?.name,
        timestamp: new Date().toISOString()
      });
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

  // Process Payment functions (like cashier)
  function openProcessPaymentModal(payment) {
    if (!payment) return;
    setProcessingPayment(payment);
    setShowProcessModal(true);
    
    const cents = Number(payment?.amount || payment?.totalPrice || 0);
    const requiredAmount = (cents / 100).toFixed(2);
    setAmountTendered(requiredAmount);
    setAmountCustomerPaid(requiredAmount); // Pre-fill with required amount
    setPaymentMethod((payment?.method || payment?.provider || "").toLowerCase());
    setReferenceNo(payment?.referenceId || payment?.reference || `REF-${Date.now()}`);
    setNoteText("");
    
    // Focus on customer paid amount field
    setTimeout(() => {
      const input = document.querySelector('input[name="amountCustomerPaid"]');
      if (input) input.focus();
    }, 100);
  }

  function closeProcessModal() {
    setShowProcessModal(false);
    setProcessingPayment(null);
    setAmountTendered("");
    setAmountCustomerPaid("");
    setPaymentMethod("");
    setReferenceNo("");
    setNoteText("");
  }

  async function processPayment() {
    const payment = processingPayment;
    if (!payment) return;

    if (payment?.isCheckout || String(payment?.type || '').toLowerCase() === 'checkout') {
      showAlert('Checkout Restricted', 'Checkout must be completed in Booking Management.', 'warning');
      return;
    }
    
    setActionLoading(prev => ({...prev, process: true}));
    try {
      const customerPaidInCents = Math.round((parseFloat(amountCustomerPaid || amountTendered || "0") || 0) * 100);
      const requiredAmount = payment?.totalPrice || payment?.amount || 0;
      const changeAmount = Math.max(0, customerPaidInCents - requiredAmount);
      
      // Generate receipt data
      const uniqueReceiptId = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const receiptData = {
        id: uniqueReceiptId,
        paymentId: payment.id,
        guestName: payment.booking?.user?.name || payment.booking?.guestName || 'Guest',
        email: payment.booking?.user?.email || '',
        contact: payment.booking?.user?.contactNumber || '',
        amountRequired: requiredAmount,
        amountPaid: customerPaidInCents,
        changeAmount: changeAmount,
        paymentMethod: paymentMethod,
        referenceNo: referenceNo,
        bookingType: payment.booking?.type || 'Booking',
        processedBy: session?.user?.name || 'Super Admin',
        processedAt: new Date().toISOString(),
        notes: noteText,
        transactionDate: new Date().toISOString().split('T')[0]
      };

      const isBookingContext = ['walkin', 'booking'].includes(String(payment?.type || '').toLowerCase());
      let updateRes;

      if (isBookingContext) {
        const bookingId = payment?.bookingId || payment?.id || payment?.booking?.id;
        updateRes = await fetch('/api/bookings/update-payment-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId,
            paymentStatus: customerPaidInCents >= Number(payment?.totalPrice || payment?.amount || 0) ? 'Paid' : 'Partial',
            paymentMethod,
            referenceNo,
            amountPaid: customerPaidInCents,
            receiptData,
            processContext: 'arrival'
          })
        });
      } else {
        updateRes = await fetch('/api/payments/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: payment.id,
            amount: customerPaidInCents,
            customerPaid: customerPaidInCents,
            status: 'Paid',
            paymentMethod,
            referenceNo,
            receiptData
          })
        });
      }

      if (!updateRes?.ok) {
        const payload = await updateRes?.json().catch(() => ({}));
        throw new Error(payload?.error || 'Failed to update payment records');
      }

      // Show e-receipt
      setEReceiptModal({ show: true, receiptData });
      
      // Log audit trail
      await logAuditTrail('PROCESS_PAYMENT', payment.id, {
        paymentId: payment.id,
        amountPaid: customerPaidInCents,
        paymentMethod,
        referenceNo,
        receiptId: uniqueReceiptId,
        processedBy: session?.user?.name,
        timestamp: new Date().toISOString()
      });

      closeProcessModal();
      await refreshPayments();
      
      showAlert('Payment Processed', 'Payment processed successfully! E-receipt ready to view.', 'success');
    } catch (e) {
      console.error('Process payment error', e);
      showAlert('Process Failed', 'Failed to process payment', 'error');
    } finally {
      setActionLoading(prev => ({...prev, process: false}));
    }
  }

  function downloadReceipt(receiptData) {
    const receiptContent = `
===================================
       E-Receipt
===================================
Receipt ID: ${receiptData.id}
Date: ${new Date(receiptData.processedAt).toLocaleString()}

Guest Information:
Name: ${receiptData.guestName}
Email: ${receiptData.email}
Contact: ${receiptData.contact || 'N/A'}

Transaction Details:
Reference: ${receiptData.paymentId}
Booking Type: ${receiptData.bookingType}

Payment Information:
Required Amount: ₱${(receiptData.amountRequired/100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Amount Paid: ₱${(receiptData.amountPaid/100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Change Due: ₱${(receiptData.changeAmount/100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
Payment Method: ${receiptData.paymentMethod}
Reference No: ${receiptData.referenceNo || 'N/A'}

Processed by: ${receiptData.processedBy}

${receiptData.notes ? `Notes: ${receiptData.notes}` : ''}

===================================
   Thank you for staying with us!
===================================
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt-${receiptData.id}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showAlert('Download Complete', 'Receipt downloaded successfully!', 'success');
  }

  // Batch operations
  function toggleRowSelection(id) {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    const filtered = applyStatusTab(filterPayments(), activeStatusTab);
    if (selectedRows.size > 0 && selectedRows.size === filtered.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filtered.map(p => p.id)));
    }
  }

  async function batchVerify() {
    if (selectedRows.size === 0) return;
    setActionLoading(prev => ({...prev, batch: true}));
    try {
      for (const paymentId of selectedRows) {
        await verifyPayment(paymentId, 'Batch verified by Super Admin');
      }
      showAlert('Batch Verified', `${selectedRows.size} payment(s) verified successfully!`, 'success');
      setSelectedRows(new Set());
      await refreshPayments();
    } catch (e) {
      showAlert('Verification Failed', 'Batch verification failed', 'error');
    } finally {
      setActionLoading(prev => ({...prev, batch: false}));
    }
  }

  async function batchFlag() {
    if (selectedRows.size === 0) return;
    const reason = prompt('Enter flag reason for all selected payments:');
    if (!reason) return;
    
    setActionLoading(prev => ({...prev, batch: true}));
    try {
      for (const paymentId of selectedRows) {
        await flagPayment(paymentId, reason);
      }
      showAlert('Batch Flagged', `${selectedRows.size} payment(s) flagged successfully!`, 'success');
      setSelectedRows(new Set());
      await refreshPayments();
    } catch (e) {
      showAlert('Flagging Failed', 'Batch flagging failed', 'error');
    } finally {
      setActionLoading(prev => ({...prev, batch: false}));
    }
  }

  // CSV Export
  function exportCSV() {
    try {
      const filtered = filterPayments();
      const rows = [
        ['Payment ID', 'Booking ID', 'Guest', 'Amount (PHP)', 'Method', 'Status', 'Verified', 'Date']
      ];
      filtered.forEach(p => {
        const guest = p.booking?.user?.name || p.booking?.guestName || 'N/A';
        const amt = (Number(p.amount || 0) / 100).toFixed(2);
        const method = p.method || p.provider || '';
        const status = p.status || '';
        const verified = p.verificationStatus || '';
        const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '';
        rows.push([p.id, p.bookingId, guest, amt, method, status, verified, date]);
      });
      const csv = rows.map(r => r.map((c) => {
        const s = String(c ?? '');
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
      }).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `superadmin-payments-${new Date().toISOString().slice(0,10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showAlert('Export Complete', 'Payment data exported successfully!', 'success');
    } catch (e) {
      showAlert('Export Failed', 'Failed to export CSV', 'error');
    }
  }

  // Higher Authority Override Functions
  async function overridePaymentStatus(paymentId, newStatus, reason) {
    if (!reason || !reason.trim()) {
      showAlert('Reason Required', 'Please provide a reason for overriding the payment status', 'warning');
      return;
    }
    
    setActionLoading(prev => ({...prev, [`override_${paymentId}`]: true}));
    try {
      const res = await fetch('/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentId, 
          action: 'override_status', 
          newStatus,
          reason 
        }),
      });
      const data = await res.json();
      
      if (data?.success) {
        await logAuditTrail('OVERRIDE_PAYMENT_STATUS', paymentId, {
          paymentId,
          oldStatus: selectedPayment?.status,
          newStatus,
          reason,
          overriddenBy: session?.user?.name,
          timestamp: new Date().toISOString()
        });
        await refreshPayments();
        showAlert('Status Overridden', `Payment status overridden to ${newStatus} successfully!`, 'success');
      } else {
        showAlert('Override Failed', data?.error || 'Failed to override payment status', 'error');
      }
      return data;
    } catch (e) {
      console.error('Override status error', e);
      showAlert('Override Failed', 'Failed to override payment status', 'error');
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`override_${paymentId}`]: false}));
    }
  }

  function openOverrideStatusModal(payment) {
    if (!payment) return;

    setOverrideStatusModal({
      show: true,
      payment,
      newStatus: payment?.status || 'Paid',
      reason: '',
    });
  }

  function closeOverrideStatusModal() {
    setOverrideStatusModal({
      show: false,
      payment: null,
      newStatus: 'Paid',
      reason: '',
    });
  }

  async function submitOverrideStatusModal() {
    const payment = overrideStatusModal.payment;
    if (!payment) return;

    if (!overrideStatusModal.reason.trim()) {
      showAlert('Reason Required', 'Please provide a reason for overriding the payment status', 'warning');
      return;
    }

    await overridePaymentStatus(payment.id, overrideStatusModal.newStatus, overrideStatusModal.reason.trim());
    closeOverrideStatusModal();
  }

  async function unverifyPayment(paymentId, reason) {
    if (!reason || !reason.trim()) {
      showAlert('Reason Required', 'Please provide a reason for unverifying this payment', 'warning');
      return;
    }
    
    setActionLoading(prev => ({...prev, [`unverify_${paymentId}`]: true}));
    try {
      const res = await fetch('/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentId, 
          action: 'unverify',
          reason 
        }),
      });
      const data = await res.json();
      
      if (data?.success) {
        await logAuditTrail('UNVERIFY_PAYMENT', paymentId, {
          paymentId,
          reason,
          unverifiedBy: session?.user?.name,
          timestamp: new Date().toISOString()
        });
        await refreshPayments();
        showAlert('Payment Unverified', 'Payment unverified successfully!', 'success');
      } else {
        showAlert('Unverify Failed', data?.error || 'Failed to unverify payment', 'error');
      }
      return data;
    } catch (e) {
      console.error('Unverify error', e);
      showAlert('Unverify Failed', 'Failed to unverify payment', 'error');
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`unverify_${paymentId}`]: false}));
    }
  }

  async function editPaymentMetadata(paymentId, updates) {
    if (!updates || Object.keys(updates).length === 0) {
      showAlert('No Changes', 'No changes to save', 'info');
      return;
    }
    
    setActionLoading(prev => ({...prev, [`edit_${paymentId}`]: true}));
    try {
      const res = await fetch('/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentId, 
          action: 'edit_metadata',
          updates 
        }),
      });
      const data = await res.json();
      
      if (data?.success) {
        await logAuditTrail('EDIT_PAYMENT_METADATA', paymentId, {
          paymentId,
          updates,
          editedBy: session?.user?.name,
          timestamp: new Date().toISOString()
        });
        await refreshPayments();
        showAlert('Metadata Updated', 'Payment metadata updated successfully!', 'success');
      } else {
        showAlert('Update Failed', data?.error || 'Failed to update payment metadata', 'error');
      }
      return data;
    } catch (e) {
      console.error('Edit metadata error', e);
      showAlert('Update Failed', 'Failed to update payment metadata', 'error');
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`edit_${paymentId}`]: false}));
    }
  }

  async function reassignCashier(paymentId, newCashierId, newCashierName, reason) {
    if (!newCashierId || !reason || !reason.trim()) {
      showAlert('Missing Information', 'Please provide both a cashier and reason for reassignment', 'warning');
      return;
    }
    
    setActionLoading(prev => ({...prev, [`reassign_${paymentId}`]: true}));
    try {
      const res = await fetch('/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentId, 
          action: 'reassign_cashier',
          newCashierId,
          reason 
        }),
      });
      const data = await res.json();
      
      if (data?.success) {
        await logAuditTrail('REASSIGN_CASHIER', paymentId, {
          paymentId,
          oldCashier: selectedPayment?.verifiedBy?.name,
          newCashier: newCashierName,
          newCashierId,
          reason,
          reassignedBy: session?.user?.name,
          timestamp: new Date().toISOString()
        });
        await refreshPayments();
        showAlert('Reassigned', `Payment reassigned to ${newCashierName} successfully!`, 'success');
      } else {
        showAlert('Reassign Failed', data?.error || 'Failed to reassign cashier', 'error');
      }
      return data;
    } catch (e) {
      console.error('Reassign cashier error', e);
      showAlert('Reassign Failed', 'Failed to reassign cashier', 'error');
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`reassign_${paymentId}`]: false}));
    }
  }

  async function requestReview(paymentId, reason) {
    if (!reason || !reason.trim()) {
      showAlert('Reason Required', 'Please provide a reason for review request', 'warning');
      return;
    }

    setActionLoading(prev => ({ ...prev, [`review_${paymentId}`]: true }));
    try {
      const res = await fetch('/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'request_review', reason })
      });
      const data = await res.json();
      if (!data?.success) {
        showAlert('Request Failed', data?.error || 'Failed to mark payment for review', 'error');
        return;
      }
      await refreshPayments();
      showAlert('Marked For Review', 'Payment has been marked for supervisor review', 'success');
    } catch (e) {
      console.error('request review error', e);
      showAlert('Request Failed', 'Failed to mark payment for review', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`review_${paymentId}`]: false }));
    }
  }

  async function startInvestigation(paymentId, reason) {
    if (!reason || !reason.trim()) {
      showAlert('Reason Required', 'Please provide investigation context', 'warning');
      return;
    }

    setActionLoading(prev => ({ ...prev, [`investigate_${paymentId}`]: true }));
    try {
      const res = await fetch('/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'start_investigation', reason })
      });
      const data = await res.json();
      if (!data?.success) {
        showAlert('Investigation Failed', data?.error || 'Failed to start investigation', 'error');
        return;
      }
      await refreshPayments();
      showAlert('Investigation Started', 'Case moved to investigation', 'success');
    } catch (e) {
      console.error('start investigation error', e);
      showAlert('Investigation Failed', 'Failed to start investigation', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`investigate_${paymentId}`]: false }));
    }
  }

  async function clearCase(paymentId, reason) {
    if (!reason || !reason.trim()) {
      showAlert('Reason Required', 'Please provide a resolution note', 'warning');
      return;
    }

    setActionLoading(prev => ({ ...prev, [`clear_${paymentId}`]: true }));
    try {
      const res = await fetch('/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'clear_case', reason })
      });
      const data = await res.json();
      if (!data?.success) {
        showAlert('Clear Failed', data?.error || 'Failed to clear case', 'error');
        return;
      }
      await refreshPayments();
      showAlert('Case Cleared', 'Payment case marked as cleared', 'success');
    } catch (e) {
      console.error('clear case error', e);
      showAlert('Clear Failed', 'Failed to clear case', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`clear_${paymentId}`]: false }));
    }
  }

  async function confirmFraud(paymentId, reason) {
    if (!reason || !reason.trim()) {
      showAlert('Reason Required', 'Please provide fraud confirmation reason', 'warning');
      return;
    }

    setActionLoading(prev => ({ ...prev, [`fraud_${paymentId}`]: true }));
    try {
      const res = await fetch('/api/payments/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, action: 'confirm_fraud', reason })
      });
      const data = await res.json();
      if (!data?.success) {
        showAlert('Fraud Update Failed', data?.error || 'Failed to confirm fraud', 'error');
        return;
      }
      await refreshPayments();
      showAlert('Fraud Confirmed', 'Case marked as confirmed fraud', 'success');
    } catch (e) {
      console.error('confirm fraud error', e);
      showAlert('Fraud Update Failed', 'Failed to confirm fraud', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`fraud_${paymentId}`]: false }));
    }
  }

  function filterPayments() {
    if (!Array.isArray(payments)) return [];
    let filtered = payments.filter((p) => {
      const createdAt = new Date(p.createdAt);
      const startDateMatch = filters.startDate ? createdAt >= new Date(filters.startDate) : true;
      const endDateMatch = filters.endDate ? createdAt <= new Date(filters.endDate) : true;
      const statusMatch = filters.status ? p.status === filters.status : true;
      
      // Search query match
      const q = (searchQuery || "").toLowerCase();
      const searchMatch = !q || 
        p.booking?.user?.name?.toLowerCase().includes(q) ||
        p.booking?.guestName?.toLowerCase().includes(q) ||
        p.id?.toString().includes(q) ||
        p.bookingId?.toString().includes(q);
      
      // Payment method filter
      const methodMatch = !paymentMethodFilter || 
        (p.method || p.provider || '').toLowerCase() === paymentMethodFilter.toLowerCase();
      
      return statusMatch && startDateMatch && endDateMatch && searchMatch && methodMatch;
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

  useEffect(() => {
    const count = applyStatusTab(filterPayments(), activeStatusTab).length;
    const pages = Math.max(1, Math.ceil(count / TAB_PAGE_SIZE));
    setStatusTabPage((prev) => {
      const nextPage = Math.min(prev[activeStatusTab] || 1, pages);
      if (nextPage === (prev[activeStatusTab] || 1)) return prev;
      return { ...prev, [activeStatusTab]: nextPage };
    });
  }, [activeStatusTab, payments, filters.status, filters.startDate, filters.endDate, searchQuery, paymentMethodFilter, activeFilter]);

  useEffect(() => {
    setStatusTabPage((prev) => {
      if ((prev[activeStatusTab] || 1) === 1) return prev;
      return { ...prev, [activeStatusTab]: 1 };
    });
  }, [activeStatusTab, searchQuery, paymentMethodFilter, filters.startDate, filters.endDate, filters.status, activeFilter]);

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
    gap: '1rem',
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

  const baseFilteredPayments = filterPayments();
  const tabFilteredPayments = applyStatusTab(baseFilteredPayments, activeStatusTab);
  const tabCounts = STATUS_TABS.reduce((acc, tab) => {
    acc[tab.key] = applyStatusTab(baseFilteredPayments, tab.key).length;
    return acc;
  }, {});

  const currentStatusTabPage = statusTabPage[activeStatusTab] || 1;
  const totalStatusTabPages = Math.max(1, Math.ceil(tabFilteredPayments.length / TAB_PAGE_SIZE));
  const pagedTabPayments = tabFilteredPayments.slice(
    (currentStatusTabPage - 1) * TAB_PAGE_SIZE,
    currentStatusTabPage * TAB_PAGE_SIZE
  );

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
              <span style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1 }}>₱</span>
            </div>
            <div style={styles.kpiContent}>
              <h3 style={styles.kpiTitle}>Total Revenue (Paid)</h3>
              <p style={styles.kpiValue}>
                ₱ {(() => {
                  const paidPayments = payments.filter(p => {
                    const status = String(p.status || '').toLowerCase();
                    return status === 'paid' || status === 'reservation' || status === 'partial' || status === 'completed';
                  });
                  const totalRevenue = paidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                  return formatAmount(totalRevenue);
                })()}
              </p>
              <span style={styles.kpiChange}>
                <TrendingUp size={14} style={{ marginRight: '4px' }} />
                {payments.filter(p => {
                  const status = String(p.status || '').toLowerCase();
                  return status === 'paid' || status === 'reservation' || status === 'partial' || status === 'completed';
                }).length} paid transactions
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

        <div style={styles.statusTabsBar}>
          {STATUS_TABS.map((tab) => {
            const isActive = activeStatusTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveStatusTab(tab.key);
                  setSelectedRows(new Set());
                }}
                style={{
                  ...styles.statusTabButton,
                  ...(isActive ? styles.statusTabButtonActive : {}),
                }}
              >
                <span>{tab.label}</span>
                <span style={{ ...styles.statusTabCount, ...(isActive ? styles.statusTabCountActive : {}) }}>
                  {tabCounts[tab.key] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {activeStatusTab === 'to_process' && (
          <>
            {/* Cashier Daily Revenue Section */}
            {renderCashierRevenueSection()}

            {/* Today's Scheduled Checkouts Section */}
            <div style={{ marginBottom: '1rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)', color: 'white' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={20} /> Today's Scheduled Checkouts
            </h2>
            <p style={{ margin: '0.35rem 0 0 0', opacity: 0.9, fontSize: '0.88rem' }}>Process payments for guests checking out today ({checkoutTransactions.length} checkouts)</p>
          </div>
          <div style={{ padding: '1rem' }}>
            {checkoutsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading checkouts...</div>
            ) : checkoutTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <Calendar size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No checkouts scheduled for today</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Booking ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Guest</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Checkout Date</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem' }}>Total Amount</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem' }}>Balance Due</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkoutTransactions.slice(0, 5).map((checkout) => {
                      const totalAmount = checkout.totalPrice || 0;
                      const paidAmount = (checkout.payments || [])
                        .filter(p => p.status === 'Paid')
                        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const remainingBalance = totalAmount - paidAmount;
                      const isUnpaid = remainingBalance > 0;
                      
                      return (
                        <tr key={checkout.id} style={{ borderBottom: '1px solid #f1f5f9', background: isUnpaid ? '#fef2f2' : 'white' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#2563eb', fontWeight: 600 }}>
                              #{checkout.id.toString().slice(-8)}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{checkout.user?.name || checkout.guestName || 'Guest'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{checkout.user?.email || ''}</div>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            {new Date(checkout.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                            ₱{(totalAmount / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: isUnpaid ? '#dc2626' : '#059669' }}>
                            {isUnpaid ? 
                              `₱${(remainingBalance / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : 
                              'Paid'
                            }
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {isUnpaid ? (
                              <button
                                onClick={() => {
                                  const checkoutPayment = {
                                    ...checkout,
                                    amount: remainingBalance,
                                    totalPrice: remainingBalance,
                                    type: 'checkout',
                                    isCheckout: true
                                  };
                                  openProcessPaymentModal(checkoutPayment);
                                }}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  margin: '0 auto'
                                }}
                              >
                                <CreditCard size={14} />
                                Process Payment
                              </button>
                            ) : (
                              <span style={{ color: '#059669', fontWeight: 600, fontSize: '0.875rem' }}>✓ Complete</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {checkoutTransactions.length > 5 && (
                  <div style={{ textAlign: 'center', padding: '1rem', borderTop: '1px solid #e2e8f0', marginTop: '1rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                      Showing 5 of {checkoutTransactions.length} checkouts
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

          {/* Confirmed Bookings Awaiting Payment (Walk-ins) */}
          <div style={{ marginBottom: '1rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', color: 'white' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={20} /> Walk-in Bookings - Payment Required
            </h2>
            <p style={{ margin: '0.35rem 0 0 0', opacity: 0.9, fontSize: '0.88rem' }}>Process payments for confirmed walk-in bookings ({pendingPaymentBookings.length} bookings)</p>
          </div>
          <div style={{ padding: '1rem' }}>
            {pendingPaymentsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading pending payments...</div>
            ) : pendingPaymentBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <CheckCircle size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No confirmed bookings with pending payments</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Booking ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Guest</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Check-in</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Check-out</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem' }}>Total Amount</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPaymentBookings.slice(0, 10).map((booking) => {
                      const totalAmount = booking.totalPrice || 0;
                      
                      return (
                        <tr key={booking.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#fef2f2' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#2563eb', fontWeight: 600 }}>
                              #{booking.id.toString().slice(-8)}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{booking.user?.name || booking.guestName || 'Guest'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{booking.user?.email || ''}</div>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            {new Date(booking.checkIn || booking.checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            {new Date(booking.checkOut || booking.checkOutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>
                            ₱{(totalAmount / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{ 
                              padding: '0.375rem 0.75rem', 
                              background: '#fef3c7', 
                              color: '#92400e', 
                              borderRadius: '9999px', 
                              fontSize: '0.75rem', 
                              fontWeight: 600 
                            }}>
                              Payment Pending
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                const walkInPayment = {
                                  ...booking,
                                  amount: totalAmount,
                                  type: 'walkin',
                                  isCheckout: true
                                };
                                openProcessPaymentModal(walkInPayment);
                              }}
                              style={{
                                padding: '0.5rem 1rem',
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                margin: '0 auto'
                              }}
                            >
                              <CreditCard size={14} />
                              Process Payment
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {pendingPaymentBookings.length > 10 && (
                  <div style={{ textAlign: 'center', padding: '1rem', borderTop: '1px solid #e2e8f0', marginTop: '1rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                      Showing 10 of {pendingPaymentBookings.length} bookings
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>

          {/* Upcoming Reservations Section (ALL records - no date limit) */}
          <div style={{ marginBottom: '1rem', background: 'white', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={20} /> All Upcoming Reservations
            </h2>
            <p style={{ margin: '0.35rem 0 0 0', opacity: 0.9, fontSize: '0.88rem' }}>View all future reservations - no date restrictions ({upcomingReservations.length} reservations)</p>
          </div>
          <div style={{ padding: '1rem' }}>
            {reservationsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading reservations...</div>
            ) : upcomingReservations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                <BookOpen size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p>No upcoming reservations found</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Booking ID</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Guest</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.875rem' }}>Check-in Date</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600, fontSize: '0.875rem' }}>Total Amount</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Days Until</th>
                      {isSuperAdmin && (
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem' }}>Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingReservations.slice(0, 10).map((reservation) => {
                      const checkInDate = new Date(reservation.checkInDate || reservation.checkIn);
                      const today = new Date();
                      const daysUntil = Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));
                      const totalAmount = Number(reservation.totalAmount || reservation.totalPrice || 0);
                      const paidAmount = (reservation.payments || [])
                        .filter(p => {
                          const status = String(p.status || '').toLowerCase();
                          return status === 'paid' || status === 'reservation' || status === 'partial' || status === 'completed';
                        })
                        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
                      const remainingBalance = Math.max(0, totalAmount - paidAmount);
                      const canOverride = isSuperAdmin && remainingBalance > 0;
                      
                      return (
                        <tr key={reservation.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#2563eb', fontWeight: 600 }}>
                              #{reservation.id.toString().slice(-8)}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{reservation.user?.name || reservation.guestName || 'Guest'}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{reservation.user?.email || ''}</div>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                            {checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: '#2563eb' }}>
                            ₱{(totalAmount / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: reservation.status === 'confirmed' ? '#d1fae5' : '#fef3c7',
                              color: reservation.status === 'confirmed' ? '#065f46' : '#92400e'
                            }}>
                              {reservation.status || 'Pending'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: daysUntil <= 3 ? '#dc2626' : '#64748b' }}>
                            {daysUntil} days
                          </td>
                          {isSuperAdmin && (
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  if (!canOverride) return;
                                  const overridePayment = {
                                    ...reservation,
                                    amount: remainingBalance,
                                    type: 'override',
                                    isCheckout: false,
                                    override: true
                                  };
                                  openProcessPaymentModal(overridePayment);
                                }}
                                disabled={!canOverride}
                                style={{
                                  padding: '0.45rem 0.9rem',
                                  background: canOverride ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#cbd5f5',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: canOverride ? 'pointer' : 'not-allowed'
                                }}
                                title={canOverride ? 'Process payment early (override)' : 'Already fully paid'}
                              >
                                Process Now
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {upcomingReservations.length > 10 && (
                  <div style={{ textAlign: 'center', padding: '1rem', borderTop: '1px solid #e2e8f0', marginTop: '1rem' }}>
                    <span style={{ color: '#64748b', fontSize: '0.875rem' }}>
                      Showing 10 of {upcomingReservations.length} reservations
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
            </div>
          </>
        )}

        {/* Enhanced Filters */}
        <div style={styles.filtersCard}>
          <div style={styles.filtersHeader}>
            <h3 style={styles.filtersTitle}>
              <Filter size={20} style={{ marginRight: '0.5rem' }} />
              Filter Payments
            </h3>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {selectedRows.size > 0 && (
                <>
                  <button
                    onClick={batchVerify}
                    disabled={actionLoading.batch}
                    style={{
                      ...styles.refreshButton,
                      backgroundColor: '#10b981',
                      opacity: actionLoading.batch ? 0.6 : 1
                    }}
                  >
                    {actionLoading.batch ? (
                      <ButtonLoading size="small" color="#10b981" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Verify ({selectedRows.size})
                  </button>
                  <button
                    onClick={batchFlag}
                    disabled={actionLoading.batch}
                    style={{
                      ...styles.refreshButton,
                      backgroundColor: '#ef4444',
                      opacity: actionLoading.batch ? 0.6 : 1
                    }}
                  >
                    {actionLoading.batch ? (
                      <ButtonLoading size="small" color="#ef4444" />
                    ) : (
                      <AlertTriangle size={16} />
                    )}
                    Flag ({selectedRows.size})
                  </button>
                </>
              )}
              <button onClick={exportCSV} style={{...styles.refreshButton, backgroundColor: '#6366f1'}}>
                <Receipt size={16} />
                Export CSV
              </button>
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
          </div>
          <div style={styles.filtersContainer}>
            <div style={styles.filterGroup}>
              <label style={styles.label}>
                <Search size={14} style={{ marginRight: '4px' }} />
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Guest name, Payment ID, Booking ID..."
                style={styles.input}
              />
            </div>
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
              <label style={styles.label}>Payment Method</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                style={styles.select}
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="online">Online</option>
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
                  setSearchQuery('');
                  setPaymentMethodFilter('');
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
                  {STATUS_TABS.find((tab) => tab.key === activeStatusTab)?.label || 'Payment Transactions'}
                </h3>
                <div style={styles.tableStats}>
                  {tabFilteredPayments.length} of {payments.length} payments
                </div>
              </div>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead style={styles.thead}>
                    <tr>
                      <th style={styles.th}>
                        <input
                          type="checkbox"
                          checked={selectedRows.size > 0 && selectedRows.size === tabFilteredPayments.length}
                          onChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </th>
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
                    {refreshing && <TableLoading />}
                    {!refreshing && pagedTabPayments.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ ...styles.td, textAlign: 'center', color: '#64748b' }}>
                          No payments found for this tab and filter combination.
                        </td>
                      </tr>
                    )}
                    {pagedTabPayments.map((payment) => (
                      <tr
                        key={payment.id}
                        onClick={() => selectPayment(payment)}
                        style={{
                          ...styles.tr,
                          backgroundColor: selectedPayment?.id === payment.id ? '#E3F2FD' : 'white',
                          borderLeft: selectedPayment?.id === payment.id ? '4px solid #2196F3' : '4px solid transparent',
                        }}
                      >
                        <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(payment.id)}
                            onChange={() => toggleRowSelection(payment.id)}
                          />
                        </td>
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
                                openProcessPaymentModal(payment);
                              }}
                              style={{...styles.viewButton, backgroundColor: '#10b981', color: 'white'}}
                              title="Process Payment"
                            >
                              <CreditCard size={16} />
                            </button>
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
              <div style={styles.tabPaginationBar}>
                <div style={styles.tabPaginationInfo}>
                  Page {currentStatusTabPage} of {totalStatusTabPages}
                </div>
                <div style={styles.tabPaginationButtons}>
                  <button
                    onClick={() => setStatusTabPage((prev) => ({ ...prev, [activeStatusTab]: Math.max(1, (prev[activeStatusTab] || 1) - 1) }))}
                    disabled={currentStatusTabPage === 1}
                    style={{ ...styles.tabPaginationButton, ...(currentStatusTabPage === 1 ? styles.tabPaginationButtonDisabled : {}) }}
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setStatusTabPage((prev) => ({ ...prev, [activeStatusTab]: Math.min(totalStatusTabPages, (prev[activeStatusTab] || 1) + 1) }))}
                    disabled={currentStatusTabPage >= totalStatusTabPages}
                    style={{ ...styles.tabPaginationButton, ...(currentStatusTabPage >= totalStatusTabPages ? styles.tabPaginationButtonDisabled : {}) }}
                  >
                    Next
                  </button>
                </div>
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
                      <span style={{ marginRight: '0.5rem', fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>₱</span>
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
                      {(() => {
                        const booking = selectedPayment.booking || {};
                        const baseTotal = Number(booking.totalBeforeDiscount || booking.totalPrice || 0);
                        const finalTotal = Number(booking.totalAfterDiscount || booking.totalPrice || 0);
                        const discountAmount = Number(booking.discountAmount || Math.max(0, baseTotal - finalTotal));
                        if (discountAmount <= 0) return null;
                        return (
                          <>
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>Promotion:</span>
                              <span style={styles.detailValue}>{booking.discountLabel || 'Promotion Applied'}</span>
                            </div>
                            <div style={styles.detailRow}>
                              <span style={styles.detailLabel}>Discount:</span>
                              <span style={styles.detailValue}>₱{(discountAmount / 100).toLocaleString()}</span>
                            </div>
                          </>
                        );
                      })()}
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
                      Payment Control Actions
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
                        {actionLoading[`verify_${selectedPayment.id}`] ? ' Verifying...' : ' Mark Verified'}
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
                        {actionLoading[`flag_${selectedPayment.id}`] ? ' Marking...' : ' Flag (Needs Review)'}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setShowSupervisorActions(prev => !prev)}
                      style={{
                        ...styles.modalActionButton,
                        width: '100%',
                        backgroundColor: '#fff7ed',
                        color: '#c2410c',
                        border: '1px solid #fdba74',
                        marginBottom: '1rem'
                      }}
                    >
                      <Shield size={16} />
                      {showSupervisorActions ? 'Hide Advanced Actions' : 'Show Advanced Actions'}
                    </button>

                    {showSupervisorActions && (
                      <div style={{...styles.actionSection, marginTop: '0', paddingTop: '1.5rem', borderTop: '2px solid #f59e0b'}}>
                        <h4 style={{...styles.sectionTitle, color: '#f59e0b'}}>
                          <Shield size={18} style={{ marginRight: '0.5rem' }} />
                          Advanced Payment Actions
                        </h4>
                        <div style={styles.actionButtons}>
                          <button
                            style={{
                              ...styles.modalActionButton,
                              backgroundColor: '#7c3aed',
                              color: 'white',
                              opacity: actionLoading[`review_${selectedPayment.id}`] ? 0.6 : 1
                            }}
                            onClick={async () => {
                              const reason = prompt('Enter review request reason:');
                              if (reason && reason.trim()) {
                                await requestReview(selectedPayment.id, reason.trim());
                              }
                            }}
                            disabled={actionLoading[`review_${selectedPayment.id}`]}
                          >
                            {actionLoading[`review_${selectedPayment.id}`] ? (
                              <ButtonLoading size="small" color="#7c3aed" />
                            ) : (
                              <AlertCircle size={16} />
                            )}
                            {actionLoading[`review_${selectedPayment.id}`] ? ' Sending...' : ' Request Review'}
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

                          <button
                            style={{
                              ...styles.modalActionButton,
                              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                              color: 'white',
                              opacity: actionLoading[`investigate_${selectedPayment.id}`] ? 0.6 : 1
                            }}
                            onClick={async () => {
                              const reason = prompt('Enter investigation context:');
                              if (reason && reason.trim()) {
                                await startInvestigation(selectedPayment.id, reason.trim());
                              }
                            }}
                            disabled={actionLoading[`investigate_${selectedPayment.id}`]}
                          >
                            {actionLoading[`investigate_${selectedPayment.id}`] ? (
                              <RotateCcw size={16} className="animate-spin" />
                            ) : (
                              <AlertTriangle size={16} />
                            )}
                            {actionLoading[`investigate_${selectedPayment.id}`] ? ' Starting...' : ' Start Investigation'}
                          </button>

                          <button
                            style={{
                              ...styles.modalActionButton,
                              backgroundColor: '#16a34a',
                              color: 'white',
                              opacity: actionLoading[`clear_${selectedPayment.id}`] ? 0.6 : 1
                            }}
                            onClick={async () => {
                              const reason = prompt('Enter case clear note:');
                              if (reason && reason.trim()) {
                                await clearCase(selectedPayment.id, reason.trim());
                              }
                            }}
                            disabled={actionLoading[`clear_${selectedPayment.id}`]}
                          >
                            {actionLoading[`clear_${selectedPayment.id}`] ? (
                              <RotateCcw size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                            {actionLoading[`clear_${selectedPayment.id}`] ? ' Clearing...' : ' Clear Case'}
                          </button>

                          <button
                            style={{
                              ...styles.modalActionButton,
                              backgroundColor: '#b91c1c',
                              color: 'white',
                              opacity: actionLoading[`fraud_${selectedPayment.id}`] ? 0.6 : 1
                            }}
                            onClick={async () => {
                              const reason = prompt('Enter confirmed fraud reason:');
                              if (reason && reason.trim()) {
                                await confirmFraud(selectedPayment.id, reason.trim());
                              }
                            }}
                            disabled={actionLoading[`fraud_${selectedPayment.id}`]}
                          >
                            {actionLoading[`fraud_${selectedPayment.id}`] ? (
                              <RotateCcw size={16} className="animate-spin" />
                            ) : (
                              <XCircle size={16} />
                            )}
                            {actionLoading[`fraud_${selectedPayment.id}`] ? ' Updating...' : ' Confirm Fraud'}
                          </button>

                          <button
                            style={{
                              ...styles.modalActionButton,
                              background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
                              color: 'white',
                              opacity: actionLoading[`override_${selectedPayment.id}`] ? 0.6 : 1
                            }}
                            onClick={() => openOverrideStatusModal(selectedPayment)}
                            disabled={actionLoading[`override_${selectedPayment.id}`]}
                          >
                            {actionLoading[`override_${selectedPayment.id}`] ? (
                              <RotateCcw size={16} className="animate-spin" />
                            ) : (
                              <Shield size={16} />
                            )}
                            {actionLoading[`override_${selectedPayment.id}`] ? ' Overriding...' : ' Override Financial Status'}
                          </button>
                          <button
                            style={{
                              ...styles.modalActionButton,
                              backgroundColor: '#f59e0b',
                              color: 'white',
                              opacity: actionLoading[`unverify_${selectedPayment.id}`] ? 0.6 : 1
                            }}
                            onClick={async () => {
                              const reason = prompt('Enter reason for unverifying this payment:');
                              if (reason && reason.trim()) {
                                await unverifyPayment(selectedPayment.id, reason.trim());
                              }
                            }}
                            disabled={actionLoading[`unverify_${selectedPayment.id}`] || selectedPayment.verificationStatus !== 'Verified'}
                          >
                            {actionLoading[`unverify_${selectedPayment.id}`] ? (
                              <RotateCcw size={16} className="animate-spin" />
                            ) : (
                              <XCircle size={16} />
                            )}
                            {actionLoading[`unverify_${selectedPayment.id}`] ? ' Unverifying...' : ' Unverify Payment'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Process Payment Modal */}
        {showProcessModal && processingPayment && (
          <div style={styles.modalOverlay} onClick={closeProcessModal}>
            <div style={{...styles.modalContent, maxWidth: '800px'}} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>
                  <CreditCard size={24} style={{ marginRight: '0.5rem' }} />
                  Process Payment
                </h3>
                <button style={styles.closeButton} onClick={closeProcessModal}>
                  <X size={20} />
                </button>
              </div>
              
              <div style={styles.modalBody}>
                <div style={styles.paymentOverview}>
                  <div style={styles.paymentIdLarge}>#{String(processingPayment.id).slice(-8)}</div>
                  <span style={{ ...styles.statusBadgeLarge, ...getStatusStyle(processingPayment.status) }}>
                    {getStatusIcon(processingPayment.status)} {processingPayment.status}
                  </span>
                </div>

                <div style={styles.modalSection}>
                  <h4 style={styles.sectionTitle}>
                    <User size={18} style={{ marginRight: '0.5rem' }} />
                    Guest Information
                  </h4>
                  <div style={styles.detailGrid}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Name:</span>
                      <span style={styles.detailValue}>{processingPayment.booking?.user?.name || processingPayment.booking?.guestName || 'Walk-in Guest'}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Email:</span>
                      <span style={styles.detailValue}>{processingPayment.booking?.user?.email || 'N/A'}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Contact:</span>
                      <span style={styles.detailValue}>{processingPayment.booking?.user?.contactNumber || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.modalSection}>
                  <h4 style={styles.sectionTitle}>
                    <span style={{ marginRight: '0.5rem', fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>₱</span>
                    Payment Entry
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div>
                      <label style={styles.label}>Amount Required *</label>
                      <input
                        type="text"
                        value={amountTendered}
                        readOnly
                        style={{...styles.input, backgroundColor: '#f8fafc', color: '#64748b'}}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Amount Customer Paid *</label>
                      <input
                        type="number"
                        name="amountCustomerPaid"
                        step="0.01"
                        min="0"
                        value={amountCustomerPaid}
                        onChange={(e) => setAmountCustomerPaid(e.target.value)}
                        placeholder="0.00"
                        style={styles.input}
                      />
                    </div>
                    <div>
                      <label style={styles.label}>Payment Method *</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={styles.select}
                      >
                        <option value="">Select Method</option>
                        <option value="cash">Cash</option>
                        <option value="card">Credit/Debit Card</option>
                        <option value="gcash">GCash</option>
                        <option value="maya">Maya</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>
                    <div>
                      <label style={styles.label}>Reference No.</label>
                      <input
                        type="text"
                        value={referenceNo}
                        onChange={(e) => setReferenceNo(e.target.value)}
                        placeholder="Enter reference number"
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>

                {/* Change Calculation */}
                {amountCustomerPaid && (
                  <div style={{
                    background: 'linear-gradient(to right, #ecfdf5, #d1fae5)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    border: '1px solid #86efac',
                    marginBottom: '1.5rem'
                  }}>
                    <h4 style={{...styles.sectionTitle, marginBottom: '1rem'}}>
                      <Receipt size={18} style={{ marginRight: '0.5rem' }} />
                      Payment Calculation
                    </h4>
                    {(() => {
                      const required = Number(processingPayment?.totalPrice || processingPayment?.amount || 0);
                      const paid = Math.round((parseFloat(amountCustomerPaid) || 0) * 100);
                      const change = Math.max(0, paid - required);
                      const isInsufficient = paid < required;
                      
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                          <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Required Amount</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>
                              ₱{(required/100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Amount Paid</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isInsufficient ? '#dc2626' : '#2563eb' }}>
                              ₱{(paid/100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div style={{ background: 'white', borderRadius: '8px', padding: '1rem', border: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Change Due</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: isInsufficient ? '#dc2626' : '#059669' }}>
                              {isInsufficient ? 
                                `Short: ₱${((required - paid)/100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}` :
                                `₱${(change/100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
                              }
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div style={styles.modalSection}>
                  <label style={styles.label}>Notes (Optional)</label>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add any notes about this payment..."
                    rows={3}
                    style={{...styles.input, resize: 'vertical', fontFamily: 'inherit'}}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <button
                    onClick={closeProcessModal}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processPayment}
                    disabled={(() => {
                      const required = Number(processingPayment?.totalPrice || processingPayment?.amount || 0);
                      const paid = Math.round((parseFloat(amountCustomerPaid || '0') || 0) * 100);
                      return !paymentMethod || paid < required || actionLoading.process;
                    })()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: (() => {
                        const required = Number(processingPayment?.totalPrice || processingPayment?.amount || 0);
                        const paid = Math.round((parseFloat(amountCustomerPaid || '0') || 0) * 100);
                        return (!paymentMethod || paid < required || actionLoading.process) ? 0.5 : 1;
                      })(),
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    {actionLoading.process ? (
                      <ButtonLoading size="small" color="#10b981" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    {actionLoading.process ? 'Processing...' : 'Confirm Payment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Override Financial Status Modal */}
        {overrideStatusModal.show && overrideStatusModal.payment && (
          <div style={styles.modalOverlay} onClick={closeOverrideStatusModal}>
            <div style={{ ...styles.modalContent, maxWidth: '560px' }} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>
                  <Shield size={24} style={{ marginRight: '0.5rem' }} />
                  Override Financial Status
                </h3>
                <button style={styles.closeButton} onClick={closeOverrideStatusModal}>
                  <X size={20} />
                </button>
              </div>

              <div style={styles.modalBody}>
                <div style={styles.modalSection}>
                  <h4 style={styles.sectionTitle}>
                    <Receipt size={18} style={{ marginRight: '0.5rem' }} />
                    Payment Summary
                  </h4>
                  <div style={styles.detailGrid}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Payment ID:</span>
                      <span style={styles.detailValue}>#{String(overrideStatusModal.payment.id).slice(-8)}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Current Status:</span>
                      <span style={styles.detailValue}>{overrideStatusModal.payment.status || 'N/A'}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Guest:</span>
                      <span style={styles.detailValue}>{overrideStatusModal.payment.booking?.user?.name || overrideStatusModal.payment.booking?.guestName || 'Walk-in Guest'}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.modalSection}>
                  <h4 style={styles.sectionTitle}>
                    <Shield size={18} style={{ marginRight: '0.5rem' }} />
                    New Status
                  </h4>
                  <select
                    value={overrideStatusModal.newStatus}
                    onChange={(e) => setOverrideStatusModal(prev => ({ ...prev, newStatus: e.target.value }))}
                    style={{ ...styles.select, width: '100%' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Partial">Partial</option>
                    <option value="Reservation">Reservation</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#64748b' }}>
                    This updates the payment status and syncs the booking status where applicable.
                  </p>
                </div>

                <div style={styles.modalSection}>
                  <h4 style={styles.sectionTitle}>
                    <AlertCircle size={18} style={{ marginRight: '0.5rem' }} />
                    Reason
                  </h4>
                  <textarea
                    value={overrideStatusModal.reason}
                    onChange={(e) => setOverrideStatusModal(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Explain why the financial status is being overridden..."
                    rows={4}
                    style={{ ...styles.input, width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={closeOverrideStatusModal}
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#334155',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submitOverrideStatusModal}
                    disabled={actionLoading[`override_${overrideStatusModal.payment.id}`]}
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
                      color: '#fff',
                      fontWeight: 700,
                      cursor: 'pointer',
                      opacity: actionLoading[`override_${overrideStatusModal.payment.id}`] ? 0.7 : 1
                    }}
                  >
                    {actionLoading[`override_${overrideStatusModal.payment.id}`] ? 'Overriding...' : 'Confirm Override'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* E-Receipt Modal */}
        {eReceiptModal.show && eReceiptModal.receiptData && (
          <div style={styles.modalOverlay} onClick={() => setEReceiptModal({ show: false, receiptData: null })}>
            <div style={{...styles.modalContent, maxWidth: '600px'}} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h3 style={styles.modalTitle}>
                  <Receipt size={24} style={{ marginRight: '0.5rem' }} />
                  Electronic Receipt
                </h3>
                <button style={styles.closeButton} onClick={() => setEReceiptModal({ show: false, receiptData: null })}>
                  <X size={20} />
                </button>
              </div>
              
              <div style={styles.modalBody}>
                <div style={{ textAlign: 'center', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '2px solid #e5e7eb' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>E-Receipt</h2>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Receipt ID: {eReceiptModal.receiptData.id}</p>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>{new Date(eReceiptModal.receiptData.processedAt).toLocaleString()}</p>
                </div>

                <div style={styles.modalSection}>
                  <h4 style={styles.sectionTitle}>Guest Information</h4>
                  <div style={styles.detailGrid}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Name:</span>
                      <span style={styles.detailValue}>{eReceiptModal.receiptData.guestName}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Email:</span>
                      <span style={styles.detailValue}>{eReceiptModal.receiptData.email || 'N/A'}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Contact:</span>
                      <span style={styles.detailValue}>{eReceiptModal.receiptData.contact || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.modalSection}>
                  <h4 style={styles.sectionTitle}>Payment Details</h4>
                  <div style={styles.detailGrid}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Reference:</span>
                      <span style={styles.detailValue}>#{eReceiptModal.receiptData.paymentId}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Booking Type:</span>
                      <span style={styles.detailValue}>{eReceiptModal.receiptData.bookingType}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Payment Method:</span>
                      <span style={styles.detailValue}>{eReceiptModal.receiptData.paymentMethod}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Reference No:</span>
                      <span style={styles.detailValue}>{eReceiptModal.receiptData.referenceNo || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'linear-gradient(to right, #f0fdf4, #dcfce7)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  border: '1px solid #86efac',
                  marginBottom: '1.5rem'
                }}>
                  <div style={styles.detailGrid}>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Required Amount:</span>
                      <span style={{...styles.detailValue, fontSize: '1.1rem', fontWeight: 700}}>
                        ₱{(eReceiptModal.receiptData.amountRequired/100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Amount Paid:</span>
                      <span style={{...styles.detailValue, fontSize: '1.1rem', fontWeight: 700, color: '#2563eb'}}>
                        ₱{(eReceiptModal.receiptData.amountPaid/100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Change Due:</span>
                      <span style={{...styles.detailValue, fontSize: '1.1rem', fontWeight: 700, color: '#059669'}}>
                        ₱{(eReceiptModal.receiptData.changeAmount/100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={styles.modalSection}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Processed by:</span>
                    <span style={styles.detailValue}>{eReceiptModal.receiptData.processedBy}</span>
                  </div>
                  {eReceiptModal.receiptData.notes && (
                    <div style={{ marginTop: '1rem' }}>
                      <span style={styles.detailLabel}>Notes:</span>
                      <p style={{ marginTop: '0.5rem', color: '#4b5563' }}>{eReceiptModal.receiptData.notes}</p>
                    </div>
                  )}
                </div>

                <div style={{ textAlign: 'center', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb' }}>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Thank you for staying with us!</p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                  <button
                    onClick={() => downloadReceipt(eReceiptModal.receiptData)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Receipt size={16} />
                    Download Receipt
                  </button>
                  <button
                    onClick={() => setEReceiptModal({ show: false, receiptData: null })}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert Modal */}
        {alertModal.show && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #febe52 0%, #fcd34d 50%, #f6e27a 100%)',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              animation: 'modalSlideIn 0.3s ease-out',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}>
                {alertModal.type === 'error' ? (
                  <div style={{ backgroundColor: '#fee2e2', borderRadius: '50%', padding: '8px' }}>
                    <XCircle size={24} color="#dc2626" />
                  </div>
                ) : alertModal.type === 'warning' ? (
                  <div style={{ backgroundColor: '#fef3c7', borderRadius: '50%', padding: '8px' }}>
                    <AlertCircle size={24} color="#d97706" />
                  </div>
                ) : alertModal.type === 'success' ? (
                  <div style={{ backgroundColor: '#dcfce7', borderRadius: '50%', padding: '8px' }}>
                    <CheckCircle size={24} color="#16a34a" />
                  </div>
                ) : (
                  <div style={{ backgroundColor: '#dbeafe', borderRadius: '50%', padding: '8px' }}>
                    <Info size={24} color="#2563eb" />
                  </div>
                )}
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '700',
                  color: '#5a3e00',
                }}>{alertModal.title}</h3>
              </div>
              <p style={{
                margin: '0 0 24px 0',
                fontSize: '15px',
                color: '#6b4700',
                lineHeight: '1.5',
              }}>{alertModal.message}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setAlertModal({ show: false, title: '', message: '', type: 'info' })}
                  style={{
                    backgroundColor: '#56A86B',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 32px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(86, 168, 107, 0.4)',
                  }}
                >
                  Okay
                </button>
              </div>
            </div>
          </div>
        )}
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
    padding: '1rem 1.25rem',
    maxWidth: 'none',
    margin: '0',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: `'Inter', 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif`,
    lineHeight: 1.6,
    color: '#1a1a1a',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },
  header: {
    textAlign: 'left',
    marginBottom: '1rem',
  },
  title: {
    fontSize: 'clamp(1.45rem, 2vw, 2rem)',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '0.2rem',
  background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    fontWeight: 400,
  },

  statusTabsBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '1rem',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '0.6rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
  },
  statusTabButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    border: '1px solid #dbe3ef',
    background: '#f8fafc',
    color: '#334155',
    borderRadius: '999px',
    padding: '0.45rem 0.8rem',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  statusTabButtonActive: {
    background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
    color: '#fff',
    border: '1px solid #E89C1A',
  },
  statusTabCount: {
    minWidth: '22px',
    height: '22px',
    borderRadius: '999px',
    background: '#e2e8f0',
    color: '#334155',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0 0.4rem',
  },
  statusTabCountActive: {
    background: 'rgba(255,255,255,0.28)',
    color: '#fff',
  },
  
  // Enhanced KPI Cards
  kpiContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '0.85rem',
    marginBottom: '1rem',
  },
  kpiCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
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
  background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
    color: 'white',
  },
  transactionCard: {
  background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
    color: 'white',
  },
  pendingCard: {
  background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
    color: '#8b4513',
  },
  successCard: {
  background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
    color: '#2d5a27',
  },
  kpiIcon: {
    fontSize: '1.6rem',
    minWidth: '44px',
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
    fontSize: '1.28rem',
    fontWeight: 700,
    marginBottom: '0.15rem',
  },
  kpiChange: {
    fontSize: '0.8rem',
    opacity: 0.8,
    fontWeight: 500,
  },

  // Enhanced Filters
  filtersCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '1rem',
    marginBottom: '1rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
  },
  filtersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
    flexWrap: 'wrap',
    gap: '0.6rem',
  },
  filtersTitle: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  refreshButton: {
    padding: '0.55rem 0.9rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  filtersContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '0.75rem',
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
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: 'white',
  },
  select: {
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  clearButton: {
    padding: '0.6rem 0.75rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Enhanced Table
  tableCard: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
    border: '1px solid #e2e8f0',
  },
  tableHeader: {
    padding: '1rem',
  background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableTitle: {
    fontSize: '1.05rem',
    fontWeight: 600,
    margin: 0,
  },
  tableStats: {
    fontSize: '0.9rem',
    opacity: 0.9,
  },
  tabPaginationBar: {
    borderTop: '1px solid #e2e8f0',
    padding: '0.75rem 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  tabPaginationInfo: {
    fontSize: '0.82rem',
    color: '#64748b',
    fontWeight: 600,
  },
  tabPaginationButtons: {
    display: 'flex',
    gap: '0.5rem',
  },
  tabPaginationButton: {
    border: '1px solid #cbd5e1',
    background: '#fff',
    color: '#1e293b',
    borderRadius: '8px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  tabPaginationButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
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
    padding: '0.7rem 0.65rem',
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
    padding: '0.7rem 0.65rem',
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
    fontSize: '0.98rem',
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
  background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
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
  // Modal Styles used by the payment details overlay
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
    maxWidth: '700px',
    maxHeight: '85vh',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
    animation: 'modalSlideIn 0.3s ease-out',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
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
  verifyButton: {
    backgroundColor: '#10b981',
    color: 'white',
  },
  pollButton: {
    backgroundColor: '#f59e0b',
    color: 'white',
  },
  closeButton: {
    backgroundColor: 'transparent',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
  },
};