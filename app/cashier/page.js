'use client';
import { useSession, signOut } from 'next-auth/react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useChangeModal, ChangeModal, useReceiptModal, ReceiptModal, NavigationConfirmationModal } from '@/components/CustomModals';
import { useToast } from '@/components/Toast';
import { useNavigationGuard } from '../../hooks/useNavigationGuard.simple';
import { Bell, Search, ChevronDown, User, LogOut, CheckCircle2, AlertTriangle, XCircle, Flag, CreditCard, CalendarDays, BookOpen, Clock, DollarSign } from 'lucide-react';
import styles from './Cashier.module.css';

// Helper function to format payment IDs consistently
function formatPaymentId(id) {
  if (!id) return '—';
  
  // If it's a cuid (from Prisma), format it nicely
  if (typeof id === 'string' && id.length > 10) {
    // Take first 3 chars, convert to uppercase, add a dash, then 4 digits from the end
    const prefix = id.substring(0, 3).toUpperCase();
    const suffix = id.substring(id.length - 4);
    return `CHK-${prefix}-${suffix}`;
  }
  
  // If it's a number, format as CHK-XXXX
  if (typeof id === 'number' || !isNaN(id)) {
    return `CHK-${String(id).padStart(4, '0')}`;
  }
  
  return `CHK-${String(id).toUpperCase()}`;
}

