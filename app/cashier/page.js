                'use client';
                import { useSession, signOut } from 'next-auth/react';
                import { useEffect, useRef, useState, useMemo } from 'react';
                import { useChangeModal, ChangeModal, useReceiptModal, ReceiptModal, NavigationConfirmationModal } from '@/components/CustomModals';
                import { useToast } from '@/components/Toast';
                import { useNavigationGuard } from '../../hooks/useNavigationGuard.simple';
                import { Bell, Search, ChevronDown, User, LogOut, CheckCircle2, AlertTriangle, XCircle, Flag, CreditCard, CalendarDays, BookOpen, Clock, Calculator, Hotel, X, Eye, Calendar, Users, MoreVertical, Download } from 'lucide-react';
                import styles from './Cashier.module.css';

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

                // Modals
                const [changeModal, setChangeModal] = useChangeModal();
                const [receiptModal, setReceiptModal] = useReceiptModal();
                const [decisionModal, setDecisionModal] = useState({ show: false, payment: null });
                const [eReceiptModal, setEReceiptModal] = useState({ show: false, receiptData: null });
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

                async function fetchUpcomingReservations() {
                  setUpcomingLoading(true);
                  try {
                    const res = await fetch('/api/bookings/upcoming');
                    if (res.ok) {
                      const data = await res.json();
                      setUpcomingTransactionsList(Array.isArray(data) ? data : data.reservations || []);
                    } else {
                      setUpcomingTransactionsList([]);
                    }
                  } catch (e) {
                    setUpcomingTransactionsList([]);
                  } finally {
                    setUpcomingLoading(false);
                  }
                }

                async function fetchCheckoutTransactions() {
                  setCheckoutLoading(true);
                  try {
                    // Fetch bookings with checkout scheduled for today
                    const today = new Date().toISOString().split('T')[0];
                    const res = await fetch(`/api/bookings/checkout?date=${today}`);
                    if (res.ok) {
                      const data = await res.json();
                      setCheckoutTransactions(Array.isArray(data) ? data : data.checkouts || []);
                    } else {
                      // Fallback: filter bookings with checkout today
                      const todayCheckouts = bookings.filter(booking => {
                        const checkoutDate = new Date(booking.checkOut).toISOString().split('T')[0];
                        return checkoutDate === today && (booking.status || '').toLowerCase() === 'confirmed';
                      });
                      setCheckoutTransactions(todayCheckouts);
                    }
                  } catch (e) {
                    // Fallback to local filtering
                    const today = new Date().toISOString().split('T')[0];
                    const todayCheckouts = bookings.filter(booking => {
                      const checkoutDate = new Date(booking.checkOut).toISOString().split('T')[0];
                      return checkoutDate === today && (booking.status || '').toLowerCase() === 'confirmed';
                    });
                    setCheckoutTransactions(todayCheckouts);
                  } finally {
                    setCheckoutLoading(false);
                  }
                }

                useEffect(() => {
                  let mounted = true;
                  (async () => {
                    await Promise.all([fetchPaidPayments(), fetchBookings(), fetchNotifications(), fetchTotalTransactions(), fetchPendingTransactions(), fetchUpcomingReservations(), fetchCheckoutTransactions()]);
                    if (mounted) setLoading(false);
                  })();
                  
                  // Auto-refresh every 30 seconds
                  const intervalId = setInterval(async () => {
                    if (mounted) {
                      console.log('Auto-refreshing data...');
                      await Promise.all([fetchPaidPayments(), fetchBookings(), fetchNotifications(), fetchTotalTransactions(), fetchPendingTransactions(), fetchUpcomingReservations(), fetchCheckoutTransactions()]);
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

                // Upcoming reservations: show bookings/reservations for the next 15 days
                const [upcomingReservations, setUpcomingReservations] = useState([]);
                const [upcomingLoading, setUpcomingLoading] = useState(false);

                // Fetch upcoming reservations from dedicated API
                async function fetchUpcomingReservations() {
                  setUpcomingLoading(true);
                  try {
                    const res = await fetch('/api/cashier/upcoming-reservations');
                    if (res.ok) {
                      const data = await res.json();
                      setUpcomingReservations(Array.isArray(data) ? data : data.reservations || []);
                    } else {
                      // Fallback: filter from local bookings
                      const now = new Date();
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const fifteenDaysFromNow = new Date(today);
                      fifteenDaysFromNow.setDate(today.getDate() + 15);
                      
                      const filtered = (bookings || []).filter(booking => {
                        const checkIn = booking.checkInDate || booking.checkIn || booking.startDate;
                        if (!checkIn) return false;
                        
                        const checkInDate = new Date(checkIn);
                        const checkInDateOnly = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate());
                        
                        const isInRange = checkInDateOnly >= today && checkInDateOnly <= fifteenDaysFromNow;
                        const isValidStatus = !booking.status || 
                                            (booking.status.toLowerCase() !== 'cancelled' && 
                                             booking.status.toLowerCase() !== 'completed');
                        
                        return isInRange && isValidStatus;
                      });
                      
                      setUpcomingReservations(filtered);
                    }
                  } catch (error) {
                    console.error('Failed to fetch upcoming reservations:', error);
                    setUpcomingReservations([]);
                  } finally {
                    setUpcomingLoading(false);
                  }
                }

                const upcomingTransactionsList = useMemo(() => {
                  if (!dateFrom && !dateTo) return upcomingReservations;
                  
                  return (upcomingReservations || []).filter(reservation => {
                    const checkInDate = reservation.checkInDate || reservation.checkIn;
                    if (!checkInDate) return false;
                    
                    const reservationDate = new Date(checkInDate);
                    if (isNaN(reservationDate.getTime())) return false;
                    
                    // Apply date filtering
                    if (dateFrom) {
                      const fromDate = new Date(dateFrom);
                      if (reservationDate < fromDate) return false;
                    }
                    
                    if (dateTo) {
                      const toDate = new Date(dateTo);
                      toDate.setHours(23, 59, 59, 999); // End of the day
                      if (reservationDate > toDate) return false;
                    }
                    
                    return true;
                  });
                }, [upcomingReservations, dateFrom, dateTo]);

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

                // Actions: refresh + export
                async function refreshAll() {
                  setIsLoading(true);
                  setRefreshLoading(true);
                  try {
                    await Promise.all([fetchBookings(), fetchNotifications(), fetchUpcomingReservations(), fetchCheckoutTransactions()]);
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
                  setAmountTendered(requiredAmount);
                  setAmountCustomerPaid(requiredAmount); // Pre-fill with required amount
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

                    // Try to update payment status if endpoint exists
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

                    // 1. Handle different transaction types
                    if (payment?.isCheckout || payment?.type === 'checkout') {
                      // For checkout transactions, remove from checkoutTransactions
                      setCheckoutTransactions(prev => prev.filter(c => c.id !== payment.id));
                      
                      // Update the booking to completed status
                      setBookings(prev => prev.map(booking => 
                        booking.id === payment.id 
                          ? { ...booking, status: 'completed', paymentStatus: 'completed' }
                          : booking
                      ));
                    } else {
                      // For regular payments, remove from paidPayments
                      setPaidPayments(prev => prev.filter(p => p.id !== payment.id));

                      // Update bookings to remove from pending if it was a booking
                      if (payment.booking || payment.type === 'booking') {
                        setBookings(prev => prev.map(booking => 
                          booking.id === payment.id || booking.id === payment.bookingId
                            ? { ...booking, status: 'confirmed', paymentStatus: 'completed' }
                            : booking
                        ));
                      }
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
                    await Promise.all([fetchPaidPayments(), fetchBookings(), fetchCheckoutTransactions()]);

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
                          entityId: payment.id,
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
                        <div className={styles.headerTitle}>
                          🏨 Welcome back, {session?.user?.name || 'Cashier'}!
                        </div>
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
                                  🔄 Refresh
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
                                                ✓ Paid
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
                                                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                                  style={{
                                                    background: 'linear-gradient(135deg, #FEBE52 0%, #f59e0b 100%)',
                                                  }}
                                                >
                                                  <CreditCard className="h-3 w-3" />
                                                  Process Payment
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={() => {
                                                    // Show receipt or details for paid checkout
                                                    console.log('View paid checkout details:', checkout.id);
                                                  }}
                                                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                                  style={{
                                                    background: 'linear-gradient(135deg, #FEBE52 0%, #f59e0b 100%)',
                                                  }}
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
                                  Page {checkoutPage} of {checkoutTotalPages} • {checkoutTransactions.length} checkouts
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
                                Upcoming Reservations (Next 15 Days)
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={styles.sectionBadge}>{upcomingTransactionsList.length}</div>
                                <button
                                  onClick={refreshAll}
                                  className={styles.toolbarButton}
                                  disabled={isLoading}
                                >
                                  {isLoading ? '⟳ Loading...' : '↻ Refresh'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {debug && (
                            <div className="px-3 py-2 text-xs text-slate-600 border-b border-slate-100">
                              Debug · paidPayments: {paidPayments.length} · filteredPaid: {filteredPaidPayments.length} · pagedPaid: {pagedPaid.length} · bookings: {bookings.length}
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

                        {/* Upcoming Reservations Section */}
                        <div className={styles.card}>
                          <div className={`px-4 py-3 border-b border-slate-200 ${styles.cardHeaderPrimary}`}>
                            <div className={styles.sectionTitleBar}>
                              <div className={`${styles.sectionTitle} text-white`} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                <Hotel className="h-5 w-5" />
                                Upcoming Reservations (Next 15 Days)
                              </div>
                              <div className="flex items-center gap-2">
                                <div className={styles.sectionBadge}>{upcomingTransactionsList.length}</div>
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
                                          <div className="font-semibold text-green-600">
                                            ₱{((reservation.totalAmount || reservation.totalPrice || 0) / 100).toLocaleString()}
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
                                          <button
                                            type="button"
                                            onClick={(e) => { 
                                              e.stopPropagation(); 
                                              // Open view-only modal for reservations
                                              console.log('View reservation details:', reservation.id);
                                              // You can create a separate view modal here
                                            }}
                                            className={`${styles.button} ${styles.btnReview}`}
                                            aria-label={`View reservation ${reservation.id}`}
                                          >
                                            Review
                                          </button>
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
                                  🔄 Refresh
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
                                                ✓ Paid
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
                                                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                                  style={{
                                                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                  }}
                                                >
                                                  <CreditCard className="h-3 w-3" />
                                                  Process Payment
                                                </button>
                                              ) : (
                                                <button
                                                  onClick={() => {
                                                    // Show receipt or details for paid checkout
                                                    console.log('View paid checkout details:', checkout.id);
                                                  }}
                                                  className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                                  style={{
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                  }}
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
                                  Page {checkoutPage} of {checkoutTotalPages} • {checkoutTransactions.length} checkouts
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
                                  ⬇ Export CSV
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
                                              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                              style={{
                                                background: 'linear-gradient(135deg, #FEBE52 0%, #f59e0b 100%)',
                                              }}
                                            >
                                              <Eye className="h-3 w-3" />
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
                                    Page {completedPage} of {completedTotalPages} • {completedTransactions.length} transactions
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
                      </div>
                    </main>

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
                              <CreditCard className="h-6 w-6" style={{color: '#FEBE52'}} />
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
                                      "—"
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
                                  const change = Math.max(0, paid - required);
                                  const isInsufficient = paid < required;
                                  
                                  return (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="bg-white rounded-lg p-4 border">
                                        <div className="text-sm text-gray-600 mb-1">Required Amount</div>
                                        <div className="text-lg font-bold text-gray-800">
                                          ₱{(required/100).toLocaleString()}
                                        </div>
                                      </div>
                                      <div className="bg-white rounded-lg p-4 border">
                                        <div className="text-sm text-gray-600 mb-1">Amount Paid</div>
                                        <div className={`text-lg font-bold ${isInsufficient ? 'text-red-600' : 'text-blue-600'}`}>
                                          ₱{(paid/100).toLocaleString()}
                                        </div>
                                      </div>
                                      <div className="bg-white rounded-lg p-4 border">
                                        <div className="text-sm text-gray-600 mb-1">Change Due</div>
                                        <div className={`text-lg font-bold ${isInsufficient ? 'text-red-600' : 'text-green-600'}`}>
                                          {isInsufficient ? 
                                            `Insufficient (₱${((required - paid)/100).toLocaleString()} short)` :
                                            `₱${(change/100).toLocaleString()}`
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
                              ✕ Close
                            </button>
                            <button
                              onClick={generateReceipt}
                              className={`${styles.button} ${styles.btnNote}`}
                            >
                              🧾 Generate Receipt
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
                                    ❌ Cancel Transaction
                                    {actionLoading && <span className={styles.inlineSpinner} />}
                                  </button>
                                  <button
                                    onClick={approveTransaction}
                                    disabled={!canConfirm}
                                    className={`${styles.button} ${styles.btnVerify}`}
                                    title={!paymentMethod ? 'Select a payment method' : (paid < required ? 'Amount tendered is less than required' : undefined)}
                                  >
                                    ✅ Confirm Payment
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
                                <Bell className="h-6 w-6" style={{color: '#FEBE52'}} />
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
                                                 notif.priority === 'high' ? 'linear-gradient(90deg, #FEBE52, #f59e0b)' :
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
                                                     notif.priority === 'high' ? 'linear-gradient(135deg, #FEBE52, #d97706)' :
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
                                              background: notif.priority === 'urgent' ? '#dc2626' : '#FEBE52',
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
                                          background: 'linear-gradient(135deg, #FEBE52, #f59e0b)',
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
                                      background: 'linear-gradient(135deg, #FEBE52 0%, #f59e0b 100%)',
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
