                'use client';
                import { useSession, signOut } from 'next-auth/react';
                import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
                import { useChangeModal, ChangeModal, useReceiptModal, ReceiptModal, NavigationConfirmationModal } from '@/components/CustomModals';
                import { useToast } from '@/components/Toast';
                import { useNavigationGuard } from '../../hooks/useNavigationGuard.simple';
                import { Bell, Search, ChevronDown, User, LogOut, CheckCircle2, AlertTriangle, XCircle, Flag, CreditCard, CalendarDays, BookOpen, Clock, Calculator, Hotel, X, Eye, Calendar, Users, MoreVertical, Download, Lock } from 'lucide-react';
                import styles from './Cashier.module.css';
                import { useBookingUpdates, usePaymentUpdates, useStaffNotifications } from '@/hooks/usePusher';
                import ChangePasswordModal from '@/components/ChangePasswordModal';

                /**
                 * CASHIER API ENDPOINTS DOCUMENTATION
                 * ===================================
                 * 
                 * 1. /api/cashier/verify (POST)
                 *    - Purpose: Verify payment transactions
                 *    - Payload: { paymentId, note? }
                 *    - Auth: CASHIER or SUPERADMIN
                 *    - Creates notifications for RECEPTIONIST and SUPERADMIN
                 *    - Records audit trail
                 * 
                 * 2. /api/cashier/flag (POST)
                 *    - Purpose: Flag suspicious or problematic payments
                 *    - Payload: { paymentId, reason }
                 *    - Auth: CASHIER or SUPERADMIN
                 *    - Creates notification for SUPERADMIN
                 *    - Records audit trail
                 * 
                 * 3. /api/cashier/confirm-full (POST)
                 *    - Purpose: Process full payment for on-site bookings
                 *    - Payload: { bookingId, amountPaid, method, referenceNo? }
                 *    - Auth: CASHIER or SUPERADMIN
                 *    - Creates payment record with 'Paid' status
                 *    - Updates booking payment status
                 *    - Records audit trail
                 * 
                 * 4. /api/cashier/upcoming-reservations (GET)
                 *    - Purpose: Fetch upcoming reservations with future check-in dates
                 *    - Auth: CASHIER or SUPERADMIN
                 *    - Returns bookings with paymentStatus: 'Reservation' and future check-in
                 *    - Includes booking details, user info, and payment information
                 * 
                 * 5. /api/cashier/reports (GET)
                 *    - Purpose: Generate payment reports for specific dates
                 *    - Query Params: date (ISO string), format (json|csv|pdf)
                 *    - Auth: CASHIER or SUPERADMIN
                 *    - Returns payment data for the specified date range
                 *    - Supports multiple export formats
                 */// Helper function to format payment IDs consistently