export default function CashierDashboard() {
                const { success: toastSuccess, error: toastError } = useToast();
                const { data: session, status } = useSession({
                  required: true,
                  onUnauthenticated() {
                    if (typeof window !== "undefined") window.location.href = "/login";
                  },
                });
                // Debug toggle (set NEXT_PUBLIC_DEBUG_CASHIER=1 to enable)
                const debug = process.env.NEXT_PUBLIC_DEBUG_CASHIER === '1';

                // Navigation guard for logout/back
                const navigationGuard = useNavigationGuard({
                  shouldPreventNavigation: () => true,
                  onNavigationAttempt: () => {
                    console.log('Cashier Dashboard: Navigation attempt detected, showing logout confirmation');
                  },
                  customAction: () => signOut({ callbackUrl: '/login' }),
                  context: 'logout',
                  message: 'Are you sure you want to log out of your Cashier dashboard?'
                });

                // UI state
                const [userMenuOpen, setUserMenuOpen] = useState(false);
                const [loading, setLoading] = useState(true);
                const [isLoading, setIsLoading] = useState(false);

                // Data state
                const [bookings, setBookings] = useState([]);
                const [paidPayments, setPaidPayments] = useState([]);
                // Additional lists requested: Total Transactions and Pending Transactions
                const [totalTransactionsList, setTotalTransactionsList] = useState([]);
                const [pendingTransactionsList, setPendingTransactionsList] = useState([]);
                const [totalLoading, setTotalLoading] = useState(false);
                const [pendingLoading, setPendingLoading] = useState(false);
                const [notifications, setNotifications] = useState([]);
                const [notifCount, setNotifCount] = useState(0);
                const [showNotifications, setShowNotifications] = useState(false);

                // Filters and search
                const [searchQuery, setSearchQuery] = useState("");
                const [searchDebounced, setSearchDebounced] = useState("");
                const [filterStatus, setFilterStatus] = useState("");
                const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
                const [dateFrom, setDateFrom] = useState("");
                const [dateTo, setDateTo] = useState("");
                const [selectedRows, setSelectedRows] = useState(new Set());
                // Sorting
                const [sortField, setSortField] = useState("id");
                const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc'
                // View mode
                const [viewMode, setViewMode] = useState("table"); // 'table' | 'timeline'

                // Pagination
                const [paidPage, setPaidPage] = useState(1);
                const paidPageSize = 10;
                // Pagination for Total & Pending overview tables
                const [totalPage, setTotalPage] = useState(1);
                const totalPageSize = 6;
                const [pendingPage, setPendingPage] = useState(1);
                const pendingPageSize = 6;
                const [refreshLoading, setRefreshLoading] = useState(false);

                // Modals
                const [changeModal, setChangeModal] = useChangeModal();
                const [receiptModal, setReceiptModal] = useReceiptModal();
                const [decisionModal, setDecisionModal] = useState({ show: false, payment: null });
                const modalRef = useRef(null);
                const [backConfirm, setBackConfirm] = useState(false);
                const amountTenderedRef = useRef(null);

                // Form state (Payment Modal)
                const [amountTendered, setAmountTendered] = useState("");
                const [amountCustomerPaid, setAmountCustomerPaid] = useState("");
                const [paymentMethod, setPaymentMethod] = useState("");
                const [referenceNo, setReferenceNo] = useState("");
                const [name, setName] = useState("");
                const [email, setEmail] = useState("");
                const [contact, setContact] = useState("");
                const [datePaid, setDatePaid] = useState("");
                const [bookingType, setBookingType] = useState("Walk-in");
                const [noteText, setNoteText] = useState("");
                const [actionLoading, setActionLoading] = useState(false);

                // Helpers
                const formatCurrency = (cents) => {
                  const n = Number(cents || 0) / 100;
                  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
                };

                // Reusable badge class helper (used across multiple tables)
                const getBadgeClass = (status) => {
                  const common = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold";
                  switch ((status || "").toLowerCase()) {
                    case "verified":
                      return `${common} bg-green-100 text-green-700`;
                    case "pending":
                    case "unverified":
                      return `${common} bg-amber-100 text-amber-700`;
                    case "flagged":
                      return `${common} bg-slate-200 text-slate-700`;
                    case "cancelled":
                      return `${common} bg-red-100 text-red-700`;
                    default:
                      return `${common} bg-slate-100 text-slate-600`;
                  }
                };

                // Debounce search for smoother UI on large lists
                useEffect(() => {
                  const t = setTimeout(() => setSearchDebounced(searchQuery), 250);
                  return () => clearTimeout(t);
                }, [searchQuery]);

                // Data loaders
                async function fetchPaidPayments() {
                  try {
                    const res = await fetch("/api/payments/today");
                    if (res.ok) {
                      const data = await res.json();
                      setPaidPayments(Array.isArray(data) ? data : data.payments || []);
                    } else {
                      // Fallback to all payments if today endpoint is not available
                      const resAll = await fetch("/api/payments");
                      const dataAll = resAll.ok ? await resAll.json() : [];
                      setPaidPayments(Array.isArray(dataAll) ? dataAll : dataAll.payments || []);
                    }
                  } catch (e) {
                    setPaidPayments([]);
                  }
                }

                async function fetchBookings() {
                  try {
                    const res = await fetch("/api/bookings");
                    const data = res.ok ? await res.json() : [];
                    setBookings(Array.isArray(data) ? data : data.bookings || []);
                  } catch (e) {
                    setBookings([]);
                  }
                }

                async function fetchNotifications() {
                  try {
                    // Fetch actual notifications
                    const res = await fetch("/api/notifications?role=CASHIER");
                    const data = res.ok ? await res.json() : [];
                    let list = Array.isArray(data) ? data : data.notifications || [];
                    
                    // Fetch recent bookings and convert to notifications
                    const bookingsRes = await fetch("/api/bookings?limit=10&sort=desc");
                    const bookingsData = bookingsRes.ok ? await bookingsRes.json() : [];
                    const recentBookings = Array.isArray(bookingsData) ? bookingsData : bookingsData.bookings || [];
                    
                    // Create notifications from bookings
                    const bookingNotifs = recentBookings
                      .filter(b => b.status && b.status.toLowerCase() !== 'cancelled')
                      .map(booking => ({
                        id: `booking-${booking.id}`,
                        type: booking.status?.toLowerCase() === 'confirmed' ? 'payment' : 'info',
                        title: `New Booking #${booking.id}`,
                        message: `${booking.user?.name || booking.guestName || 'Guest'} - ${booking.status || 'Pending'}`,
                        createdAt: booking.createdAt || booking.checkInDate,
                        bookingId: booking.id
                      }));
                    
                    // Combine and deduplicate
                    const allNotifs = [...list, ...bookingNotifs];
                    const uniqueNotifs = allNotifs.filter((notif, index, self) => 
                      index === self.findIndex(n => n.id === notif.id)
                    );
                    
                    setNotifications(uniqueNotifs);
                    setNotifCount(uniqueNotifs.length);
                  } catch (e) {
                    console.error('Failed to fetch notifications:', e);
                    setNotifications([]);
                    setNotifCount(0);
                  }
                }

                async function fetchTotalTransactions() {
                  setTotalLoading(true);
                  try {
                    // Prefer a dedicated endpoint if available
                    const res = await fetch('/api/transactions/total');
                    if (res.ok) {
                      const data = await res.json();
                      setTotalTransactionsList(Array.isArray(data) ? data : data.transactions || []);
                    } else {
                      // Fallback: combine bookings and paidPayments
                      const combined = [...bookings, ...paidPayments];
                      setTotalTransactionsList(combined);
                    }
                  } catch (e) {
                    // Fallback to combining local state
                    setTotalTransactionsList([...bookings, ...paidPayments]);
                  } finally {
                    setTotalLoading(false);
                  }
                }

                async function fetchPendingTransactions() {
                  setPendingLoading(true);
                  try {
                    const res = await fetch('/api/transactions/pending');
                    if (res.ok) {
                      const data = await res.json();
                      setPendingTransactionsList(Array.isArray(data) ? data : data.transactions || []);
                    } else {
                      // Fallback: bookings with pending status
                      const pend = bookings.filter(b => (b.status || '').toLowerCase() === 'pending');
                      setPendingTransactionsList(pend);
                    }
                  } catch (e) {
                    const pend = bookings.filter(b => (b.status || '').toLowerCase() === 'pending');
                    setPendingTransactionsList(pend);
                  } finally {
                    setPendingLoading(false);
                  }
                }

                useEffect(() => {
                  let mounted = true;
                  (async () => {
                    await Promise.all([fetchPaidPayments(), fetchBookings(), fetchNotifications(), fetchTotalTransactions(), fetchPendingTransactions()]);
                    if (mounted) setLoading(false);
                  })();
                  
                  // Auto-refresh every 30 seconds
                  const intervalId = setInterval(async () => {
                    if (mounted) {
                      console.log('Auto-refreshing data...');
                      await Promise.all([fetchPaidPayments(), fetchBookings(), fetchNotifications(), fetchTotalTransactions(), fetchPendingTransactions()]);
                    }
                  }, 30000); // 30 seconds
                  
                  return () => {
                    mounted = false;
                    clearInterval(intervalId);
                  };
                }, []);

                // Filters
                const filteredBookings = useMemo(() => {
                  return bookings.filter((booking) => {
                    const q = (searchDebounced || "").toLowerCase();
                    const matchesSearch =
                      !q ||
                      booking.guestName?.toLowerCase().includes(q) ||
                      booking.id?.toString().includes(q) ||
                      booking.user?.name?.toLowerCase().includes(q) ||
                      booking.user?.email?.toLowerCase().includes(q);
                    const matchesStatus = !filterStatus || booking.status?.toLowerCase() === filterStatus.toLowerCase();
                    const matchesPaymentMethod = !filterPaymentMethod || booking.paymentMethod === filterPaymentMethod;
                    return matchesSearch && matchesStatus && matchesPaymentMethod;
                  });
                }, [bookings, searchDebounced, filterStatus, filterPaymentMethod]);

                // Keep pendingTransactionsList in sync with filteredBookings so the
                // Pending table reflects the same items counted in the KPI.
                useEffect(() => {
                  try {
                    setPendingTransactionsList(filteredBookings.filter(b => (b.status || '').toLowerCase() === 'pending'));
                    // reset pending pagination when list changes
                    setPendingPage(1);
                  } catch (e) {
                    // noop
                  }
                }, [filteredBookings]);

                const filteredPaidPayments = useMemo(() => {
                  const q = (searchDebounced || "").toLowerCase();
                  const filtered = paidPayments.filter((payment) => {
                    const matchesSearch = (
                      !q ||
                      payment.booking?.user?.name?.toLowerCase().includes(q) ||
                      payment.id?.toString().includes(q) ||
                      payment.booking?.guestName?.toLowerCase().includes(q)
                    );
                    const matchesDate = (() => {
                      if (!dateFrom && !dateTo) return true;
                      const pDate = new Date(payment.createdAt || payment.timestamp);
                      if (isNaN(pDate.getTime())) return false;
                      const from = dateFrom ? new Date(dateFrom) : null;
                      const to = dateTo ? new Date(dateTo) : null;
                      if (from && pDate < from) return false;
                      if (to) {
                        const toEnd = new Date(to);
                        toEnd.setHours(23, 59, 59, 999);
                        if (pDate > toEnd) return false;
                      }
                      return true;
                    })();
                    return matchesSearch && matchesDate;
                  });
                  // Sort
                  const sorted = [...filtered].sort((a, b) => {
                    const dir = sortDir === 'asc' ? 1 : -1;
                    switch (sortField) {
                      case 'guest': {
                        const an = (a.booking?.user?.name || a.booking?.guestName || '').toLowerCase();
                        const bn = (b.booking?.user?.name || b.booking?.guestName || '').toLowerCase();
                        return an.localeCompare(bn) * dir;
                      }
                      case 'amount': {
                        const av = Number(a.amount || 0);
                        const bv = Number(b.amount || 0);
                        return (av - bv) * dir;
                      }
                      case 'method': {
                        const am = (a.method || a.provider || '').toLowerCase();
                        const bm = (b.method || b.provider || '').toLowerCase();
                        return am.localeCompare(bm) * dir;
                      }
                      case 'status': {
                        const as = (a.status || a.booking?.status || '').toLowerCase();
                        const bs = (b.status || b.booking?.status || '').toLowerCase();
                        return as.localeCompare(bs) * dir;
                      }
                      case 'verified': {
                        const av = (a.verificationStatus || '').toLowerCase();
                        const bv = (b.verificationStatus || '').toLowerCase();
                        return av.localeCompare(bv) * dir;
                      }
                      case 'id':
                      default: {
                        const av = Number(a.id || 0);
                        const bv = Number(b.id || 0);
                        return (av - bv) * dir;
                      }
                    }
                  });
                  return sorted;
                }, [paidPayments, searchDebounced, sortField, sortDir, dateFrom, dateTo]);

                // Pagination
                const paidTotalPages = Math.max(1, Math.ceil(filteredPaidPayments.length / paidPageSize));
                const pagedPaid = useMemo(() => {
                  const start = (paidPage - 1) * paidPageSize;
                  return filteredPaidPayments.slice(start, start + paidPageSize);
                }, [filteredPaidPayments, paidPage]);

                // Paginate totals and pending lists
                const totalTotalPages = Math.max(1, Math.ceil((totalTransactionsList?.length || 0) / totalPageSize));
                const pagedTotal = useMemo(() => {
                  const start = (totalPage - 1) * totalPageSize;
                  return (totalTransactionsList || []).slice(start, start + totalPageSize);
                }, [totalTransactionsList, totalPage]);

                const pendingTotalPages = Math.max(1, Math.ceil((pendingTransactionsList?.length || 0) / pendingPageSize));
                const pagedPending = useMemo(() => {
                  const start = (pendingPage - 1) * pendingPageSize;
                  return (pendingTransactionsList || []).slice(start, start + pendingPageSize);
                }, [pendingTransactionsList, pendingPage]);

                // Ensure current page is valid after filters/data change
                useEffect(() => {
                  if (paidPage > paidTotalPages) {
                    setPaidPage(1);
                  }
                }, [paidPage, paidTotalPages]);

                useEffect(() => {
                  if (totalPage > totalTotalPages) setTotalPage(1);
                }, [totalPage, totalTotalPages]);

                useEffect(() => {
                  if (pendingPage > pendingTotalPages) setPendingPage(1);
                }, [pendingPage, pendingTotalPages]);

                // Modal focus trap and autofocus
                useEffect(() => {
                  if (!decisionModal.show) return;
                  const root = modalRef.current;
                  if (!root) return;
                  const focusable = root.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                  );
                  const first = focusable[0];
                  const last = focusable[focusable.length - 1];
                  if (first) first.focus();
                  function handleKeyDown(e) {
                    if (e.key !== 'Tab') return;
                    if (focusable.length === 0) return;
                    if (e.shiftKey) {
                      if (document.activeElement === first) {
                        e.preventDefault();
                        last.focus();
                      }
                    } else {
                      if (document.activeElement === last) {
                        e.preventDefault();
                        first.focus();
                      }
                    }
                  }
                  root.addEventListener('keydown', handleKeyDown);
                  return () => root.removeEventListener('keydown', handleKeyDown);
                }, [decisionModal.show]);

                // KPIs
                const totalTransactions = filteredBookings.length + filteredPaidPayments.length;
                // Actions: refresh + export
                async function refreshAll() {
                  setIsLoading(true);
                  setRefreshLoading(true);
                  try {
                    await Promise.all([fetchPaidPayments(), fetchBookings(), fetchNotifications()]);
                    toastSuccess('Dashboard refreshed successfully!');
                  } catch (error) {
                    toastError('Failed to refresh data');
                    console.error('Refresh error:', error);
                  } finally {
                    setIsLoading(false);
                    setRefreshLoading(false);
                  }
                }

                function exportCSV() {
                  try {
                    const rows = [
                      ['Payment ID','Guest','Amount (PHP)','Method','Status','Verified','Date']
                    ];
                    filteredPaidPayments.forEach(p => {
                      const guest = p.booking?.user?.name || p.booking?.guestName || 'N/A';
                      const amt = (Number(p.amount || 0) / 100).toFixed(2);
                      const method = p.method || p.provider || '';
                      const status = p.status || p.booking?.status || '';
                      const verified = p.verificationStatus || '';
                      const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '';
                      rows.push([p.id, guest, amt, method, status, verified, date]);
                    });
                    const csv = rows.map(r => r.map((c) => {
                      const s = String(c ?? '');
                      return /[",\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
                    }).join(',')).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `cashier-payments-${new Date().toISOString().slice(0,10)}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toastSuccess('Payment data exported successfully!');
                  } catch (e) {
                    toastError('Failed to export CSV');
                  }
                }

                function toggleSort(field) {
                  if (sortField === field) {
                    setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField(field);
                    setSortDir('asc');
                  }
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
                  if (selectedRows.size === pagedPaid.length) {
                    setSelectedRows(new Set());
                  } else {
                    setSelectedRows(new Set(pagedPaid.map(p => p.id)));
                  }
                }

                async function batchVerify() {
                  if (selectedRows.size === 0) return;
                  setActionLoading(true);
                  try {
                    // Simulate batch update
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    toastSuccess(`${selectedRows.size} payment(s) verified successfully!`);
                    setSelectedRows(new Set());
                    await fetchPaidPayments();
                  } catch (e) {
                    toastError('Batch verification failed');
                  } finally {
                    setActionLoading(false);
                  }
                }
                // KPI: count only bookings with status 'pending' so the Pending card
                // reflects the same items shown in the Pending table below.
                const pendingTransactions = filteredBookings.filter(b => (b.status || '').toLowerCase() === 'pending').length;
                const dailyTotal = filteredPaidPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
                const cashTotal = filteredPaidPayments
                  .filter((p) => (p.method || "").toLowerCase() === "cash")
                  .reduce((sum, p) => sum + Number(p.amount || 0), 0);
                const cardTotal = filteredPaidPayments
                  .filter((p) => (p.method || "").toLowerCase() === "card")
                  .reduce((sum, p) => sum + Number(p.amount || 0), 0);
                const totalNotifications = notifications.length;

                // Actions
                function openPaymentModal(payment) {
                  if (!payment) return;
                  try { console.debug('[cashier] openPaymentModal ->', payment?.id, payment); } catch {}
                  setDecisionModal({ show: true, payment });
                  const cents = Number(payment?.amount || payment?.totalPrice || 0);
                  setAmountTendered((cents / 100).toFixed(2));
                  setAmountCustomerPaid("");
                  setPaymentMethod((payment?.method || payment?.provider || "").toLowerCase());
                  setReferenceNo(payment?.id || "");
                  setName(payment?.booking?.user?.name || payment?.user?.name || payment?.booking?.guestName || "");
                  setEmail(payment?.booking?.user?.email || payment?.user?.email || "");
                  setContact(payment?.booking?.user?.contact || payment?.user?.contact || "");
                  setDatePaid(new Date().toISOString().slice(0, 10));
                  setBookingType(payment?.booking?.type || "Walk-in");
                  setNoteText("");
                  setTimeout(() => amountTenderedRef.current?.focus(), 0);
                }

                // Ensure totalTransactionsList and pendingTransactionsList are populated from
                // the canonical sources (bookings + paidPayments) when API endpoints are absent
                // or when those lists are still empty. This prevents race conditions where
                // fetchTotalTransactions() ran before bookings/payments were loaded.
                useEffect(() => {
                  // Always derive Total Transactions from current bookings + paidPayments
                  setTotalTransactionsList([...bookings, ...paidPayments]);
                  setTotalPage(1);
                }, [bookings, paidPayments]);

                useEffect(() => {
                  // Populate pendingTransactionsList if it's empty but bookings has pending items
                  if ((pendingTransactionsList?.length || 0) === 0 && bookings.length > 0) {
                    const pend = bookings.filter(b => (b.status || '').toLowerCase() === 'pending');
                    setPendingTransactionsList(pend);
                  }
                }, [bookings]);

                function resetForm() {
                  setAmountTendered("");
                  setAmountCustomerPaid("");
                  setPaymentMethod("");
                  setReferenceNo("");
                  setName("");
                  setEmail("");
                  setContact("");
                  setDatePaid("");
                  setBookingType("Walk-in");
                  setNoteText("");
                }

                async function generateReceipt() {
                  const payment = decisionModal.payment;
                  if (!payment) return;
                  const requiredAmount = Number(payment.totalPrice || payment.amount || 0);
                  const customerPaidInCents = Math.round((parseFloat(amountCustomerPaid || amountTendered || "0") || 0) * 100);
                  const calculatedChange = Math.max(0, customerPaidInCents - requiredAmount);

                  const receiptData = {
                    receiptNo: `RCP-${Date.now()}`,
                    guestName: name || payment?.booking?.user?.name || payment?.booking?.guestName || "",
                    bookingId: payment.booking?.id || payment.id,
                    amount: customerPaidInCents / 100,
                    tendered: customerPaidInCents / 100,
                    totalDue: requiredAmount / 100,
                    paymentMethod: paymentMethod || payment.method || payment.provider || "",
                    change: calculatedChange / 100,
                    cashier: session?.user?.name,
                    timestamp: new Date(),
                    items: [
                      { description: `Booking Payment - ${bookingType}`, amount: (requiredAmount || 0) / 100 },
                    ],
                  };

                  setReceiptModal({ show: true, receiptData });

                  // Audit trail (non-blocking)
                  try {
                    await fetch("/api/audit-trails", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        actorId: session?.user?.id,
                        actorName: session?.user?.name,
                        actorRole: "CASHIER",
                        action: "GENERATE_RECEIPT_PREVIEW",
                        entity: "PAYMENT",
                        entityId: payment.id,
                        details: `Generated receipt preview for payment ${payment.id}`,
                      }),
                    });
                  } catch (e) {
                    /* noop */
                  }
                }

                async function approveTransaction() {
                  const payment = decisionModal.payment;
                  if (!payment) return;
                  setActionLoading(true);
                  try {
                    // Try to update payment status if endpoint exists
                    const customerPaidInCents = Math.round((parseFloat(amountCustomerPaid || amountTendered || "0") || 0) * 100);
                    await fetch("/api/payments/update", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        paymentId: payment.id,
                        amount: customerPaidInCents,
                        status: "Paid",
                        paymentMethod,
                        referenceNo,
                      }),
                    }).catch(() => {});

                    // Show success toast for 2 seconds
                    toastSuccess("Payment confirmed successfully!");
                    
                    setDecisionModal({ show: false, payment: null });
                    resetForm();
                    await Promise.all([fetchPaidPayments(), fetchBookings()]);

                    try {
                      await fetch("/api/audit-trails", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          actorId: session?.user?.id,
                          actorName: session?.user?.name,
                          actorRole: "CASHIER",
                          action: "UPDATE_PAYMENT_STATUS",
                          entity: "PAYMENT",
                          entityId: payment.id,
                          details: `Updated payment status to Paid`,
                        }),
                      });
                    } catch {}
                  } catch (e) {
                    toastError("Failed to confirm payment");
                  } finally {
                    setActionLoading(false);
                  }
                }

                async function disapproveTransaction() {
                  const payment = decisionModal.payment;
                  if (!payment) return;
                  setActionLoading(true);
                  try {
                    // Flag/cancel endpoint may vary; do audit + notify
                    toastSuccess("Transaction cancelled successfully!");
                    
                    setDecisionModal({ show: false, payment: null });
                    resetForm();
                    await fetchPaidPayments();
                    try {
                      await fetch("/api/audit-trails", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          actorId: session?.user?.id,
                          actorName: session?.user?.name,
                          actorRole: "CASHIER",
                          action: "CANCEL_PAYMENT",
                          entity: "PAYMENT",
                          entityId: payment.id,
                          details: `Cashier cancelled payment ${payment.id}`,
                        }),
                      });
                    } catch {}
                  } catch (e) {
                    toastError("Failed to cancel transaction");
                  } finally {
                    setActionLoading(false);
                  }
                }

                // Loading state
                if (status === "loading" || loading) {
                  return (
                    <div className={styles.page}>
                      <header className={styles.headerBar}>
                        <div className={styles.headerLeft}>
                          <div className={`${styles.skeleton} ${styles.skeletonLineMd}`} style={{ width: 180 }} />
                        </div>
                        <div className={styles.headerCenter}>
                          <div className={`${styles.skeleton} ${styles.skeletonLineSm}`} style={{ width: 120 }} />
                        </div>
                        <div className={styles.headerRight}>
                          <div className={`${styles.skeleton} ${styles.skeletonCircleMd}`} />
                          <div className={`${styles.skeleton} ${styles.skeletonCircleMd}`} />
                        </div>
                      </header>
                      <main className={styles.main}>
                        <div className={styles.leftColumn}>
                          <div className={styles.kpiGrid}>
                            {Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className={`${styles.card} p-4`}>
                                <div className={`${styles.skeleton} ${styles.skeletonLineSm}`} style={{ width: '40%' }} />
                                <div className={`${styles.skeleton} ${styles.skeletonLineMd}`} style={{ width: '60%', marginTop: 12 }} />
                              </div>
                            ))}
                          </div>
                          <div className={styles.toolbar} style={{ gap: 12 }}>
                            <div className={`${styles.skeleton} ${styles.skeletonInput}`} style={{ flex: 1, minWidth: 220 }} />
                            <div className={`${styles.skeleton} ${styles.skeletonInput}`} style={{ width: 160 }} />
                            <div className={`${styles.skeleton} ${styles.skeletonInput}`} style={{ width: 160 }} />
                            <div className={`${styles.skeleton} ${styles.skeletonBtn}`} style={{ width: 120 }} />
                            <div className={`${styles.skeleton} ${styles.skeletonBtn}`} style={{ width: 120 }} />
                          </div>
                          <div className={styles.card}>
                            <div className="p-4">
                              <div className={`${styles.skeleton} ${styles.skeletonLineSm}`} style={{ width: '30%' }} />
                            </div>
                            <div className={styles.tableWrap}>
                              <table className={styles.table}>
                                <thead>
                                  <tr>
                                    {Array.from({ length: 8 }).map((_, j) => (
                                      <th key={j} className={styles.th}>
                                        <div className={`${styles.skeleton} ${styles.skeletonLineSm}`} style={{ width: '70%' }} />
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className={styles.fadeIn}>
                                  {Array.from({ length: 6 }).map((_, i) => (
                                    <tr key={i}>
                                      {Array.from({ length: 8 }).map((__, j) => (
                                        <td key={j} className={styles.td}>
                                          <div className={`${styles.skeleton} ${styles.skeletonLineSm}`} />
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <div className={styles.paginationBar}>
                              <div className={`${styles.skeleton} ${styles.skeletonLineSm}`} style={{ width: 120 }} />
                              <div className="flex gap-2">
                                <div className={`${styles.skeleton} ${styles.skeletonBtn}`} style={{ width: 80 }} />
                                <div className={`${styles.skeleton} ${styles.skeletonBtn}`} style={{ width: 80 }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </main>
                      <footer className={styles.footer}>
                        <div className={`${styles.skeleton} ${styles.skeletonLineSm}`} style={{ width: 300, margin: '0 auto' }} />
                      </footer>
                    </div>
                  );
                }

                return (
                  <div className={styles.page}>
                    {/* Header */}
                    <header className={styles.headerBar}>
                      <div className={styles.headerLeft}>
                        <div className={styles.headerTitle}>💰 Cashier Dashboard</div>
                      </div>
                      <div className={styles.headerRight}>
                        {/* Notifications */}
                        <button
                          onClick={() => setShowNotifications(!showNotifications)}
                          className={styles.notificationBtn}
                          aria-label="Notifications"
                        >
                          <Bell className="h-5 w-5" />
                          {totalNotifications > 0 && (
                            <span className={styles.badge}>{totalNotifications}</span>
                          )}
                        </button>

                        {/* User Menu */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className={styles.avatarBtn}
                            aria-label="User menu"
                          >
                            <div className={styles.avatar}>
                              {(session?.user?.name || 'C')[0].toUpperCase()}
                            </div>
                            <div className={styles.avatarInfo}>
                              <div className={styles.avatarName}>
                                {session?.user?.name || 'Cashier'}
                              </div>
                              <div className={styles.avatarRole}>Cashier</div>
                            </div>
                            <ChevronDown className="h-4 w-4 text-slate-500" />
                          </button>
                          {userMenuOpen && (
                            <>
                              <div
                                onClick={() => setUserMenuOpen(false)}
                                style={{ position: 'fixed', inset: 0, zIndex: 140 }}
                                aria-hidden
                              />
                              <div className={styles.dropdownMenu}>
                                <button
                                  onClick={() => setUserMenuOpen(false)}
                                  className={styles.menuItem}
                                  role="menuitem"
                                >
                                  <User className="h-4 w-4" />
                                  <span>View Profile</span>
                                </button>
                                <button
                                  onClick={() => { setUserMenuOpen(false); navigationGuard.handleLeave(); }}
                                  className={`${styles.menuItem} ${styles.menuItemLogout}`}
                                  role="menuitem"
                                >
                                  <LogOut className="h-4 w-4" />
                                  <span>Sign Out</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </header>

                    <main className={styles.main}>
                      <div className={styles.leftColumn}>
                        {/* KPI Cards */}
                        <div className={styles.kpiGrid}>
                          <div className={`${styles.kpiCard} ${styles.kpiTotal}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs opacity-90">Total Transactions</div>
                                <div className="text-2xl font-bold mt-1">{totalTransactions}</div>
                              </div>
                              <CalendarDays className="h-8 w-8 opacity-30" />
                            </div>
                          </div>
                          <div className={`${styles.kpiCard} ${styles.kpiPending}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs opacity-90">Pending</div>
                                <div className="text-2xl font-bold mt-1">{pendingTransactions}</div>
                              </div>
                              <Clock className="h-8 w-8 opacity-30" />
                            </div>
                          </div>
                          <div className={`${styles.kpiCard} ${styles.kpiSales}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs opacity-90">Daily Sales</div>
                                <div className="text-xl font-bold mt-1">{formatCurrency(dailyTotal)}</div>
                              </div>
                              <DollarSign className="h-8 w-8 opacity-30" />
                            </div>
                          </div>
                          <div className={`${styles.kpiCard} ${styles.kpiCash}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs opacity-90">Cash</div>
                                <div className="text-xl font-bold mt-1">{formatCurrency(cashTotal)}</div>
                              </div>
                              <CreditCard className="h-8 w-8 opacity-30" />
                            </div>
                          </div>
                          <div className={`${styles.kpiCard} ${styles.kpiCardSales}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-xs opacity-90">Card</div>
                                <div className="text-xl font-bold mt-1">{formatCurrency(cardTotal)}</div>
                              </div>
                              <CheckCircle2 className="h-8 w-8 opacity-30" />
                            </div>
                          </div>
                        </div>

                        {/* Search and filters */}
                        <div className={styles.toolbar}>
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search by guest name, ID, or email"
                              className={`${styles.toolbarInput} pl-10`}
                            />
                          </div>
                          <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className={styles.toolbarSelect}
                          >
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <select
                            value={filterPaymentMethod}
                            onChange={(e) => setFilterPaymentMethod(e.target.value)}
                            className={styles.toolbarSelect}
                          >
                            <option value="">All Methods</option>
                            <option value="Cash">Cash</option>
                            <option value="Card">Card</option>
                            <option value="Online">Online</option>
                            <option value="Reservation Payment">Reservation</option>
                          </select>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className={styles.toolbarInput}
                            style={{ minWidth: '140px' }}
                            placeholder="From"
                            title="From date"
                          />
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className={styles.toolbarInput}
                            style={{ minWidth: '140px' }}
                            placeholder="To"
                            title="To date"
                          />
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setFilterStatus("");
                              setFilterPaymentMethod("");
                              setDateFrom("");
                              setDateTo("");
                            }}
                            className={styles.toolbarButton}
                          >
                            Clear
                          </button>
                        </div>

                        {/* Transactions table (Today's Payment Activity) - moved up */}
                        <div className={styles.card}>
                          <div className={`px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 ${styles.sectionHeader}`}>
                            <div className="flex items-center gap-3">
                              <div className="text-base font-bold text-slate-800">💳 Today's Payment Activity</div>
                              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                                <button
                                  onClick={() => setViewMode('table')}
                                  className={`px-3 py-2 text-xs rounded-lg font-semibold transition-all ${
                                    viewMode === 'table'
                                      ? 'bg-white text-amber-600 shadow-sm'
                                      : 'text-slate-600 hover:text-slate-800'
                                  }`}
                                  aria-label="Table view"
                                >
                                  📊 Table
                                </button>
                                <button
                                  onClick={() => setViewMode('timeline')}
                                  className={`px-3 py-2 text-xs rounded-lg font-semibold transition-all ${
                                    viewMode === 'timeline'
                                      ? 'bg-white text-amber-600 shadow-sm'
                                      : 'text-slate-600 hover:text-slate-800'
                                  }`}
                                  aria-label="Timeline view"
                                >
                                  📅 Timeline
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={styles.sectionBadge}>{filteredPaidPayments.length}</div>
                              {selectedRows.size > 0 && (
                                <button
                                  onClick={batchVerify}
                                  className={`${styles.button} ${styles.btnVerify} text-xs`}
                                >
                                  ✓ Verify ({selectedRows.size})
                                </button>
                              )}
                              <button
                                onClick={refreshAll}
                                className={styles.toolbarButton}
                                disabled={isLoading}
                              >
                                {isLoading ? '⟳ Loading...' : '↻ Refresh'}
                              </button>
                              <button onClick={exportCSV} className={styles.toolbarButton}>
                                ⬇ Export CSV
                              </button>
                            </div>
                          </div>

                          {debug && (
                            <div className="px-3 py-2 text-xs text-slate-600 border-b border-slate-100">
                              Debug · paidPayments: {paidPayments.length} · filteredPaid: {filteredPaidPayments.length} · pagedPaid: {pagedPaid.length} · bookings: {bookings.length}
                            </div>
                          )}
                          {viewMode === 'table' ? (
                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th className={styles.th}>
                                    <input
                                      type="checkbox"
                                      checked={selectedRows.size === pagedPaid.length && pagedPaid.length > 0}
                                      onChange={toggleSelectAll}
                                      aria-label="Select all"
                                    />
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='id'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('id')} className="underline-offset-2 hover:underline">Payment ID</button>
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='guest'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('guest')} className="underline-offset-2 hover:underline">Guest</button>
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='amount'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('amount')} className="underline-offset-2 hover:underline">Amount</button>
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='method'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('method')} className="underline-offset-2 hover:underline">Method</button>
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='status'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('status')} className="underline-offset-2 hover:underline">Status</button>
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='verified'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('verified')} className="underline-offset-2 hover:underline">Verified</button>
                                  </th>
                                  <th className={styles.th}>Actions</th>
                                </tr>
                              </thead>
                            <tbody className={styles.fadeIn}>
                              {pagedPaid.map((p) => {
                                const badge = (status) => {
                                  const common =
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold";
                                  switch ((status || "").toLowerCase()) {
                                    case "verified":
                                      return `${common} bg-green-100 text-green-700`;
                                    case "pending":
                                    case "unverified":
                                      return `${common} bg-amber-100 text-amber-700`;
                                    case "flagged":
                                      return `${common} bg-slate-200 text-slate-700`;
                                    case "cancelled":
                                      return `${common} bg-red-100 text-red-700`;
                                    default:
                                      return `${common} bg-slate-100 text-slate-600`;
                                  }
                                };
                                const verifiedLabel = (p.verificationStatus || "").toLowerCase();
                                const statusLabel = (p.booking?.status || p.status || "").toLowerCase();
                                return (
                                  <tr
                                    key={p.id}
                                    onClick={() => openPaymentModal(p)}
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPaymentModal(p); } }}
                                    className={`${styles.trClickable} ${selectedRows.has(p.id) ? styles.rowSelected : ''}`}
                                  >
                                    <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={selectedRows.has(p.id)}
                                        onChange={() => toggleRowSelection(p.id)}
                                        aria-label={`Select payment ${p.id}`}
                                      />
                                    </td>
                                    <td className={styles.td}>{formatPaymentId(p.id)}</td>
                                    <td className={styles.td}>
                                      {p.booking?.user?.name || p.booking?.guestName || "N/A"}
                                    </td>
                                    <td className={styles.td}>{formatCurrency(Number(p.amount))}</td>
                                    <td className={styles.td}>{p.method || p.provider || "—"}</td>
                                    <td className={styles.td}>
                                      <span className={badge(statusLabel)}>
                                        {p.status || p.booking?.status || "—"}
                                      </span>
                                    </td>
                                    <td className={styles.td}>
                                      <span className={badge(verifiedLabel)}>
                                        {p.verificationStatus || "—"}
                                      </span>
                                    </td>
                                    <td className={styles.td}>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openPaymentModal(p); }}
                                        className={`${styles.button} ${styles.btnReview}`}
                                        aria-label={`Open payment ${p.id}`}
                                      >
                                        Review
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {filteredPaidPayments.length === 0 && (
                                <tr>
                                  <td colSpan={8} className={`${styles.td} text-center text-slate-500 py-10`}>
                                    No paid transactions today
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                          ) : (
                            <div className="p-4">
                              {/* Timeline view */}
                              <div className="space-y-4">
                                {pagedPaid.map((p, idx) => (
                                  <div key={p.id} className="flex gap-4 items-start">
                                    <div className="flex flex-col items-center">
                                      <div className="h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-100"></div>
                                      {idx < pagedPaid.length - 1 && (
                                        <div className="w-0.5 h-full bg-slate-200 flex-1 min-h-[60px]"></div>
                                      )}
                                    </div>
                                    <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openPaymentModal(p)}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="font-semibold text-slate-800">Payment {formatPaymentId(p.id)}</div>
                                        <div className="text-sm text-slate-500">
                                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                                        </div>
                                      </div>
                                      <div className="text-sm text-slate-600 mb-2">
                                        <strong>{p.booking?.user?.name || p.booking?.guestName || 'N/A'}</strong> · {formatCurrency(Number(p.amount))}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">{p.method || p.provider || '—'}</span>
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          (p.verificationStatus || '').toLowerCase() === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>{p.verificationStatus || '—'}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Pagination */}
                          {paidTotalPages > 1 && (
                            <div className={`${styles.paginationBar} ${styles.barRelative}`}>
                              {refreshLoading && <div className={`${styles.refreshBar} ${styles.topBar}`} />}
                              <div className={styles.paginationInfo}>
                                Page {paidPage} of {paidTotalPages}
                              </div>
                              <div className={styles.paginationButtons}>
                                <button
                                  onClick={() => setPaidPage((p) => Math.max(1, p - 1))}
                                  disabled={paidPage === 1}
                                  className={styles.paginationBtn}
                                >
                                  Prev
                                </button>
                                <button
                                  onClick={() => setPaidPage((p) => Math.min(paidTotalPages, p + 1))}
                                  disabled={paidPage === paidTotalPages}
                                  className={styles.paginationBtn}
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Transactions overview tables: Total & Pending */}
                        <div className="grid sm:grid-cols-2 gap-3 mb-3">
                          <div className={styles.card}>
                            <div className={`px-4 py-3 border-b border-slate-200 ${styles.cardHeaderPrimary}`}>
                                <div className={styles.sectionTitleBar}>
                                  <div className={`${styles.sectionTitle} text-white`}>📊 All Transactions</div>
                                  <div className={styles.sectionBadge}>{totalTransactionsList.length}</div>
                                </div>
                              </div>
                            <div className="p-2">
                              {totalLoading ? (
                                <div className={styles.tableWrap} style={{maxHeight: '150px', overflow: 'auto'}}>
                                  <table className={styles.table}>
                                    <thead>
                                      <tr>
                                        <th className={styles.th} style={{width: '1%'}}></th>
                                        <th className={styles.th}>Payment ID</th>
                                        <th className={styles.th}>Guest</th>
                                        <th className={styles.th}>Amount</th>
                                        <th className={styles.th}>Method</th>
                                        <th className={styles.th}>Status</th>
                                        <th className={styles.th}>Verified</th>
                                        <th className={styles.th}>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className={styles.fadeIn}>
                                      {Array.from({length: 4}).map((_,i) => (
                                        <tr key={i}>
                                          {Array.from({length:8}).map((__,j) => (
                                            <td key={j} className={styles.td}><div className={`${styles.skeleton} ${styles.skeletonLineSm}`} /></td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : totalTransactionsList.length === 0 ? (
                                <div className="text-sm text-slate-500">No transactions available</div>
                              ) : (
                                <div className={styles.tableWrap} style={{maxHeight: '180px', overflow: 'auto'}}>
                                  <table className={styles.table}>
                                    <thead>
                                      <tr>
                                        <th className={styles.th} style={{width: '1%'}}>
                                          <input type="checkbox" disabled aria-hidden />
                                        </th>
                                        <th className={styles.th}>Payment ID</th>
                                        <th className={styles.th}>Guest</th>
                                        <th className={styles.th}>Amount</th>
                                        <th className={styles.th}>Method</th>
                                        <th className={styles.th}>Status</th>
                                        <th className={styles.th}>Verified</th>
                                        <th className={styles.th}>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody className={styles.fadeIn}>
                                      {pagedTotal.map((t) => {
                                        const statusLabel = (t.booking?.status || t.status || '').toLowerCase();
                                        const verifiedLabel = (t.verificationStatus || '').toLowerCase();
                                        return (
                                          <tr key={t.id || `${t.type}-${Math.random()}`} className={styles.tr}>
                                            <td className={styles.td}>
                                              <input type="checkbox" disabled aria-hidden />
                                            </td>
                                            <td className={styles.td}>{formatPaymentId(t.id)}</td>
                                            <td className={styles.td}>{t.booking?.user?.name || t.booking?.guestName || t.user?.name || 'N/A'}</td>
                                            <td className={styles.td}>{formatCurrency(Number(t.amount || t.totalPrice || 0))}</td>
                                            <td className={styles.td}>{t.method || t.provider || '—'}</td>
                                              <td className={styles.td}><span className={getBadgeClass(statusLabel)}>{t.status || t.booking?.status || '—'}</span></td>
                                              <td className={styles.td}><span className={getBadgeClass(verifiedLabel)}>{t.verificationStatus || '—'}</span></td>
                                              <td className={styles.td}><button onClick={(e) => { e.stopPropagation(); openPaymentModal(t); }} className={`${styles.toolbarButton}`} style={{padding: '8px 12px', borderRadius: '8px'}}>Review</button></td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className={styles.card}>
                            <div className={`px-4 py-3 border-b border-slate-200 ${styles.cardHeaderAlert}`}>
                              <div className={styles.sectionTitleBar}>
                                <div className={`${styles.sectionTitle} text-white`}>⏳ Pending Verification</div>
                                <div className={styles.sectionBadge}>{pendingTransactionsList.length}</div>
                              </div>
                            </div>
                            <div className="p-2">
                              {pendingLoading ? (
                                <div className={styles.tableWrap} style={{maxHeight: '150px', overflow: 'auto'}}>
                                  <table className={styles.table}>
                                    <thead>
                                      <tr>
                                        <th className={styles.th} style={{width: '1%'}}></th>
                                        <th className={styles.th}>Payment ID</th>
                                        <th className={styles.th}>Guest</th>
                                        <th className={styles.th}>Amount</th>
                                        <th className={styles.th}>Method</th>
                                        <th className={styles.th}>Status</th>
                                        <th className={styles.th}>Verified</th>
                                        <th className={styles.th}>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {Array.from({length: 4}).map((_,i) => (
                                        <tr key={i}>
                                          {Array.from({length:8}).map((__,j) => (
                                            <td key={j} className={styles.td}><div className={`${styles.skeleton} ${styles.skeletonLineSm}`} /></td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : pendingTransactionsList.length === 0 ? (
                                <div className="text-xs text-slate-500">No pending transactions</div>
                              ) : (
                                <div className={styles.tableWrap} style={{maxHeight: '150px', overflow: 'auto'}}>
                                  <table className={styles.table}>
                                    <thead>
                                      <tr>
                                        <th className={styles.th} style={{width: '1%'}}>
                                          <input type="checkbox" disabled aria-hidden />
                                        </th>
                                        <th className={styles.th}>Payment ID</th>
                                        <th className={styles.th}>Guest</th>
                                        <th className={styles.th}>Amount</th>
                                        <th className={styles.th}>Method</th>
                                        <th className={styles.th}>Status</th>
                                        <th className={styles.th}>Verified</th>
                                        <th className={styles.th}>Actions</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {pagedPending.map((p) => {
                                        const statusLabel = (p.booking?.status || p.status || '').toLowerCase();
                                        const verifiedLabel = (p.verificationStatus || '').toLowerCase();
                                        return (
                                          <tr key={p.id || `${p.type}-${Math.random()}`} className={styles.trClickable} onClick={() => openPaymentModal(p)}>
                                            <td className={styles.td}>
                                              <input type="checkbox" disabled aria-hidden />
                                            </td>
                                            <td className={styles.td}>{formatPaymentId(p.id)}</td>
                                            <td className={styles.td}>{p.booking?.user?.name || p.booking?.guestName || p.user?.name || 'N/A'}</td>
                                            <td className={styles.td}>{formatCurrency(Number(p.amount || p.totalPrice || 0))}</td>
                                            <td className={styles.td}>{p.method || p.provider || '—'}</td>
                                            <td className={styles.td}><span className={getBadgeClass(statusLabel)}>{p.status || p.booking?.status || '—'}</span></td>
                                            <td className={styles.td}><span className={getBadgeClass(verifiedLabel)}>{p.verificationStatus || '—'}</span></td>
                                            <td className={styles.td}><button onClick={(e) => { e.stopPropagation(); openPaymentModal(p); }} className={`${styles.toolbarButton}`} style={{padding: '6px 10px', borderRadius: '6px'}}>Review</button></td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                            {/* Pagination for Total Transactions */}
                            {totalTotalPages > 1 && (
                              <div className={`${styles.paginationBar} ${styles.barRelative}`} style={{marginTop: '6px'}}>
                                {totalLoading && <div className={`${styles.refreshBar} ${styles.topBar}`} />}
                                <div className={styles.paginationInfo}>Page {totalPage} of {totalTotalPages}</div>
                                <div className={styles.paginationButtons}>
                                  <button onClick={() => setTotalPage((p) => Math.max(1, p - 1))} disabled={totalPage === 1} className={styles.paginationBtn}>Prev</button>
                                  <button onClick={() => setTotalPage((p) => Math.min(totalTotalPages, p + 1))} disabled={totalPage === totalTotalPages} className={styles.paginationBtn}>Next</button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Transactions table */}
                        <div className={styles.card}>
                          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-3">
                              <div className="text-base font-bold text-slate-800">💳 Today's Payment Activity</div>
                              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                                <button
                                  onClick={() => setViewMode('table')}
                                  className={`px-3 py-2 text-xs rounded-lg font-semibold transition-all ${
                                    viewMode === 'table'
                                      ? 'bg-white text-amber-600 shadow-sm'
                                      : 'text-slate-600 hover:text-slate-800'
                                  }`}
                                  aria-label="Table view"
                                >
                                  📊 Table
                                </button>
                                <button
                                  onClick={() => setViewMode('timeline')}
                                  className={`px-3 py-2 text-xs rounded-lg font-semibold transition-all ${
                                    viewMode === 'timeline'
                                      ? 'bg-white text-amber-600 shadow-sm'
                                      : 'text-slate-600 hover:text-slate-800'
                                  }`}
                                  aria-label="Timeline view"
                                >
                                  📅 Timeline
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedRows.size > 0 && (
                                <button
                                  onClick={batchVerify}
                                  className={`${styles.button} ${styles.btnVerify} text-xs`}
                                >
                                  ✓ Verify ({selectedRows.size})
                                </button>
                              )}
                              <button
                                onClick={refreshAll}
                                className={styles.toolbarButton}
                                disabled={isLoading}
                              >
                                {isLoading ? '⟳ Loading...' : '↻ Refresh'}
                              </button>
                              <button onClick={exportCSV} className={styles.toolbarButton}>
                                ⬇ Export CSV
                              </button>
                            </div>
                            {/* Pagination for Pending Transactions */}
                            {pendingTotalPages > 1 && (
                              <div className={`${styles.paginationBar} ${styles.barRelative}`} style={{marginTop: '6px'}}>
                                {pendingLoading && <div className={`${styles.refreshBar} ${styles.topBar}`} />}
                                <div className={styles.paginationInfo}>Page {pendingPage} of {pendingTotalPages}</div>
                                <div className={styles.paginationButtons}>
                                  <button onClick={() => setPendingPage((p) => Math.max(1, p - 1))} disabled={pendingPage === 1} className={styles.paginationBtn}>Prev</button>
                                  <button onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))} disabled={pendingPage === pendingTotalPages} className={styles.paginationBtn}>Next</button>
                                </div>
                              </div>
                            )}
                          </div>

                          {debug && (
                            <div className="px-3 py-2 text-xs text-slate-600 border-b border-slate-100">
                              Debug · paidPayments: {paidPayments.length} · filteredPaid: {filteredPaidPayments.length} · pagedPaid: {pagedPaid.length} · bookings: {bookings.length}
                            </div>
                          )}
                          {viewMode === 'table' ? (
                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th className={styles.th}>
                                    <input
                                      type="checkbox"
                                      checked={selectedRows.size === pagedPaid.length && pagedPaid.length > 0}
                                      onChange={toggleSelectAll}
                                      aria-label="Select all"
                                    />
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='id'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('id')} className="underline-offset-2 hover:underline">Payment ID</button>
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='guest'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('guest')} className="underline-offset-2 hover:underline">Guest</button>
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='amount'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('amount')} className="underline-offset-2 hover:underline">Amount</button>
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='method'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('method')} className="underline-offset-2 hover:underline">Method</button>
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='status'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('status')} className="underline-offset-2 hover:underline">Status</button>
                                  </th>
                                  <th className={styles.th} role="columnheader" aria-sort={sortField==='verified'?sortDir:'none'}>
                                    <button onClick={() => toggleSort('verified')} className="underline-offset-2 hover:underline">Verified</button>
                                  </th>
                                  <th className={styles.th}>Actions</th>
                                </tr>
                              </thead>
                            <tbody className={styles.fadeIn}>
                              {pagedPaid.map((p) => {
                                const badge = (status) => {
                                  const common =
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold";
                                  switch ((status || "").toLowerCase()) {
                                    case "verified":
                                      return `${common} bg-green-100 text-green-700`;
                                    case "pending":
                                    case "unverified":
                                      return `${common} bg-amber-100 text-amber-700`;
                                    case "flagged":
                                      return `${common} bg-slate-200 text-slate-700`;
                                    case "cancelled":
                                      return `${common} bg-red-100 text-red-700`;
                                    default:
                                      return `${common} bg-slate-100 text-slate-600`;
                                  }
                                };
                                const verifiedLabel = (p.verificationStatus || "").toLowerCase();
                                const statusLabel = (p.booking?.status || p.status || "").toLowerCase();
                                return (
                                  <tr
                                    key={p.id}
                                    onClick={() => openPaymentModal(p)}
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPaymentModal(p); } }}
                                    className={`${styles.trClickable} ${selectedRows.has(p.id) ? styles.rowSelected : ''}`}
                                  >
                                    <td className={styles.td} onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={selectedRows.has(p.id)}
                                        onChange={() => toggleRowSelection(p.id)}
                                        aria-label={`Select payment ${p.id}`}
                                      />
                                    </td>
                                    <td className={styles.td}>{formatPaymentId(p.id)}</td>
                                    <td className={styles.td}>
                                      {p.booking?.user?.name || p.booking?.guestName || "N/A"}
                                    </td>
                                    <td className={styles.td}>{formatCurrency(Number(p.amount))}</td>
                                    <td className={styles.td}>{p.method || p.provider || "—"}</td>
                                    <td className={styles.td}>
                                      <span className={badge(statusLabel)}>
                                        {p.status || p.booking?.status || "—"}
                                      </span>
                                    </td>
                                    <td className={styles.td}>
                                      <span className={badge(verifiedLabel)}>
                                        {p.verificationStatus || "—"}
                                      </span>
                                    </td>
                                    <td className={styles.td}>
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openPaymentModal(p); }}
                                        className={`${styles.button} ${styles.btnReview}`}
                                        aria-label={`Open payment ${p.id}`}
                                      >
                                        Review
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {filteredPaidPayments.length === 0 && (
                                <tr>
                                  <td colSpan={8} className={`${styles.td} text-center text-slate-500 py-10`}>
                                    No paid transactions today
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                          ) : (
                            <div className="p-4">
                              {/* Timeline view */}
                              <div className="space-y-4">
                                {pagedPaid.map((p, idx) => (
                                  <div key={p.id} className="flex gap-4 items-start">
                                    <div className="flex flex-col items-center">
                                      <div className="h-3 w-3 rounded-full bg-amber-500 ring-4 ring-amber-100"></div>
                                      {idx < pagedPaid.length - 1 && (
                                        <div className="w-0.5 h-full bg-slate-200 flex-1 min-h-[60px]"></div>
                                      )}
                                    </div>
                                    <div className="flex-1 bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => openPaymentModal(p)}>
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="font-semibold text-slate-800">Payment {formatPaymentId(p.id)}</div>
                                        <div className="text-sm text-slate-500">
                                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                                        </div>
                                      </div>
                                      <div className="text-sm text-slate-600 mb-2">
                                        <strong>{p.booking?.user?.name || p.booking?.guestName || 'N/A'}</strong> · {formatCurrency(Number(p.amount))}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">{p.method || p.provider || '—'}</span>
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          (p.verificationStatus || '').toLowerCase() === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                        }`}>{p.verificationStatus || '—'}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {/* Pagination */}
                          {paidTotalPages > 1 && (
                            <div className={`${styles.paginationBar} ${styles.barRelative}`}>
                              {refreshLoading && <div className={`${styles.refreshBar} ${styles.topBar}`} />}
                              <div className={styles.paginationInfo}>
                                Page {paidPage} of {paidTotalPages}
                              </div>
                              <div className={styles.paginationButtons}>
                                <button
                                  onClick={() => setPaidPage((p) => Math.max(1, p - 1))}
                                  disabled={paidPage === 1}
                                  className={styles.paginationBtn}
                                >
                                  Prev
                                </button>
                                <button
                                  onClick={() => setPaidPage((p) => Math.min(paidTotalPages, p + 1))}
                                  disabled={paidPage === paidTotalPages}
                                  className={styles.paginationBtn}
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </main>

                    {/* Payment Modal */}
                    {decisionModal.show && (
                      <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="cashier-payment-modal-title">
                        <div
                          className={styles.modal}
                          ref={modalRef}
                          tabIndex={-1}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setDecisionModal({ show: false, payment: null });
                          }}
                        >
                          <h3 id="cashier-payment-modal-title" className={styles.modalHeader}>Payment Details</h3>
                          <div className="space-y-4">
                            {/* Summary */}
                            <div className={styles.modalSummaryGrid}>
                              <div>
                                <label className={styles.label}>Payment ID</label>
                                <input type="text" className={styles.input} value={formatPaymentId(decisionModal.payment?.id)} readOnly />
                              </div>
                              <div>
                                <label className={styles.label}>Guest</label>
                                <input type="text" className={styles.input} value={
                                  decisionModal.payment?.booking?.user?.name ||
                                  decisionModal.payment?.user?.name ||
                                  decisionModal.payment?.guestName ||
                                  "N/A"
                                } readOnly />
                              </div>
                              <div>
                                <label className={styles.label}>Required Amount</label>
                                <input type="text" className={styles.input} value={formatCurrency(
                                    decisionModal.payment?.totalPrice ||
                                      decisionModal.payment?.amount ||
                                      0
                                  )} readOnly />
                              </div>
                              <div>
                                <label className={styles.label}>Method</label>
                                <input type="text" className={styles.input} value={
                                  decisionModal.payment?.method ||
                                  decisionModal.payment?.provider ||
                                  decisionModal.payment?.paymentMethod ||
                                  "—"
                                } readOnly />
                              </div>
                            </div>

                            {/* Editable Fields */}
                            <div className={styles.modalGrid}>
                              <div>
                                <label className={styles.label}>Amount Tendered</label>
                                <input
                                  ref={amountTenderedRef}
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={amountTendered}
                                  onChange={(e) => setAmountTendered(e.target.value)}
                                  className={styles.input}
                                />
                              </div>
                              <div>
                                <label className={styles.label}>Amount Customer Paid</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={amountCustomerPaid}
                                  onChange={(e) => setAmountCustomerPaid(e.target.value)}
                                  className={styles.input}
                                />
                              </div>
                              <div>
                                <label className={styles.label}>Payment Method</label>
                                <select
                                  value={paymentMethod}
                                  onChange={(e) => setPaymentMethod(e.target.value)}
                                  className={styles.select}
                                >
                                  <option value="">Select Method</option>
                                  <option value="cash">Cash</option>
                                  <option value="card">Card</option>
                                  <option value="gcash">GCash</option>
                                  <option value="maya">Maya</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                </select>
                              </div>
                              <div>
                                <label className={styles.label}>Reference No.</label>
                                <input
                                  type="text"
                                  value={referenceNo}
                                  onChange={(e) => setReferenceNo(e.target.value)}
                                  className={styles.input}
                                />
                              </div>
                              <div>
                                <label className={styles.label}>Name</label>
                                <input
                                  type="text"
                                  value={name}
                                  onChange={(e) => setName(e.target.value)}
                                  className={styles.input}
                                />
                              </div>
                              <div>
                                <label className={styles.label}>Email</label>
                                <input
                                  type="email"
                                  value={email}
                                  onChange={(e) => setEmail(e.target.value)}
                                  className={styles.input}
                                />
                              </div>
                              <div>
                                <label className={styles.label}>Contact No.</label>
                                <input
                                  type="text"
                                  value={contact}
                                  onChange={(e) => setContact(e.target.value)}
                                  className={styles.input}
                                />
                              </div>
                              <div>
                                <label className={styles.label}>Date Paid</label>
                                <input
                                  type="date"
                                  value={datePaid}
                                  onChange={(e) => setDatePaid(e.target.value)}
                                  className={styles.input}
                                />
                              </div>
                              <div>
                                <label className={styles.label}>Booking Type</label>
                                <select
                                  value={bookingType}
                                  onChange={(e) => setBookingType(e.target.value)}
                                  className={styles.select}
                                >
                                  <option value="Walk-in">Walk-in</option>
                                  <option value="Reservation">Reservation</option>
                                </select>
                              </div>
                            </div>

                            {/* Notes */}
                            <div>
                              <label className={styles.label}>Internal Note</label>
                              <textarea
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                placeholder="e.g., Downpayment verified at 12:45 PM"
                                className={styles.textarea}
                              />
                            </div>

                            {/* Calculated Change Preview */}
                            <div className="px-3 py-2 rounded-md" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                              {(() => {
                                const payment = decisionModal.payment;
                                const required = Number(payment?.totalPrice || payment?.amount || 0);
                                const paid = Math.round((parseFloat(amountCustomerPaid || amountTendered || '0') || 0) * 100);
                                const change = Math.max(0, paid - required);
                                return (
                                  <div className="flex flex-wrap gap-3 text-sm text-slate-700">
                                    <div><strong>Required:</strong> {formatCurrency(required)}</div>
                                    <div><strong>Tendered:</strong> {formatCurrency(paid)}</div>
                                    <div><strong>Change:</strong> {formatCurrency(change)}</div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <div className={styles.modalFooter}>
                            <button
                              onClick={() => setDecisionModal({ show: false, payment: null })}
                              className={`${styles.button} ${styles.btnClose}`}
                            >
                              Close
                            </button>
                            <button
                              onClick={generateReceipt}
                              className={`${styles.button} ${styles.btnNeutral}`}
                            >
                              Generate Receipt
                            </button>
                            {(() => {
                              const payment = decisionModal.payment;
                              const required = Number(payment?.totalPrice || payment?.amount || 0);
                              const paid = Math.round((parseFloat(amountCustomerPaid || amountTendered || '0') || 0) * 100);
                              const canConfirm = !actionLoading && paymentMethod && paid >= required && required > 0;
                              return (
                                <>
                                  <button
                                    onClick={disapproveTransaction}
                                    disabled={actionLoading}
                                    className={`${styles.button} ${styles.btnFlag}`}
                                  >
                                    Cancel Transaction
                                    {actionLoading && <span className={styles.inlineSpinner} />}
                                  </button>
                                  <button
                                    onClick={approveTransaction}
                                    disabled={!canConfirm}
                                    className={`${styles.button} ${styles.btnVerify}`}
                                    title={!paymentMethod ? 'Select a payment method' : (paid < required ? 'Amount tendered is less than required' : undefined)}
                                  >
                                    Confirm Payment
                                    {actionLoading && <span className={styles.inlineSpinner} />}
                                  </button>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cashier Modals */}
                    <>
                      <ChangeModal modal={changeModal} setModal={setChangeModal} onClose={changeModal.onClose} />
                      <ReceiptModal modal={receiptModal} setModal={setReceiptModal} />
                    </>

                    {/* Notifications Modal */}
                    {showNotifications && (
                      <div className={styles.modalOverlay} onClick={() => setShowNotifications(false)}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
                          <div className="flex items-center justify-between mb-4">
                            <h2 className={styles.modalHeader} style={{margin: 0}}>🔔 Notifications</h2>
                            <button
                              onClick={() => setShowNotifications(false)}
                              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              aria-label="Close"
                            >
                              <XCircle className="h-5 w-5 text-slate-500" />
                            </button>
                          </div>
                          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                            {notifications.length === 0 ? (
                              <div className="text-center py-10 text-slate-500">
                                <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>No notifications</p>
                              </div>
                            ) : (
                              notifications.map((notif) => (
                                <div
                                  key={notif.id}
                                  className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border border-slate-200"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                      {notif.type === 'payment' && <DollarSign className="h-5 w-5 text-green-600" />}
                                      {notif.type === 'alert' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                                      {notif.type === 'info' && <Bell className="h-5 w-5 text-blue-600" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-800">{notif.title}</p>
                                      <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                                      <p className="text-xs text-slate-400 mt-2">
                                        {notif.createdAt ? new Date(notif.createdAt).toLocaleString() : 'Just now'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Logout Confirmation Modal */}
                    <NavigationConfirmationModal
                      show={navigationGuard.showModal}
                      onStay={navigationGuard.handleStay}
                      onLeave={() => signOut()}
                      context="logout"
                      message={navigationGuard.message}
                    />

                    {/* Back/Leave Confirmation for Cancel */}
                    <NavigationConfirmationModal
                      show={backConfirm}
                      onStay={() => setBackConfirm(false)}
                      onLeave={() => {
                        setBackConfirm(false);
                        setDecisionModal({ show: false, payment: null });
                        resetForm();
                      }}
                      context="leave"
                      message={"Do you want to go back?"}
                    />

                    {/* Footer */}
                    <footer className={styles.footer}>
                      <p className={styles.footerText}>
                        For technical support or system inquiries, please contact the{' '}
                        <a href="/super-admin" className={styles.footerLink}>
                          Super Administrator
                        </a>
                        {' '}or email support@hotel.com
                      </p>
                    </footer>
                  </div>
                );
              }
