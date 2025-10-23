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
  Bell,
  Receipt,
  Shield,
  RotateCcw,
  CalendarDays,
  BookOpen
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

  // Payment processing state (like cashier)
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [amountTendered, setAmountTendered] = useState("");
  const [amountCustomerPaid, setAmountCustomerPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [noteText, setNoteText] = useState("");
  const [eReceiptModal, setEReceiptModal] = useState({ show: false, receiptData: null });
  
  // Search and advanced filters
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [selectedRows, setSelectedRows] = useState(new Set());

  // Checkouts and Reservations state
  const [checkoutTransactions, setCheckoutTransactions] = useState([]);
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [checkoutsLoading, setCheckoutsLoading] = useState(false);
  const [reservationsLoading, setReservationsLoading] = useState(false);

  useEffect(() => {
    fetchPayments();
    fetchCheckoutTransactions();
    fetchUpcomingReservations();
    // Remove report fetching since we calculate everything from payments data
  }, []);

  async function fetchCheckoutTransactions() {
    setCheckoutsLoading(true);
    try {
      // Fetch all bookings with checkout scheduled for today
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/bookings/checkout?date=${today}`);
      if (res.ok) {
        const data = await res.json();
        setCheckoutTransactions(Array.isArray(data) ? data : data.checkouts || []);
      } else {
        setCheckoutTransactions([]);
      }
    } catch (e) {
      console.error('Failed to fetch checkout transactions:', e);
      setCheckoutTransactions([]);
    } finally {
      setCheckoutsLoading(false);
    }
  }

  async function fetchUpcomingReservations() {
    setReservationsLoading(true);
    try {
      // SuperAdmin sees ALL upcoming reservations (no date limit)
      // Try multiple endpoints to get all bookings
      const res = await fetch('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        const bookings = Array.isArray(data) ? data : data.bookings || [];
        
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
      } else {
        setUpcomingReservations([]);
      }
    } catch (e) {
      console.error('Failed to fetch upcoming reservations:', e);
      setUpcomingReservations([]);
    } finally {
      setReservationsLoading(false);
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
    <div style={{ marginBottom: '2rem', background: 'white', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b' }}>
        <CreditCard size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
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
      <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '0.5rem' }}>
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

      // Update payment status
      await fetch("/api/payments/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.id,
          amount: customerPaidInCents,
          status: "Completed",
          paymentMethod,
          referenceNo,
          receiptData
        }),
      }).catch(() => {});

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
      
      alert('Payment processed successfully! E-receipt ready to view.');
    } catch (e) {
      console.error('Process payment error', e);
      alert('Failed to process payment');
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

    alert('Receipt downloaded successfully!');
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
    const filtered = filterPayments();
    if (selectedRows.size === filtered.length) {
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
      alert(`${selectedRows.size} payment(s) verified successfully!`);
      setSelectedRows(new Set());
      await refreshPayments();
    } catch (e) {
      alert('Batch verification failed');
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
      alert(`${selectedRows.size} payment(s) flagged successfully!`);
      setSelectedRows(new Set());
      await refreshPayments();
    } catch (e) {
      alert('Batch flagging failed');
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
      alert('Payment data exported successfully!');
    } catch (e) {
      alert('Failed to export CSV');
    }
  }

  // Higher Authority Override Functions
  async function overridePaymentStatus(paymentId, newStatus, reason) {
    if (!reason || !reason.trim()) {
      alert('Please provide a reason for overriding the payment status');
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
        alert(`Payment status overridden to ${newStatus} successfully!`);
      } else {
        alert(data?.error || 'Failed to override payment status');
      }
      return data;
    } catch (e) {
      console.error('Override status error', e);
      alert('Failed to override payment status');
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`override_${paymentId}`]: false}));
    }
  }

  async function unverifyPayment(paymentId, reason) {
    if (!reason || !reason.trim()) {
      alert('Please provide a reason for unverifying this payment');
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
        alert('Payment unverified successfully!');
      } else {
        alert(data?.error || 'Failed to unverify payment');
      }
      return data;
    } catch (e) {
      console.error('Unverify error', e);
      alert('Failed to unverify payment');
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`unverify_${paymentId}`]: false}));
    }
  }

  async function editPaymentMetadata(paymentId, updates) {
    if (!updates || Object.keys(updates).length === 0) {
      alert('No changes to save');
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
        alert('Payment metadata updated successfully!');
      } else {
        alert(data?.error || 'Failed to update payment metadata');
      }
      return data;
    } catch (e) {
      console.error('Edit metadata error', e);
      alert('Failed to update payment metadata');
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`edit_${paymentId}`]: false}));
    }
  }

  async function reassignCashier(paymentId, newCashierId, newCashierName, reason) {
    if (!newCashierId || !reason || !reason.trim()) {
      alert('Please provide both a cashier and reason for reassignment');
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
        alert(`Payment reassigned to ${newCashierName} successfully!`);
      } else {
        alert(data?.error || 'Failed to reassign cashier');
      }
      return data;
    } catch (e) {
      console.error('Reassign cashier error', e);
      alert('Failed to reassign cashier');
      return { error: 'Network error' };
    } finally {
      setActionLoading(prev => ({...prev, [`reassign_${paymentId}`]: false}));
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

        {/* Cashier Daily Revenue Section */}
        {renderCashierRevenueSection()}

        {/* Today's Scheduled Checkouts Section */}
        <div style={{ marginBottom: '2rem', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)', color: 'white' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarDays size={28} /> Today's Scheduled Checkouts
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Process payments for guests checking out today ({checkoutTransactions.length} checkouts)</p>
          </div>
          <div style={{ padding: '1.5rem' }}>
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

        {/* Upcoming Reservations Section (ALL records - no date limit) */}
        <div style={{ marginBottom: '2rem', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={28} /> All Upcoming Reservations
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>View all future reservations - no date restrictions ({upcomingReservations.length} reservations)</p>
          </div>
          <div style={{ padding: '1.5rem' }}>
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
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingReservations.slice(0, 10).map((reservation) => {
                      const checkInDate = new Date(reservation.checkInDate || reservation.checkIn);
                      const today = new Date();
                      const daysUntil = Math.ceil((checkInDate - today) / (1000 * 60 * 60 * 24));
                      
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
                            ₱{((reservation.totalAmount || reservation.totalPrice || 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
                  Payment Transactions
                </h3>
                <div style={styles.tableStats}>
                  {filterPayments().length} of {payments.length} payments
                </div>
              </div>
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead style={styles.thead}>
                    <tr>
                      <th style={styles.th}>
                        <input
                          type="checkbox"
                          checked={selectedRows.size > 0 && selectedRows.size === filterPayments().length}
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

                  {/* Higher Authority Actions Section */}
                  <div style={{...styles.actionSection, marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #f59e0b'}}>
                    <h4 style={{...styles.sectionTitle, color: '#f59e0b'}}>
                      <Shield size={18} style={{ marginRight: '0.5rem' }} />
                      Supervisor Override Actions
                    </h4>
                    <div style={styles.actionButtons}>
                      <button
                        style={{
                          ...styles.modalActionButton,
                          background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
                          color: 'white',
                          opacity: actionLoading[`override_${selectedPayment.id}`] ? 0.6 : 1
                        }}
                        onClick={async () => {
                          const newStatus = prompt('Enter new status (Paid, Pending, or Failed):');
                          if (newStatus && ['Paid', 'Pending', 'Failed'].includes(newStatus)) {
                            const reason = prompt('Enter reason for overriding status:');
                            if (reason && reason.trim()) {
                              await overridePaymentStatus(selectedPayment.id, newStatus, reason.trim());
                            }
                          } else if (newStatus !== null) {
                            alert('Invalid status. Must be: Paid, Pending, or Failed');
                          }
                        }}
                        disabled={actionLoading[`override_${selectedPayment.id}`]}
                      >
                        {actionLoading[`override_${selectedPayment.id}`] ? (
                          <RotateCcw size={16} className="animate-spin" />
                        ) : (
                          <Shield size={16} />
                        )}
                        {actionLoading[`override_${selectedPayment.id}`] ? ' Overriding...' : ' Override Status'}
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
                      <button
                        style={{
                          ...styles.modalActionButton,
                          backgroundColor: '#8b5cf6',
                          color: 'white',
                          opacity: actionLoading[`edit_${selectedPayment.id}`] ? 0.6 : 1
                        }}
                        onClick={async () => {
                          const field = prompt('What to edit? (method, reference, provider):');
                          if (field && ['method', 'reference', 'provider'].includes(field.toLowerCase())) {
                            const newValue = prompt(`Enter new ${field}:`);
                            if (newValue && newValue.trim()) {
                              const updates = {};
                              if (field.toLowerCase() === 'method') updates.method = newValue.trim();
                              if (field.toLowerCase() === 'reference') updates.referenceId = newValue.trim();
                              if (field.toLowerCase() === 'provider') updates.provider = newValue.trim();
                              await editPaymentMetadata(selectedPayment.id, updates);
                            }
                          } else if (field !== null) {
                            alert('Invalid field. Must be: method, reference, or provider');
                          }
                        }}
                        disabled={actionLoading[`edit_${selectedPayment.id}`]}
                      >
                        {actionLoading[`edit_${selectedPayment.id}`] ? (
                          <RotateCcw size={16} className="animate-spin" />
                        ) : (
                          <Receipt size={16} />
                        )}
                        {actionLoading[`edit_${selectedPayment.id}`] ? ' Updating...' : ' Edit Metadata'}
                      </button>
                      <button
                        style={{
                          ...styles.modalActionButton,
                          backgroundColor: '#ec4899',
                          color: 'white',
                          opacity: actionLoading[`reassign_${selectedPayment.id}`] ? 0.6 : 1
                        }}
                        onClick={async () => {
                          const cashierId = prompt('Enter cashier user ID to reassign to:');
                          if (cashierId && cashierId.trim()) {
                            const cashierName = prompt('Enter cashier name:');
                            if (cashierName && cashierName.trim()) {
                              const reason = prompt('Enter reason for reassignment:');
                              if (reason && reason.trim()) {
                                await reassignCashier(selectedPayment.id, cashierId.trim(), cashierName.trim(), reason.trim());
                              }
                            }
                          }
                        }}
                        disabled={actionLoading[`reassign_${selectedPayment.id}`]}
                      >
                        {actionLoading[`reassign_${selectedPayment.id}`] ? (
                          <RotateCcw size={16} className="animate-spin" />
                        ) : (
                          <User size={16} />
                        )}
                        {actionLoading[`reassign_${selectedPayment.id}`] ? ' Reassigning...' : ' Reassign Cashier'}
                      </button>
                    </div>
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
                    <DollarSign size={18} style={{ marginRight: '0.5rem' }} />
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
  background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
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
  background: 'linear-gradient(135deg, #FEBE52 0%, #E89C1A 100%)',
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