function formatPaymentId(id) {
  if (!id) return 'Payment Menthod';
  
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

                // Memoized callbacks for navigation guard to prevent re-renders
                const shouldPreventNav = useCallback(() => true, []);
                const onNavAttempt = useCallback(() => {
                  console.log('Cashier Dashboard: Navigation attempt detected, showing logout confirmation');
                }, []);
                const customLogout = useCallback(() => signOut({ callbackUrl: '/login' }), []);

                // Navigation guard for logout/back
                const navigationGuard = useNavigationGuard({
                  shouldPreventNavigation: shouldPreventNav,
                  onNavigationAttempt: onNavAttempt,
                  customAction: customLogout,
                  context: 'logout',
                  message: 'Are you sure you want to log out of your Cashier dashboard?'
                });

                // UI state
                const [userMenuOpen, setUserMenuOpen] = useState(false);
                const [showChangePassword, setShowChangePassword] = useState(false);
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
                
                // Notification simulator state
                const [liveNotifications, setLiveNotifications] = useState([]);
                const [showLiveNotification, setShowLiveNotification] = useState(false);
                const [currentLiveNotification, setCurrentLiveNotification] = useState(null);

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

                // Pagination
                const [paidPage, setPaidPage] = useState(1);
                const paidPageSize = 6;
                // Pagination for Total & Pending overview tables
                const [totalPage, setTotalPage] = useState(1);
                const totalPageSize = 6;
                const [pendingPage, setPendingPage] = useState(1);
                const pendingPageSize = 6;
                // Pagination for Upcoming Reservations
                const [upcomingPage, setUpcomingPage] = useState(1);
                const upcomingPageSize = 5;
                const [refreshLoading, setRefreshLoading] = useState(false);

                // Completed transactions by cashier
                const [completedTransactions, setCompletedTransactions] = useState([]);
                const [completedPage, setCompletedPage] = useState(1);
                const completedPageSize = 6;

                // Checkout transactions scheduled for today
                const [checkoutTransactions, setCheckoutTransactions] = useState([]);
                const [checkoutPage, setCheckoutPage] = useState(1);
                const checkoutPageSize = 6;
                const [checkoutLoading, setCheckoutLoading] = useState(false);

                // Cancelled transactions
                const [cancelledTransactions, setCancelledTransactions] = useState([]);
                const [cancelledPage, setCancelledPage] = useState(1);
                const cancelledPageSize = 6;

                // Modals
                const [changeModal, setChangeModal] = useChangeModal();
                const [receiptModal, setReceiptModal] = useReceiptModal();
                const [decisionModal, setDecisionModal] = useState({ show: false, payment: null });
                const [eReceiptModal, setEReceiptModal] = useState({ show: false, receiptData: null });
                const [cancellationModal, setCancellationModal] = useState({ show: false, transaction: null });
                const [cancelDetailsModal, setCancelDetailsModal] = useState({ show: false, transaction: null });
                const [viewDetailsModal, setViewDetailsModal] = useState({ show: false, data: null });
                const [cancellationReason, setCancellationReason] = useState("");
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
                // Track existing payments for detection of down payments
                const [previousPaid, setPreviousPaid] = useState(0);
                const [isDownPaymentExisting, setIsDownPaymentExisting] = useState(false);

                // Helpers
                const formatCurrency = (cents) => {
                  const n = Number(cents || 0) / 100;
                  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n);
                };

                // No-decimal formatter (displays whole pesos, rounded)
                const formatCurrencyNoDecimal = (cents) => {
                  const n = Number(cents || 0) / 100;
                  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
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
                    const newBookings = Array.isArray(data) ? data : data.bookings || [];
                    // Avoid clobbering local state with an empty response due to pagination or transient API issues
                    if (Array.isArray(newBookings) && newBookings.length > 0) {
                      setBookings(newBookings);
                    } else {
                      // keep existing bookings if API returned empty
                      console.warn('fetchBookings returned empty; keeping previous bookings state');
                    }
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



                const showLiveNotificationPopup = (notification) => {
                  setCurrentLiveNotification(notification);
                  setShowLiveNotification(true);
                  
                  // Add to live notifications list
                  setLiveNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
                  
                  // Auto-hide after 5 seconds
                  setTimeout(() => {
                    setShowLiveNotification(false);
                  }, 5000);
                };



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

                // NOTE: consolidated two-window `fetchUpcomingReservations()` is implemented
                // later in this file (handles Today->+15 and Tomorrow->+15). The earlier
                // single-window implementation was removed to avoid duplicate definitions.

                async function fetchCompletedTransactions() {
                  try {
                    const res = await fetch('/api/cashier/completed-transactions');
                    if (res.ok) {
                      const data = await res.json();
                      setCompletedTransactions(Array.isArray(data) ? data : []);
                    } else {
                      setCompletedTransactions([]);
                    }
                  } catch (e) {
                    console.error('Failed to fetch completed transactions:', e);
                    setCompletedTransactions([]);
                  }
                }

                async function fetchCancelledTransactions() {
                  try {
                    const today = new Date().toISOString().split('T')[0];
                    const res = await fetch(`/api/cashier/cancelled-transactions?date=${today}`);
                    if (res.ok) {
                      const data = await res.json();
                      setCancelledTransactions(Array.isArray(data) ? data : []);
                    } else {
                      setCancelledTransactions([]);
                    }
                  } catch (e) {
                    console.error('Failed to fetch cancelled transactions:', e);
                    setCancelledTransactions([]);
                  }
                }

                async function fetchCheckoutTransactions() {
                  setCheckoutLoading(true);
                  try {
                    const today = new Date().toISOString().split('T')[0];
                    
                    // Fetch bookings with checkout scheduled for today
                    const checkoutRes = await fetch(`/api/bookings/checkout?date=${today}`);
                    let checkouts = [];
                    if (checkoutRes.ok) {
                      const data = await checkoutRes.json();
                      checkouts = Array.isArray(data) ? data : data.checkouts || [];
                    }

                    // Only use bookings that are scheduled to checkout today (do NOT mix bookings created today)
                    const unpaidCheckouts = (checkouts || []).filter(b => (b.paymentStatus || '').toLowerCase() !== 'paid');
                    setCheckoutTransactions(unpaidCheckouts);
                  } catch (e) {
                    // Fallback to local filtering
                    const today = new Date().toISOString().split('T')[0];
                    const todayCheckouts = bookings.filter(booking => {
                      const checkoutDate = new Date(booking.checkOut).toISOString().split('T')[0];
                      const createdDate = new Date(booking.createdAt).toISOString().split('T')[0];
                      return (checkoutDate === today && (booking.status || '').toLowerCase() === 'confirmed' && booking.paymentStatus !== 'Paid');
                    });
                    setCheckoutTransactions(todayCheckouts);
                  } finally {
                    setCheckoutLoading(false);
                  }
                }

                useEffect(() => {
                  let mounted = true;
                  (async () => {
                    await Promise.all([fetchPaidPayments(), fetchBookings(), fetchNotifications(), fetchTotalTransactions(), fetchPendingTransactions(), fetchUpcomingReservations(), fetchCheckoutTransactions(), fetchCompletedTransactions(), fetchCancelledTransactions()]);
                    if (mounted) setLoading(false);
                  })();
                  
                  // Auto-refresh every 30 seconds. Use a lightweight summary check for upcoming
                  // reservations so we only fetch the full upcoming list when something changed.
                  const intervalId = setInterval(async () => {
                    if (!mounted) return;
                    try {
                      console.log('Auto-refreshing data (summary-first)...');
                      // Trigger other refreshes in parallel, but use summary check for upcoming
                      await Promise.all([fetchPaidPayments(), fetchBookings(), fetchNotifications(), fetchTotalTransactions(), fetchPendingTransactions(), fetchCheckoutTransactions(), fetchCompletedTransactions(), fetchCancelledTransactions()]);
                      // Check upcoming summary and conditionally refresh full upcoming lists
                      if (typeof fetchUpcomingSummary === 'function') {
                        await fetchUpcomingSummary();
                      } else {
                        await fetchUpcomingReservations();
                      }
                    } catch (err) {
                      console.warn('Auto-refresh error', err);
                    }
                  }, 30000); // 30 seconds
                  
                  return () => {
                    mounted = false;
                    clearInterval(intervalId);
                  };
                }, []);

                // 🔔 PUSHER: Real-time updates for cashier dashboard
                // Callback to refresh all cashier data
                const refetchCashierData = useCallback(() => {
                  console.log('[Pusher] Received update, refreshing cashier data...');
                  Promise.all([
                    fetchPaidPayments(),
                    fetchBookings(),
                    fetchTotalTransactions(),
                    fetchPendingTransactions(),
                    fetchUpcomingReservations(),
                    fetchCheckoutTransactions(),
                    fetchCompletedTransactions(),
                  ]).catch(err => console.warn('[Pusher] Refresh error:', err));
                }, []);

                // Subscribe to booking events
                useBookingUpdates({
                  onBookingCreated: (data) => {
                    console.log('[Pusher] New booking:', data.guestName);
                    toastSuccess(`New booking from ${data.guestName}`);
                    refetchCashierData();
                  },
                  onBookingUpdated: (data) => {
                    console.log('[Pusher] Booking updated:', data.bookingId);
                    refetchCashierData();
                  },
                  onBookingCancelled: (data) => {
                    console.log('[Pusher] Booking cancelled:', data.bookingId);
                    refetchCashierData();
                  },
                  onCheckedIn: (data) => {
                    console.log('[Pusher] Guest checked in:', data.guestName);
                    toastSuccess(`${data.guestName} has checked in`);
                    refetchCashierData();
                  },
                  onPaymentReceived: (data) => {
                    console.log('[Pusher] Payment received:', data.guestName);
                    toastSuccess(`Payment received from ${data.guestName}`);
                    refetchCashierData();
                  },
                });

                // Subscribe to payment events
                usePaymentUpdates({
                  onPaymentReceived: (data) => {
                    console.log('[Pusher] Payment received:', data);
                    refetchCashierData();
                  },
                  onPaymentVerified: (data) => {
                    console.log('[Pusher] Payment verified:', data);
                    refetchCashierData();
                  },
                });

                // Subscribe to cashier-specific notifications
                useStaffNotifications('CASHIER', (notification) => {
                  console.log('[Pusher] New notification:', notification.message);
                  toastSuccess(notification.message);
                  fetchNotifications();
                });

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

                // Upcoming reservations: show bookings/reservations for the next 15 days
                const [upcomingReservations, setUpcomingReservations] = useState([]);
                const [upcomingReservationsTomorrow, setUpcomingReservationsTomorrow] = useState([]);
                const [upcomingLoading, setUpcomingLoading] = useState(false);

                // Fetch upcoming reservations for two 15-day windows:
                // 1) Today -> +15 days
                // 2) Tomorrow -> +15 days from tomorrow
                // Sets `upcomingReservations` (today-window) and `upcomingReservationsTomorrow`.
                async function fetchUpcomingReservations() {
                  setUpcomingLoading(true);
                  try {
                    const todayObj = new Date();
                    const today = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
                    const todayISO = today.toISOString().split('T')[0];

                    const tomorrowObj = new Date(today);
                    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
                    const tomorrowISO = tomorrowObj.toISOString().split('T')[0];

                    const fifteenFromToday = new Date(today);
                    fifteenFromToday.setDate(fifteenFromToday.getDate() + 15);
                    const endTodayISO = fifteenFromToday.toISOString().split('T')[0];

                    const fifteenFromTomorrow = new Date(tomorrowObj);
                    fifteenFromTomorrow.setDate(fifteenFromTomorrow.getDate() + 15);
                    const endTomorrowISO = fifteenFromTomorrow.toISOString().split('T')[0];

                    // Try dedicated endpoint for ranges (preferred)
                    const resToday = await fetch(`/api/bookings/upcoming?startDate=${todayISO}&endDate=${endTodayISO}`);
                    const resTomorrow = await fetch(`/api/bookings/upcoming?startDate=${tomorrowISO}&endDate=${endTomorrowISO}`);

                    let listToday = [];
                    let listTomorrow = [];

                    if (resToday.ok) {
                      const data = await resToday.json();
                      listToday = Array.isArray(data) ? data : data.reservations || data.bookings || [];
                    }

                    if (resTomorrow.ok) {
                      const data = await resTomorrow.json();
                      listTomorrow = Array.isArray(data) ? data : data.reservations || data.bookings || [];
                    }

                    // If endpoints didn't return data, fallback to local filtering
                    if (!resToday.ok || !Array.isArray(listToday) || listToday.length === 0) {
                      listToday = (bookings || []).filter(booking => {
                        const checkIn = booking.checkInDate || booking.checkIn || booking.startDate;
                        if (!checkIn) return false;
                        const d = new Date(checkIn);
                        const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        return dOnly >= today && dOnly <= fifteenFromToday && (booking.status || '').toLowerCase() !== 'cancelled';
                      });
                    }

                    if (!resTomorrow.ok || !Array.isArray(listTomorrow) || listTomorrow.length === 0) {
                      listTomorrow = (bookings || []).filter(booking => {
                        const checkIn = booking.checkInDate || booking.checkIn || booking.startDate;
                        if (!checkIn) return false;
                        const d = new Date(checkIn);
                        const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        return dOnly >= tomorrowObj && dOnly <= fifteenFromTomorrow && (booking.status || '').toLowerCase() !== 'cancelled';
                      });
                    }

                    // Normalize bookings: ensure totalPrice/totalAmount present and compute daysUntilCheckIn
                    const normalizeList = (list, windowStart) => {
                      const nowDay = new Date(windowStart.getFullYear(), windowStart.getMonth(), windowStart.getDate());

                      const computeLocalTotal = (booking) => {
                        try {
                          let total = 0;
                          // rooms
                          if (booking.rooms && Array.isArray(booking.rooms)) {
                            const checkIn = booking.checkInDate || booking.checkIn || booking.startDate;
                            const checkOut = booking.checkOutDate || booking.checkOut || booking.endDate;
                            let nights = 1;
                            if (checkIn && checkOut) {
                              const ci = new Date(checkIn);
                              const co = new Date(checkOut);
                              const diff = Math.max(0, co.getTime() - ci.getTime());
                              nights = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                            }
                            for (const r of booking.rooms) {
                              const qty = Number(r.quantity || 1);
                              const price = Number(r.room?.price || r.price || 0);
                              total += (price * qty * nights);
                            }
                          }

                          // rental amenities
                          if (booking.rentalAmenities && Array.isArray(booking.rentalAmenities)) {
                            for (const ra of booking.rentalAmenities) {
                              const rp = Number(ra.totalPrice || ra.price || 0);
                              total += rp;
                            }
                          }

                          // cottages
                          if (booking.cottage && Array.isArray(booking.cottage)) {
                            for (const c of booking.cottage) {
                              const cp = Number(c.totalPrice || c.price || 0);
                              total += cp;
                            }
                          }

                          return total || 0;
                        } catch (err) {
                          return 0;
                        }
                      };

                      const computePaid = (booking) => {
                        try {
                          const paid = (booking.payments || []).reduce((s, p) => {
                            if (!p) return s;
                            let amt = Number(p.amount || 0);
                            if (amt > 1000000) amt = Math.floor(amt / 100);
                            const status = (p.status || '').toLowerCase();
                            return (status === 'paid' || status === 'partial' || status === 'reservation' || status === 'completed') ? s + amt : s;
                          }, 0);
                          return paid;
                        } catch (err) {
                          return 0;
                        }
                      };

                      return (list || []).map(b => {
                        const checkInRaw = b.checkInDate || b.checkIn || b.startDate;
                        const checkInDate = checkInRaw ? new Date(checkInRaw) : null;
                        const checkInOnly = checkInDate ? new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate()) : null;
                        let daysUntil = null;
                        if (checkInOnly) {
                          const msPerDay = 1000 * 60 * 60 * 24;
                          daysUntil = Math.ceil((checkInOnly.getTime() - nowDay.getTime()) / msPerDay);
                          if (daysUntil < 0) daysUntil = 0;
                        }

                        // Prefer server-computed totals if present
                        const serverTotal = Number(b.totalCostWithAddons || b.totalPrice || b.totalAmount || b.total || b.amount || 0);
                        const localTotal = computeLocalTotal(b);
                        const totalPrice = (!isNaN(serverTotal) && serverTotal > 0) ? serverTotal : (localTotal > 0 ? localTotal : 0);

                        const totalPaid = computePaid(b);

                        if (!totalPrice || Number(totalPrice) === 0) {
                          console.warn('Upcoming booking has total 0', { id: b.id, guestName: b.guestName, checkIn: checkInRaw, localTotal, serverTotal });
                        }

                        return {
                          ...b,
                          totalPrice,
                          totalPaid,
                          totalAmount: b.totalAmount || b.totalPrice || b.totalCostWithAddons || b.total || b.amount || 0,
                          daysUntilCheckIn: daysUntil
                        };
                      });
                    };
                    const normToday = normalizeList(listToday, today);
                    const normTomorrow = normalizeList(listTomorrow, tomorrowObj);

                    // Only replace state if we have results; otherwise keep existing to avoid disappearing UI on intermittent failures
                    if (Array.isArray(normToday) && normToday.length > 0) setUpcomingReservations(normToday);
                    else console.warn('fetchUpcomingReservations: today window returned no items; retaining previous upcomingReservations');

                    if (Array.isArray(normTomorrow) && normTomorrow.length > 0) setUpcomingReservationsTomorrow(normTomorrow);
                    else console.warn('fetchUpcomingReservations: tomorrow window returned no items; retaining previous upcomingReservationsTomorrow');
                  } catch (e) {
                    console.error('Failed to fetch upcoming reservations (two-window):', e);
                    // Fallback: use local bookings and compute windows
                    try {
                      const now = new Date();
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                      const fifteenFromToday = new Date(today); fifteenFromToday.setDate(today.getDate() + 15);
                      const fifteenFromTomorrow = new Date(tomorrow); fifteenFromTomorrow.setDate(tomorrow.getDate() + 15);

                      const listToday = (bookings || []).filter(booking => {
                        const checkIn = booking.checkInDate || booking.checkIn || booking.startDate;
                        if (!checkIn) return false;
                        const d = new Date(checkIn);
                        const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        return dOnly >= today && dOnly <= fifteenFromToday && (booking.status || '').toLowerCase() !== 'cancelled';
                      });

                      const listTomorrow = (bookings || []).filter(booking => {
                        const checkIn = booking.checkInDate || booking.checkIn || booking.startDate;
                        if (!checkIn) return false;
                        const d = new Date(checkIn);
                        const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                        return dOnly >= tomorrow && dOnly <= fifteenFromTomorrow && (booking.status || '').toLowerCase() !== 'cancelled';
                      });

                      setUpcomingReservations(listToday);
                      setUpcomingReservationsTomorrow(listTomorrow);
                    } catch (inner) {
                      setUpcomingReservations([]);
                      setUpcomingReservationsTomorrow([]);
                    }
                  } finally {
                    setUpcomingLoading(false);
                  }
                }

                // Lightweight summary key to avoid fetching the full upcoming list unless something changed.
                const [upcomingSummaryKey, setUpcomingSummaryKey] = useState(null);

                async function fetchUpcomingSummary() {
                  try {
                    const todayObj = new Date();
                    const today = new Date(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
                    const todayISO = today.toISOString().split('T')[0];

                    const tomorrowObj = new Date(today);
                    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
                    const tomorrowISO = tomorrowObj.toISOString().split('T')[0];

                    const fifteenFromToday = new Date(today);
                    fifteenFromToday.setDate(fifteenFromToday.getDate() + 15);
                    const endTodayISO = fifteenFromToday.toISOString().split('T')[0];

                    const fifteenFromTomorrow = new Date(tomorrowObj);
                    fifteenFromTomorrow.setDate(fifteenFromTomorrow.getDate() + 15);
                    const endTomorrowISO = fifteenFromTomorrow.toISOString().split('T')[0];

                    const [resToday, resTomorrow] = await Promise.all([
                      fetch(`/api/bookings/upcoming/summary?startDate=${todayISO}&endDate=${endTodayISO}`),
                      fetch(`/api/bookings/upcoming/summary?startDate=${tomorrowISO}&endDate=${endTomorrowISO}`)
                    ]);

                    let t1 = null;
                    let t2 = null;
                    if (resToday.ok) t1 = await resToday.json();
                    if (resTomorrow.ok) t2 = await resTomorrow.json();

                    const key = `${t1?.latestUpdatedAt||''}:${t1?.count||0}|${t2?.latestUpdatedAt||''}:${t2?.count||0}`;
                    if (key !== upcomingSummaryKey) {
                      setUpcomingSummaryKey(key);
                      // Something changed — refresh the full upcoming lists
                      await fetchUpcomingReservations();
                    }
                    return key;
                  } catch (err) {
                    console.warn('fetchUpcomingSummary error', err);
                    return null;
                  }
                }

                const upcomingTransactionsList = useMemo(() => {
                  // Start with normalized upcoming reservations
                  let list = (upcomingReservations || []);

                  // Apply global search filter if present
                  const q = (searchDebounced || '').toLowerCase();
                  if (q) {
                    list = list.filter(r => {
                      return (
                        (r.guestName || '').toString().toLowerCase().includes(q) ||
                        (r.user?.name || '').toString().toLowerCase().includes(q) ||
                        (r.user?.email || '').toString().toLowerCase().includes(q) ||
                        (r.id || '').toString().includes(q)
                      );
                    });
                  }

                  // Exclude reservations whose check-in date is before today (date-only comparison)
                  try {
                    const now = new Date();
                    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    list = list.filter(r => {
                      const checkInRaw = r.checkInDate || r.checkIn || r.startDate;
                      if (!checkInRaw) return false;
                      const d = new Date(checkInRaw);
                      if (isNaN(d.getTime())) return false;
                      const dOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                      return dOnly.getTime() >= todayOnly.getTime();
                    });
                  } catch (e) {
                    // if anything fails, proceed without dropping items
                    console.warn('upcoming filter: date-only exclusion failed', e);
                  }

                  // Filter by status if set
                  if (filterStatus) {
                    list = list.filter(r => (r.status || '').toLowerCase() === filterStatus.toLowerCase());
                  }

                  // Filter by payment method if set
                  if (filterPaymentMethod) {
                    list = list.filter(r => {
                      const methods = r.paymentMethods || [];
                      // Also consider booking.paymentMethod legacy field
                      return methods.includes(filterPaymentMethod) || (r.paymentMethod === filterPaymentMethod);
                    });
                  }

                  // Apply dateFrom/dateTo filtering if provided
                  if (!dateFrom && !dateTo) return list;

                  return list.filter(reservation => {
                    const checkInDateRaw = reservation.checkInDate || reservation.checkIn;
                    if (!checkInDateRaw) return false;
                    const reservationDate = new Date(checkInDateRaw);
                    if (isNaN(reservationDate.getTime())) return false;

                    if (dateFrom) {
                      const fromDate = new Date(dateFrom);
                      if (reservationDate < fromDate) return false;
                    }

                    if (dateTo) {
                      const toDate = new Date(dateTo);
                      toDate.setHours(23, 59, 59, 999);
                      if (reservationDate > toDate) return false;
                    }

                    return true;
                  });
                }, [upcomingReservations, searchDebounced, filterStatus, filterPaymentMethod, dateFrom, dateTo]);

                // Pagination for upcoming reservations
                const upcomingTotalPages = Math.max(1, Math.ceil((upcomingTransactionsList?.length || 0) / upcomingPageSize));
                const pagedUpcoming = useMemo(() => {
                  const start = (upcomingPage - 1) * upcomingPageSize;
                  return (upcomingTransactionsList || []).slice(start, start + upcomingPageSize);
                }, [upcomingTransactionsList, upcomingPage]);

                const totalTotalPages = Math.max(1, Math.ceil((upcomingTransactionsList?.length || 0) / totalPageSize));
                const pagedTotal = useMemo(() => {
                  const start = (totalPage - 1) * totalPageSize;
                  return (upcomingTransactionsList || []).slice(start, start + totalPageSize);
                }, [upcomingTransactionsList, totalPage]);

                // Pending transactions: only show pending from current date
                const filteredPendingTransactions = useMemo(() => {
                  try {
                    const now = new Date();
                    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    
                    return (pendingTransactionsList || []).filter(transaction => {
                      // Check if status is pending
                      const isPending = (transaction.status || '').toLowerCase() === 'pending' ||
                                       (transaction.verificationStatus || '').toLowerCase() === 'pending' ||
                                       (transaction.verificationStatus || '').toLowerCase() === 'unverified';
                      
                      // Check if transaction/booking is from today
                      const transactionDate = transaction.createdAt || 
                                            transaction.timestamp || 
                                            transaction.checkInDate || 
                                            transaction.booking?.createdAt;
                      
                      if (!transactionDate) return isPending; // Include if no date but is pending
                      
                      const tDate = new Date(transactionDate);
                      const transactionDateOnly = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate());
                      const isToday = transactionDateOnly.getTime() === today.getTime();
                      
                      return isPending && isToday;
                    });
                  } catch (e) {
                    console.error('Error filtering pending transactions:', e);
                    return pendingTransactionsList || [];
                  }
                }, [pendingTransactionsList]);

                const pendingTotalPages = Math.max(1, Math.ceil((filteredPendingTransactions?.length || 0) / pendingPageSize));
                const pagedPending = useMemo(() => {
                  const start = (pendingPage - 1) * pendingPageSize;
                  return (filteredPendingTransactions || []).slice(start, start + pendingPageSize);
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

                useEffect(() => {
                  if (upcomingPage > upcomingTotalPages) setUpcomingPage(1);
                }, [upcomingPage, upcomingTotalPages]);

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

                // KPIs - Updated to focus on active checkout work and completed transactions
                const totalTransactions = checkoutTransactions.length + completedTransactions.length + upcomingTransactionsList.length;
                // KPI: count checkout transactions that need payment processing (unpaid)
                const pendingTransactions = checkoutTransactions.filter(checkout => {
                  const totalAmount = checkout.totalPrice || 0;
                  const paidAmount = (checkout.payments || [])
                    .filter(p => p.status === 'Paid')
                    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
                  return (totalAmount - paidAmount) > 0; // Has remaining balance
                }).length;
                
                // Daily totals from completed transactions processed by cashier
                const completedTransactionsTotal = completedTransactions.reduce((sum, t) => sum + Number(t.amountPaid || 0), 0);
                const dailyTotal = completedTransactionsTotal;
                
                // Cash and Card totals from completed transactions only
                const completedCashTotal = completedTransactions
                  .filter((t) => (t.paymentMethod || "").toLowerCase() === "cash")
                  .reduce((sum, t) => sum + Number(t.amountPaid || 0), 0);
                const cashTotal = completedCashTotal;
                
                const completedCardTotal = completedTransactions
                  .filter((t) => (t.paymentMethod || "").toLowerCase() === "card")
                  .reduce((sum, t) => sum + Number(t.amountPaid || 0), 0);
                const cardTotal = completedCardTotal;
                const totalNotifications = notifications.length;

                // Totals for upcoming windows (amounts are expected in cents)
                const upcomingTodayTotalAmount = useMemo(() => {
                  try {
                    return (upcomingReservations || []).reduce((sum, r) => {
                      const a = Number(r.totalPrice || r.totalAmount || r.total || r.amount || 0);
                      return sum + (isNaN(a) ? 0 : a);
                    }, 0);
                  } catch (e) {
                    return 0;
                  }
                }, [upcomingReservations]);

                const upcomingTomorrowTotalAmount = useMemo(() => {
                  try {
                    return (upcomingReservationsTomorrow || []).reduce((sum, r) => {
                      const a = Number(r.totalPrice || r.totalAmount || r.total || r.amount || 0);
                      return sum + (isNaN(a) ? 0 : a);
                    }, 0);
                  } catch (e) {
                    return 0;
                  }
                }, [upcomingReservationsTomorrow]);

                // System-wide quick total: upcoming windows + checkout remaining + completed processed amounts + paidPayments
                const systemTotalAmount = useMemo(() => {
                  try {
                    const checkoutTotal = (checkoutTransactions || []).reduce((s, c) => s + Number(c.totalPrice || c.totalAmount || c.amount || 0), 0);
                    const completedTotal = (completedTransactions || []).reduce((s, t) => s + Number(t.amountPaid || t.paidAmount || 0), 0);
                    const paidPaymentsTotal = (paidPayments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
                    return upcomingTodayTotalAmount + upcomingTomorrowTotalAmount + checkoutTotal + completedTotal + paidPaymentsTotal;
                  } catch (e) {
                    return 0;
                  }
                }, [upcomingTodayTotalAmount, upcomingTomorrowTotalAmount, checkoutTransactions, completedTransactions, paidPayments]);

                // Actions: refresh + export
                async function refreshAll() {
                  setIsLoading(true);
                  setRefreshLoading(true);
                  try {
                    await Promise.all([fetchBookings(), fetchNotifications(), fetchUpcomingReservations(), fetchCheckoutTransactions(), fetchCompletedTransactions(), fetchCancelledTransactions()]);
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

                // Actions
                function openPaymentModal(payment) {
                  if (!payment) return;
                  try { console.debug('[cashier] openPaymentModal ->', payment?.id, payment); } catch {}
                  setDecisionModal({ show: true, payment });
                  const cents = Number(payment?.amount || payment?.totalPrice || 0);
                  const requiredAmount = (cents / 100).toFixed(2);
                  // Detect any existing payments associated with this booking/payment
                  let alreadyPaid = 0;
                  try {
                    if (payment?.payments && Array.isArray(payment.payments)) {
                      alreadyPaid = payment.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
                    } else if (payment?.booking && Array.isArray(payment.booking.payments)) {
                      alreadyPaid = payment.booking.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
                    } else if (payment?.booking?.paidAmount) {
                      alreadyPaid = Number(payment.booking.paidAmount || 0);
                    }
                  } catch (e) {
                    alreadyPaid = 0;
                  }

                  setPreviousPaid(alreadyPaid);
                  setIsDownPaymentExisting(alreadyPaid > 0 && alreadyPaid < cents);

                  // Pre-fill amount fields: default to remaining balance (or full required amount)
                  const remaining = Math.max(0, cents - alreadyPaid);
                  const remainingDisplay = (remaining / 100).toFixed(2);
                  setAmountTendered(remainingDisplay);
                  setAmountCustomerPaid(remainingDisplay); // Pre-fill with remaining amount
                  setPaymentMethod((payment?.method || payment?.provider || "").toLowerCase());
                  setReferenceNo(payment?.referenceNumber || payment?.reference || `REF-${Date.now()}`);
                  
                  // Handle checkout transactions vs regular payments
                  if (payment?.isCheckout || payment?.type === 'checkout') {
                    setName(payment?.user?.name || payment?.guestName || "Guest");
                    setEmail(payment?.user?.email || "");
                    setContact(payment?.user?.contact || "");
                    setBookingType("Checkout Payment");
                    setNoteText("Final checkout payment for completed stay");
                  } else {
                    setName(payment?.booking?.user?.name || payment?.user?.name || payment?.booking?.guestName || "");
                    setEmail(payment?.booking?.user?.email || payment?.user?.email || "");
                    setContact(payment?.booking?.user?.contact || payment?.user?.contact || "");
                    setBookingType(payment?.booking?.type || "Walk-in");
                    setNoteText("");
                  }
                  
                  setDatePaid(new Date().toISOString().slice(0, 10));
                  // Focus on the customer paid amount field for easy editing
                  setTimeout(() => {
                    const customerPaidInput = document.querySelector('input[placeholder="0.00"]:not([readonly])');
                    if (customerPaidInput) customerPaidInput.focus();
                  }, 100);
                }

                // Generic view details modal opener (handles bookings/payments from PC and phone sources)
                function openViewDetails(item) {
                  if (!item) return;
                  // Normalize object: booking objects may be passed directly, payments may include booking
                  const data = item.booking ? { ...item.booking, payment: item } : item;
                  setViewDetailsModal({ show: true, data });
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
                        entityId: String(payment.id),
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
                    // Calculate amounts
                    const customerPaidInCents = Math.round((parseFloat(amountCustomerPaid || amountTendered || "0") || 0) * 100);
                    const requiredAmount = payment?.totalPrice || payment?.amount || 0;
                    const changeAmount = Math.max(0, customerPaidInCents - requiredAmount);
                    
                    // Generate unique receipt data with unique IDs
                    const uniqueReceiptId = `RCP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
                    const receiptData = {
                      id: uniqueReceiptId,
                      paymentId: payment.id,
                      guestName: name || payment?.guestName || payment?.user?.name || "Guest",
                      email: email || payment?.user?.email || "",
                      contact: contact,
                      amountRequired: requiredAmount,
                      amountPaid: customerPaidInCents,
                      changeAmount: changeAmount,
                      paymentMethod: paymentMethod,
                      referenceNo: referenceNo,
                      bookingType: bookingType,
                      processedBy: session?.user?.name || "Cashier",
                      processedAt: new Date().toISOString(),
                      notes: noteText,
                      transactionDate: datePaid || new Date().toISOString().split('T')[0]
                    };
                    // Determine if this is a full payment, partial (down payment), or overpay
                    const isFullPayment = customerPaidInCents >= requiredAmount;
                    const isPartial = customerPaidInCents > 0 && customerPaidInCents < requiredAmount;

                    // Common helper to notify super admin and create audit trail
                    async function notifySuperAdmin(actionDetail) {
                      try {
                        await fetch('/api/notifications', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            title: actionDetail.title,
                            message: actionDetail.message,
                            type: actionDetail.type || 'payment',
                            bookingId: actionDetail.bookingId || payment.booking?.id || payment.id,
                            priority: actionDetail.priority || (isPartial ? 'high' : 'normal'),
                            targetRoles: ['SUPERADMIN'],
                            metadata: actionDetail.metadata || {}
                          })
                        });
                      } catch (e) {
                        console.error('Failed to notify super admin:', e);
                      }
                    }

                    // Handle checkout transactions (bookings) and regular payments
                    if (payment?.isCheckout || payment?.type === 'checkout' || payment.booking || payment.type === 'booking') {
                      // For bookings: update booking payment records and booking.paymentStatus
                      try {
                        // Create or update a payment record first
                        const paymentPayload = {
                          bookingId: payment.id || payment.booking?.id,
                          amountPaid: customerPaidInCents,
                          amountRequired: requiredAmount,
                          method: paymentMethod,
                          referenceNo,
                          status: isFullPayment ? 'Paid' : (isPartial ? 'Partial' : 'Pending'),
                          processedBy: session?.user?.id,
                          processedByName: session?.user?.name,
                          receipt: receiptData,
                          downPayment: isPartial
                        };

                        const payRes = await fetch('/api/payments/create-or-update', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(paymentPayload)
                        });

                        if (!payRes.ok) {
                          // Try update endpoint as fallback
                          await fetch('/api/payments/update', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ paymentId: payment.id, ...paymentPayload })
                          });
                        }

                        // Update booking status depending on payment
                        const newBookingPaymentStatus = isFullPayment ? 'Paid' : (isPartial ? 'Partial' : (requiredAmount === 0 ? 'Paid' : 'Pending'));

                        const bookingRes = await fetch('/api/bookings/update-payment-status', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            bookingId: payment.id || payment.booking?.id,
                            paymentStatus: newBookingPaymentStatus,
                            paymentMethod,
                            referenceNo,
                            amountPaid: customerPaidInCents,
                            receiptData
                          })
                        });

                        if (!bookingRes.ok) {
                          console.warn('Booking update returned non-ok');
                        }
                      } catch (error) {
                        console.error('Error updating booking/payment for checkout:', error);
                        toastError('Failed to update booking/payment');
                        setActionLoading(false);
                        return;
                      }

                      // Update local UI state conservatively
                      setCheckoutTransactions(prev => prev.filter(c => {
                        // if full payment, remove; if partial keep but update amounts
                        if (isFullPayment) return c.id !== (payment.id || payment.booking?.id);
                        if (isPartial && c.id === (payment.id || payment.booking?.id)) {
                          // update remaining balance locally
                          const paidAmount = (c.payments || []).reduce((s, p) => s + Number(p.amount || 0), 0) + customerPaidInCents;
                          const newRemaining = (c.totalPrice || 0) - paidAmount;
                          c.totalPrice = c.totalPrice; // keep
                          c._localRemaining = newRemaining;
                        }
                        return true;
                      }));

                      setBookings(prev => prev.map(booking => 
                        booking.id === (payment.id || payment.booking?.id) 
                          ? { ...booking, paymentStatus: isFullPayment ? 'Paid' : (isPartial ? 'Partial' : booking.paymentStatus || 'Pending'), status: isFullPayment ? 'Completed' : booking.status }
                          : booking
                      ));

                      // Notify super admin with summary
                      await notifySuperAdmin({
                        title: isPartial ? 'Down Payment Received' : 'Payment Processed',
                        message: `${session?.user?.name || 'Cashier'} processed ${isPartial ? 'a down payment' : 'a payment'} for booking #${payment.id || payment.booking?.id}. Amount: ₱${(customerPaidInCents/100).toLocaleString()}`,
                        bookingId: payment.id || payment.booking?.id,
                        type: 'booking',
                        priority: isPartial ? 'high' : 'normal',
                        metadata: { receiptId: receiptData.id, amountPaid: customerPaidInCents }
                      });

                    } else {
                      // Regular standalone payment (not linked to a booking)
                      try {
                        const payload = {
                          paymentId: payment.id,
                          amount: customerPaidInCents,
                          customerPaid: customerPaidInCents,
                          status: isFullPayment ? 'Paid' : (isPartial ? 'Partial' : 'Pending'),
                          paymentMethod,
                          referenceNo,
                          receiptData,
                          downPayment: isPartial
                        };

                        const resp = await fetch('/api/payments/update', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload)
                        });

                        if (!resp.ok) {
                          console.warn('payments/update failed, trying create');
                          await fetch('/api/payments/create', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                          });
                        }
                      } catch (error) {
                        console.error('Error updating payment:', error);
                      }

                      // Update local payments and bookings if linked
                      setPaidPayments(prev => prev.filter(p => p.id !== payment.id));
                      if (payment.booking || payment.type === 'booking') {
                        setBookings(prev => prev.map(booking => 
                          booking.id === payment.id || booking.id === payment.bookingId
                            ? { ...booking, status: isFullPayment ? 'Completed' : booking.status, paymentStatus: isPartial ? 'Partial' : (isFullPayment ? 'Paid' : booking.paymentStatus) }
                            : booking
                        ));
                      }

                      // Notify super admin
                      await notifySuperAdmin({
                        title: isPartial ? 'Down Payment Recorded' : 'Payment Recorded',
                        message: `${session?.user?.name || 'Cashier'} recorded ${isPartial ? 'a down payment' : 'a payment'} (${(customerPaidInCents/100).toLocaleString()})${payment.booking ? ` for booking #${payment.booking.id}` : ''}`,
                        bookingId: payment.booking?.id || null,
                        type: 'payment',
                        priority: isPartial ? 'high' : 'normal',
                        metadata: { receiptId: receiptData.id, paymentId: payment.id }
                      });
                    }

                    // 2. Add to completed transactions list with unique data
                    const completedTransaction = {
                      ...receiptData,
                      originalPayment: payment,
                      completedAt: new Date()
                    };
                    
                    setCompletedTransactions(prev => [completedTransaction, ...prev]);

                    // Generate e-receipt
                    generateEReceipt(receiptData);

                    // Show success toast for 2 seconds
                    toastSuccess("Payment confirmed successfully! E-receipt ready to view.");
                    
                    setDecisionModal({ show: false, payment: null });
                    resetForm();
                    
                    // Refresh data to ensure consistency with backend
                    await Promise.all([fetchPaidPayments(), fetchBookings(), fetchCheckoutTransactions(), fetchCompletedTransactions()]);

                    // Audit trail with receipt information and KPI impact
                    try {
                      await fetch("/api/audit-trails", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          actorId: session?.user?.id,
                          actorName: session?.user?.name,
                          actorRole: "CASHIER",
                          action: "PROCESS_PAYMENT_WITH_RECEIPT",
                          entity: "PAYMENT",
                          entityId: String(payment.id),
                          details: `Processed payment ${payment.id} - Method: ${paymentMethod}, Amount: ₱${(customerPaidInCents/100).toLocaleString()}, Receipt: ${receiptData.id}`,
                          metadata: {
                            receiptId: receiptData.id,
                            paymentMethod: paymentMethod,
                            amountPaid: customerPaidInCents,
                            changeAmount: changeAmount,
                            referenceNo: referenceNo,
                            kpiImpact: {
                              removedFromPaidPayments: true,
                              addedToCompletedTransactions: true,
                              paymentMethodProcessed: paymentMethod,
                              amountProcessed: customerPaidInCents,
                              pendingTransactionsReduced: payment.status === 'pending' ? 1 : 0
                            }
                          }
                        }),
                      });
                    } catch {}
                  } catch (e) {
                    toastError("Failed to confirm payment");
                  } finally {
                    setActionLoading(false);
                  }
                }

                // E-receipt generation function
                function generateEReceipt(receiptData) {
                  // Show the receipt modal instead of auto-downloading
                  setEReceiptModal({ show: true, receiptData });
                }

                // Function to download receipt from modal
                function downloadReceipt(receiptData) {
                  const receiptContent = `
===================================
       HOTEL E-RECEIPT
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

                  // Create downloadable receipt
                  const blob = new Blob([receiptContent], { type: 'text/plain' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `Receipt-${receiptData.id}.txt`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);

                  toastSuccess("Receipt downloaded successfully!");
                }

                function openCancellationModal(transaction) {
                  setCancellationModal({ show: true, transaction });
                  setCancellationReason("");
                }

                async function confirmCancellation() {
                  const transaction = cancellationModal.transaction;
                  if (!transaction || !cancellationReason.trim()) {
                    toastError("Please provide a cancellation reason");
                    return;
                  }
                  
                  setActionLoading(true);
                  try {
                    const response = await fetch("/api/cashier/cancel-transaction", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        bookingId: transaction.id,
                        cancellationReason: cancellationReason.trim(),
                        cancelledBy: session?.user?.name || "Cashier",
                        cancelledById: session?.user?.id,
                      }),
                    });

                    if (!response.ok) {
                      throw new Error('Failed to cancel transaction');
                    }

                    toastSuccess("Transaction cancelled successfully!");
                    
                    // Close modals
                    setCancellationModal({ show: false, transaction: null });
                    setCancellationReason("");
                    
                    // Refresh data
                    await Promise.all([
                      fetchCheckoutTransactions(),
                      fetchCancelledTransactions(),
                      fetchBookings(),
                      fetchNotifications()
                    ]);
                  } catch (e) {
                    console.error('Cancellation error:', e);
                    toastError("Failed to cancel transaction");
                  } finally {
                    setActionLoading(false);
                  }
                }

                async function disapproveTransaction() {
                  const payment = decisionModal.payment;
                  if (!payment) return;
                  
                  // If it's a checkout transaction, show cancellation reason modal
                  if (payment?.isCheckout || payment?.type === 'checkout') {
                    setDecisionModal({ show: false, payment: null });
                    openCancellationModal(payment);
                    return;
                  }
                  
                  // For regular payments, just close the modal
                  setActionLoading(true);
                  try {
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
                          entityId: String(payment.id),
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
                    {/* Navbar */}
                    <header className={styles.headerBar}>
                      <div className={styles.headerLeft}>
                        {/* Empty or can add logo here */}
                      </div>
                      <div className={styles.headerRight}>
                        {/* Notifications */}
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className={styles.notificationBtn}
                            aria-label="Notifications"
                            title={`${totalNotifications} new notification${totalNotifications !== 1 ? 's' : ''}`}
                          >
                            <Bell className="h-5 w-5" />
                            {totalNotifications > 0 && (
                              <span className={styles.badge}>{totalNotifications > 9 ? '9+' : totalNotifications}</span>
                            )}
                          </button>
                          
                          {/* Notifications Panel */}
                          {showNotifications && (
                            <>
                              <div
                                onClick={() => setShowNotifications(false)}
                                style={{ position: 'fixed', inset: 0, zIndex: 140 }}
                                aria-hidden
                              />
                              <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                right: 0,
                                width: 'min(95vw, 420px)',
                                maxHeight: '70vh',
                                overflowY: 'auto',
                                background: '#fff',
                                borderRadius: '12px',
                                boxShadow: '0 12px 48px rgba(0, 0, 0, 0.15)',
                                zIndex: 150,
                                border: '1px solid #e5e7eb',
                                padding: 0
                              }}>
                                {/* Header */}
                                <div style={{
                                  padding: '16px',
                                  borderBottom: '1px solid #e5e7eb',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  position: 'sticky',
                                  top: 0,
                                  background: '#f8fafc',
                                  zIndex: 10
                                }}>
                                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#1f2937' }}>
                                    Notifications
                                  </h3>
                                  <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '28px',
                                    height: '28px',
                                    background: '#febe52',
                                    color: 'white',
                                    borderRadius: '999px',
                                    fontSize: '0.8rem',
                                    fontWeight: '700'
                                  }}>
                                    {totalNotifications > 9 ? '9+' : totalNotifications}
                                  </span>
                                </div>
                                
                                {/* Notifications List */}
                                <div style={{ maxHeight: 'calc(70vh - 60px)', overflowY: 'auto' }}>
                                  {notifications.length === 0 ? (
                                    <div style={{
                                      padding: '32px 16px',
                                      textAlign: 'center',
                                      color: '#94a3b8'
                                    }}>
                                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                      <p style={{ margin: 0, fontSize: '0.9rem' }}>No notifications yet</p>
                                    </div>
                                  ) : (
                                    notifications.map((notif, idx) => (
                                      <div key={idx} style={{
                                        padding: '16px',
                                        borderBottom: idx < notifications.length - 1 ? '1px solid #f1f5f9' : 'none',
                                        transition: 'background-color 0.2s ease',
                                        cursor: 'pointer'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                      >
                                        {/* Notification Icon and Header */}
                                        <div style={{
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          gap: '12px',
                                          marginBottom: '8px'
                                        }}>
                                          <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            background: notif.type === 'payment' ? '#dbeafe' : notif.type === 'booking' ? '#fef3c7' : '#f0fdf4',
                                            color: notif.type === 'payment' ? '#0369a1' : notif.type === 'booking' ? '#b45309' : '#16a34a'
                                          }}>
                                            {notif.type === 'payment' ? (
                                              <CreditCard className="h-4 w-4" />
                                            ) : notif.type === 'booking' ? (
                                              <Hotel className="h-4 w-4" />
                                            ) : (
                                              <CheckCircle2 className="h-4 w-4" />
                                            )}
                                          </div>
                                          <div style={{ flex: 1 }}>
                                            <div style={{
                                              fontSize: '0.95rem',
                                              fontWeight: '600',
                                              color: '#1f2937',
                                              marginBottom: '2px'
                                            }}>
                                              {notif.title || notif.message?.split('\n')[0] || 'Notification'}
                                            </div>
                                            <div style={{
                                              fontSize: '0.8rem',
                                              color: '#9ca3af',
                                              fontWeight: '500'
                                            }}>
                                              {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                                               notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}
                                            </div>
                                          </div>
                                        </div>
                                        
                                        {/* Message */}
                                        <p style={{
                                          fontSize: '0.9rem',
                                          color: '#475569',
                                          lineHeight: '1.5',
                                          margin: '0 0 12px 0'
                                        }}>
                                          {notif.message || notif.description}
                                        </p>
                                        
                                        {/* Actions and Metadata */}
                                        <div className="flex items-center justify-between">
                                          <div style={{
                                            fontSize: '0.8rem',
                                            color: '#94a3b8',
                                            fontWeight: '500'
                                          }}>
                                            {notif.timestamp ? new Date(notif.timestamp).toLocaleDateString() :
                                             notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : 'Today'}
                                          </div>
                                          
                                          {notif.type === 'booking' && notif.bookingId && (
                                            <button
                                              style={{
                                                background: 'linear-gradient(135deg, #febe52, #f59e0b)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '6px 12px',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease',
                                                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                                              }}
                                              onMouseEnter={(e) => {
                                                e.target.style.transform = 'scale(1.05)';
                                                e.target.style.boxShadow = '0 4px 8px rgba(245, 158, 11, 0.4)';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.target.style.transform = 'scale(1)';
                                                e.target.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.3)';
                                              }}
                                            >
                                              View Booking
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                                
                                {/* Footer */}
                                {notifications.length > 0 && (
                                  <div style={{
                                    padding: '12px 16px',
                                    borderTop: '1px solid #e5e7eb',
                                    background: '#f8fafc',
                                    textAlign: 'center'
                                  }}>
                                    <button
                                      onClick={() => {
                                        setShowNotifications(false);
                                        // Optional: Add action to view all notifications
                                        toastSuccess('Viewing all notifications');
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#3b82f6',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        fontWeight: '600',
                                        textDecoration: 'none',
                                        transition: 'color 0.2s ease'
                                      }}
                                      onMouseEnter={(e) => e.target.style.color = '#1d4ed8'}
                                      onMouseLeave={(e) => e.target.style.color = '#3b82f6'}
                                    >
                                      View All Notifications
                                    </button>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>

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
                            <ChevronDown className="h-4 w-4 text-white opacity-80" />
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
                                  onClick={() => { setUserMenuOpen(false); setShowChangePassword(true); }}
                                  className={styles.menuItem}
                                  role="menuitem"
                                >
                                  <Lock className="h-4 w-4" />
                                  <span>Change Password</span>
                                </button>
                                <button
                                  onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: '/login' }); }}
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

                    {/* Welcome Section */}
                    <div style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e2e8f0 100%)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '2px solid transparent',
                      backgroundClip: 'padding-box',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(254, 190, 82, 0.2)',
                      margin: '12px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '16px',
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          minWidth: 0,
                          flex: '1 1 auto',
                        }}>
                          <User size={24} style={{
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 50%, #f59e0b 100%)',
                            padding: '12px',
                            borderRadius: '50%',
                            width: '48px',
                            height: '48px',
                            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4), 0 4px 12px rgba(245, 158, 11, 0.2)',
                            border: '3px solid rgba(255, 255, 255, 0.3)',
                            flexShrink: 0,
                          }} />
                          <div style={{ minWidth: 0 }}>
                            <h2 style={{
                              margin: '0 0 4px 0',
                              fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
                              fontWeight: '700',
                              color: '#1f2937',
                              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              letterSpacing: '-0.3px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              Welcome, {(session?.user?.name || session?.user?.email || 'Cashier').split(' ')[0]}!
                            </h2>
                            <p style={{
                              margin: '0',
                              fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
                              color: '#6b7280',
                              display: 'flex',
                              alignItems: 'center',
                              fontWeight: '500',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              <Clock size={14} style={{ marginRight: '6px', flexShrink: 0 }} />
                              <span style={{ whiteSpace: 'nowrap' }}>
                                {new Date().toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </span>
                            </p>
                          </div>
                        </div>
                        <div style={{
                          background: '#f59e0b',
                          color: 'white',
                          padding: '6px 16px',
                          borderRadius: '20px',
                          fontSize: 'clamp(0.7rem, 1.5vw, 0.85rem)',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
                          whiteSpace: 'nowrap',
                        }}>
                          Cashier
                        </div>
                      </div>
                    </div>

                    <main className={styles.main}>
                      <div className={styles.leftColumn}>
          {/* KPI Cards */}
          <div className={styles.kpiGrid}>
            <div className={`${styles.kpiCard} ${styles.kpiTotal}`}>
              <div className="flex items-start justify-between h-full">
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-600 mb-1">Total Transactions</div>
                  <div className="text-3xl font-bold text-slate-800 mb-1">{totalTransactions}</div>
                  <div className="text-xs text-slate-500">Today's volume</div>
                </div>
                <div className="flex-shrink-0 p-3 bg-blue-50 rounded-xl">
                  <CalendarDays className="h-6 w-6 text-blue-600" />
                              </div>
                            </div>
                          </div>
                          <div className={`${styles.kpiCard} ${styles.kpiPending}`}>
                            <div className="flex items-start justify-between h-full">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-600 mb-1">Unpaid Checkouts</div>
                                <div className="text-3xl font-bold text-slate-800 mb-1">{pendingTransactions}</div>
                                <div className="text-xs text-slate-500">Need payment processing</div>
                              </div>
                              <div className="flex-shrink-0 p-3 bg-amber-50 rounded-xl">
                                <Clock className="h-6 w-6 text-amber-600" />
                              </div>
                            </div>
                          </div>
                          <div className={`${styles.kpiCard} ${styles.kpiSales}`}>
                            <div className="flex items-start justify-between h-full">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-600 mb-1">Daily Sales</div>
                                <div className="text-2xl font-bold text-slate-800 mb-1">{formatCurrency(dailyTotal)}</div>
                                <div className="text-xs text-slate-500">Processed by cashier</div>
                              </div>
                              <div className="flex-shrink-0 p-3 bg-emerald-50 rounded-xl">
                                <CreditCard className="h-6 w-6 text-emerald-600" />
                              </div>
                            </div>
                          </div>
                          <div className={`${styles.kpiCard} ${styles.kpiCash}`}>
                            <div className="flex items-start justify-between h-full">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-600 mb-1">Cash Payments</div>
                                <div className="text-2xl font-bold text-slate-800 mb-1">{formatCurrency(cashTotal)}</div>
                                <div className="text-xs text-slate-500">Physical currency</div>
                              </div>
                              <div className="flex-shrink-0 p-3 bg-green-50 rounded-xl">
                                <BookOpen className="h-6 w-6 text-green-600" />
                              </div>
                            </div>
                          </div>
                          <div className={`${styles.kpiCard} ${styles.kpiCardSales}`}>
                            <div className="flex items-start justify-between h-full">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-slate-600 mb-1">Card Payments</div>
                                <div className="text-2xl font-bold text-slate-800 mb-1">{formatCurrency(cardTotal)}</div>
                                <div className="text-xs text-slate-500">Electronic transactions</div>
                              </div>
                              <div className="flex-shrink-0 p-3 bg-purple-50 rounded-xl">
                                <CreditCard className="h-6 w-6 text-purple-600" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Priority Section: Transactions to Pay Today (Checkout) */}
                        <div className={styles.card}>
                          <div className={`px-4 py-3 border-b border-slate-200 ${styles.cardHeaderPrimary}`}>
                            <div className={styles.sectionTitleBar}>
                              <div className={`${styles.sectionTitle} text-white`} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <CreditCard className="h-5 w-5" />
                                Today's Scheduled Checkouts (Priority)
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={styles.sectionBadge}>{checkoutTransactions.length}</div>
                                <button
                                  onClick={refreshAll}
                                  className={styles.toolbarButton}
                                  aria-label="Refresh checkout transactions"
                                >
                                  Refresh
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th className={styles.th}>Booking ID</th>
                                  <th className={styles.th}>Guest Name</th>
                                  <th className={styles.th}>Checkout Date</th>
                                  <th className={styles.th}>Total Amount</th>
                                  <th className={styles.th}>Payment Status</th>
                                  <th className={styles.th}>Balance Due</th>
                                  <th className={styles.th}>Actions</th>
                                </tr>
                              </thead>
                              <tbody className={styles.fadeIn}>
                                {checkoutTransactions.length === 0 ? (
                                  <tr>
                                    <td colSpan="7" className="text-center py-12 text-gray-500">
                                      <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                                      <p>No checkout transactions scheduled for today</p>
                                    </td>
                                  </tr>
                                ) : (
                                  (() => {
                                    const checkoutTotalPages = Math.max(1, Math.ceil(checkoutTransactions.length / checkoutPageSize));
                                    const pagedCheckout = checkoutTransactions.slice(
                                      (checkoutPage - 1) * checkoutPageSize,
                                      checkoutPage * checkoutPageSize
                                    );
                                    
                                    return pagedCheckout.map((checkout, index) => {
                                      const totalAmount = checkout.totalPrice || 0;
                                      const paidAmount = (checkout.payments || [])
                                        .filter(p => p.status === 'Paid')
                                        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
                                      const remainingBalance = totalAmount - paidAmount;
                                      const isFullyPaid = remainingBalance <= 0;
                                      const isUnpaid = remainingBalance > 0;

                                      const paymentStatusBadge = (isPaid) => {
                                        const common = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold";
                                        return isPaid ? 
                                          `${common} bg-green-100 text-green-700` : 
                                          `${common} bg-red-100 text-red-700`;
                                      };

                                      return (
                                        <tr key={checkout.id} className={`${styles.tr} ${isUnpaid ? 'bg-red-50' : ''}`}>
                                          <td className={styles.td}>
                                            <div className="font-mono text-sm text-blue-600">
                                              {formatPaymentId(checkout.id)}
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <div className="flex items-center gap-3">
                                              <div className={`w-8 h-8 ${isUnpaid ? 'bg-red-100' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
                                                <User className={`h-4 w-4 ${isUnpaid ? 'text-red-600' : 'text-green-600'}`} />
                                              </div>
                                              <div>
                                                <div className="font-medium text-gray-900">
                                                  {checkout.user?.name || checkout.guestName || 'Guest'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  {checkout.user?.email || ''}
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td className={`${styles.td} ${styles.actionsCell}`}>
                                            <div className="flex items-center gap-2">
                                              <Calendar className="h-4 w-4 text-gray-400" />
                                              <span className="text-sm">
                                                {new Date(checkout.checkOut).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric'
                                                })}
                                              </span>
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <div className="font-semibold text-blue-600">
                                              ₱{(totalAmount / 100).toLocaleString()}
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <span className={paymentStatusBadge(isFullyPaid)}>
                                              {isFullyPaid ? 'Fully Paid' : 'Unpaid'}
                                            </span>
                                          </td>
                                          <td className={styles.td}>
                                            {isUnpaid ? (
                                              <div className="font-semibold text-red-600">
                                                  ₱{(remainingBalance / 100).toLocaleString()}
                                              </div>
                                            ) : (
                                              <div className="text-green-600 font-medium">
                                                 Paid
                                              </div>
                                            )}
                                          </td>
                                          <td className={`${styles.td} ${styles.actionsCell}`}>
                                            <div className="flex items-center gap-2">
                                              {isUnpaid ? (
                                                <button
                                                  onClick={() => {
                                                    // Create a payment object for checkout
                                                    const checkoutPayment = {
                                                      ...checkout,
                                                      amount: remainingBalance,
                                                      totalPrice: remainingBalance,
                                                      type: 'checkout',
                                                      isCheckout: true
                                                    };
                                                    openPaymentModal(checkoutPayment);
                                                  }}
                                                  className={`${styles.button} ${styles.btnReview}`}
                                                >
                                                  <CreditCard className="h-4 w-4" />
                                                  Process Payment
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={() => openViewDetails(checkout)}
                                                  className={`${styles.actionButton} ${styles.actionButtonSmall}`}
                                                  aria-label={`View details for ${checkout.id}`}
                                                >
                                                  <Eye className="h-3 w-3" />
                                                  View Details
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()
                                )}
                              </tbody>
                            </table>
                          </div>
                            
                          {/* Pagination for Checkout Transactions */}
                          {(() => {
                            const checkoutTotalPages = Math.max(1, Math.ceil(checkoutTransactions.length / checkoutPageSize));
                            return checkoutTotalPages > 1 && (
                              <div className={`${styles.paginationBar} ${styles.barRelative}`} style={{marginTop: '16px'}}>
                                <div className={styles.paginationInfo}>
                                  Page {checkoutPage} of {checkoutTotalPages} {checkoutTransactions.length} checkouts
                                </div>
                                <div className={styles.paginationButtons}>
                                  <button
                                    onClick={() => setCheckoutPage((p) => Math.max(1, p - 1))}
                                    disabled={checkoutPage === 1}
                                    className={styles.paginationBtn}
                                  >
                                    Prev
                                  </button>
                                  <button
                                    onClick={() => setCheckoutPage((p) => Math.min(checkoutTotalPages, p + 1))}
                                    disabled={checkoutPage === checkoutTotalPages}
                                    className={styles.paginationBtn}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
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
                          <div className="flex items-center gap-2">
                            <label htmlFor="dateFrom" className="text-sm font-medium text-slate-600">From:</label>
                            <input
                              id="dateFrom"
                              type="date"
                              value={dateFrom}
                              onChange={(e) => setDateFrom(e.target.value)}
                              className={styles.toolbarInput}
                              style={{ minWidth: '140px' }}
                              title="Filter from date"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <label htmlFor="dateTo" className="text-sm font-medium text-slate-600">To:</label>
                            <input
                              id="dateTo"
                              type="date"
                              value={dateTo}
                              onChange={(e) => setDateTo(e.target.value)}
                              className={styles.toolbarInput}
                              style={{ minWidth: '140px' }}
                              title="Filter to date"
                            />
                          </div>
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


                        {/* Upcoming Reservations Section */}
                        <div className={styles.card}>
                          <div className={`px-4 py-3 border-b border-slate-200 ${styles.cardHeaderPrimary}`}>
                            <div className={styles.sectionTitleBar}>
                              <div className={`${styles.sectionTitle} text-white`} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <Hotel className="h-5 w-5" />
                                Upcoming Reservations
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={styles.sectionBadge}>{upcomingTransactionsList.length}</div>
                                <button
                                  onClick={refreshAll}
                                  className={styles.toolbarButton}
                                  disabled={isLoading}
                                >
                                  {isLoading ? 'Loading...' : 'Refresh'}
                                </button>
                                <button onClick={exportCSV} className={styles.toolbarButton}>
                                  Export CSV
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {debug && (
                            <div className="px-3 py-2 text-xs text-slate-600 border-b border-slate-100">
                              Debug · upcomingReservations: {upcomingTransactionsList.length} · pagedUpcoming: {pagedUpcoming.length}
                            </div>
                          )}
                          
                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th className={styles.th}>
                                    <input
                                      type="checkbox"
                                      aria-label="Select all"
                                    />
                                  </th>
                                  <th className={styles.th} role="columnheader">
                                    <button className="underline-offset-2 hover:underline">Booking ID</button>
                                  </th>
                                  <th className={styles.th} role="columnheader">
                                    <button className="underline-offset-2 hover:underline">Guest Name</button>
                                  </th>
                                  <th className={styles.th} role="columnheader">
                                    <button className="underline-offset-2 hover:underline">Check-in Date</button>
                                  </th>
                                  <th className={styles.th} role="columnheader">
                                    <button className="underline-offset-2 hover:underline">Total Amount</button>
                                  </th>
                                  <th className={styles.th} role="columnheader">
                                    <button className="underline-offset-2 hover:underline">Status</button>
                                  </th>
                                  <th className={styles.th} role="columnheader">
                                    <button className="underline-offset-2 hover:underline">Days Until</button>
                                  </th>
                                  <th className={styles.th}>Actions</th>
                                </tr>
                              </thead>
                              <tbody className={styles.fadeIn}>
                                {upcomingLoading ? (
                                  <tr>
                                    <td colSpan="8" className="text-center py-8">
                                      <div className="space-y-3">
                                        {Array.from({length: 3}).map((_, i) => (
                                          <div key={i} className="animate-pulse bg-gray-200 h-16 rounded-lg"></div>
                                        ))}
                                      </div>
                                    </td>
                                  </tr>
                                ) : pagedUpcoming.length === 0 ? (
                                  <tr>
                                    <td colSpan="8" className="text-center py-12 text-gray-500">
                                      <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                                      <p>No upcoming reservations in the next 15 days</p>
                                    </td>
                                  </tr>
                                ) : (
                                  pagedUpcoming.map((reservation, index) => {
                                    const statusBadge = (status) => {
                                      const common = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold";
                                      switch ((status || "").toLowerCase()) {
                                        case "confirmed":
                                          return `${common} bg-green-100 text-green-700`;
                                        case "pending":
                                          return `${common} bg-amber-100 text-amber-700`;
                                        case "cancelled":
                                          return `${common} bg-red-100 text-red-700`;
                                        default:
                                          return `${common} bg-gray-100 text-gray-700`;
                                      }
                                    };

                                    return (
                                      <tr key={reservation.id || index} className={styles.tr}>
                                        <td className={styles.td}>
                                          <input type="checkbox" />
                                        </td>
                                        <td className={styles.td}>
                                          <div className="font-mono text-sm">
                                            #{reservation.id || 'N/A'}
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                                              <Users className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div>
                                              <div className="font-medium text-gray-900">
                                                {reservation.guestName || reservation.user?.name || 'Guest Name N/A'}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {reservation.user?.email || ''}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm">
                                              {reservation.checkInDate || reservation.checkIn ? 
                                                new Date(reservation.checkInDate || reservation.checkIn).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric'
                                                }) : 'Date N/A'}
                                            </span>
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          <div>
                                            <div className="font-semibold text-green-600">
                                              {formatCurrencyNoDecimal(reservation.totalPrice || reservation.totalAmount || reservation.total || reservation.amount || 0)}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">
                                              DP: {formatCurrencyNoDecimal(reservation.totalPaid || reservation.balancePaid || 0)}
                                            </div>
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          <span className={statusBadge(reservation.status)}>
                                            {reservation.status || 'Pending'}
                                          </span>
                                        </td>
                                        <td className={styles.td}>
                                          <div className="flex items-center gap-1">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm font-medium">
                                              {reservation.daysUntilCheckIn || 'N/A'} days
                                            </span>
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          {(() => {
                                            const state = (reservation.status || '').toLowerCase();
                                            const needsSuper = state.includes('super') || state.includes('requires_superadmin') || state.includes('awaiting_superadmin');
                                            const isDisabled = needsSuper && session?.user?.role !== 'SUPERADMIN';
                                            return (
                                              <button
                                                type="button"
                                                onClick={(e) => { 
                                                  e.stopPropagation(); 
                                                  if (isDisabled) return;
                                                  openViewDetails(reservation);
                                                }}
                                                className={`${styles.button} ${styles.btnReview}`}
                                                aria-label={`View reservation ${reservation.id}`}
                                                disabled={isDisabled}
                                              >
                                                {isDisabled ? 'Awaiting Approval' : 'Review'}
                                              </button>
                                            );
                                          })()}
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                            
                          {/* Pagination for Upcoming Reservations */}
                          {upcomingTotalPages > 1 && (
                            <div className={`${styles.paginationBar} ${styles.barRelative}`} style={{marginTop: '16px'}}>
                              <div className={styles.paginationInfo}>
                                Page {upcomingPage} of {upcomingTotalPages} • {upcomingTransactionsList.length} reservations
                              </div>
                              <div className={styles.paginationButtons}>
                                <button
                                  onClick={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                                  disabled={upcomingPage === 1}
                                  className={styles.paginationBtn}
                                >
                                  Prev
                                </button>
                                <button
                                  onClick={() => setUpcomingPage((p) => Math.min(upcomingTotalPages, p + 1))}
                                  disabled={upcomingPage === upcomingTotalPages}
                                  className={styles.paginationBtn}
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Completed Transactions Section */}
                        <div className={styles.card}>
                          <div className={`px-4 py-3 border-b border-slate-200 ${styles.cardHeaderPrimary}`}>
                            <div className={styles.sectionTitleBar}>
                              <div className={`${styles.sectionTitle} text-white`} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <CreditCard className="h-5 w-5" />
                                Transactions to Pay Today (Checkout)
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={styles.sectionBadge}>{checkoutTransactions.length}</div>
                                <button
                                  onClick={refreshAll}
                                  className={styles.toolbarButton}
                                  aria-label="Refresh checkout transactions"
                                >
                                  Refresh
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th className={styles.th}>Booking ID</th>
                                  <th className={styles.th}>Guest Name</th>
                                  <th className={styles.th}>Check-out Date</th>
                                  <th className={styles.th}>Total Amount</th>
                                  <th className={styles.th}>Payment Status</th>
                                  <th className={styles.th}>Amount to Pay</th>
                                  <th className={styles.th}>Actions</th>
                                </tr>
                              </thead>
                              <tbody className={styles.fadeIn}>
                                {checkoutLoading ? (
                                  <tr>
                                    <td colSpan="7" className="text-center py-8">
                                      <div className="space-y-3">
                                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                                        <p className="text-gray-600">Loading checkout transactions...</p>
                                      </div>
                                    </td>
                                  </tr>
                                ) : checkoutTransactions.length === 0 ? (
                                  <tr>
                                    <td colSpan="7" className="text-center py-12 text-gray-500">
                                      <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                                      <p>No checkout transactions scheduled for today</p>
                                    </td>
                                  </tr>
                                ) : (
                                  (() => {
                                    const checkoutTotalPages = Math.max(1, Math.ceil(checkoutTransactions.length / checkoutPageSize));
                                    const pagedCheckout = checkoutTransactions.slice(
                                      (checkoutPage - 1) * checkoutPageSize,
                                      checkoutPage * checkoutPageSize
                                    );
                                    
                                    return pagedCheckout.map((checkout, index) => {
                                      const totalAmount = checkout.totalPrice || 0;
                                      const paidAmount = (checkout.payments || [])
                                        .filter(p => p.status === 'Paid')
                                        .reduce((sum, p) => sum + Number(p.amount || 0), 0);
                                      const remainingBalance = totalAmount - paidAmount;
                                      const isFullyPaid = remainingBalance <= 0;
                                      const isUnpaid = remainingBalance > 0;

                                      const paymentStatusBadge = (isPaid) => {
                                        const common = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold";
                                        return isPaid ? 
                                          `${common} bg-green-100 text-green-700` : 
                                          `${common} bg-red-100 text-red-700`;
                                      };

                                      return (
                                        <tr key={checkout.id} className={`${styles.tr} ${isUnpaid ? 'bg-red-50' : ''}`}>
                                          <td className={styles.td}>
                                            <div className="font-mono text-sm text-blue-600">
                                              {formatPaymentId(checkout.id)}
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <div className="flex items-center gap-3">
                                              <div className={`w-8 h-8 ${isUnpaid ? 'bg-red-100' : 'bg-green-100'} rounded-lg flex items-center justify-center`}>
                                                <User className={`h-4 w-4 ${isUnpaid ? 'text-red-600' : 'text-green-600'}`} />
                                              </div>
                                              <div>
                                                <div className="font-medium text-gray-900">
                                                  {checkout.user?.name || checkout.guestName || 'Guest'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  {checkout.user?.email || ''}
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <div className="flex items-center gap-2">
                                              <Calendar className="h-4 w-4 text-gray-400" />
                                              <span className="text-sm">
                                                {new Date(checkout.checkOut).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric'
                                                })}
                                              </span>
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <div className="font-semibold text-blue-600">
                                              ₱{(totalAmount / 100).toLocaleString()}
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <span className={paymentStatusBadge(isFullyPaid)}>
                                              {isFullyPaid ? 'Fully Paid' : 'Unpaid'}
                                            </span>
                                          </td>
                                          <td className={styles.td}>
                                            {isUnpaid ? (
                                              <div className="font-semibold text-red-600">
                                                  ₱{(remainingBalance / 100).toLocaleString()}
                                              </div>
                                            ) : (
                                              <div className="text-green-600 font-medium">
                                                 Paid
                                              </div>
                                            )}
                                          </td>
                                          <td className={styles.td}>
                                            <div className="flex items-center gap-2">
                                              {isUnpaid ? (
                                                <button
                                                  onClick={() => {
                                                    // Create a payment object for checkout
                                                    const checkoutPayment = {
                                                      ...checkout,
                                                      amount: remainingBalance,
                                                      totalPrice: remainingBalance,
                                                      type: 'checkout',
                                                      isCheckout: true
                                                    };
                                                    openPaymentModal(checkoutPayment);
                                                  }}
                                                  className={`${styles.button} ${styles.btnReview}`}
                                                >
                                                  <CreditCard className="h-4 w-4" />
                                                  Process Payment
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={() => openViewDetails(checkout)}
                                                  className={`${styles.actionButton} ${styles.actionButtonSmall}`}
                                                  aria-label={`View details for ${checkout.id}`}
                                                >
                                                  <Eye className="h-3 w-3" />
                                                  View Details
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()
                                )}
                              </tbody>
                            </table>
                          </div>
                            
                          {/* Pagination for Checkout Transactions */}
                          {(() => {
                            const checkoutTotalPages = Math.max(1, Math.ceil(checkoutTransactions.length / checkoutPageSize));
                            return checkoutTotalPages > 1 && (
                              <div className={`${styles.paginationBar} ${styles.barRelative}`} style={{marginTop: '16px'}}>
                                <div className={styles.paginationInfo}>
                                  Page {checkoutPage} of {checkoutTotalPages} {checkoutTransactions.length} checkouts
                                </div>
                                <div className={styles.paginationButtons}>
                                  <button
                                    onClick={() => setCheckoutPage((p) => Math.max(1, p - 1))}
                                    disabled={checkoutPage === 1}
                                    className={styles.paginationBtn}
                                  >
                                    Prev
                                  </button>
                                  <button
                                    onClick={() => setCheckoutPage((p) => Math.min(checkoutTotalPages, p + 1))}
                                    disabled={checkoutPage === checkoutTotalPages}
                                    className={styles.paginationBtn}
                                  >
                                    Next
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Completed Transactions Section */}
                        <div className={styles.card}>
                          <div className={`px-4 py-3 border-b border-slate-200 ${styles.cardHeaderPrimary}`}>
                            <div className={styles.sectionTitleBar}>
                              <div className={`${styles.sectionTitle} text-white`} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <CheckCircle2 className="h-5 w-5" />
                                Completed Transactions by Cashier
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={styles.sectionBadge}>{completedTransactions.length}</div>
                                <button
                                  onClick={() => {
                                    // Export completed transactions
                                    const csvContent = [
                                      ['Receipt ID', 'Payment ID', 'Guest Name', 'Amount Paid', 'Payment Method', 'Processed At', 'Processed By'],
                                      ...completedTransactions.map(t => [
                                        t.id,
                                        t.paymentId,
                                        t.guestName,
                                        `₱${(t.amountPaid/100).toLocaleString()}`,
                                        t.paymentMethod,
                                        new Date(t.processedAt).toLocaleString(),
                                        t.processedBy
                                      ])
                                    ].map(row => row.join(',')).join('\\n');
                                    
                                    const blob = new Blob([csvContent], { type: 'text/csv' });
                                    const url = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = `completed-transactions-${new Date().toISOString().split('T')[0]}.csv`;
                                    a.click();
                                    window.URL.revokeObjectURL(url);
                                  }}
                                  className={styles.toolbarButton}
                                >
                                  Export CSV
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className={styles.tableWrap}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th className={styles.th}>Receipt ID</th>
                                  <th className={styles.th}>Payment ID</th>
                                  <th className={styles.th}>Guest Name</th>
                                  <th className={styles.th}>Amount Paid</th>
                                  <th className={styles.th}>Payment Method</th>
                                  <th className={styles.th}>Change</th>
                                  <th className={styles.th}>Processed At</th>
                                  <th className={styles.th}>Actions</th>
                                </tr>
                              </thead>
                              <tbody className={styles.fadeIn}>
                                {completedTransactions.length === 0 ? (
                                  <tr>
                                    <td colSpan="8" className="text-center py-12 text-gray-500">
                                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                                      <p>No completed transactions yet</p>
                                    </td>
                                  </tr>
                                ) : (
                                  (() => {
                                    const completedTotalPages = Math.max(1, Math.ceil(completedTransactions.length / completedPageSize));
                                    const pagedCompleted = completedTransactions.slice(
                                      (completedPage - 1) * completedPageSize,
                                      completedPage * completedPageSize
                                    );
                                    
                                    return pagedCompleted.map((transaction, index) => (
                                      <tr key={transaction.id} className={styles.tr}>
                                        <td className={styles.td}>
                                          <div className="font-mono text-sm text-blue-600">
                                            {transaction.id}
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          <div className="font-mono text-sm">
                                            {transaction.paymentId}
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            </div>
                                            <div>
                                              <div className="font-medium text-gray-900">
                                                {transaction.guestName}
                                              </div>
                                              <div className="text-xs text-gray-500">
                                                {transaction.email}
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          <div className="font-semibold text-green-600">
                                            ₱{(transaction.amountPaid/100).toLocaleString()}
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
                                            {transaction.paymentMethod}
                                          </span>
                                        </td>
                                        <td className={styles.td}>
                                          <div className="font-medium text-amber-600">
                                            ₱{(transaction.changeAmount/100).toLocaleString()}
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          <div className="text-sm">
                                            {new Date(transaction.processedAt).toLocaleString()}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                            by {transaction.processedBy}
                                          </div>
                                        </td>
                                        <td className={styles.td}>
                                          <div className="flex items-center gap-2">
                                            <button
                                              onClick={() => {
                                                // Show receipt modal instead of auto-download
                                                setEReceiptModal({ show: true, receiptData: transaction });
                                              }}
                                              className={`${styles.button} ${styles.btnReview}`}
                                            >
                                              <Eye className="h-4 w-4" />
                                              View Receipt
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ));
                                  })()
                                )}
                              </tbody>
                            </table>
                            
                            {/* Pagination for Completed Transactions */}
                            {(() => {
                              const completedTotalPages = Math.max(1, Math.ceil(completedTransactions.length / completedPageSize));
                              return completedTotalPages > 1 && (
                                <div className={`${styles.paginationBar} ${styles.barRelative}`} style={{marginTop: '16px'}}>
                                  <div className={styles.paginationInfo}>
                                    Page {completedPage} of {completedTotalPages} {completedTransactions.length} transactions
                                  </div>
                                  <div className={styles.paginationButtons}>
                                    <button
                                      onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                                      disabled={completedPage === 1}
                                      className={styles.paginationBtn}
                                    >
                                      Prev
                                    </button>
                                    <button
                                      onClick={() => setCompletedPage((p) => Math.min(completedTotalPages, p + 1))}
                                      disabled={completedPage === completedTotalPages}
                                      className={styles.paginationBtn}
                                    >
                                      Next
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Cancelled Transactions Section */}
                        <div className={`${styles.section} ${styles.shadow}`}>
                          <div className={`${styles.sectionHeader} ${styles.headerWarning}`}>
                            <div className={styles.sectionLeft}>
                              <h2 className={styles.sectionTitle}>
                                <Flag className={`${styles.icon} ${styles.iconWarning}`} />
                                Cancelled Transactions
                              </h2>
                              <div className={styles.sectionBadge}>{cancelledTransactions.length}</div>
                            </div>
                          </div>
                          <div className={styles.sectionBody}>
                            <table className={styles.table}>
                              <thead className={styles.thead}>
                                <tr>
                                  <th className={styles.th}>BOOKING ID</th>
                                  <th className={styles.th}>GUEST NAME</th>
                                  <th className={styles.th}>CHECKOUT DATE</th>
                                  <th className={styles.th}>TOTAL AMOUNT</th>
                                  <th className={styles.th}>CANCELLATION REASON</th>
                                  <th className={styles.th}>ACTIONS</th>
                                </tr>
                              </thead>
                              <tbody className={styles.tbody}>
                                {cancelledTransactions.length === 0 ? (
                                  <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-500">
                                      <p>No cancelled transactions for today</p>
                                    </td>
                                  </tr>
                                ) : (
                                  (() => {
                                    const cancelledTotalPages = Math.max(1, Math.ceil(cancelledTransactions.length / cancelledPageSize));
                                    const pagedCancelled = cancelledTransactions.slice(
                                      (cancelledPage - 1) * cancelledPageSize,
                                      cancelledPage * cancelledPageSize
                                    );
                                    
                                    return pagedCancelled.map((cancelled) => {
                                      const totalAmount = cancelled.totalPrice || 0;

                                      return (
                                        <tr key={cancelled.id} className={styles.tr}>
                                          <td className={styles.td}>
                                            <div className="font-mono text-sm text-blue-600">
                                              {formatPaymentId(cancelled.id)}
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                                <User className="h-4 w-4 text-red-600" />
                                              </div>
                                              <div>
                                                <div className="font-medium text-gray-900">
                                                  {cancelled.user?.name || cancelled.guestName || 'Guest'}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                  {cancelled.user?.email || ''}
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <div className="flex items-center gap-2">
                                              <Calendar className="h-4 w-4 text-gray-400" />
                                              <span className="text-sm">
                                                {new Date(cancelled.checkOut).toLocaleDateString('en-US', {
                                                  month: 'short',
                                                  day: 'numeric',
                                                  year: 'numeric'
                                                })}
                                              </span>
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <div className="font-semibold text-gray-600">
                                              ₱{(totalAmount / 100).toLocaleString()}
                                            </div>
                                          </td>
                                          <td className={styles.td}>
                                            <div className="text-sm text-gray-700 max-w-xs truncate" title={cancelled.cancellationRemarks || 'No reason provided'}>
                                              {cancelled.cancellationRemarks || 'No reason provided'}
                                            </div>
                                          </td>
                                          <td className={`${styles.td} ${styles.actionsCell}`}>
                                            <button
                                              onClick={() => {
                                                // Open cancellation details modal
                                                setCancelDetailsModal({ show: true, transaction: cancelled });
                                              }}
                                              className={`${styles.button} ${styles.btnReview}`}
                                            >
                                              <Eye className="h-4 w-4" />
                                              View Details
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    });
                                  })()
                                )}
                              </tbody>
                            </table>
                            
                            {/* Pagination for Cancelled Transactions */}
                            {(() => {
                              const cancelledTotalPages = Math.max(1, Math.ceil(cancelledTransactions.length / cancelledPageSize));
                              return cancelledTotalPages > 1 && (
                                <div className={`${styles.paginationBar} ${styles.barRelative}`} style={{marginTop: '16px'}}>
                                  <div className={styles.paginationInfo}>
                                    Page {cancelledPage} of {cancelledTotalPages} {cancelledTransactions.length} transactions
                                  </div>
                                  <div className={styles.paginationButtons}>
                                    <button
                                      onClick={() => setCancelledPage((p) => Math.max(1, p - 1))}
                                      disabled={cancelledPage === 1}
                                      className={styles.paginationBtn}
                                    >
                                      Prev
                                    </button>
                                    <button
                                      onClick={() => setCancelledPage((p) => Math.min(cancelledTotalPages, p + 1))}
                                      disabled={cancelledPage === cancelledTotalPages}
                                      className={styles.paginationBtn}
                                    >
                                      Next
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </main>

                    {/* Cancellation Reason Modal */}
                    {cancellationModal.show && (
                      <div className={styles.modalOverlay} onClick={() => setCancellationModal({ show: false, transaction: null })}>
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                          <h2 className={styles.modalHeader}>Cancel Transaction</h2>
                          
                          <div style={{ marginBottom: '24px' }}>
                            <p style={{ color: '#374151', marginBottom: '8px', fontSize: '0.95rem' }}>
                              <strong>Booking ID:</strong> {cancellationModal.transaction?.id}
                            </p>
                            <p style={{ color: '#374151', fontSize: '0.95rem' }}>
                              <strong>Guest:</strong> {cancellationModal.transaction?.user?.name || cancellationModal.transaction?.guestName || 'Guest'}
                            </p>
                          </div>

                          <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
                              Cancellation Reason <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            <textarea
                              value={cancellationReason}
                              onChange={(e) => setCancellationReason(e.target.value)}
                              placeholder="Please provide a reason for cancellation..."
                              rows="4"
                              style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                              required
                            />
                          </div>

                          <div style={{
                            background: '#fef3c7',
                            borderLeft: '4px solid #f59e0b',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '24px'
                          }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                              <AlertTriangle style={{ width: '20px', height: '20px', color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                              <div>
                                <p style={{ fontSize: '0.875rem', color: '#92400e', fontWeight: '600', marginBottom: '6px' }}>
                                  Warning: This action will:
                                </p>
                                <ul style={{ fontSize: '0.875rem', color: '#92400e', paddingLeft: '20px', margin: 0 }}>
                                  <li>Cancel the booking and mark payment as cancelled</li>
                                  <li>Free up the reserved rooms</li>
                                  <li>Notify the guest and superadmin</li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className={styles.modalFooter}>
                            <button
                              onClick={() => setCancellationModal({ show: false, transaction: null })}
                              className={`${styles.button} ${styles.btnClose}`}
                              disabled={actionLoading}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={confirmCancellation}
                              className={`${styles.button} ${styles.btnFlag}`}
                              disabled={actionLoading || !cancellationReason.trim()}
                            >
                              {actionLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Payment Modal */}
                    {decisionModal.show && (
                      <div 
                        className={styles.modalOverlay} 
                        role="dialog" 
                        aria-modal="true" 
                        aria-labelledby="cashier-payment-modal-title"
                        onClick={(e) => {
                          // Close modal when clicking on overlay (outside the modal content)
                          if (e.target === e.currentTarget) {
                            setDecisionModal({ show: false, payment: null });
                          }
                        }}
                      >
                        <div
                          className={styles.modal}
                          ref={modalRef}
                          tabIndex={-1}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') setDecisionModal({ show: false, payment: null });
                          }}
                          onClick={(e) => {
                            // Prevent modal content clicks from bubbling up to overlay
                            e.stopPropagation();
                          }}
                          style={{
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '32px',
                            margin: '20px'
                          }}
                        >
                          <div className="flex items-center justify-between mb-6 relative">
                            <h3 id="cashier-payment-modal-title" className={styles.modalHeader} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                              <CreditCard className="h-6 w-6" style={{color: '#febe52'}} />
                              Payment Processing
                            </h3>
                            <button 
                              onClick={() => setDecisionModal({ show: false, payment: null })}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                              aria-label="Close modal"
                              style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                zIndex: 10
                              }}
                            >
                              <X className="h-5 w-5 text-red-500 group-hover:text-red-700" />
                            </button>
                          </div>
                          
                          <div className="space-y-6">
                            {/* Summary Section */}
                            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200" style={{marginBottom: '24px'}}>
                              <h4 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                                Transaction Summary
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Payment ID</label>
                                  <input 
                                    type="text" 
                                    className={styles.input} 
                                    value={formatPaymentId(decisionModal.payment?.id)} 
                                    readOnly 
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%', backgroundColor: '#f8fafc', color: '#64748b'}}
                                  />
                                </div>
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Guest Name</label>
                                  <input 
                                    type="text" 
                                    className={styles.input} 
                                    value={
                                      decisionModal.payment?.booking?.user?.name ||
                                      decisionModal.payment?.user?.name ||
                                      decisionModal.payment?.guestName ||
                                      "N/A"
                                    } 
                                    readOnly 
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%', backgroundColor: '#f8fafc', color: '#64748b'}}
                                  />
                                </div>
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Required Amount</label>
                                  <input 
                                    type="text" 
                                    className={styles.input} 
                                    value={formatCurrency(
                                        decisionModal.payment?.totalPrice ||
                                          decisionModal.payment?.amount ||
                                          0
                                      )} 
                                    readOnly 
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%', backgroundColor: '#f8fafc', color: '#64748b'}}
                                  />
                                </div>
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Payment Method</label>
                                  <input 
                                    type="text" 
                                    className={styles.input} 
                                    value={
                                      decisionModal.payment?.method ||
                                      decisionModal.payment?.provider ||
                                      decisionModal.payment?.paymentMethod ||
                                      "Method of payment"
                                    } 
                                    readOnly 
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%', backgroundColor: '#f8fafc', color: '#64748b'}}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Payment Entry Section */}
                            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200" style={{marginBottom: '24px'}}>
                              <h4 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-blue-600" />
                                Payment Entry
                              </h4>
                              <div style={{marginBottom: '12px', color: '#475569'}}>
                                You may accept a full payment or a partial (down) payment. Previous payments are shown in the summary above.
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Amount Tendered *</label>
                                  <input
                                    ref={amountTenderedRef}
                                    type="text"
                                    value={amountTendered}
                                    className={styles.input}
                                    placeholder="0.00"
                                    readOnly
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%', backgroundColor: '#f8fafc', color: '#64748b'}}
                                  />
                                </div>
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Amount Customer Paid *</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={amountCustomerPaid}
                                    onChange={(e) => setAmountCustomerPaid(e.target.value)}
                                    className={styles.input}
                                    placeholder="0.00"
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%'}}
                                  />
                                </div>
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Payment Method *</label>
                                  <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className={styles.select}
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%'}}
                                  >
                                    <option value="">Select Method</option>
                                    <option value="cash">Cash</option>
                                    <option value="card">Credit/Debit Card</option>
                                    <option value="gcash">GCash</option>
                                    <option value="maya">Maya</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                  </select>
                                </div>
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Reference No.</label>
                                  <input
                                    type="text"
                                    value={referenceNo}
                                    className={styles.input}
                                    placeholder="Enter reference number"
                                    readOnly
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%', backgroundColor: '#f8fafc', color: '#64748b'}}
                                  />
                                </div>
                              </div>
                            </div>

                            {/* Change Calculation Display */}
                            {amountCustomerPaid && (
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200" style={{marginBottom: '24px'}}>
                                <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                  <Calculator className="h-5 w-5 text-green-600" />
                                  Payment Calculation
                                </h4>
                                {(() => {
                                  const payment = decisionModal.payment;
                                  const required = Number(payment?.totalPrice || payment?.amount || 0);
                                  const paid = Math.round((parseFloat(amountCustomerPaid) || 0) * 100);
                                  const alreadyPaid = Number(previousPaid || 0);
                                  const totalPaid = alreadyPaid + paid;
                                  const remainingAfter = Math.max(0, required - totalPaid);
                                  const change = Math.max(0, totalPaid - required);
                                  const isInsufficient = totalPaid < required;

                                  return (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                      <div className="bg-white rounded-lg p-4 border">
                                        <div className="text-sm text-gray-600 mb-1">Required Amount</div>
                                        <div className="text-lg font-bold text-gray-800">
                                          ₱{(required/100).toLocaleString()}
                                        </div>
                                      </div>

                                      <div className="bg-white rounded-lg p-4 border">
                                        <div className="text-sm text-gray-600 mb-1">Previous Payments</div>
                                        <div className={`text-lg font-bold ${alreadyPaid > 0 ? 'text-amber-600' : 'text-gray-700'}`}>
                                          ₱{(alreadyPaid/100).toLocaleString()}
                                          {alreadyPaid > 0 && <span style={{marginLeft:8, fontSize:12, color:'#92400e'}}> (downpayment)</span>}
                                        </div>
                                      </div>

                                      <div className="bg-white rounded-lg p-4 border">
                                        <div className="text-sm text-gray-600 mb-1">Current Payment</div>
                                        <div className={`text-lg font-bold ${paid <= 0 ? 'text-red-600' : 'text-blue-600'}`}>
                                          ₱{(paid/100).toLocaleString()}
                                        </div>
                                      </div>

                                      <div className="bg-white rounded-lg p-4 border">
                                        <div className="text-sm text-gray-600 mb-1">Remaining / Change</div>
                                        <div className={`text-lg font-bold ${isInsufficient ? 'text-red-600' : 'text-green-600'}`}>
                                          {isInsufficient ? 
                                            `Remaining: ₱${(remainingAfter/100).toLocaleString()}` :
                                            `Change: ₱${(change/100).toLocaleString()}`
                                          }
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}

                            {/* Guest Information Section */}
                            <div className="bg-amber-50 rounded-xl p-6 border border-amber-200" style={{marginBottom: '24px'}}>
                              <h4 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                                <User className="h-5 w-5 text-amber-600" />
                                Guest Information
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Guest Name</label>
                                  <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={styles.input}
                                    placeholder="Enter guest name"
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%'}}
                                  />
                                </div>
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Email Address</label>
                                  <input
                                    type="email"
                                    value={email}
                                    className={styles.input}
                                    placeholder="guest@example.com"
                                    readOnly
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%', backgroundColor: '#f8fafc', color: '#64748b'}}
                                  />
                                </div>
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Contact Number</label>
                                  <input
                                    type="text"
                                    value={contact}
                                    onChange={(e) => setContact(e.target.value)}
                                    className={styles.input}
                                    placeholder="09XXXXXXXXX"
                                    pattern="^09[0-9]{9}$"
                                    maxLength="11"
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%'}}
                                  />
                                </div>
                                <div style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Date Paid</label>
                                  <input
                                    type="date"
                                    value={datePaid}
                                    onChange={(e) => setDatePaid(e.target.value)}
                                    className={styles.input}
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%'}}
                                  />
                                </div>
                                <div className="md:col-span-2" style={{marginBottom: '16px'}}>
                                  <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Booking Type</label>
                                  <select
                                    value={bookingType}
                                    onChange={(e) => setBookingType(e.target.value)}
                                    className={styles.select}
                                    style={{padding: '12px 16px', fontSize: '16px', width: '100%'}}
                                  >
                                    <option value="Walk-in">Walk-in</option>
                                    <option value="Reservation">Reservation</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Notes Section */}
                            <div className="bg-green-50 rounded-xl p-6 border border-green-200" style={{marginBottom: '24px'}}>
                              <h4 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-green-600" />
                                Internal Notes
                              </h4>
                              <div>
                                <label className={styles.label} style={{marginBottom: '8px', display: 'block', fontWeight: '600'}}>Transaction Notes</label>
                                <textarea
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  placeholder="Add any notes about this transaction (e.g., 'Downpayment verified at 12:45 PM')"
                                  className={styles.textarea}
                                  rows={4}
                                  style={{padding: '12px 16px', fontSize: '16px', width: '100%', resize: 'vertical'}}
                                />
                              </div>
                            </div>

                            {/* Calculated Change Preview */}
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                              <h4 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-blue-600" />
                                Payment Summary
                              </h4>
                              {(() => {
                                const payment = decisionModal.payment;
                                const required = Number(payment?.totalPrice || payment?.amount || 0);
                                const paid = Math.round((parseFloat(amountCustomerPaid || amountTendered || '0') || 0) * 100);
                                const change = Math.max(0, paid - required);
                                return (
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white rounded-lg p-4 border border-blue-200">
                                      <div className="text-sm text-slate-600 mb-1">Required Amount</div>
                                      <div className="text-xl font-bold text-slate-800">{formatCurrency(required)}</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-green-200">
                                      <div className="text-sm text-slate-600 mb-1">Amount Tendered</div>
                                      <div className="text-xl font-bold text-slate-800">{formatCurrency(paid)}</div>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                                      <div className="text-sm text-slate-600 mb-1">Change Due</div>
                                      <div className="text-xl font-bold text-slate-800">{formatCurrency(change)}</div>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <div className={styles.modalFooter}>
                            <button
                              onClick={() => setDecisionModal({ show: false, payment: null })}
                              className={`${styles.button} ${styles.btnNeutral}`}
                            >
                              Close
                            </button>
                            <button
                              onClick={generateReceipt}
                              className={`${styles.button} ${styles.btnNote}`}
                            >
                              Generate Receipt
                            </button>
                            {(() => {
                              const payment = decisionModal.payment;
                              const required = Number(payment?.totalPrice || payment?.amount || 0);
                              const paid = Math.round((parseFloat(amountCustomerPaid || amountTendered || '0') || 0) * 100);
                              // Allow confirming partial / down payments: require a payment method and some positive paid amount
                              const canConfirm = !actionLoading && paymentMethod && paid > 0;
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
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
                          <div className="flex items-center justify-between mb-6">
                            <h2 className={styles.modalHeader} style={{margin: 0, background: 'linear-gradient(135deg, var(--primary-500), var(--primary-600))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>
                              <div className="flex items-center gap-2">
                                <Bell className="h-6 w-6" style={{color: '#febe52'}} />
                                Notifications Center
                              </div>
                            </h2>
                            <button
                              onClick={() => setShowNotifications(false)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                              aria-label="Close"
                              style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)'
                              }}
                            >
                              <X className="h-5 w-5 text-red-500 group-hover:text-red-700" />
                            </button>
                          </div>
                          
                          {/* Tab Headers */}
                          <div className="flex border-b border-slate-200 mb-4">
                            <button className="px-4 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
                              All Notifications ({notifications.length})
                            </button>
                          </div>
                          
                          <div className="grid gap-4 max-h-[60vh] overflow-y-auto p-2">
                            {notifications.length === 0 ? (
                              <div className="text-center py-10 text-slate-500">
                                <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>No new notifications at this time</p>
                                <p className="text-xs mt-2 opacity-70">Notifications will appear here as they arrive</p>
                              </div>
                            ) : (
                              notifications.map((notif, index) => (
                                <div 
                                  key={notif.id}
                                  className="notification-card group"
                                  style={{
                                    background: notif.priority === 'urgent' ? 'linear-gradient(135deg, #fee2e2, #fecaca)' :
                                               notif.priority === 'high' ? 'linear-gradient(135deg, #fef3c7, #fde68a)' :
                                               notif.priority === 'normal' ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)' :
                                               'linear-gradient(135deg, #f8fafc, #f1f5f9)',
                                    border: `1px solid ${
                                      notif.priority === 'urgent' ? '#fca5a5' :
                                      notif.priority === 'high' ? '#fbbf24' :
                                      notif.priority === 'normal' ? '#93c5fd' :
                                      '#e2e8f0'
                                    }`,
                                    borderRadius: '16px',
                                    padding: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                                    position: 'relative',
                                    overflow: 'hidden'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.12)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.06)';
                                  }}
                                >
                                  {/* Priority Accent Line */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      height: '4px',
                                      background: notif.priority === 'urgent' ? 'linear-gradient(90deg, #dc2626, #ef4444)' :
                                                 notif.priority === 'high' ? 'linear-gradient(90deg, #febe52, #f59e0b)' :
                                                 notif.priority === 'normal' ? 'linear-gradient(90deg, #3b82f6, #1d4ed8)' :
                                                 'linear-gradient(90deg, #6b7280, #4b5563)'
                                    }}
                                  />
                                  
                                  {/* Card Header */}
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      {/* Icon with enhanced styling */}
                                      <div
                                        style={{
                                          width: '48px',
                                          height: '48px',
                                          borderRadius: '12px',
                                          background: notif.priority === 'urgent' ? 'linear-gradient(135deg, #dc2626, #b91c1c)' :
                                                     notif.priority === 'high' ? 'linear-gradient(135deg, #febe52, #d97706)' :
                                                     notif.priority === 'normal' ? 'linear-gradient(135deg, #3b82f6, #1e40af)' :
                                                     'linear-gradient(135deg, #6b7280, #374151)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '1.5rem',
                                          color: 'white',
                                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                        }}
                                      >
                                        {notif.icon || (
                                          notif.type === 'payment' ? <CreditCard className="h-6 w-6" /> :
                                          notif.type === 'booking' ? <Hotel className="h-6 w-6" /> :
                                          notif.type === 'urgent' ? <AlertTriangle className="h-6 w-6" /> :
                                          notif.type === 'checkout' ? <LogOut className="h-6 w-6" /> :
                                          notif.type === 'system' ? <X className="h-6 w-6" /> :
                                          notif.type === 'alert' ? <AlertTriangle className="h-6 w-6" /> :
                                          <Bell className="h-6 w-6" />
                                        )}
                                      </div>
                                      
                                      {/* Title and Priority Badge */}
                                      <div>
                                        <h3 style={{
                                          fontSize: '1rem',
                                          fontWeight: '700',
                                          color: '#1e293b',
                                          margin: 0,
                                          lineHeight: '1.4'
                                        }}>
                                          {notif.title}
                                        </h3>
                                        {notif.priority && notif.priority !== 'normal' && (
                                          <span
                                            style={{
                                              display: 'inline-block',
                                              marginTop: '4px',
                                              padding: '2px 8px',
                                              fontSize: '0.75rem',
                                              fontWeight: '600',
                                              borderRadius: '6px',
                                              background: notif.priority === 'urgent' ? '#dc2626' : '#febe52',
                                              color: 'white',
                                              textTransform: 'uppercase',
                                              letterSpacing: '0.5px'
                                            }}
                                          >
                                            {notif.priority}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Time Badge */}
                                    <div
                                      style={{
                                        padding: '4px 8px',
                                        background: 'rgba(255, 255, 255, 0.7)',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        color: '#64748b',
                                        fontWeight: '500',
                                        backdropFilter: 'blur(4px)'
                                      }}
                                    >
                                      {notif.timestamp ? new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
                                       notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Now'}
                                    </div>
                                  </div>
                                  
                                  {/* Message */}
                                  <p style={{
                                    fontSize: '0.9rem',
                                    color: '#475569',
                                    lineHeight: '1.5',
                                    margin: '0 0 16px 0'
                                  }}>
                                    {notif.message}
                                  </p>
                                  
                                  {/* Actions and Metadata */}
                                  <div className="flex items-center justify-between">
                                    <div style={{
                                      fontSize: '0.8rem',
                                      color: '#94a3b8',
                                      fontWeight: '500'
                                    }}>
                                      {notif.timestamp ? new Date(notif.timestamp).toLocaleDateString() :
                                       notif.createdAt ? new Date(notif.createdAt).toLocaleDateString() : 'Today'}
                                    </div>
                                    
                                    {notif.type === 'booking' && notif.bookingId && (
                                      <button
                                        style={{
                                          background: 'linear-gradient(135deg, #febe52, #f59e0b)',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '8px',
                                          padding: '6px 12px',
                                          fontSize: '0.8rem',
                                          fontWeight: '600',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease',
                                          boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.transform = 'scale(1.05)';
                                          e.target.style.boxShadow = '0 4px 8px rgba(245, 158, 11, 0.4)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.transform = 'scale(1)';
                                          e.target.style.boxShadow = '0 2px 4px rgba(245, 158, 11, 0.3)';
                                        }}
                                      >
                                        View Booking #{notif.bookingId}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Live Notification Popup */}
                    {showLiveNotification && currentLiveNotification && (
                      <div className="fixed top-4 right-4 z-[2000] max-w-sm">
                        <div className={`
                          transform transition-all duration-500 ease-out
                          ${showLiveNotification ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
                        `}>
                          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
                            {/* Notification Header */}
                            <div className={`
                              px-4 py-3 flex items-center justify-between
                              ${currentLiveNotification.priority === 'urgent' ? 'bg-red-500' :
                                currentLiveNotification.priority === 'high' ? 'bg-amber-500' :
                                currentLiveNotification.priority === 'normal' ? 'bg-blue-500' :
                                'bg-slate-500'}
                              text-white
                            `}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{currentLiveNotification.icon}</span>
                                <span className="font-semibold text-sm">{currentLiveNotification.title}</span>
                              </div>
                              <button
                                onClick={() => setShowLiveNotification(false)}
                                className="p-1 hover:bg-white/20 rounded transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                            
                            {/* Notification Body */}
                            <div className="p-4">
                              <p className="text-slate-700 text-sm mb-3">{currentLiveNotification.message}</p>
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{new Date(currentLiveNotification.timestamp).toLocaleTimeString()}</span>
                                <button
                                  onClick={() => {
                                    setShowLiveNotification(false);
                                    setShowNotifications(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  View All
                                </button>
                              </div>
                            </div>
                            
                            {/* Priority Indicator */}
                            <div className={`
                              h-1 w-full
                              ${currentLiveNotification.priority === 'urgent' ? 'bg-red-500' :
                                currentLiveNotification.priority === 'high' ? 'bg-amber-500' :
                                currentLiveNotification.priority === 'normal' ? 'bg-blue-500' :
                                'bg-slate-500'}
                            `} />
                          </div>
                        </div>
                      </div>
                    )}



                    {/* Logout Confirmation Modal */}
                    <NavigationConfirmationModal
                      show={navigationGuard.showModal}
                      onStay={navigationGuard.handleStay}
                      onLeave={() => signOut({ callbackUrl: '/login' })}
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

                    {/* E-Receipt Modal */}
                    {eReceiptModal.show && (
                      <div 
                        className={styles.modalOverlay} 
                        role="dialog" 
                        aria-modal="true" 
                        aria-labelledby="e-receipt-modal-title"
                        onClick={(e) => {
                          if (e.target === e.currentTarget) {
                            setEReceiptModal({ show: false, receiptData: null });
                          }
                        }}
                      >
                        <div
                          className={styles.modal}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            padding: '32px',
                            margin: '20px',
                            maxWidth: '600px',
                            width: '90%'
                          }}
                        >
                          <div className="flex items-center justify-between mb-6 relative">
                            <h3 id="e-receipt-modal-title" className={styles.modalHeader} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                              <CheckCircle2 className="h-6 w-6" style={{color: '#22c55e'}} />
                              E-Receipt
                            </h3>
                            <button 
                              onClick={() => setEReceiptModal({ show: false, receiptData: null })}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                              aria-label="Close modal"
                              style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                zIndex: 10
                              }}
                            >
                              <X className="h-5 w-5 text-red-500 group-hover:text-red-700" />
                            </button>
                          </div>
                          
                          <div className="space-y-6">
                            {eReceiptModal.receiptData && (
                              <>
                                {/* Receipt Header */}
                                <div className="text-center bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-6 border">
                                  <h4 className="text-2xl font-bold text-gray-800 mb-2">HOTEL E-RECEIPT</h4>
                                  <div className="text-lg font-semibold text-blue-600 mb-1">
                                    Receipt ID: {eReceiptModal.receiptData.id}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {new Date(eReceiptModal.receiptData.processedAt).toLocaleString()}
                                  </div>
                                </div>

                                {/* Guest Information */}
                                <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
                                  <h5 className="text-lg font-semibold text-amber-800 mb-4 flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Guest Information
                                  </h5>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-sm text-gray-600 mb-1">Name</div>
                                      <div className="font-medium">{eReceiptModal.receiptData.guestName}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-gray-600 mb-1">Email</div>
                                      <div className="font-medium">{eReceiptModal.receiptData.email || 'N/A'}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-gray-600 mb-1">Contact</div>
                                      <div className="font-medium">{eReceiptModal.receiptData.contact || 'N/A'}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-gray-600 mb-1">Booking Type</div>
                                      <div className="font-medium">{eReceiptModal.receiptData.bookingType}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Transaction Details */}
                                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                                  <h5 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
                                    <Calculator className="h-5 w-5" />
                                    Transaction Details
                                  </h5>
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Reference:</span>
                                      <span className="font-mono font-medium">{eReceiptModal.receiptData.paymentId}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Required Amount:</span>
                                      <span className="font-semibold text-gray-800">₱{(eReceiptModal.receiptData.amountRequired/100).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Amount Paid:</span>
                                      <span className="font-semibold text-green-600">₱{(eReceiptModal.receiptData.amountPaid/100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Change Due:</span>
                                      <span className="font-semibold text-amber-600">₱{(eReceiptModal.receiptData.changeAmount/100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Payment Method:</span>
                                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">
                                        {eReceiptModal.receiptData.paymentMethod}
                                      </span>
                                    </div>
                                    {eReceiptModal.receiptData.referenceNo && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Reference No:</span>
                                        <span className="font-mono font-medium">{eReceiptModal.receiptData.referenceNo}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Processing Info */}
                                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                                  <h5 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5" />
                                    Processing Information
                                  </h5>
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Processed by:</span>
                                      <span className="font-medium">{eReceiptModal.receiptData.processedBy}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-gray-600">Transaction Date:</span>
                                      <span className="font-medium">{eReceiptModal.receiptData.transactionDate}</span>
                                    </div>
                                    {eReceiptModal.receiptData.notes && (
                                      <div>
                                        <div className="text-gray-600 mb-1">Notes:</div>
                                        <div className="font-medium bg-white p-3 rounded border">
                                          {eReceiptModal.receiptData.notes}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Thank You Message */}
                                <div className="text-center bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border">
                                  <h4 className="text-xl font-bold text-gray-800 mb-2">Thank you for staying with us!</h4>
                                  <p className="text-gray-600">We appreciate your business and hope you enjoyed your stay.</p>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex justify-center gap-4 pt-4">
                                  <button
                                    onClick={() => downloadReceipt(eReceiptModal.receiptData)}
                                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                                    style={{
                                      background: 'linear-gradient(135deg, #febe52 0%, #f59e0b 100%)',
                                    }}
                                  >
                                    <Download className="h-5 w-5" />
                                    Download Receipt
                                  </button>
                                  <button
                                    onClick={() => setEReceiptModal({ show: false, receiptData: null })}
                                    className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
                                  >
                                    <X className="h-5 w-5" />
                                    Close
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cancelled Transaction Details Modal */}
                    {cancelDetailsModal.show && (
                      <div
                        className={styles.modalOverlay}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="cancel-details-title"
                        onClick={(e) => {
                          if (e.target === e.currentTarget) setCancelDetailsModal({ show: false, transaction: null });
                        }}
                      >
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, width: '92%', padding: 28 }}>
                          <div className="flex items-center justify-between mb-4">
                            <h3 id="cancel-details-title" className={styles.modalHeader} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <AlertTriangle className="h-5 w-5" style={{ color: '#f59e0b' }} />
                              Cancelled Transaction Details
                            </h3>
                            <button
                              onClick={() => setCancelDetailsModal({ show: false, transaction: null })}
                              className="p-2 hover:bg-gray-100 rounded"
                              aria-label="Close cancelled details modal"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>

                          {cancelDetailsModal.transaction && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm text-gray-600">Booking / Transaction ID</div>
                                  <div className="font-medium">{cancelDetailsModal.transaction.id}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-600">Guest</div>
                                  <div className="font-medium">{cancelDetailsModal.transaction.user?.name || cancelDetailsModal.transaction.guestName || 'Guest'}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-600">Email</div>
                                  <div className="font-medium">{cancelDetailsModal.transaction.user?.email || 'N/A'}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-600">Contact</div>
                                  <div className="font-medium">{cancelDetailsModal.transaction.user?.contact || 'N/A'}</div>
                                </div>
                              </div>

                              <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                                <div className="text-sm text-gray-700 mb-2">Cancellation Reason</div>
                                <div className="font-medium text-red-700">{cancelDetailsModal.transaction.cancellationRemarks || 'No reason provided'}</div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm text-gray-600">Cancelled By</div>
                                  <div className="font-medium">{cancelDetailsModal.transaction.cancelledBy || 'System'}</div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-600">Cancelled At</div>
                                  <div className="font-medium">{cancelDetailsModal.transaction.cancelledAt ? new Date(cancelDetailsModal.transaction.cancelledAt).toLocaleString() : 'N/A'}</div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                  onClick={() => setCancelDetailsModal({ show: false, transaction: null })}
                                  className="px-4 py-2 bg-gray-200 rounded font-medium hover:bg-gray-300"
                                >
                                  Close
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Generic View Details Modal (booking/payment) */}
                    {viewDetailsModal.show && (
                      <div
                        className={styles.modalOverlay}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="view-details-title"
                        onClick={(e) => { if (e.target === e.currentTarget) setViewDetailsModal({ show: false, data: null }); }}
                      >
                        <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 920, width: '94%', padding: 20 }}>
                          <div className="flex items-center justify-between mb-4">
                            <h3 id="view-details-title" className={styles.modalHeader} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <BookOpen className="h-5 w-5" style={{ color: '#2563eb' }} />
                              Details
                            </h3>
                              <button onClick={() => setViewDetailsModal({ show: false, data: null })} className={`${styles.modalCloseBtn}`} aria-label="Close details modal"><X className="h-5 w-5" /></button>
                          </div>

                          {viewDetailsModal.data && (
                            (() => {
                              const md = viewDetailsModal.data || {};
                              // Helper: format date if present and not already passed (compare date-only to avoid timezone issues)
                              const formatDateIfFuture = (raw) => {
                                if (!raw) return null;
                                const d = new Date(raw);
                                if (isNaN(d.getTime())) return null;
                                const now = new Date();
                                // Build date-only values in local time for robust comparison
                                const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                // If dateOnly is before todayOnly, it's passed
                                if (dateOnly.getTime() < todayOnly.getTime()) return null;
                                return dateOnly.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                              };
                              const formattedCheckIn = formatDateIfFuture(md.checkInDate || md.checkIn || md.startDate);
                              const formattedCheckOut = formatDateIfFuture(md.checkOut || md.checkOutDate || md.endDate);
                              const total = Number(md.totalPrice || md.totalCostWithAddons || md.totalAmount || md.total || md.amount || 0);
                              const paid = Number(md.totalPaid || md.paidAmount || (md.payments || []).reduce((s,p)=>s+Number(p.amount||0),0) || 0);
                              const balance = Math.max(0, total - paid);
                              const status = (md.paymentStatus || md.status || '').toLowerCase();
                              const statusClass = status.includes('cancel') ? 'bg-red-100 text-red-700' : status.includes('paid') ? 'bg-green-100 text-green-700' : status.includes('pending') || status.includes('reservation') ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700';
                              return (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                                    <div className="md:col-span-2 bg-white p-4 rounded-lg shadow-sm border">
                                      <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-white rounded-lg flex items-center justify-center">
                                          <Users className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between gap-4">
                                            <div>
                                              <div className="text-sm text-gray-500">Booking / Transaction</div>
                                              <div className="text-lg font-semibold">#{md.id || md.paymentId || 'N/A'}</div>
                                            </div>
                                            <div className="text-right">
                                              <div className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}>{(md.paymentStatus || md.status || 'N/A')}</div>
                                            </div>
                                          </div>

                                          <div className={`${styles.modalDetailsGrid} mt-3`}>
                                            <div className={styles.detailLabel}>Guest</div>
                                            <div className={styles.detailValue}>{md.user?.name || md.guestName || 'Guest'}</div>

                                            <div className={styles.detailLabel}>Source</div>
                                            <div className={styles.detailValue}>{md.user ? 'PC / Account' : (md.source || 'Phone / Walk-in')}</div>

                                            <div className={styles.detailLabel}>Contact</div>
                                            <div className={styles.detailValue}>{md.user?.contact || md.contact || 'N/A'}</div>

                                            <div className={styles.detailLabel}>Email</div>
                                            <div className={styles.detailValue}>{md.user?.email || md.email || 'N/A'}</div>

                                            {formattedCheckIn && (
                                              <>
                                                <div className={styles.detailLabel}>Check-in</div>
                                                <div className={styles.detailValue}>{formattedCheckIn}</div>
                                              </>
                                            )}

                                            {formattedCheckOut && (
                                              <>
                                                <div className={styles.detailLabel}>Check-out</div>
                                                <div className={styles.detailValue}>{formattedCheckOut}</div>
                                              </>
                                            )}

                                            {formattedCheckIn && (
                                              <>
                                                <div className={styles.detailLabel}>Days Until</div>
                                                <div className={styles.detailValue}>{md.daysUntilCheckIn ?? 'N/A'}</div>
                                              </>
                                            )}
                                          </div>

                                          {md.notes && (
                                            <div className="mt-4 bg-white border rounded p-3">
                                              <div className="text-xs text-gray-500">Notes</div>
                                              <div className="text-sm text-gray-800">{md.notes}</div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className={`${styles.amountCard} md:col-span-1`}>
                                      <div className={styles.amountRow}>
                                        <div className={styles.amountLabel}>Total</div>
                                        <div className={styles.amountValue}>{formatCurrencyNoDecimal(total)}</div>
                                      </div>
                                      <div className={styles.amountRow}>
                                        <div className={styles.amountLabel}>Paid</div>
                                        <div className={styles.amountPaid}>{formatCurrencyNoDecimal(paid)}</div>
                                      </div>
                                      <div className={styles.amountRow}>
                                        <div className={styles.amountLabel}>Balance</div>
                                        <div className={styles.amountBalance}>{formatCurrencyNoDecimal(balance)}</div>
                                      </div>

                                      <div>
                                        <button onClick={() => { setViewDetailsModal({ show: false, data: null }); if (md) openPaymentModal(md); }} className={`${styles.openPaymentBtn} w-full`}>Open Payment</button>
                                      </div>

                                      <div className={styles.paymentsSection}>
                                        <div className={styles.paymentsTitle}>Payments</div>
                                        <div className={styles.paymentsList}>
                                          {(md.payments || []).length === 0 ? (
                                            <div className={styles.smallMuted}>No payments recorded</div>
                                          ) : (
                                            (md.payments || []).map((p, i) => (
                                              <div key={i} className={styles.paymentsListItem}>
                                                <div>
                                                  <div className={styles.paymentMethod}>{p.method || p.provider || 'Method'}</div>
                                                  <div className={styles.paymentTime}>{p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}</div>
                                                </div>
                                                <div className={styles.paymentRight}>
                                                  <div className={styles.paymentAmount}>{formatCurrencyNoDecimal(Number(p.amount || 0))}</div>
                                                  {p.status && <div className={styles.statusPill}>{p.status}</div>}
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    )}

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
                    
                    {/* Change Password Modal */}
                    <ChangePasswordModal
                      isOpen={showChangePassword}
                      onClose={() => setShowChangePassword(false)}
                      onSuccess={() => {
                        console.log('Cashier password changed successfully');
                      }}
                    />
                  </div>
                );
              }
