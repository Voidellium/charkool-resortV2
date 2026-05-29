'use client';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useEarlyCheckInModal, EarlyCheckInModal, NavigationConfirmationModal } from '@/components/CustomModals';
import { signOut, useSession } from 'next-auth/react';
import { useNavigationGuard } from '../../hooks/useNavigationGuard.simple';
import { User, CheckCircle, XCircle, AlertCircle, Info, Lock, Bell, X, RefreshCw, Users, Wallet, Smartphone, CreditCard } from 'lucide-react';
import './receptionist-styles.css';
import RoomAmenitiesSelector from '@/components/RoomAmenitiesSelector';
import RentalAmenitiesSelector from '@/components/RentalAmenitiesSelector';
import OptionalAmenitiesSelector from '@/components/OptionalAmenitiesSelector';
import BookingCalendar from '@/components/BookingCalendar';
import RoomUnitSelector from '@/components/RoomUnitSelector';
import Loading from '@/components/Loading';
import { useBookingUpdates, useStaffNotifications } from '@/hooks/usePusher';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { useToast } from '@/components/Toast';

// Timezone-safe date formatting utility
function formatDate(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeBookingStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  const map = {
    held: 'Held',
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
    'checked out': 'CheckedOut',
    checked_out: 'CheckedOut',
    checkout: 'CheckedOut',
    checkedout: 'CheckedOut',
    'checked in': 'CheckedIn',
    checkedin: 'CheckedIn',
  };
  return map[value] || status;
}

function getDisplayBookingStatus(booking) {
  if (!booking) return 'Pending';
  const normalized = normalizeBookingStatus(booking.status);
  if (normalized === 'Completed') return 'Completed';
  if (booking.actualCheckOut) return 'Checked Out';
  if (booking.actualCheckIn) return 'Checked In';
  return normalized || 'Pending';
}

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameLocalDate(dateLike, compareTo = new Date()) {
  const date = parseDateValue(dateLike);
  if (!date) return false;
  return (
    date.getFullYear() === compareTo.getFullYear() &&
    date.getMonth() === compareTo.getMonth() &&
    date.getDate() === compareTo.getDate()
  );
}

export default function ReceptionistDashboard() {
  const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();
  // Helper function to get room capacity details
  const getRoomCapacityDetails = (type) => {
    switch (type) {
      case 'TEPEE':
        return { base: 5, additionalPaxMax: 2, max: 7, childrenMax: 2 };
      case 'LOFT':
        return { base: 2, additionalPaxMax: 2, max: 4, childrenMax: 2 };
      case 'VILLA':
        return { base: 8, additionalPaxMax: 2, max: 10, childrenMax: 2 };
      default:
        return { base: 1, additionalPaxMax: 0, max: 1, childrenMax: 2 };
    }
  };

  // Session hook
  const { data: session } = useSession();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal manager state - centralized modal management
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  
  // Modal types
  const MODALS = {
    CREATE_BOOKING: 'CREATE_BOOKING',
    ADJUST_BOOKING: 'ADJUST_BOOKING',
    CANCEL_BOOKING: 'CANCEL_BOOKING',
    REMARKS: 'REMARKS',
    DETAILS: 'DETAILS',
    STATUS_CHANGE: 'STATUS_CHANGE',
    NOTIFICATIONS: 'NOTIFICATIONS',
    SHIFT_SUMMARY: 'SHIFT_SUMMARY'
  };
  const [allRooms, setAllRooms] = useState([]);
  const [allAmenities, setAllAmenities] = useState({
    inventory: [],
    optional: [],
    rental: []
  });
  
  // Memoized callbacks for navigation guard to prevent re-renders
  const shouldPreventNav = useCallback(() => true, []);
  const onNavAttempt = useCallback(() => {
    console.log('Receptionist Dashboard: Navigation attempt detected, showing logout confirmation');
  }, []);
  const customLogout = useCallback(() => signOut({ callbackUrl: '/login' }), []);

  // Logout Navigation Guard
  const navigationGuard = useNavigationGuard({
    shouldPreventNavigation: shouldPreventNav,
    onNavigationAttempt: onNavAttempt,
    customAction: customLogout,
    context: 'logout',
    message: 'Are you sure you want to log out of your Receptionist dashboard?'
  });

  // Modal management functions
  const openModal = (modalType, data = null) => {
    setActiveModal(modalType);
    setModalData(data);
  };
  
  const closeModal = () => {
    setActiveModal(null);
    setModalData(null);
  };
  
  const isModalOpen = (modalType) => activeModal === modalType;

  // New state for booking creation form
  const [createBookingStep, setCreateBookingStep] = useState(1);
  const [createBookingForm, setCreateBookingForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1,
    paymentMode: 'cash', // Default to cash
    selectedRooms: {}, // DEPRECATED: Keep for backward compatibility
    rooms: [], // NEW: Array of { roomId, quantity, adults, additionalPax, children, optionalAmenities, rentalAmenities }
    selectedRoomDetails: {},
    selectedAmenities: { optional: {}, rental: {}, cottage: null }, // Keep for backward compatibility
  });
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [roomSearchInProgress, setRoomSearchInProgress] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [dateWarning, setDateWarning] = useState('');
  const [roomLockWarning, setRoomLockWarning] = useState('');
  const [rentalAmenitiesData, setRentalAmenitiesData] = useState([]);
  const [optionalAmenitiesData, setOptionalAmenitiesData] = useState([]);
  const [createTotalPrice, setCreateTotalPrice] = useState(0);
  const [availabilityData, setAvailabilityData] = useState({});
  const [disabledDates, setDisabledDates] = useState([]); // Dates disabled by super admin

  // Submit ref to prevent multiple submissions
  const submittingRef = useRef(false);
  
  // Debounce timer for room searches
  const roomSearchTimeoutRef = useRef(null);
  
  // Modal state for booking submission
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showShiftSummaryModal, setShowShiftSummaryModal] = useState(false);
  const [dotCount, setDotCount] = useState(1);

  // State for features
  const [quickViewGuest, setQuickViewGuest] = useState(null);
  const [notifications, setNotifications] = useState({
    pendingCheckIns: [],
    pendingCheckOuts: [],
    pendingBookings: 0,
  });
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [shiftSummary, setShiftSummary] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [pastGuests, setPastGuests] = useState([]);
  const [guestNameInput, setGuestNameInput] = useState('');
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);
  const [activeBookingFilter, setActiveBookingFilter] = useState('all');
  const [checkActionModal, setCheckActionModal] = useState({ show: false, booking: null, action: null });
  
  // Pagination and search state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('checkIn');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Missing state variables for modal management
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [bookingForDetails, setBookingForDetails] = useState(null);

  // Form state for booking operations
  const [adjustBookingForm, setAdjustBookingForm] = useState({
    guestName: '',
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1,
    selectedAmenities: { optional: {}, rental: {}, cottage: null },
    remarks: '',
  });
  
  const [bookingRemarks, setBookingRemarks] = useState('');
  
  // Early check-in modal (shared)
  const [earlyCheckInModal, setEarlyCheckInModal] = useEarlyCheckInModal();

  // Alert modal state
  const [alertModal, setAlertModal] = useState({ show: false, title: '', message: '', type: 'info', onClose: null });

  // Show alert function
  const showAlert = useCallback((title, message, type = 'info', onClose = null) => {
    setAlertModal({ show: true, title, message, type, onClose });
    if (type === 'success') toastSuccess(message, { title });
    else if (type === 'error') toastError(message, { title });
    else if (type === 'warning') toastWarning(message, { title });
    else toastInfo(message, { title });
  }, [toastSuccess, toastError, toastWarning, toastInfo]);

  // Status change form
  const [statusChangeData, setStatusChangeData] = useState({
    bookingId: null,
    newStatus: '',
    reason: '',
  });

  // Enhanced guest lookup
  const [guestLookupResults, setGuestLookupResults] = useState([]);
  const [isSearchingGuests, setIsSearchingGuests] = useState(false);

  // Notification categories
  const [notificationCategories, setNotificationCategories] = useState({
    checkIns: [],
    checkOuts: [],
    maintenance: [],
    housekeeping: [],
    general: [],
  });

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const fetchPastGuests = async () => {
    // This is a placeholder. In a real app, you'd fetch this from the backend.
    setPastGuests([
      { id: 1, name: 'John Doe' },
      { id: 2, name: 'Jane Smith' },
    ]);
  };

  // Enhanced error handling function
  const handleError = (error, context = 'Operation') => {
    console.error(`${context} error:`, error);
    setError(`${context} failed: ${error.message || 'Unknown error'}`);
    setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
  };

  const handleCancelBooking = async () => {
    const bookingToCancel = modalData;
    if (!bookingToCancel || !cancelReason) {
      showAlert('Validation Error', 'Please provide a reason for cancellation.', 'warning');
      return;
    }
    try {
      const res = await fetch(`/api/bookings/${bookingToCancel.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled', cancellationRemarks: cancelReason }),
      });
      if (!res.ok) throw new Error('Failed to cancel booking');
      await fetchBookings();
      closeModal();
      setCancelReason('');
    } catch (error) {
      handleError(error, 'Cancel booking');
    }
  };

  const updateNotifications = (allBookings) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

  const pendingCheckIns = allBookings.filter(b => isSameLocalDate(b.checkIn) && ['Held', 'Pending'].includes(normalizeBookingStatus(b.status)));
  const pendingCheckOuts = allBookings.filter(b => isSameLocalDate(b.checkOut) && normalizeBookingStatus(b.status) === 'Confirmed');
  const pendingBookingsCount = allBookings.filter(b => isSameLocalDate(b.checkIn, tomorrow)).length;

    setNotifications({
      pendingCheckIns,
      pendingCheckOuts,
      pendingBookings: pendingBookingsCount,
    });
  };

  const generateShiftSummary = () => {
    const today = new Date().toLocaleDateString('en-CA');
    const summary = {
      date: today,
      walkInBookings: bookings.filter(b => isSameLocalDate(b.createdAt) && b.status === 'Confirmed').length,
      checkedIn: bookings.filter(b => isSameLocalDate(b.checkIn) && b.status === 'Confirmed').length,
      checkedOut: bookings.filter(b => isSameLocalDate(b.checkOut) && normalizeBookingStatus(b.status) === 'CheckedOut').length,
      cancelled: bookings.filter(b => b.status === 'Cancelled').length,
      noShows: bookings.filter(b => b.status === 'No-Show').length,
      pendingReservations: bookings.filter(b => normalizeBookingStatus(b.status) === 'Held').length,
    };
    setShiftSummary(summary);
    setShowShiftSummaryModal(true);
  };

  const getBookingRoomLabels = (booking) => {
    const labels = [];
    const seen = new Set();

    const pushLabel = (rawLabel, quantity = 1) => {
      const base = String(rawLabel || '').trim();
      if (!base) return;
      const qty = Number(quantity) || 1;
      const label = qty > 1 ? `${base} x${qty}` : base;
      if (!seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    };

    // New API shape (booking.rooms with nested room)
    if (Array.isArray(booking?.rooms)) {
      booking.rooms.forEach((item) => {
        const roomName = item?.room?.name || item?.roomName || item?.name;
        const roomType = item?.room?.type || item?.type || '';
        const unit = item?.unitNumber || item?.roomUnit || item?.unit;
        const qty = item?.quantity || 1;
        const baseName = roomName || roomType || 'Room';
        const label = unit ? `${baseName} (${unit})` : baseName;
        pushLabel(label, qty);
      });
    }

    // Legacy shape
    if (labels.length === 0 && Array.isArray(booking?.roomAssignments)) {
      booking.roomAssignments.forEach((room) => {
        const roomName = room?.roomName || room?.name || room?.type || 'Room';
        const qty = room?.quantity || 1;
        pushLabel(roomName, qty);
      });
    }

    // Backward compatibility from selectedRooms + allRooms map
    if (labels.length === 0 && booking?.selectedRooms && typeof booking.selectedRooms === 'object') {
      Object.entries(booking.selectedRooms).forEach(([roomId, qty]) => {
        const match = allRooms.find((r) => String(r.id) === String(roomId));
        const roomName = match?.name || 'Room';
        pushLabel(roomName, qty);
      });
    }

    return labels;
  };

  const getBookingPrimaryRoomLabel = (booking) => {
    const labels = getBookingRoomLabels(booking);
    if (!labels.length) return 'Not assigned';
    if (labels.length === 1) return labels[0];
    return `${labels[0]} +${labels.length - 1} more`;
  };

  const getBookingAssignedUnits = (booking) => {
    if (Array.isArray(booking?.rooms) && booking.rooms.length > 0) {
      return booking.rooms.reduce((sum, room) => sum + (Number(room?.quantity) || 1), 0);
    }
    if (Array.isArray(booking?.roomAssignments) && booking.roomAssignments.length > 0) {
      return booking.roomAssignments.reduce((sum, room) => sum + (Number(room?.quantity) || 1), 0);
    }
    if (booking?.selectedRooms && typeof booking.selectedRooms === 'object') {
      return Object.values(booking.selectedRooms).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
    }
    return 0;
  };

  const getBookingGuestCount = (booking) => {
    const toPositiveNumber = (value) => {
      const num = Number(value);
      return Number.isFinite(num) && num > 0 ? num : 0;
    };

    // New shape: derive from per-room pax configuration
    if (Array.isArray(booking?.rooms) && booking.rooms.length > 0) {
      const roomPax = booking.rooms.reduce((sum, room) => {
        const adults = toPositiveNumber(room?.adults);
        const additionalPax = toPositiveNumber(room?.additionalPax);
        const children = toPositiveNumber(room?.children);
        return sum + adults + additionalPax + children;
      }, 0);

      if (roomPax > 0) return roomPax;

      // Fallback: at least the booked unit quantity if pax breakdown is unavailable
      const unitQty = booking.rooms.reduce((sum, room) => sum + (toPositiveNumber(room?.quantity) || 1), 0);
      if (unitQty > 0) return unitQty;
    }

    // Primary source from booking payload
    const directGuestCount = toPositiveNumber(booking?.numberOfGuests);
    if (directGuestCount > 0) return directGuestCount;

    // Legacy roomAssignments shape
    if (Array.isArray(booking?.roomAssignments) && booking.roomAssignments.length > 0) {
      const legacyPax = booking.roomAssignments.reduce((sum, room) => {
        const guests = toPositiveNumber(room?.numberOfGuests || room?.guests);
        const adults = toPositiveNumber(room?.adults);
        const children = toPositiveNumber(room?.children);
        const resolved = guests || adults + children;
        return sum + (resolved > 0 ? resolved : 1);
      }, 0);
      if (legacyPax > 0) return legacyPax;
    }

    return 0;
  };

  const getPaymentModeMeta = (paymentMode) => {
    const mode = String(paymentMode || 'cash').toLowerCase();
    if (mode === 'gcash') return { label: 'GCash', Icon: Smartphone };
    if (mode === 'maya') return { label: 'Maya', Icon: CreditCard };
    if (mode === 'card') return { label: 'Card', Icon: CreditCard };
    return { label: 'Cash', Icon: Wallet };
  };

  // Pagination and filtering utilities
  const getAllBookings = () => {
    return activeBookings; // Return all active (non-cancelled) bookings
  };

  const getFilteredBookings = () => {
    let filteredBookings = [];
    
    // Apply filter by status
    if (activeBookingFilter === 'pending') {
      filteredBookings = pendingBookings || [];
    } else if (activeBookingFilter === 'confirmed') {
      filteredBookings = confirmedBookings || [];
    } else if (activeBookingFilter === 'checkedIn') {
      filteredBookings = checkedInBookings || [];
    } else if (activeBookingFilter === 'checkedOut' || activeBookingFilter === 'completed') {
      filteredBookings = [...(checkedOutBookings || []), ...(completedBookings || [])];
    } else {
      filteredBookings = getAllBookings();
    }

    // Apply search filter
    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      filteredBookings = filteredBookings.filter(booking => 
        booking.guestName?.toLowerCase().includes(normalizedSearch) ||
        getBookingRoomLabels(booking).join(' ').toLowerCase().includes(normalizedSearch) ||
        booking.id?.toString().includes(searchTerm) ||
        booking.remarks?.toLowerCase().includes(normalizedSearch)
      );
    }

    // Apply sorting
    filteredBookings.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'guestName':
          aVal = a.guestName || '';
          bVal = b.guestName || '';
          break;
        case 'checkIn':
          aVal = new Date(a.checkIn || 0);
          bVal = new Date(b.checkIn || 0);
          break;
        case 'checkOut':
          aVal = new Date(a.checkOut || 0);
          bVal = new Date(b.checkOut || 0);
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        default:
          aVal = new Date(a.checkIn || 0);
          bVal = new Date(b.checkIn || 0);
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filteredBookings;
  };

  const getPaginatedBookings = () => {
    const filtered = getFilteredBookings();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = () => {
    return Math.ceil(getFilteredBookings().length / itemsPerPage);
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, getTotalPages())));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Reset pagination when filter changes
  const handleFilterChange = (filter) => {
    setActiveBookingFilter(filter);
    setCurrentPage(1);
  };

  const openCheckActionModal = (action, booking) => {
    setCheckActionModal({ show: true, booking, action });
  };

  const closeCheckActionModal = () => {
    setCheckActionModal({ show: false, booking: null, action: null });
  };

  const confirmCheckAction = async () => {
    if (!checkActionModal?.booking?.id || !checkActionModal?.action) {
      closeCheckActionModal();
      return;
    }

    try {
      if (checkActionModal.action === 'checkin') {
        await handleCheckIn(checkActionModal.booking.id);
      } else if (checkActionModal.action === 'checkout') {
        await handleCheckOut(checkActionModal.booking.id);
      }
    } finally {
      closeCheckActionModal();
    }
  };

  const handleGuestNameChange = (e) => {
    const name = e.target.value;
    setGuestNameInput(name);
    
    // Parse name into parts for the new structure
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
    
    setCreateBookingForm(prev => ({ 
      ...prev, 
      firstName,
      middleName,
      lastName
    }));
    
    if (name.length > 2) {
      setShowGuestSuggestions(true);
      searchGuests(name);
    } else {
      setShowGuestSuggestions(false);
      setGuestLookupResults([]);
    }
  };

  const handleGuestSelect = (guest) => {
    const guestName = guest.name || '';
    setGuestNameInput(guestName);
    
    // Parse name into parts for the new structure
    const nameParts = guestName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
    
    setCreateBookingForm(prev => ({ 
      ...prev, 
      firstName,
      middleName,
      lastName
    }));
    setShowGuestSuggestions(false);
  };

  const openQuickView = (guest) => {
    // Ensure guest count and guestName are always present
    setQuickViewGuest({
      ...guest,
      numberOfGuests: getBookingGuestCount(guest),
      guestName: guest.guestName ?? 'Unknown Guest',
    });
    setIsQuickViewOpen(true);
  };

  const closeQuickView = () => {
    setIsQuickViewOpen(false);
    setQuickViewGuest(null);
  };

  // Booking adjustment controls
  const openAdjustBookingModal = (booking) => {
    setAdjustBookingForm({
      guestName: booking.guestName ?? '',
      checkIn: booking.checkIn ? String(booking.checkIn).split('T')[0] : '',
      checkOut: booking.checkOut ? String(booking.checkOut).split('T')[0] : '',
      numberOfGuests: getBookingGuestCount(booking) || 1,
      selectedAmenities: booking.selectedAmenities || { optional: {}, rental: {}, cottage: null },
      remarks: booking.remarks ?? '',
    });
    openModal(MODALS.ADJUST_BOOKING, booking);
  };

  const handleAdjustBooking = async () => {
    const bookingToAdjust = modalData;
    if (!bookingToAdjust) return;
    // Validate guest name and number of guests
    if (!adjustBookingForm.guestName?.trim()) {
      showAlert('Validation Error', 'Guest name is required.', 'error');
      return;
    }
    if (!adjustBookingForm.numberOfGuests || adjustBookingForm.numberOfGuests < 1) {
      showAlert('Validation Error', 'Number of guests must be at least 1.', 'error');
      return;
    }
    try {
      setLoading(true);
      const updatedData = {
        ...bookingToAdjust,
        guestName: adjustBookingForm.guestName,
        checkIn: adjustBookingForm.checkIn,
        checkOut: adjustBookingForm.checkOut,
        numberOfGuests: adjustBookingForm.numberOfGuests,
        selectedAmenities: adjustBookingForm.selectedAmenities,
        remarks: adjustBookingForm.remarks,
      };
      const res = await fetch(`/api/bookings/${bookingToAdjust.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to update booking');
      await fetchBookings();
      closeModal();
    } catch (error) {
      handleError(error, 'Update booking');
    } finally {
      setLoading(false);
    }
  };

  // Booking remarks functionality
  const openRemarksModal = (booking) => {
    setBookingRemarks(String(booking.remarks || ''));
    openModal(MODALS.REMARKS, booking);
  };

  // Booking details modal functionality
  const openDetailsModal = (booking) => {
    // Ensure numberOfGuests is always a number if possible
    let numberOfGuests = booking.numberOfGuests;
    if (typeof numberOfGuests !== 'number') {
      const parsed = parseInt(numberOfGuests);
      numberOfGuests = isNaN(parsed) ? undefined : parsed;
    }
    openModal(MODALS.DETAILS, { ...booking, numberOfGuests });
  };

  const handleSaveRemarks = async () => {
    const booking = modalData;
    if (!booking) return;
    
    try {
      setLoading(true);
      const updatedData = {
        ...booking,
        remarks: bookingRemarks,
      };
      
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to save remarks');
      
      await fetchBookings();
      closeModal();
      setBookingRemarks('');
    } catch (error) {
      handleError(error, 'Save remarks');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced status shortcuts
  const openStatusModal = (bookingId, newStatus) => {
    const booking = bookings.find(b => b.id === bookingId);
    setStatusChangeData({
      bookingId,
      newStatus,
      reason: '',
    });
    openModal(MODALS.STATUS_CHANGE, booking);
  };

  const handleStatusChange = async () => {
    if (!statusChangeData.bookingId || !statusChangeData.reason.trim()) {
      showAlert('Validation Error', 'Please provide a reason for the status change.', 'warning');
      return;
    }
    
    // Prevent receptionist from confirming bookings
    if (statusChangeData.newStatus === 'Confirmed') {
      showAlert('Permission Denied', 'Only cashier and super admin can confirm bookings after payment verification.', 'warning');
      return;
    }
    
    try {
      const bookingToUpdate = bookings.find(b => b.id === statusChangeData.bookingId);
      if (!bookingToUpdate) throw new Error('Booking not found');

      let updatedData = { ...bookingToUpdate, status: statusChangeData.newStatus };

      if (statusChangeData.newStatus === 'Cancelled') {
        updatedData.cancellationRemarks = statusChangeData.reason;
      } else if (statusChangeData.newStatus === 'No-Show') {
        updatedData.noShowRemarks = statusChangeData.reason;
      }

      const res = await fetch(`/api/bookings/${statusChangeData.bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchBookings();
      setShowStatusModal(false);
      setStatusChangeData({ bookingId: null, newStatus: '', reason: '' });
    } catch (error) {
      console.error('Error updating status:', error);
      showAlert('Error', 'Failed to update status. Please try again.', 'error');
    }
  };

  // Enhanced guest lookup
  const searchGuests = async (query) => {
    if (query.length < 2) {
      setGuestLookupResults([]);
      return;
    }
    setIsSearchingGuests(true);
    try {
      // This would typically call an API endpoint for guest search
      // For now, we'll filter from existing bookings
      const results = bookings
        .filter(booking =>
          booking.guestName.toLowerCase().includes(query.toLowerCase())
        )
        .map(booking => ({
          id: booking.guestId || booking.id,
          name: booking.guestName,
          email: booking.email || '',
          phone: booking.phone || '',
          lastVisit: booking.checkOut,
        }))
        .slice(0, 5); // Limit to 5 results
      setGuestLookupResults(results);
    } catch (error) {
      console.error('Error searching guests:', error);
    } finally {
      setIsSearchingGuests(false);
    }
  };

  const selectGuestFromLookup = (guest) => {
    const guestName = guest.name || '';
    setGuestNameInput(guestName);
    
    // Parse name into parts for the new structure
    const nameParts = guestName.trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
    
    setCreateBookingForm(prev => ({ 
      ...prev, 
      firstName,
      middleName,
      lastName
    }));
    setGuestLookupResults([]);
    setShowGuestSuggestions(false);
  };

  // Enhanced notification panel functionality
  const loadNotifications = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Enhanced categorization with timestamps and priority
    const now = new Date();
    const overdueCheckouts = bookings.filter(b => {
      if (!b.checkOut || normalizeBookingStatus(b.status) !== 'Confirmed') return false;
      const checkoutDate = new Date(b.checkOut);
      return checkoutDate < now;
    });

    const lateArrivals = bookings.filter(b => {
      if (!b.checkIn || normalizeBookingStatus(b.status) !== 'Held') return false;
      const checkinDate = new Date(b.checkIn);
      const expectedTime = new Date(checkinDate);
      expectedTime.setHours(15, 0, 0, 0); // 3 PM check-in time
      return now > expectedTime;
    });

    setNotificationCategories({
      checkIns: bookings.filter(b => b.checkIn && b.checkIn.startsWith(today) && normalizeBookingStatus(b.status) === 'Held'),
      checkOuts: bookings.filter(b => b.checkOut && b.checkOut.startsWith(today) && normalizeBookingStatus(b.status) === 'Confirmed'),
      overdueCheckouts,
      lateArrivals,
      maintenance: [], // Would be populated from maintenance API
      housekeeping: [], // Would be populated from housekeeping API
      general: bookings.filter(b => b.checkIn && b.checkIn.startsWith(tomorrowStr)).slice(0, 3),
    });
  };



  const printBookingSummary = (booking) => {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Booking Summary</title>');
    printWindow.document.write(`
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { padding: 20px; border: 1px solid #ccc; border-radius: 8px; }
        .header { background-color: #FEBE52; color: #92400E; padding: 15px; margin: -20px -20px 20px -20px; border-radius: 8px 8px 0 0; }
        .details { margin-bottom: 20px; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .label { font-weight: bold; }
        .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 12px; color: #666; }
      </style>
    `);
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="summary">');
    printWindow.document.write(`<div class="header"><h1>Booking Summary</h1><h2>${booking.guestName}</h2></div>`);
    printWindow.document.write('<div class="details">');
    printWindow.document.write(`<div class="detail-row"><span class="label">Booking ID:</span> <span>${booking.id}</span></div>`);
    printWindow.document.write(`<div class="detail-row"><span class="label">Check-in:</span> <span>${new Date(booking.checkIn).toLocaleDateString()}</span></div>`);
    printWindow.document.write(`<div class="detail-row"><span class="label">Check-out:</span> <span>${new Date(booking.checkOut).toLocaleDateString()}</span></div>`);
    printWindow.document.write(`<div class="detail-row"><span class="label">Guests:</span> <span>${getBookingGuestCount(booking) || 'N/A'}</span></div>`);
    printWindow.document.write(`<div class="detail-row"><span class="label">Status:</span> <span>${booking.status}</span></div>`);
    if (booking.remarks) {
      printWindow.document.write(`<div class="detail-row"><span class="label">Remarks:</span> <span>${booking.remarks}</span></div>`);
    }
    printWindow.document.write('</div>');
    printWindow.document.write(`<div class="footer">Printed on ${new Date().toLocaleString()}</div>`);
    printWindow.document.write('</div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const fetchBookings = async ({ silent = true } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fetch('/api/bookings?page=1&limit=50'); // Fetch first 50 records
      if (!res.ok) {
        throw new Error(`Failed to fetch bookings: ${res.status} ${res.statusText}`);
      }
      const response = await res.json();
      // Handle both old format (array) and new format (object with bookings array)
      const allBookings = Array.isArray(response) ? response : response.bookings || [];
      setBookings(allBookings);
    } catch (error) {
      handleError(error, 'Fetch bookings');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchRooms = async (checkIn, checkOut, isInitialLoad = false) => {
    try {
      // Only show full loading for initial load
      if (isInitialLoad) {
        setLoadingRooms(true);
      } else {
        setRoomSearchInProgress(true);
      }
      
      const url = new URL('/api/rooms', window.location.origin);
      if (checkIn) url.searchParams.append('checkIn', checkIn);
      if (checkOut) url.searchParams.append('checkOut', checkOut);

      const res = await fetch(url);
      if (!res || !res.ok) { 
        throw new Error(`Failed to fetch rooms: ${res?.statusText || 'Unknown error'}`);
      }
      const rooms = await res.json();
      setAllRooms(rooms);
      
      // Update available rooms for booking creation if dates are set
      if (checkIn && checkOut) {
        const availableRooms = rooms.filter(room => room.remaining > 0);
        setAvailableRooms(availableRooms);
      }
    } catch (error) {
      handleError(error, 'Fetch rooms');
    } finally {
      setLoadingRooms(false);
      setRoomSearchInProgress(false);
    }
  };

  // Debounced room search to prevent too many API calls
  const debouncedFetchRooms = (checkIn, checkOut) => {
    // Clear existing timeout
    if (roomSearchTimeoutRef.current) {
      clearTimeout(roomSearchTimeoutRef.current);
    }
    
    // Set new timeout for 500ms
    roomSearchTimeoutRef.current = setTimeout(() => {
      if (checkIn && checkOut) {
        fetchRooms(checkIn, checkOut, false);
      }
    }, 500);
  };

  const fetchAmenities = async () => {
    try {
      const res = await fetch('/api/amenities');
      if (!res.ok) {
        throw new Error(`Failed to fetch amenities: ${res.statusText}`);
      }
      const amenities = await res.json();
      setAllAmenities(amenities);
      
      // Set amenities data for selectors
      if (amenities.optional) setOptionalAmenitiesData(amenities.optional);
      if (amenities.rental) setRentalAmenitiesData(amenities.rental);
    } catch (error) {
      handleError(error, 'Fetch amenities');
    }
  };

  const handleCheckIn = async (bookingId) => {
    try {
      const bookingToUpdate = bookings.find(b => b.id === bookingId);
      if (!bookingToUpdate) throw new Error('Booking not found');
      const updatedData = { status: 'Confirmed', actualCheckIn: true };
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to check in');
      const updatedBooking = await res.json();
      if (updatedBooking?.id) {
        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b));
        setModalData(prev => (prev && prev.id === updatedBooking.id) ? { ...prev, ...updatedBooking } : prev);
      }
    } catch (error) {
      console.error('Error checking in guest:', error);
    }
  };

  const handleCheckOut = async (bookingId) => {
    try {
      const bookingToUpdate = bookings.find(b => b.id === bookingId);
      if (!bookingToUpdate) throw new Error('Booking not found');
      const updatedData = { status: 'Confirmed', actualCheckOut: true };
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to check out');
      const updatedBooking = await res.json();
      if (updatedBooking?.id) {
        setBookings(prev => prev.map(b => b.id === updatedBooking.id ? { ...b, ...updatedBooking } : b));
        setModalData(prev => (prev && prev.id === updatedBooking.id) ? { ...prev, ...updatedBooking } : prev);
      }
    } catch (error) {
      console.error('Error checking out guest:', error);
    }
  };

  useEffect(() => {
    fetchBookings({ silent: false });
    fetchAmenities();
    fetchRooms(null, null, true); // Initial load flag
  }, []);

  // PUSHER: Real-time booking updates
  // Wrap fetchBookings in useCallback for use in Pusher hooks
  const refetchBookings = useCallback(() => {
    console.log('[Pusher] Received booking update, refreshing data...');
    fetchBookings({ silent: true });
  }, []);

  // Subscribe to booking events (new bookings, updates, cancellations)
  useBookingUpdates({
    onBookingCreated: (data) => {
      console.log('[Pusher] New booking created:', data.guestName);
      toastInfo(`New booking${data?.bookingId ? ` #${data.bookingId}` : ''} created`, { title: 'Live Update' });
      refetchBookings();
    },
    onBookingUpdated: (data) => {
      console.log('[Pusher] Booking updated:', data.bookingId);
      toastInfo(`Booking updated${data?.bookingId ? ` #${data.bookingId}` : ''}`, { title: 'Live Update' });
      refetchBookings();
    },
    onBookingCancelled: (data) => {
      console.log('[Pusher] Booking cancelled:', data.bookingId);
      toastWarning(`Booking cancelled${data?.bookingId ? ` #${data.bookingId}` : ''}`, { title: 'Live Update' });
      refetchBookings();
    },
    onCheckedIn: (data) => {
      console.log('[Pusher] Guest checked in:', data.guestName);
      toastSuccess(`${data?.guestName || 'Guest'} checked in`, { title: 'Live Update' });
      refetchBookings();
    },
    onCheckedOut: (data) => {
      console.log('[Pusher] Guest checked out:', data.bookingId);
      toastSuccess(`${data?.guestName || 'Guest'} checked out`, { title: 'Live Update' });
      refetchBookings();
    },
    onPaymentReceived: (data) => {
      console.log('[Pusher] Payment received:', data.guestName);
      toastSuccess(`Payment received${data?.bookingId ? ` for booking #${data.bookingId}` : ''}`, { title: 'Live Update' });
      refetchBookings();
    },
  });

  // Subscribe to receptionist-specific notifications
  useStaffNotifications('RECEPTIONIST', (notification) => {
    console.log('[Pusher] New notification:', notification.message);
    const notifType = String(notification?.type || '').toLowerCase();
    const notifMessage = notification?.message || 'New notification received';
    if (notifType.includes('cancel') || notifType.includes('denied') || notifType.includes('failed')) {
      toastWarning(notifMessage, { title: 'Live Notification' });
    } else if (notifType.includes('approved') || notifType.includes('verified') || notifType.includes('created') || notifType.includes('check')) {
      toastSuccess(notifMessage, { title: 'Live Notification' });
    } else {
      toastInfo(notifMessage, { title: 'Live Notification' });
    }
    // Refresh notifications panel
    loadNotifications();
  });

  useEffect(() => {
    if (bookings.length > 0) {
      updateNotifications(bookings);
      loadNotifications();
    }
  }, [bookings]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (roomSearchTimeoutRef.current) {
        clearTimeout(roomSearchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (createBookingForm.checkIn && createBookingForm.checkOut) {
      debouncedFetchRooms(createBookingForm.checkIn, createBookingForm.checkOut);
    }
  }, [createBookingForm.checkIn, createBookingForm.checkOut]);

  // Fetch initial availability data
  useEffect(() => {
    async function fetchAvailability() {
      try {
        const today = new Date();
        const startOfMonth = new Date(today);
        const endOf3Months = new Date(today.getFullYear(), today.getMonth() + 4, 0);
        const res = await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkIn: formatDate(startOfMonth),
            checkOut: formatDate(endOf3Months),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAvailabilityData(data.availability || {});
        }
      } catch (err) { console.error('Failed to load availability:', err); }
    }
    fetchAvailability();
    
    // Fetch disabled dates from super admin configuration
    async function fetchDisabledDates() {
      try {
        const res = await fetch('/api/booking-config/disabled-dates');
        if (res.ok) {
          const data = await res.json();
          // Extract date strings in yyyy-mm-dd format using UTC
          const dateStrings = data.map(d => {
            const utcDate = new Date(d.date);
            const year = utcDate.getUTCFullYear();
            const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(utcDate.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          });
          setDisabledDates(dateStrings);
        }
      } catch (err) { console.error('Failed to load disabled dates:', err); }
    }
    fetchDisabledDates();

    // Fetch rental amenities data for price breakdown
    async function fetchRentalAmenities() {
      try {
        const res = await fetch('/api/amenities/rental');
        if (res.ok) {
          const data = await res.json();
          setRentalAmenitiesData(data);
        }
      } catch (err) {
        console.error('Failed to load rental amenities:', err);
      }
    }
    fetchRentalAmenities();

    // Fetch optional amenities data for price breakdown
    async function fetchOptionalAmenities() {
      try {
        const res = await fetch('/api/amenities/optional');
        if (res.ok) {
          const data = await res.json();
          setOptionalAmenitiesData(data);
        }
      } catch (err) {
        console.error('Failed to load optional amenities:', err);
      }
    }
    fetchOptionalAmenities();
  }, []);

  // Live total calculation for create modal
  useEffect(() => {
    async function calculateCreateTotal() {
      if (!createBookingForm.checkIn || !createBookingForm.checkOut || !createBookingForm.rooms || createBookingForm.rooms.length === 0) {
        setCreateTotalPrice(0);
        return;
      }
      const nights = Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24));

      // Prepare rental amenities in expected format
      const rentalAmenitiesFormatted = {};
      for (const [id, selection] of Object.entries(createBookingForm.selectedAmenities.rental || {})) {
        rentalAmenitiesFormatted[id] = {
          quantity: selection.quantity || 0,
          hoursUsed: selection.hoursUsed || 0
        };
      }

      try {
        const res = await fetch('/api/bookings/calculate-total', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rooms: createBookingForm.rooms,
            nights,
            optionalAmenities: createBookingForm.selectedAmenities.optional || {},
            rentalAmenities: rentalAmenitiesFormatted,
            cottage: createBookingForm.selectedAmenities.cottage
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setCreateTotalPrice(data.totalPrice || 0);
        }
      } catch (error) {
        console.error("Create price calculation error:", error);
        setCreateTotalPrice(0);
      }
    }

    calculateCreateTotal();
  }, [createBookingForm.rooms, createBookingForm.selectedAmenities, createBookingForm.checkIn, createBookingForm.checkOut]);

  // Date validation
  useEffect(() => {
    if (!createBookingForm.checkIn) {
      setDateWarning('Please select a check-in date.');
    } else if (!createBookingForm.checkOut) {
      setDateWarning('Please select a check-out date. Single date selection is not allowed.');
    } else if (createBookingForm.checkIn === createBookingForm.checkOut) {
      setDateWarning('Check-out must be different from check-in.');
    } else {
      setDateWarning('');
    }
  }, [createBookingForm.checkIn, createBookingForm.checkOut]);

  // Animate dots in modal
  useEffect(() => {
    if (!showSubmitModal) {
      setDotCount(1);
      return;
    }
    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);
    return () => clearInterval(interval);
  }, [showSubmitModal]);

  // Fetch available rooms when dates change
  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (!createBookingForm.checkIn || !createBookingForm.checkOut || createBookingForm.checkIn === createBookingForm.checkOut) {
        setAvailableRooms([]);
        return;
      }
      setLoadingRooms(true);
      try {
        const res = await fetch(`/api/rooms?checkIn=${createBookingForm.checkIn}&checkOut=${createBookingForm.checkOut}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          setAvailableRooms(data.filter(room => room.remaining > 0));
        } else {
          setAvailableRooms([]);
        }
      } catch (error) {
        console.error('Failed to fetch available rooms:', error);
        setAvailableRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    };
    fetchAvailableRooms();
  }, [createBookingForm.checkIn, createBookingForm.checkOut]);

  // Price calculation
  useEffect(() => {
    const nights = createBookingForm.checkIn && createBookingForm.checkOut
      ? Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24))
      : 1;

    async function calculateTotal() {
      try {
        // Prepare rental amenities in expected format
        const rentalAmenitiesFormatted = {};
        for (const [id, selection] of Object.entries(createBookingForm.selectedAmenities.rental)) {
          rentalAmenitiesFormatted[id] = {
            quantity: selection.quantity || 0,
            hoursUsed: selection.hoursUsed || 0
          };
        }

        const res = await fetch('/api/bookings/calculate-total', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selectedRooms: createBookingForm.selectedRooms,
            nights,
            optionalAmenities: createBookingForm.selectedAmenities.optional,
            rentalAmenities: rentalAmenitiesFormatted,
            cottage: createBookingForm.selectedAmenities.cottage
          }),
        });
        if(res.ok) {
          const data = await res.json();
          setTotalPrice(data.totalPrice || 0);
        }
      } catch (error) {
        console.error("Price calculation error:", error);
      }
    }

    calculateTotal();
  }, [createBookingForm.selectedRooms, createBookingForm.selectedAmenities, createBookingForm.checkIn, createBookingForm.checkOut]);

  const getRoomCapacity = (roomType) => {
    switch (roomType) {
      case 'TEPEE':
        return { min: 1, max: 5 };
      case 'LOFT':
        return { min: 1, max: 3 };
      case 'VILLA':
        return { min: 1, max: 10 };
      default:
        return { min: 1, max: 100 };
    }
  };

  // compute total capacity from rooms array
  const computeTotalCapacity = () => {
    if (!createBookingForm.rooms || !Array.isArray(createBookingForm.rooms)) {
      return 0;
    }
    return createBookingForm.rooms.reduce((sum, roomData) => {
      return sum + roomData.adults + roomData.additionalPax + roomData.children;
    }, 0);
  };

  // is room lock active (other rooms locked when true)
  const isRoomLockActive = () => {
    const totalCap = computeTotalCapacity();
    return totalCap >= createBookingForm.numberOfGuests && createBookingForm.rooms && createBookingForm.rooms.length > 0;
  };

  // date selection validity: we treat single-date selection (checkOut empty OR checkOut === checkIn) as invalid
  const isDateSelectionValid = () => {
    if (!createBookingForm.checkIn) return false;
    if (!createBookingForm.checkOut) return false;
    if (createBookingForm.checkIn === createBookingForm.checkOut) return false;
    return true;
  };

  // Update room lock warning when selection changes
  useEffect(() => {
    if (isRoomLockActive()) {
      const totalCap = computeTotalCapacity();
      setRoomLockWarning(`Selected rooms now accommodate ${totalCap} guest(s). Other room options are locked to prevent over-selection.`);
    } else {
      setRoomLockWarning('');
    }
  }, [createBookingForm.selectedRooms, createBookingForm.numberOfGuests, availableRooms]);

  // Auto-refresh room availability when dates change
  useEffect(() => {
    if (isDateSelectionValid()) {
      debouncedFetchRooms(createBookingForm.checkIn, createBookingForm.checkOut);
    }
  }, [createBookingForm.checkIn, createBookingForm.checkOut]);

  const handleRoomSelect = (room) => {
    const locked = isRoomLockActive();
    const alreadySelected = !!createBookingForm.selectedRooms[room.id];
    if (locked && !alreadySelected) return;
    setCreateBookingForm(prev => {
      const selectedRooms = { ...prev.selectedRooms };
      if (selectedRooms[room.id]) {
        delete selectedRooms[room.id];
      } else {
        selectedRooms[room.id] = 1;
      }
      return { ...prev, selectedRooms };
    });
  };

  const handleRoomQuantityChange = (roomId, delta) => {
    const locked = isRoomLockActive();
    const isSelected = !!createBookingForm.selectedRooms[roomId];
    if (locked && !isSelected) return;
    setCreateBookingForm(prev => {
      const selectedRooms = { ...prev.selectedRooms };
      const currentQty = selectedRooms[roomId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      const room = availableRooms.find(r => r.id == roomId);
      if (room && newQty > room.remaining) {
        return prev;
      }
      if (newQty === 0) {
        delete selectedRooms[roomId];
      } else {
        selectedRooms[roomId] = newQty;
      }
      return { ...prev, selectedRooms };
    });
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container fade-in">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading Receptionist Dashboard...</p>
          <div style={{ marginTop: '2rem', width: '100%', maxWidth: '400px' }}>
            <div className="skeleton-text"></div>
            <div className="skeleton-text medium"></div>
            <div className="skeleton-text short"></div>
          </div>
        </div>
      </div>
    );
  }

  const configuredTotalRooms = allRooms.reduce((sum, room) => sum + (Number(room?.quantity) || 0), 0);
  // Resort baseline inventory: 4 Tepee + 4 Loft + 4 Villa + 1 Family Lodge = 13
  const totalRoomsCount = Math.max(configuredTotalRooms, 13);

  const occupiedRoomsCount = bookings
    .filter((b) => normalizeBookingStatus(b.status) === 'Confirmed')
    .reduce((sum, booking) => sum + getBookingAssignedUnits(booking), 0);

  const hasRemainingData = allRooms.some((room) => typeof room?.remaining === 'number');
  const availableRoomsCount = hasRemainingData
    ? allRooms.reduce((sum, room) => sum + (Number(room?.remaining) || 0), 0)
    : Math.max(totalRoomsCount - occupiedRoomsCount, 0);
  
  // Computed booking filters - show all non-cancelled bookings
  const activeBookings = bookings.filter(b => b.status !== 'Cancelled' && !b.isDeleted);
  const pendingBookings = activeBookings.filter(b => ['Held', 'Pending'].includes(normalizeBookingStatus(b.status)));
  const confirmedBookings = activeBookings.filter(b => normalizeBookingStatus(b.status) === 'Confirmed');
  const checkedInBookings = activeBookings.filter(b => !!b.actualCheckIn && !b.actualCheckOut && normalizeBookingStatus(b.status) !== 'Completed');
  const checkedOutBookings = activeBookings.filter(b => !!b.actualCheckOut && normalizeBookingStatus(b.status) !== 'Completed');
  const completedBookings = activeBookings.filter(b => normalizeBookingStatus(b.status) === 'Completed');
  const todaysReservationsCount = bookings.filter(
    (b) => !b.isDeleted && normalizeBookingStatus(b.status) !== 'Cancelled' && isSameLocalDate(b.createdAt)
  ).length;

  return (
    <div className="receptionist-layout">
      {/* Error Display */}
      {error && (
        <div className="error-banner" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#f8d7da',
          color: '#721c24',
          padding: '12px',
          textAlign: 'center',
          zIndex: 2000,
          borderBottom: '1px solid #f5c6cb'
        }}>
          <strong>Error:</strong> {error}
          <button 
            onClick={() => setError(null)}
            style={{
              marginLeft: '15px',
              background: 'none',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            ×
          </button>
        </div>
      )}
      
      {/* Loading Overlay - Only for major operations */}
      {(loading || loadingRooms) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1500,
          color: 'white',
          fontSize: '18px'
        }}>
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '20px 30px',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ marginBottom: '10px' }}>
              {loading && loadingRooms ? 'Loading application...' : 
               loading ? 'Loading bookings...' : 'Loading initial data...'}
            </div>
            <div style={{ 
              fontSize: '24px',
              animation: 'spin 1s linear infinite'
            }}>
              <RefreshCw size={22} />
            </div>
          </div>
        </div>
      )}
      
      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        <div className="navbar-left">
          <div className="brand-section">
            <div className="brand-copy">
              <span className="brand-text">Charkool</span>
              <span className="brand-subtitle">Beach Resort</span>
            </div>
          </div>
          

        </div>

        <div className="navbar-center">
        </div>

        <div className="navbar-right">
          <button 
            className="navbar-action-btn notifications" 
            title="Notifications"
            onClick={() => setShowNotificationPanel(!showNotificationPanel)}
          >
            <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            {(() => {
              const criticalCount = (notificationCategories.overdueCheckouts?.length || 0) + (notificationCategories.lateArrivals?.length || 0);
              const totalCount = (notifications.pendingCheckIns.length + notifications.pendingCheckOuts.length + notifications.pendingBookings + criticalCount);
              
              if (totalCount > 0) {
                return (
                  <span className={`notification-badge ${criticalCount > 0 ? 'critical' : 'urgent'}`}>
                    {totalCount}
                  </span>
                );
              }
              return null;
            })()}
          </button>

          <button
            className="navbar-action-btn shift-summary"
            onClick={generateShiftSummary}
            title="Generate Shift Summary"
          >
            <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </button>

          <div className="profile-section">
            <div className="profile-info">
              <span className="profile-name">Front Desk</span>
              <span className="profile-id">Resort Staff</span>
            </div>
            <div className="profile-avatar" onClick={toggleDropdown}>
              <svg className="profile-image" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 0114 0H3z" clipRule="evenodd" />
              </svg>
              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-item" onClick={() => { setIsDropdownOpen(false); setShowChangePassword(true); }}>
                    <Lock size={16} className="dropdown-icon" style={{ marginRight: '8px' }} />
                    Change Password
                  </div>
                  <div className="dropdown-item logout" onClick={handleSignOut}>
                    <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h3a1 1 0 000-2H4V5h2a1 1 0 000-2H3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                    </svg>
                    Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Dashboard Content */}
      <div className={`dashboard-container ${error ? 'with-error-banner' : ''}`} style={{ 
        paddingTop: '20px',
        position: 'relative'
      }}>
        {/* Welcome Section */}
        <div style={{
          background: 'linear-gradient(135deg, #c4871d 0%, #febe52 100%)',
          borderRadius: '16px',
          padding: '24px 32px',
          marginBottom: '24px',
          color: 'white',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-50%',
            width: '200px',
            height: '200px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '50%',
            filter: 'blur(60px)'
          }}></div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              marginBottom: '8px'
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User size={24} />
              </div>
              <div>
                <h2 style={{ 
                  margin: '0', 
                  fontSize: '28px',
                  fontWeight: '600'
                }}>
                  Welcome Receptionist, {session?.user?.name || 'User'}!
                </h2>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.2)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  marginTop: '4px'
                }}>
                  Front Desk Operations
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-header" style={{ 
          marginBottom: '30px',
          position: 'relative',
          zIndex: 2
        }}>
          <h1 className="dashboard-title" style={{ 
            marginBottom: '20px' 
          }}>Resort Receptionist Dashboard</h1>
          
          {/* Quick Action Panel */}
          <div className="quick-actions">
            <button 
              className="quick-action-btn arrivals" 
              title="View Pending Check-Ins"
              onClick={() => {
                handleFilterChange('pending');
                setSearchTerm('');
                setSortBy('checkIn');
                // Scroll to booking section
                document.querySelector('.booking-management')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 2L3 9l1.41 1.41L9 5.83V20h2V5.83l4.59 4.58L17 9l-7-7z" />
              </svg>
              <span className="action-label">Pending</span>
              {notifications.pendingCheckIns.length > 0 && (
                <span className="notification-badge">{notifications.pendingCheckIns.length}</span>
              )}
            </button>
            
            <button 
              className="quick-action-btn departures" 
              title="View Pending Check-Outs"
              onClick={() => {
                handleFilterChange('confirmed');
                setSearchTerm('');
                setSortBy('checkOut');
                // Scroll to booking section
                document.querySelector('.booking-management')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 18l7-7-1.41-1.41L11 14.17V0H9v14.17l-4.59-4.58L3 11l7 7z" />
              </svg>
              <span className="action-label">Confirmed</span>
              {notifications.pendingCheckOuts.length > 0 && (
                <span className="notification-badge">{notifications.pendingCheckOuts.length}</span>
              )}
            </button>
            
            <button 
              className="quick-action-btn guest-search" 
              title="Search Bookings"
              onClick={() => {
                // Focus on search input
                const searchInput = document.querySelector('.search-input');
                if (searchInput) {
                  searchInput.focus();
                  document.querySelector('.booking-management')?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <span className="action-label">Guest Search</span>
            </button>
            
            <button
              className="create-booking-btn"
              onClick={() => {
                openModal(MODALS.CREATE_BOOKING);
              }}
            >
              <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="action-label">New Booking</span>
            </button>
          </div>
        </div>

        {/* KPI Cards Section */}
        <div className="kpi-card-container">
        <div className="kpi-card occupied">
          <div className="kpi-card-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
          </div>
          <div className="kpi-card-content">
            <p className="kpi-card-title">Accommodations Occupied</p>
            <div className="kpi-card-metrics">
              <span className="kpi-card-metric">{occupiedRoomsCount}</span>
              <span className="kpi-card-total">/{totalRoomsCount}</span>
            </div>
            <div className="kpi-card-subtitle">
              {totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0}% Occupancy Rate
            </div>
          </div>
        </div>
        
        <div className="kpi-card available">
          <div className="kpi-card-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
            </svg>
          </div>
          <div className="kpi-card-content">
            <p className="kpi-card-title">Accommodations Available</p>
            <div className="kpi-card-metrics">
              <span className="kpi-card-metric">{availableRoomsCount}</span>
            </div>
            <div className="kpi-card-subtitle">
              Villas, Rooms & Cottages ready
            </div>
          </div>
        </div>
        
        <div className="kpi-card bookings">
          <div className="kpi-card-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="kpi-card-content">
            <p className="kpi-card-title">Today's Reservations</p>
            <div className="kpi-card-metrics">
              <span className="kpi-card-metric">
                {todaysReservationsCount}
              </span>
            </div>
            <div className="kpi-card-subtitle">
              Reservations created today
            </div>
          </div>
        </div>
        
        <div className="kpi-card revenue">
          <div className="kpi-card-icon">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="kpi-card-content">
            <p className="kpi-card-title">Pending Payments</p>
            <div className="kpi-card-metrics">
              <span className="kpi-card-metric">
                {bookings.filter(b => b.paymentStatus === 'Pending').length}
              </span>
            </div>
            <div className="kpi-card-subtitle">
              Requires immediate attention
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bookings Section */}
      <div className="recent-bookings-section">
        <div className="section-header">
          <h2 className="section-title">
            <svg className="section-icon" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
            Recent Bookings Made Today
          </h2>
          <div className="section-badge">
            {bookings.filter(b => {
              return isSameLocalDate(b.createdAt);
            }).length} bookings
          </div>
        </div>
        
        <div className="recent-bookings-grid">
          {bookings
            .filter(b => {
              return isSameLocalDate(b.createdAt);
            })
            .slice(0, 6)
            .map((booking, index) => (
              <div key={booking.id} className="recent-booking-card">
                <div className="booking-card-header">
                  <div className="booking-time">
                    {booking.createdAt ? 
                      new Date(booking.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
                      'Today'
                    }
                  </div>
                  <div className={`booking-status-dot ${booking.status?.toLowerCase() || 'pending'}`}></div>
                </div>
                
                <div className="booking-guest-name">
                  {booking.guestName || 'Unknown Guest'}
                </div>
                
                <div className="booking-card-details">
                  <div className="booking-detail-item">
                    <svg className="detail-icon" viewBox="0 0 16 16" fill="currentColor">
                      <path fillRule="evenodd" d="M4 2a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 12 2H4zm1 2.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5z"/>
                    </svg>
                    <span>{booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}) : 'TBD'}</span>
                  </div>
                  
                  <div className="booking-detail-item">
                    <svg className="detail-icon" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M7 14s-3-2-3-6a3 3 0 1 1 6 0c0 4-3 6-3 6z"/>
                      <path d="M7 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                    </svg>
                    <span>{getBookingPrimaryRoomLabel(booking)}</span>
                  </div>
                  
                  <div className="booking-detail-item">
                    <svg className="detail-icon" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M7 14s-3-2-3-6a3 3 0 1 1 6 0c0 4-3 6-3 6z"/>
                    </svg>
                    <span>{getBookingGuestCount(booking) || 'N/A'} guests</span>
                  </div>
                </div>
                
                <div className="booking-card-actions">
                  <button 
                    className="quick-view-btn"
                    onClick={() => openDetailsModal(booking)}
                    title="View Details"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Removed booking confirmation - only super admin and cashier can confirm bookings */}
                </div>
              </div>
            ))}
          
          {bookings.filter(b => {
            return isSameLocalDate(b.createdAt);
          }).length === 0 && (
            <div className="no-recent-bookings">
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <h3>No bookings made today</h3>
              <p>Recent bookings created today will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Notification Panel */}
      {showNotificationPanel && (
        <div className="notification-panel slide-up">
          <div className="notification-panel-header">
            <div className="notification-header-title">
              <Bell size={16} />
              <span>Live Notifications</span>
            </div>
            <div className="notification-header-actions">
              <span className="notification-header-count">
                {(notificationCategories.overdueCheckouts?.length || 0)
                  + (notificationCategories.lateArrivals?.length || 0)
                  + (notifications.pendingCheckIns?.length || 0)
                  + (notifications.pendingCheckOuts?.length || 0)
                  + (notifications.pendingBookings || 0)}
              </span>
              <button
                className="notification-close-btn"
                onClick={() => setShowNotificationPanel(false)}
                aria-label="Close notifications"
              >
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="notification-panel-content">
            {/* High Priority Notifications */}
            {notificationCategories.overdueCheckouts?.map((booking, index) => (
              <div key={`overdue-checkout-${index}`} className="notification-item critical">
                <svg className="notification-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="notification-content">
                  <div className="notification-title">OVERDUE CHECKOUT</div>
                  <div className="notification-message">
                    {booking.guestName} - Should have checked out
                  </div>
                  <button 
                    className="notification-action-btn urgent"
                    onClick={() => {
                      openModal(MODALS.DETAILS, booking);
                      setShowNotificationPanel(false);
                    }}
                  >
                    Handle Now
                  </button>
                </div>
              </div>
            ))}

            {notificationCategories.lateArrivals?.map((booking, index) => (
              <div key={`late-arrival-${index}`} className="notification-item urgent">
                <svg className="notification-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <div className="notification-content">
                  <div className="notification-title">Late Arrival</div>
                  <div className="notification-message">
                    {booking.guestName} - Expected arrival past 3 PM
                  </div>
                  <button 
                    className="notification-action-btn"
                    onClick={() => {
                      openModal(MODALS.DETAILS, booking);
                      setShowNotificationPanel(false);
                    }}
                  >
                    Contact Guest
                  </button>
                </div>
              </div>
            ))}

            {/* Regular Check-ins */}
            {notifications.pendingCheckIns.map((booking, index) => (
              <div key={`checkin-${index}`} className="notification-item urgent">
                <svg className="notification-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <div className="notification-content">
                  <div className="notification-title">Guest Arrival Pending</div>
                  <div className="notification-message">
                    {booking.guestName} - Accommodation ready for check-in
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button 
                      className="notification-action-btn primary"
                      onClick={() => openCheckActionModal('checkin', booking)}
                    >
                      Check In
                    </button>
                    <button 
                      className="notification-action-btn"
                      onClick={() => {
                        openModal(MODALS.DETAILS, booking);
                        setShowNotificationPanel(false);
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Regular Check-outs */}
            {notifications.pendingCheckOuts.map((booking, index) => (
              <div key={`checkout-${index}`} className="notification-item">
                <svg className="notification-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <div className="notification-content">
                  <div className="notification-title">Guest Departure Due</div>
                  <div className="notification-message">
                    {booking.guestName} - Departure scheduled for today
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button 
                      className="notification-action-btn primary"
                      onClick={() => openCheckActionModal('checkout', booking)}
                    >
                      Check Out
                    </button>
                    <button 
                      className="notification-action-btn"
                      onClick={() => {
                        openModal(MODALS.DETAILS, booking);
                        setShowNotificationPanel(false);
                      }}
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {notifications.pendingBookings > 0 && (
              <div className="notification-item success">
                <svg className="notification-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <div className="notification-content">
                  <div className="notification-title">Upcoming Reservations</div>
                  <div className="notification-message">
                    {notifications.pendingBookings} reservations scheduled for tomorrow
                  </div>
                </div>
              </div>
            )}
            
            {bookings.filter(b => b.paymentStatus === 'Pending').length > 0 && (
              <div className="notification-item urgent">
                <svg className="notification-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <div className="notification-content">
                  <div className="notification-title">Payment Required</div>
                  <div className="notification-message">
                    {bookings.filter(b => b.paymentStatus === 'Pending').length} payments pending
                  </div>
                </div>
              </div>
            )}
            
            {notifications.pendingCheckIns.length === 0 && 
             notifications.pendingCheckOuts.length === 0 && 
             notifications.pendingBookings === 0 && 
             bookings.filter(b => b.paymentStatus === 'Pending').length === 0 && (
              <div className="notification-item">
                <svg className="notification-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="notification-content">
                  <div className="notification-title">All Clear!</div>
                  <div className="notification-message">
                    No urgent notifications at this time
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen(MODALS.CREATE_BOOKING) && (
        <div
          className="create-booking-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '10px',
          }}
        >
          <div
            className="create-booking-modal"
            style={{
              backgroundColor: '#FFF8E1',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '1240px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(251, 190, 82, 0.5)',
              padding: '20px',
              color: '#5a3e00',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <h2 style={{ marginBottom: '20px', color: '#FEBE52' }}>Create Walk-In Reservation</h2>
            {/* Multi-step booking form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (submittingRef.current) return;

                // Validation: Required name fields
                if (!createBookingForm.firstName?.trim()) {
                  showAlert('Validation Error', 'First name is required.', 'error');
                  return;
                }
                
                if (!createBookingForm.lastName?.trim()) {
                  showAlert('Validation Error', 'Last name is required.', 'error');
                  return;
                }

                // Validation: Number of guests
                if (createBookingForm.numberOfGuests < 1) {
                  showAlert('Validation Error', 'Number of guests must be at least 1.', 'error');
                  return;
                }

                // Validation: date validity
                if (!isDateSelectionValid()) {
                  showAlert('Validation Error', 'Please select both check-in and check-out dates (single date selection is not allowed).', 'error');
                  return;
                }

                // Validation: Check-in date not in the past
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const checkInDate = new Date(createBookingForm.checkIn);
                if (checkInDate < today) {
                  showAlert('Validation Error', 'Check-in date cannot be in the past.', 'error');
                  return;
                }

                // Validation: Check-out after check-in
                const checkOutDate = new Date(createBookingForm.checkOut);
                if (checkOutDate <= checkInDate) {
                  showAlert('Validation Error', 'Check-out date must be after check-in date.', 'error');
                  return;
                }

                // Validation: selected rooms exist (use new format)
                if (!createBookingForm.rooms || createBookingForm.rooms.length === 0) {
                  showAlert('Validation Error', 'Please select at least one room.', 'error');
                  return;
                }

                // NEW: Validation - all rooms configured
                const totalGuests = createBookingForm.rooms.reduce((sum, r) => 
                  sum + r.adults + r.additionalPax + r.children, 0
                );
                
                if (totalGuests < 1) {
                  showAlert('Validation Error', 'Please configure guest count for all rooms.', 'error');
                  return;
                }

                // Validation: selected rooms exist (check both formats)
                const hasRooms = (createBookingForm.rooms && createBookingForm.rooms.length > 0) || Object.keys(createBookingForm.selectedRooms).length > 0;
                if (!hasRooms) {
                  showAlert('Validation Error', 'Please select at least one room.', 'error');
                  return;
                }

                // Validation: capacity meets guests
                const totalCapacity = computeTotalCapacity();
                if (totalCapacity < createBookingForm.numberOfGuests) {
                  showAlert('Capacity Error', `Selected rooms can accommodate ${totalCapacity} guest(s), but you have ${createBookingForm.numberOfGuests} guests. Add more rooms or decrease guest count.`, 'error');
                  return;
                }

                submittingRef.current = true;
                setShowSubmitModal(true);
                try {
                  const nights = Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24));

                  // Prepare rental amenities in expected format
                  const rental = {};
                  for (const [id, selection] of Object.entries(createBookingForm.selectedAmenities.rental || {})) {
                    rental[id] = {
                      quantity: selection.quantity || 0,
                      hoursUsed: selection.hoursUsed || 0
                    };
                  }

                  const optional = createBookingForm.selectedAmenities.optional || {};
                  const cottage = createBookingForm.selectedAmenities.cottage;

                  // Combine the name fields for submission
                  const guestName = `${createBookingForm.firstName}${createBookingForm.middleName ? ' ' + createBookingForm.middleName : ''} ${createBookingForm.lastName}`.trim();

                  // Prepare payload with new rooms format
                  const payload = {
                    guestName,
                    checkIn: createBookingForm.checkIn,
                    checkOut: createBookingForm.checkOut,
                    // Always persist the actual configured guest count from room allocations.
                    numberOfGuests: totalGuests,
                    paymentMode: createBookingForm.paymentMode,
                    optional,
                    rental,
                    cottage,
                    nights,
                    status: 'Pending', // Receptionist creates pending bookings
                    paymentStatus: 'Pending',
                    rooms: createBookingForm.rooms
                  };

                  const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });

                  // Handle network or server errors
                  if (!response.ok) {
                    let errorMessage = 'Failed to create booking';
                    
                    try {
                      const errorData = await response.json();
                      
                      // Check for specific error types
                      if (errorData.error) {
                        if (errorData.error.includes('inventory') || errorData.error.includes('stock')) {
                          errorMessage = `❌ Inventory Error: ${errorData.error}. Please check amenity availability.`;
                        } else if (errorData.error.includes('available') || errorData.error.includes('capacity')) {
                          errorMessage = `❌ Availability Error: ${errorData.error}. Room may have been booked by another user.`;
                        } else {
                          errorMessage = errorData.error;
                        }
                      }
                    } catch (parseErr) {
                      // If error response isn't JSON, use status-based message
                      if (response.status === 400) {
                        errorMessage = 'Invalid booking data. Please check all fields.';
                      } else if (response.status === 409) {
                        errorMessage = 'Rooms are no longer available. Please select different dates or rooms.';
                      } else if (response.status === 500) {
                        errorMessage = 'Server error occurred. Please try again or contact support.';
                      }
                    }
                    
                    throw new Error(errorMessage);
                  }

                  const newBookingData = await response.json();
                  const createdBooking = newBookingData?.booking || newBookingData;
                  const createdBookingId = createdBooking?.id;
                  setBookings([...bookings, createdBooking]);

                  showAlert(
                    'Walk-in Created',
                    createdBookingId
                      ? `Booking #${createdBookingId} created and handed off to cashier for payment.`
                      : 'Walk-in booking created and handed off to cashier for payment.',
                    'success'
                  );

                  // Reset form with new structure
                  closeModal();
                  setCreateBookingStep(1);
                  setCreateBookingForm({
                    firstName: '',
                    middleName: '',
                    lastName: '',
                    checkIn: '',
                    checkOut: '',
                    numberOfGuests: 1,
                    paymentMode: 'cash',
                    selectedRooms: {},
                    rooms: [],
                    selectedRoomDetails: {},
                    selectedAmenities: { optional: {}, rental: {}, cottage: null },
                  });
                  await fetchBookings();
                } catch (err) {
                  console.error('❌ Booking Error:', err);
                  
                  // Provide user-friendly error messages
                  if (err.message.includes('fetch')) {
                    showAlert('Network Error', 'Please check your connection and try again.', 'error');
                  } else if (err.message.includes('Inventory') || err.message.includes('Availability')) {
                    showAlert('Booking Error', err.message, 'error'); // Already formatted
                  } else {
                    showAlert('Booking Failed', err.message, 'error');
                  }
                } finally {
                  submittingRef.current = false;
                  setShowSubmitModal(false);
                }
              }}
            >
              {createBookingStep === 1 && (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <div className="walkin-step1-grid" style={{ marginBottom: '20px' }}>
                      <div className="walkin-calendar-col">
                        {/* Left side - Calendar */}
                        <BookingCalendar
                          availabilityData={availabilityData}
                          disabledDates={disabledDates}
                          minLeadDays={0}
                          onDateChange={({ checkInDate, checkOutDate }) => {
                            setCreateBookingForm(prev => ({
                              ...prev,
                              checkIn: checkInDate ? formatDate(checkInDate) : '',
                              checkOut: checkOutDate ? formatDate(checkOutDate) : ''
                            }));
                          }}
                          checkIn={createBookingForm.checkIn ? new Date(createBookingForm.checkIn) : null}
                          checkOut={createBookingForm.checkOut ? new Date(createBookingForm.checkOut) : null}
                        />
                      </div>
                      
                      <div className="walkin-info-col">
                        {/* Right side - Guest Info and Dates */}
                        <div className="walkin-guest-panel" style={{ 
                          backgroundColor: '#FFF7ED',
                          padding: '15px',
                          borderRadius: '8px',
                          border: '1px solid rgba(254, 190, 82, 0.3)'
                        }}>
                          <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                              Guest Information
                            </label>
                            
                            {/* First Name */}
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#374151' }}>
                                First Name <span style={{ color: 'red' }}>*</span>
                              </label>
                              <input
                                type="text"
                                name="firstName"
                                value={createBookingForm.firstName}
                                onChange={(e) => setCreateBookingForm(prev => ({ ...prev, firstName: e.target.value }))}
                                required
                                placeholder="Enter first name"
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  border: '1px solid #ccc',
                                  fontSize: '14px'
                                }}
                              />
                            </div>

                            {/* Middle Name */}
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#374151' }}>
                                Middle Name (Optional)
                              </label>
                              <input
                                type="text"
                                name="middleName"
                                value={createBookingForm.middleName}
                                onChange={(e) => setCreateBookingForm(prev => ({ ...prev, middleName: e.target.value }))}
                                placeholder="Enter middle name"
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  border: '1px solid #ccc',
                                  fontSize: '14px'
                                }}
                              />
                            </div>

                            {/* Last Name */}
                            <div style={{ marginBottom: '10px' }}>
                              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#374151' }}>
                                Last Name <span style={{ color: 'red' }}>*</span>
                              </label>
                              <input
                                type="text"
                                name="lastName"
                                value={createBookingForm.lastName}
                                onChange={(e) => setCreateBookingForm(prev => ({ ...prev, lastName: e.target.value }))}
                                required
                                placeholder="Enter last name"
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  border: '1px solid #ccc',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '15px' }}>
                            {/* Payment Mode */}
                            <div>
                              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                                Payment Mode <span style={{ color: 'red' }}>*</span>
                              </label>
                              <select
                                name="paymentMode"
                                value={createBookingForm.paymentMode}
                                onChange={(e) => setCreateBookingForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                                required
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  border: '1px solid #ccc',
                                }}
                              >
                                <option value="cash">Cash</option>
                                <option value="gcash">GCash</option>
                                <option value="card">Card</option>
                                <option value="bank_transfer">Bank Transfer</option>
                              </select>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ flex: '1' }}>
                              <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Check-in:</p>
                              <div style={{ 
                                padding: '8px', 
                                backgroundColor: '#fff',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}>
                                {createBookingForm.checkIn ? new Date(createBookingForm.checkIn).toLocaleDateString() : 'Select date'}
                              </div>
                            </div>
                            <div style={{ flex: '1' }}>
                              <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Check-out:</p>
                              <div style={{ 
                                padding: '8px', 
                                backgroundColor: '#fff',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}>
                                {createBookingForm.checkOut ? new Date(createBookingForm.checkOut).toLocaleDateString() : 'Select date'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {dateWarning && (
                          <div style={{ 
                            color: '#856404', 
                            backgroundColor: '#fff3cd', 
                            padding: '10px', 
                            borderRadius: '4px',
                            marginTop: '10px',
                            border: '1px solid #ffeeba',
                            fontSize: '14px'
                          }}>
                            {dateWarning}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Room Selection Below Calendar - NEW FORMAT */}
                    {!dateWarning && createBookingForm.checkIn && createBookingForm.checkOut && (
                      <div style={{ marginTop: '20px' }}>
                        <h3 style={{ marginBottom: '15px', color: '#5a3e00' }}>Select Rooms for Walk-in Guest</h3>
                        {loadingRooms ? (
                          <div style={{ position: 'relative', height: '100px' }}>
                            <Loading size="medium" text="Loading rooms..." />
                          </div>
                        ) : availableRooms.length === 0 ? (
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '20px',
                            color: '#6b7280',
                            background: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px dashed #d1d5db'
                          }}>
                            <p style={{ margin: 0, fontSize: '14px' }}>No rooms available for the selected dates.</p>
                            <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.8 }}>Try selecting different dates.</p>
                          </div>
                        ) : (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                            gap: '20px' 
                          }}>
                            {availableRooms
                              .filter(room => room.type !== 'FAMILY_LODGE')
                              .map((room) => {
                              // Count how many instances of this room are already added
                              const roomInstances = (createBookingForm.rooms || []).filter(r => r.roomId === room.id);
                              const isFull = room.remaining <= 0;
                              const hasInstances = roomInstances.length > 0;
                              const allInstancesAdded = roomInstances.length >= room.remaining;
                              
                              const roomCapacity = room.type === 'TEPEE' ? 5 : room.type === 'LOFT' ? 3 : room.type === 'VILLA' ? 10 : 1;

                              return (
                                <div
                                  key={room.id}
                                  style={{
                                    border: hasInstances ? '2px solid #FEBE52' : '1px solid #d1d5db',
                                    borderRadius: '12px',
                                    padding: '0',
                                    backgroundColor: 'white',
                                    cursor: isFull ? 'not-allowed' : 'pointer',
                                    opacity: isFull ? 0.5 : 1,
                                    transition: 'all 0.2s ease',
                                    overflow: 'hidden',
                                    position: 'relative'
                                  }}
                                >
                                  <div style={{ position: 'relative' }}>
                                    <img 
                                      src={room.image || '/images/default-room.jpg'} 
                                      alt={room.name}
                                      style={{
                                        width: '100%',
                                        height: '140px',
                                        objectFit: 'cover'
                                      }}
                                    />
                                    {/* Availability Badge */}
                                    <span style={{
                                      position: 'absolute',
                                      top: '8px',
                                      right: '8px',
                                      backgroundColor: isFull ? '#ef4444' : room.remaining <= 3 ? '#f59e0b' : '#10b981',
                                      color: 'white',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}>
                                      {isFull ? 'Full' : `${room.remaining - roomInstances.length} left`}
                                    </span>
                                    {/* Selected Count Indicator */}
                                    {hasInstances && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        left: '8px',
                                        backgroundColor: '#FEBE52',
                                        color: 'white',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                                      }}>
                                        {roomInstances.length}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ padding: '12px' }}>
                                    <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                                      {room.name}
                                    </h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                                      {/* Room Type Tag */}
                                      <span style={{
                                        backgroundColor: '#e5e7eb',
                                        color: '#374151',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        textTransform: 'uppercase'
                                      }}>
                                        {room.type}
                                      </span>
                                      {/* Capacity Tag */}
                                      <span style={{
                                        backgroundColor: '#dbeafe',
                                        color: '#1e40af',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                      }}>
                                        <Users size={12} /> {roomCapacity} guests
                                      </span>
                                    </div>
                                    {/* Price */}
                                    <p style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold', color: '#FEBE52' }}>
                                      ₱{(room.price / 100).toLocaleString()}<span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280' }}>/night</span>
                                    </p>
                                    
                                    {/* Add Room Button */}
                                    {!isFull && !allInstancesAdded && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const capacity = getRoomCapacityDetails(room.type);
                                          const instanceNumber = roomInstances.length + 1;
                                          setCreateBookingForm(prev => ({
                                            ...prev,
                                            rooms: [...prev.rooms, {
                                              roomId: room.id,
                                              instanceNumber,
                                              unitNumber: null,
                                              adults: 1,
                                              additionalPax: 0,
                                              children: 0,
                                              optionalAmenities: {},
                                              rentalAmenities: {}
                                            }]
                                          }));
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '8px',
                                          backgroundColor: '#FEBE52',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '6px',
                                          fontWeight: '600',
                                          cursor: 'pointer',
                                          fontSize: '14px'
                                        }}
                                      >
                                        + Add Room
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Room Configuration Panel - NEW */}
                        {createBookingForm.rooms && createBookingForm.rooms.length > 0 && (
                          <div style={{ marginTop: '30px' }}>
                            <h3 style={{ marginBottom: '15px', color: '#5a3e00' }}>Configure Room Details</h3>
                            <div style={{ display: 'grid', gap: '15px' }}>
                              {createBookingForm.rooms.map((roomData, idx) => {
                                const room = availableRooms.find(r => r.id === roomData.roomId);
                                if (!room) return null;
                                
                                const capacity = getRoomCapacityDetails(room.type);
                                const roomTypeName = room.type === 'LOFT' ? 'Loft' : room.type === 'TEPEE' ? 'Tepee' : room.type === 'VILLA' ? 'Villa' : room.name;
                                const additionalPaxFee = 400; // ₱400 per additional pax
                                
                                return (
                                  <div
                                    key={`${roomData.roomId}-${roomData.instanceNumber}`}
                                    style={{
                                      backgroundColor: 'white',
                                      border: '2px solid #FEBE52',
                                      borderRadius: '12px',
                                      padding: '15px',
                                      position: 'relative'
                                    }}
                                  >
                                    {/* Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                      <h4 style={{ margin: 0, color: '#5a3e00' }}>
                                        {roomTypeName} #{roomData.instanceNumber}
                                      </h4>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCreateBookingForm(prev => ({
                                            ...prev,
                                            rooms: prev.rooms.filter(r => !(r.roomId === roomData.roomId && r.instanceNumber === roomData.instanceNumber))
                                          }));
                                        }}
                                        style={{
                                          padding: '4px 8px',
                                          backgroundColor: '#ef4444',
                                          color: 'white',
                                          border: 'none',
                                          borderRadius: '4px',
                                          cursor: 'pointer',
                                          fontSize: '12px'
                                        }}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                    
                                    {/* Room Unit Selector */}
                                    <div style={{ marginBottom: '15px' }}>
                                      <RoomUnitSelector
                                        roomId={room.id}
                                        roomType={room.type}
                                        checkIn={createBookingForm.checkIn}
                                        checkOut={createBookingForm.checkOut}
                                        selectedUnit={roomData.unitNumber}
                                        onUnitSelect={(unitNumber) => {
                                          setCreateBookingForm(prev => ({
                                            ...prev,
                                            rooms: prev.rooms.map(r => 
                                              r.roomId === roomData.roomId && r.instanceNumber === roomData.instanceNumber
                                                ? { ...r, unitNumber }
                                                : r
                                            )
                                          }));
                                        }}
                                      />
                                    </div>
                                    
                                    {/* Guest Configuration */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '15px' }}>
                                      {/* Adults */}
                                      <div>
                                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '600' }}>
                                          Adults (max {capacity.base})
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCreateBookingForm(prev => ({
                                                ...prev,
                                                rooms: prev.rooms.map(r => 
                                                  r.roomId === roomData.roomId && r.instanceNumber === roomData.instanceNumber
                                                    ? {
                                                        ...r,
                                                        adults: Math.max(1, r.adults - 1),
                                                        // Extra pax is allowed only when adults is at base max.
                                                        additionalPax: Math.max(1, r.adults - 1) < capacity.base ? 0 : r.additionalPax,
                                                      }
                                                    : r
                                                )
                                              }));
                                            }}
                                            disabled={roomData.adults <= 1}
                                            style={{
                                              padding: '4px 8px',
                                              backgroundColor: '#FEBE52',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: roomData.adults <= 1 ? 'not-allowed' : 'pointer',
                                              opacity: roomData.adults <= 1 ? 0.5 : 1
                                            }}
                                          >
                                            −
                                          </button>
                                          <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                                            {roomData.adults}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCreateBookingForm(prev => ({
                                                ...prev,
                                                rooms: prev.rooms.map(r => 
                                                  r.roomId === roomData.roomId && r.instanceNumber === roomData.instanceNumber
                                                    ? { ...r, adults: Math.min(capacity.base, r.adults + 1) }
                                                    : r
                                                )
                                              }));
                                            }}
                                            disabled={roomData.adults >= capacity.base}
                                            style={{
                                              padding: '4px 8px',
                                              backgroundColor: '#FEBE52',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: roomData.adults >= capacity.base ? 'not-allowed' : 'pointer',
                                              opacity: roomData.adults >= capacity.base ? 0.5 : 1
                                            }}
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                      
                                      {/* Additional Pax */}
                                      <div>
                                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '600' }}>
                                          Extra Pax (max {capacity.additionalPaxMax})
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCreateBookingForm(prev => ({
                                                ...prev,
                                                rooms: prev.rooms.map(r => 
                                                  r.roomId === roomData.roomId && r.instanceNumber === roomData.instanceNumber
                                                    ? { ...r, additionalPax: Math.max(0, r.additionalPax - 1) }
                                                    : r
                                                )
                                              }));
                                            }}
                                            disabled={roomData.additionalPax <= 0}
                                            style={{
                                              padding: '4px 8px',
                                              backgroundColor: '#FEBE52',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: roomData.additionalPax <= 0 ? 'not-allowed' : 'pointer',
                                              opacity: roomData.additionalPax <= 0 ? 0.5 : 1
                                            }}
                                          >
                                            −
                                          </button>
                                          <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                                            {roomData.additionalPax}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (roomData.adults < capacity.base) return;
                                              setCreateBookingForm(prev => ({
                                                ...prev,
                                                rooms: prev.rooms.map(r => 
                                                  r.roomId === roomData.roomId && r.instanceNumber === roomData.instanceNumber
                                                    ? { ...r, additionalPax: Math.min(capacity.additionalPaxMax, r.additionalPax + 1) }
                                                    : r
                                                )
                                              }));
                                            }}
                                            disabled={roomData.adults < capacity.base || roomData.additionalPax >= capacity.additionalPaxMax}
                                            style={{
                                              padding: '4px 8px',
                                              backgroundColor: '#FEBE52',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: (roomData.adults < capacity.base || roomData.additionalPax >= capacity.additionalPaxMax) ? 'not-allowed' : 'pointer',
                                              opacity: (roomData.adults < capacity.base || roomData.additionalPax >= capacity.additionalPaxMax) ? 0.5 : 1
                                            }}
                                          >
                                            +
                                          </button>
                                        </div>
                                        {roomData.adults < capacity.base && (
                                          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                                            Reach max adults first to enable extra pax.
                                          </div>
                                        )}
                                        {roomData.additionalPax > 0 && (
                                          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
                                            +₱{(additionalPaxFee * roomData.additionalPax).toLocaleString()}/night
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Children */}
                                      <div>
                                        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', fontWeight: '600' }}>
                                          Children (max {capacity.childrenMax || 2})
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCreateBookingForm(prev => ({
                                                ...prev,
                                                rooms: prev.rooms.map(r => 
                                                  r.roomId === roomData.roomId && r.instanceNumber === roomData.instanceNumber
                                                    ? { ...r, children: Math.max(0, r.children - 1) }
                                                    : r
                                                )
                                              }));
                                            }}
                                            disabled={roomData.children <= 0}
                                            style={{
                                              padding: '4px 8px',
                                              backgroundColor: '#FEBE52',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: roomData.children <= 0 ? 'not-allowed' : 'pointer',
                                              opacity: roomData.children <= 0 ? 0.5 : 1
                                            }}
                                          >
                                            −
                                          </button>
                                          <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>
                                            {roomData.children}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setCreateBookingForm(prev => ({
                                                ...prev,
                                                rooms: prev.rooms.map(r => 
                                                  r.roomId === roomData.roomId && r.instanceNumber === roomData.instanceNumber
                                                    ? { ...r, children: Math.min(capacity.childrenMax || 2, r.children + 1) }
                                                    : r
                                                )
                                              }));
                                            }}
                                            disabled={roomData.children >= (capacity.childrenMax || 2)}
                                            style={{
                                              padding: '4px 8px',
                                              backgroundColor: '#FEBE52',
                                              color: 'white',
                                              border: 'none',
                                              borderRadius: '4px',
                                              cursor: roomData.children >= (capacity.childrenMax || 2) ? 'not-allowed' : 'pointer',
                                              opacity: roomData.children >= (capacity.childrenMax || 2) ? 0.5 : 1
                                            }}
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Summary */}
                                    <div style={{ padding: '8px', backgroundColor: '#FFF7ED', borderRadius: '6px', fontSize: '12px' }}>
                                      <strong>Room Summary:</strong> {roomData.adults} Adult{roomData.adults !== 1 ? 's' : ''}
                                      {roomData.additionalPax > 0 && ` + ${roomData.additionalPax} Extra`}
                                      {roomData.children > 0 && `, ${roomData.children} ${roomData.children === 1 ? 'Child' : 'Children'}`}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              {createBookingStep === 2 && (
                <>
                  <h3 style={{ color: '#5a3e00', marginBottom: '20px' }}>Optional & Rental Amenities</h3>
                  <div style={{ 
                    backgroundColor: '#FFF8E1',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(251, 190, 82, 0.3)'
                  }}>
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ color: '#5a3e00', marginBottom: '15px' }}>Selected Rooms:</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {(createBookingForm.rooms || []).map((roomData) => {
                          const room = availableRooms.find(r => r.id === roomData.roomId);
                          if (!room) return null;
                          const roomTypeName = room.type === 'LOFT' ? 'Loft' : room.type === 'TEPEE' ? 'Tepee' : room.type === 'VILLA' ? 'Villa' : room.name;
                          return (
                            <div key={`selected-room-${roomData.roomId}-${roomData.instanceNumber}`} style={{
                              padding: '8px 12px',
                              backgroundColor: 'rgba(251, 190, 82, 0.1)',
                              borderRadius: '6px',
                              border: '1px solid rgba(251, 190, 82, 0.3)',
                              fontSize: '14px'
                            }}>
                              {roomTypeName} #{roomData.instanceNumber} ({roomData.adults} adults
                              {roomData.additionalPax > 0 && ` +${roomData.additionalPax} extra`}
                              {roomData.children > 0 && `, ${roomData.children} ${roomData.children === 1 ? 'child' : 'children'}`})
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                      {/* Optional Amenities */}
                      <div>
                        <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Optional Amenities:</h4>
                        <OptionalAmenitiesSelector
                          selectedAmenities={createBookingForm.selectedAmenities.optional}
                          onAmenitiesChange={(newOptional) => setCreateBookingForm(prev => ({ 
                            ...prev, 
                            selectedAmenities: {
                              ...prev.selectedAmenities,
                              optional: newOptional
                            }
                          }))}
                        />
                      </div>

                      {/* Rental Amenities */}
                      <div>
                        <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Rental Amenities:</h4>
                        <RentalAmenitiesSelector
                          selectedAmenities={createBookingForm.selectedAmenities.rental}
                          onAmenitiesChange={(newRental) => setCreateBookingForm(prev => ({ 
                            ...prev, 
                            selectedAmenities: {
                              ...prev.selectedAmenities,
                              rental: newRental
                            }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {createBookingStep === 3 && (
                <>
                  <h3 style={{ color: '#5a3e00', marginBottom: '20px' }}>Booking Summary</h3>
                  <div style={{ 
                    backgroundColor: '#FFF8E1',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(251, 190, 82, 0.3)'
                  }}>
                    {/* Guest Information */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Guest Information</h4>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        <div>
                          <strong>Guest Name:</strong> {createBookingForm.firstName} {createBookingForm.middleName && createBookingForm.middleName + ' '}{createBookingForm.lastName}
                        </div>
                        <div>
                          <strong>Total Guests:</strong> {createBookingForm.rooms.reduce((sum, r) => sum + r.adults + r.additionalPax + r.children, 0)}
                        </div>
                        <div>
                          <strong>Payment Mode:</strong> {createBookingForm.paymentMode.charAt(0).toUpperCase() + createBookingForm.paymentMode.slice(1).replace('_', ' ')}
                        </div>
                        <div>
                          <strong>Check-in:</strong> {new Date(createBookingForm.checkIn).toLocaleDateString()}
                        </div>
                        <div>
                          <strong>Check-out:</strong> {new Date(createBookingForm.checkOut).toLocaleDateString()}
                        </div>
                        <div>
                          <strong>Duration:</strong> {Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24))} nights
                        </div>
                      </div>
                    </div>

                    {/* Selected Rooms */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Selected Rooms</h4>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {(createBookingForm.rooms || []).map((roomData) => {
                          const room = availableRooms.find(r => r.id === roomData.roomId);
                          if (!room) return null;
                          const roomTypeName = room.type === 'LOFT' ? 'Loft' : room.type === 'TEPEE' ? 'Tepee' : room.type === 'VILLA' ? 'Villa' : room.name;
                          return (
                            <div key={`summary-room-${roomData.roomId}-${roomData.instanceNumber}`} style={{
                              padding: '12px',
                              backgroundColor: 'white',
                              borderRadius: '6px',
                              border: '1px solid rgba(251, 190, 82, 0.3)'
                            }}>
                              <strong>{roomTypeName} #{roomData.instanceNumber}</strong>
                              <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                • {roomData.adults} Adult{roomData.adults !== 1 ? 's' : ''}
                                {roomData.additionalPax > 0 && ` + ${roomData.additionalPax} Additional Pax (₱${(400 * roomData.additionalPax).toLocaleString()}/night)`}
                                {roomData.children > 0 && `\n• ${roomData.children} ${roomData.children === 1 ? 'Child' : 'Children'}`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selected Amenities */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ color: '#92400E', marginBottom: '10px' }}>Selected Amenities</h4>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        {/* Optional Amenities */}
                        {Object.entries(createBookingForm.selectedAmenities.optional || {}).some(([_, qty]) => qty > 0) && (
                          <div>
                            <strong>Optional Amenities:</strong>
                            <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                              {Object.entries(createBookingForm.selectedAmenities.optional).map(([amenityId, quantity]) => {
                                if (!quantity) return null;
                                const amenity = optionalAmenitiesData.find(a => a.id === parseInt(amenityId));
                                const amenityName = amenity ? amenity.name : `Optional Amenity ${amenityId}`;
                                return (
                                  <li key={amenityId}>{amenityName} x{quantity}</li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Rental Amenities */}
                        {Object.entries(createBookingForm.selectedAmenities.rental || {}).some(([_, sel]) => (sel.quantity || 0) > 0 || (sel.hoursUsed || 0) > 0) && (
                          <div>
                            <strong>Rental Amenities:</strong>
                            <ul style={{ marginTop: '5px', marginLeft: '20px' }}>
                              {Object.entries(createBookingForm.selectedAmenities.rental).map(([amenityId, selection]) => {
                                const quantity = selection.quantity || 0;
                                const hoursUsed = selection.hoursUsed || 0;
                                if (quantity === 0 && hoursUsed === 0) return null;
                                const amenity = rentalAmenitiesData.find(a => a.id === parseInt(amenityId));
                                if (!amenity) return null;
                                const displayText = hoursUsed > 0 ? `${quantity} x ${hoursUsed}h` : `${quantity} x ${amenity.unitType || 'units'}`;
                                return (
                                  <li key={amenityId}>{amenity.name}: {displayText}</li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div style={{ 
                      backgroundColor: 'white',
                      padding: '15px',
                      borderRadius: '6px',
                      border: '1px solid rgba(254, 190, 82, 0.2)'
                    }}>
                      <h4 style={{ color: '#92400E', marginBottom: '15px' }}>Price Breakdown</h4>
                      
                      {/* Room Costs */}
                      {Object.entries(createBookingForm.selectedRooms || {}).map(([roomId, quantity]) => {
                        const roomDetails = createBookingForm.selectedRoomDetails[roomId];
                        if (!roomDetails) return null;
                        const nights = Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24));
                        const roomTotal = (roomDetails.price * quantity * nights);
                        return (
                          <div key={roomId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>{roomDetails.name} x{quantity} ({nights} nights)</span>
                            <span>₱{(roomTotal / 100).toFixed(2)}</span>
                          </div>
                        );
                      })}

                      {/* Optional Amenities */}
                      {Object.entries(createBookingForm.selectedAmenities?.optional || {}).map(([amenityId, quantity]) => {
                        const amenity = optionalAmenitiesData.find(a => a.id === parseInt(amenityId));
                        if (!quantity) return null;
                        const amenityName = amenity ? amenity.name : `Optional Amenity ${amenityId}`;
                        const amenityPrice = amenity ? Number(amenity.price || 0) : 0;
                        return (
                          <div key={amenityId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>{amenityName} x{quantity}</span>
                            <span>₱{((amenityPrice * quantity) / 100).toFixed(2)}</span>
                          </div>
                        );
                      })}

                      {/* Rental Amenities */}
                      {Object.entries(createBookingForm.selectedAmenities?.rental || {}).map(([amenityId, details]) => {
                        const amenity = rentalAmenitiesData.find(a => a.id === amenityId);
                        if (!amenity || !details.quantity) return null;
                        const total = amenity.price * details.quantity * (details.hoursUsed || 1);
                        return (
                          <div key={amenityId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>{amenity.name} x{details.quantity} ({details.hoursUsed || 1}h)</span>
                            <span>₱{(total / 100).toFixed(2)}</span>
                          </div>
                        );
                      })}

                      {/* Total */}
                      <div style={{ 
                        borderTop: '2px solid rgba(254, 190, 82, 0.3)', 
                        marginTop: '15px', 
                        paddingTop: '15px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        fontSize: '18px',
                        color: '#92400E'
                      }}>
                        <span>Total Amount</span>
                        <span>₱{(createTotalPrice / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                {createBookingStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCreateBookingStep(step => Math.max(1, step - 1))}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#D1D5DB',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#92400E',
                    }}
                  >
                    Back
                  </button>
                )}
                {createBookingStep < 3 && (
                  <button
                    type="button"
                    onClick={() => {
                      // Step-by-step validation
                      if (createBookingStep === 1) {
                        // Validate Step 1: Guest info and dates
                        if (!createBookingForm.firstName?.trim()) {
                          showAlert('Validation Error', 'First name is required.', 'error');
                          return;
                        }
                        if (!createBookingForm.lastName?.trim()) {
                          showAlert('Validation Error', 'Last name is required.', 'error');
                          return;
                        }
                        if (createBookingForm.numberOfGuests < 1) {
                          showAlert('Validation Error', 'Number of guests must be at least 1.', 'error');
                          return;
                        }
                        if (!createBookingForm.checkIn || !createBookingForm.checkOut) {
                          showAlert('Validation Error', 'Please select both check-in and check-out dates.', 'error');
                          return;
                        }
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const checkInDate = new Date(createBookingForm.checkIn);
                        if (checkInDate < today) {
                          showAlert('Validation Error', 'Check-in date cannot be in the past.', 'error');
                          return;
                        }
                        const checkOutDate = new Date(createBookingForm.checkOut);
                        if (checkOutDate <= checkInDate) {
                          showAlert('Validation Error', 'Check-out date must be after check-in date.', 'error');
                          return;
                        }
                        if (!createBookingForm.rooms || createBookingForm.rooms.length === 0) {
                          showAlert('Validation Error', 'Please select at least one room.', 'error');
                          return;
                        }
                      }
                      
                      setCreateBookingStep(step => Math.min(3, step + 1));
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#FEBE52',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#fff',
                      fontWeight: 'bold',
                    }}
                  >
                    Next
                  </button>
                )}
                {createBookingStep === 3 && (
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#FEBE52',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      color: '#fff',
                      fontWeight: 'bold',
                    }}
                  >
                    Create
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    closeModal();
                    setCreateBookingStep(1);
                    setCreateBookingForm({
                      firstName: '',
                      middleName: '',
                      lastName: '',
                      checkIn: '',
                      checkOut: '',
                      numberOfGuests: 1,
                      paymentMode: 'cash',
                      selectedRooms: {},
                      rooms: [],
                      selectedRoomDetails: {},
                      selectedAmenities: { optional: {}, rental: {}, cottage: null },
                    });
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#D1D5DB',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#92400E',
                  }}
                >
                  Cancel
                </button>
              </div>

              {/* Total Price Display - Inside Modal */}
              {createTotalPrice > 0 && (
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ 
                    fontWeight: 'bold', 
                    fontSize: '1.2rem', 
                    color: '#B45309',
                    backgroundColor: 'rgba(254, 248, 237, 0.95)',
                    padding: '12px 18px',
                    borderRadius: '8px',
                    border: '2px solid #FEBE52',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    minWidth: '200px',
                    textAlign: 'center'
                  }}>
                    Total Price: ₱{(createTotalPrice / 100).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              )}

              {/* Submit Modal for Loading */}
              {showSubmitModal && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  zIndex: 1200
                }}>
                  <div style={{
                    color: 'white',
                    fontSize: '1.5rem',
                    textAlign: 'center'
                  }}>
                    Submitting, please wait{Array(dotCount).fill('.').join('')}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

        {/* Enhanced Booking Management Section */}
      <div className="section-container" style={{ 
        marginTop: '40px', 
        paddingTop: '20px',
        clear: 'both'
      }}>
        <div className="section-card booking-management" style={{
          marginTop: '20px',
          paddingTop: '24px'
        }}>
          <div className="booking-header">
            <h2 className="section-title">
              Booking Management ({getFilteredBookings().length} bookings)
            </h2>
            
            {/* Search and Controls Bar */}
            <div className="booking-controls">
              <div className="search-container">
                <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by guest name, room, or booking ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                {searchTerm && (
                  <button 
                    className="clear-search"
                    onClick={() => setSearchTerm('')}
                  >
                    ×
                  </button>
                )}
              </div>
              
              <div className="sort-controls">
                <label className="sort-label">Sort by:</label>
                <select 
                  value={sortBy} 
                  onChange={(e) => handleSort(e.target.value)}
                  className="sort-select"
                >
                  <option value="checkIn">Check-in Date</option>
                  <option value="guestName">Guest Name</option>
                  <option value="checkOut">Check-out Date</option>
                  <option value="status">Status</option>
                </select>
                <button 
                  className={`sort-order-btn ${sortOrder === 'desc' ? 'desc' : 'asc'}`}
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={sortOrder === 'asc' ? 'Sort Descending' : 'Sort Ascending'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Filter Tabs */}
          <div className="booking-filter-tabs">
            <button 
              className={`filter-tab ${activeBookingFilter === 'all' ? 'active' : ''}`}
              onClick={() => handleFilterChange('all')}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a2 2 0 00-2 2v6a2 2 0 002 2h8a2 2 0 002-2V6a2 2 0 00-2-2V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
              </svg>
              All ({getAllBookings().length})
            </button>
            <button 
              className={`filter-tab ${activeBookingFilter === 'pending' ? 'active' : ''}`}
              onClick={() => handleFilterChange('pending')}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              Pending ({(pendingBookings || []).length})
            </button>
            <button 
              className={`filter-tab ${activeBookingFilter === 'confirmed' ? 'active' : ''}`}
              onClick={() => handleFilterChange('confirmed')}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Confirmed ({(confirmedBookings || []).length})
            </button>
            <button 
              className={`filter-tab ${activeBookingFilter === 'checkedIn' ? 'active' : ''}`}
              onClick={() => handleFilterChange('checkedIn')}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Checked In ({(checkedInBookings || []).length})
            </button>
            <button 
              className={`filter-tab ${activeBookingFilter === 'checkedOut' ? 'active' : ''}`}
              onClick={() => handleFilterChange('checkedOut')}
            >
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Checked Out / Completed ({(checkedOutBookings || []).length + (completedBookings || []).length})
            </button>
          </div>
          
          {/* Enhanced Booking List */}
          <div className="booking-grid">
            {getPaginatedBookings().length > 0 ? (
              getPaginatedBookings().map((booking) => (
                <div key={booking.id} className={`booking-card ${booking.status?.toLowerCase() || 'pending'}`}>
                  <div className="booking-header-row">
                    <div className="guest-info-main">
                      <h3 className="guest-name" onClick={() => openQuickView(booking)}>
                        {booking.guestName || 'Unknown Guest'}
                      </h3>
                      <span className={`status-badge ${String(getDisplayBookingStatus(booking)).toLowerCase().replace(/\s+/g, '-')}`}>
                        {getDisplayBookingStatus(booking)}
                      </span>
                    </div>
                    <div className="booking-id">#{booking.id}</div>
                  </div>
                  
                  <div className="booking-details">
                    <div className="detail-row">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span className="detail-label">Check-in:</span>
                      <span className="detail-value">
                        {booking.checkIn ? new Date(booking.checkIn).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        }) : 'N/A'}
                      </span>
                    </div>
                    
                    <div className="detail-row">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                      </svg>
                      <span className="detail-label">Room:</span>
                      <span className="detail-value">
                        {getBookingPrimaryRoomLabel(booking)}
                      </span>
                    </div>
                    
                    <div className="detail-row">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                      </svg>
                      <span className="detail-label">Guests:</span>
                      <span className="detail-value">{getBookingGuestCount(booking) || 'N/A'}</span>
                    </div>
                    
                    {booking.remarks && (
                      <div className="detail-row remarks">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        <span className="detail-value remarks-text">{booking.remarks}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="booking-actions">
                    <button 
                      className="action-btn primary" 
                      onClick={() => openDetailsModal(booking)}
                      title="View Full Details"
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      Details
                    </button>
                    
                    {['Held', 'Pending'].includes(normalizeBookingStatus(booking.status)) ? (
                      <>
                        {/* Pending bookings can only be confirmed by super admin or cashier */}
                        {normalizeBookingStatus(booking.status) === 'Pending' && (
                          <div className="action-btn info" style={{ 
                            backgroundColor: '#FEF3C7', 
                            color: '#92400E', 
                            cursor: 'default',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '8px 12px',
                            border: '1px solid #FDE68A'
                          }}>
                            <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: '16px', height: '16px' }}>
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            Awaiting Confirmation
                          </div>
                        )}
                        <button 
                          className="action-btn danger" 
                          onClick={() => openStatusModal(booking.id, 'Cancelled')}
                          title="Cancel Booking"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button 
                        className="action-btn secondary" 
                        onClick={() => openAdjustBookingModal(booking)}
                        title="Edit Booking"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-bookings">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                <h3>No bookings found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {getTotalPages() > 1 && (
            <div className="pagination">
              <button 
                className="pagination-btn" 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Previous
              </button>
              
              <div className="pagination-info">
                <span>Page {currentPage} of {getTotalPages()}</span>
                <span className="results-count">
                  Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, getFilteredBookings().length)} of {getFilteredBookings().length}
                </span>
              </div>
              
              <button 
                className="pagination-btn" 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === getTotalPages()}
              >
                Next
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Adjust Booking Modal */}
      {isModalOpen(MODALS.ADJUST_BOOKING) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Adjust Booking</h3>
              <button className="modal-close-button" onClick={() => closeModal()}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAdjustBooking(); }}>
              <div className="form-group">
                <label className="form-label">Guest Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={adjustBookingForm.guestName}
                  onChange={(e) => setAdjustBookingForm(prev => ({ ...prev, guestName: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Check-in Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={adjustBookingForm.checkIn}
                  onChange={(e) => setAdjustBookingForm(prev => ({ ...prev, checkIn: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Check-out Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={adjustBookingForm.checkOut}
                  onChange={(e) => setAdjustBookingForm(prev => ({ ...prev, checkOut: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Number of Guests</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={adjustBookingForm.numberOfGuests}
                  onChange={(e) => setAdjustBookingForm(prev => ({ ...prev, numberOfGuests: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Remarks</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={adjustBookingForm.remarks}
                  onChange={(e) => setAdjustBookingForm(prev => ({ ...prev, remarks: e.target.value }))}
                  placeholder="Special requests or notes..."
                />
              </div>
              <button type="submit" className="form-button">Update Booking</button>
            </form>
          </div>
        </div>
      )}

      {/* Remarks Modal */}
      {isModalOpen(MODALS.REMARKS) && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Booking Remarks</h3>
              <button className="modal-close-button" onClick={() => closeModal()}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Notes / Special Requests</label>
              <textarea
                className="form-input"
                rows="5"
                value={bookingRemarks}
                onChange={(e) => setBookingRemarks(e.target.value)}
                placeholder="Enter any special requests, notes, or instructions..."
              />
            </div>
            <button className="form-button" onClick={handleSaveRemarks}>Save Remarks</button>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Change Status to {statusChangeData.newStatus}</h3>
              <button className="modal-close-button" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="form-group">
              <label className="form-label">Reason for Change (Required)</label>
              <textarea
                className="form-input"
                rows="4"
                value={statusChangeData.reason}
                onChange={(e) => setStatusChangeData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Please explain why you're changing the status..."
                required
              />
            </div>
            <button className="form-button" onClick={handleStatusChange}>Confirm Status Change</button>
          </div>
        </div>
      )}



      {/* Shift Summary Modal */}
      {showShiftSummaryModal && shiftSummary && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Shift Summary - {shiftSummary.date}</h3>
              <button className="modal-close-button" onClick={() => setShowShiftSummaryModal(false)}>×</button>
            </div>
            <div className="shift-summary-content">
              <div className="summary-metric">
                <span className="metric-label">Walk-in Bookings:</span>
                <span className="metric-value">{shiftSummary.walkInBookings}</span>
              </div>
              <div className="summary-metric">
                <span className="metric-label">Checked In:</span>
                <span className="metric-value">{shiftSummary.checkedIn}</span>
              </div>
              <div className="summary-metric">
                <span className="metric-label">Checked Out:</span>
                <span className="metric-value">{shiftSummary.checkedOut}</span>
              </div>
              <div className="summary-metric">
                <span className="metric-label">Cancelled:</span>
                <span className="metric-value">{shiftSummary.cancelled}</span>
              </div>
              <div className="summary-metric">
                <span className="metric-label">No Shows:</span>
                <span className="metric-value">{shiftSummary.noShows}</span>
              </div>
              <div className="summary-metric">
                <span className="metric-label">Pending Reservations:</span>
                <span className="metric-value">{shiftSummary.pendingReservations}</span>
              </div>
              <button className="form-button" onClick={() => { setShowShiftSummaryModal(false); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Quick View Modal */}
      {isQuickViewOpen && quickViewGuest && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Quick View: {quickViewGuest.guestName}</h3>
              <button className="modal-close-button" onClick={closeQuickView}>×</button>
            </div>
            <div className="guest-quick-view">
              <p><strong>Booking ID:</strong> {quickViewGuest.id}</p>
              <p><strong>Check-in:</strong> {new Date(quickViewGuest.checkIn).toLocaleDateString()}</p>
              <p><strong>Check-out:</strong> {new Date(quickViewGuest.checkOut).toLocaleDateString()}</p>
              <p><strong>Guests:</strong> {getBookingGuestCount(quickViewGuest) || 'N/A'}</p>
              <p><strong>Status:</strong> <span className={`status-${quickViewGuest.status.toLowerCase()}`}>{quickViewGuest.status}</span></p>
              {quickViewGuest.remarks && <p><strong>Remarks:</strong> {quickViewGuest.remarks}</p>}
              {getBookingRoomLabels(quickViewGuest).length > 0 && (
                <div>
                  <p><strong>Room Assignment:</strong></p>
                  <ul>
                    {getBookingRoomLabels(quickViewGuest).map((roomLabel, index) => (
                      <li key={index}>{roomLabel}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {isModalOpen(MODALS.DETAILS) && modalData && (
        <div
          className="modal-overlay fade-in"
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="modal-content"
            data-modal="booking-details"
            style={{
              background: 'linear-gradient(160deg, #fff8e6 0%, #fff3d2 100%)',
              padding: '24px',
              borderRadius: '16px',
              width: '680px',
              maxWidth: '90%',
              maxHeight: '82%',
              overflowY: 'auto',
              boxShadow: '0 14px 34px rgba(68, 47, 9, 0.16)',
              position: 'relative',
              border: '1px solid rgba(215, 154, 43, 0.38)',
            }}
          >
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1.35rem', color: '#3d2c00' }}>Booking Details</h3>
              <button
                className="modal-close-button"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  fontSize: '1.5rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#92400E',
                  padding: '2px 8px',
                  lineHeight: 1,
                  zIndex: 2
                }}
                onClick={() => {
                  closeModal();
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Check-in:</strong> {new Date(modalData.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Actual Check-in Time:</strong>{' '}
              {modalData.actualCheckIn
                ? new Date(modalData.actualCheckIn).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })
                : 'Not checked in yet'}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Check-out:</strong> {new Date(modalData.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Actual Check-out Time:</strong>{' '}
              {modalData.actualCheckOut
                ? new Date(modalData.actualCheckOut).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  })
                : 'Not checked out yet'}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Guests:</strong> {getBookingGuestCount(modalData) || 'N/A'}
            </div>

            {modalData.rooms && Array.isArray(modalData.rooms) && modalData.rooms.length > 0 && (
              <div style={{ marginBottom: '14px' }}>
                <strong>Selected Rooms:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {modalData.rooms.map((r, idx) => (
                    <li key={`room-${r.room?.id || idx}-${idx}`}>{r.room?.name || 'Room'} x{r.quantity}</li>
                  ))}
                </ul>
              </div>
            )}

            {modalData.optionalAmenities && Array.isArray(modalData.optionalAmenities) && modalData.optionalAmenities.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Optional Amenities:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {modalData.optionalAmenities.map((oa) => (
                    <li key={`optional-${oa.optionalAmenity.id}`}>{oa.optionalAmenity.name} x{oa.quantity}</li>
                  ))}
                </ul>
              </div>
            )}

            {modalData.rentalAmenities && Array.isArray(modalData.rentalAmenities) && modalData.rentalAmenities.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Rental Amenities:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {modalData.rentalAmenities.map((ra) => (
                    <li key={`rental-${ra.rentalAmenity.id}`}>{ra.rentalAmenity.name} x{ra.quantity} {ra.hoursUsed ? `(${ra.hoursUsed}h)` : ''}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <strong>Payment Mode:</strong> 
              <span style={{
                marginLeft: '10px',
                padding: '6px 10px',
                borderRadius: '8px',
                backgroundColor: '#fff8e8',
                border: '1px solid #d79a2b',
                fontSize: '14px',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#8f5a12'
              }}>
                {(() => {
                  const payment = getPaymentModeMeta(modalData.paymentMode);
                  const PaymentIcon = payment.Icon;
                  return (
                    <>
                      <PaymentIcon size={14} />
                      <span>{payment.label}</span>
                    </>
                  );
                })()}
              </span>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>Price Breakdown:</strong>
              <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                {(() => {
                  if (!modalData) return null;
                  const nights = Math.max(1, (new Date(modalData.checkOut) - new Date(modalData.checkIn)) / (1000 * 60 * 60 * 24));
                  const baseTotal = Number(modalData.totalBeforeDiscount || modalData.totalCostWithAddons || modalData.totalPrice || 0);
                  const finalTotal = Number(modalData.totalAfterDiscount || modalData.totalCostWithAddons || modalData.totalPrice || 0);
                  const discountAmount = Number(modalData.discountAmount || Math.max(0, baseTotal - finalTotal));
                  return (
                    <>
                      {modalData.rooms && Array.isArray(modalData.rooms) && modalData.rooms.map((r, idx) => {
                        const roomTotal = Number(r.room.price) * r.quantity * nights;
                        return (
                          <li key={`room-${idx}`}>
                            {r.room.name} x{r.quantity} ({nights} nights): ₱{(roomTotal / 100).toFixed(0)}
                          </li>
                        );
                      })}
                      {modalData.optionalAmenities && Array.isArray(modalData.optionalAmenities) && modalData.optionalAmenities.map((oa, idx) => {
                        const optionalTotal = (Number(oa.optionalAmenity.price || 0) * oa.quantity);
                        return (
                          <li key={`amenity-${idx}`}>
                            {oa.optionalAmenity.name} x{oa.quantity}: ₱{(optionalTotal / 100).toFixed(0)}
                          </li>
                        );
                      })}
                      {modalData.rentalAmenities && Array.isArray(modalData.rentalAmenities) && modalData.rentalAmenities.map((ra, idx) => (
                        <li key={`rental-${idx}`}>
                          {ra.rentalAmenity.name} x{ra.quantity} {ra.hoursUsed ? `(${ra.hoursUsed}h)` : ''}: ₱{(Number(ra.totalPrice) / 100).toFixed(0)}
                        </li>
                      ))}
                      {discountAmount > 0 && (
                        <li style={{ color: '#b45309' }}>
                          Promotion Discount: -₱{(discountAmount / 100).toFixed(0)}
                        </li>
                      )}
                      <li style={{ marginTop: '10px', fontWeight: 'bold' }}>
                        Total Price: ₱{(finalTotal / 100).toFixed(0)}
                      </li>
                    </>
                  );
                })()}
              </ul>
            </div>

            {/* Action Buttons - always show row, buttons conditionally rendered */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end', flexWrap: 'wrap', minHeight: '44px' }}>
              {/* Show Check In button if not checked in yet (actualCheckIn is null and status is HELD, PENDING, or Confirmed) */}
              {(['Held', 'Pending', 'Confirmed'].includes(normalizeBookingStatus(modalData.status)) && !modalData.actualCheckIn) && (
                <button
                      onClick={() => {
                    const today = new Date();
                    const checkInDate = new Date(modalData.checkIn);
                    if (today < new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate())) {
                      setEarlyCheckInModal({
                        show: true,
                        date: checkInDate
                      });
                      return;
                    }
                        openCheckActionModal('checkin', modalData);
                  }}
                  style={{
                    minWidth: '120px',
                    padding: '10px 20px',
                    backgroundColor: '#56A86B',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Check In
                </button>
              )}

              {/* Show Check Out button if checked in but not checked out (actualCheckIn is set, actualCheckOut is null, status is Confirmed or Checked-In) */}
              {(modalData.actualCheckIn && !modalData.actualCheckOut && normalizeBookingStatus(modalData.status) === 'Confirmed') && (
                <button
                  onClick={() => {
                    openCheckActionModal('checkout', modalData);
                  }}
                  style={{
                    minWidth: '120px',
                    padding: '10px 20px',
                    backgroundColor: '#E74C3C',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500',
                  }}
                >
                  Check Out
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Early Check-In Modal (shared) */}
      <EarlyCheckInModal modal={earlyCheckInModal} setModal={setEarlyCheckInModal} />

      {/* Check-in / Check-out Confirmation Modal */}
      {checkActionModal.show && checkActionModal.booking && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1300,
          padding: '1rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '460px',
            padding: '1.2rem',
            boxShadow: '0 16px 40px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.75rem' }}>
              Confirm {checkActionModal.action === 'checkin' ? 'Check In' : 'Check Out'}
            </h3>
            <p style={{ marginBottom: '1rem', color: '#374151' }}>
              {`Are you sure you want to ${checkActionModal.action === 'checkin' ? 'check in' : 'check out'} `}
              <strong>{checkActionModal.booking.guestName || `Booking #${checkActionModal.booking.id}`}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                onClick={closeCheckActionModal}
                style={{
                  padding: '0.55rem 0.95rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmCheckAction}
                style={{
                  padding: '0.55rem 0.95rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: checkActionModal.action === 'checkin' ? '#56A86B' : '#E74C3C',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .create-booking-overlay {
          padding: 10px;
        }

        .create-booking-modal {
          width: min(1240px, 96vw) !important;
          max-height: 90vh !important;
          overflow-y: auto;
        }

        .walkin-step1-grid {
          display: flex;
          gap: 15px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .walkin-calendar-col {
          flex: 1 1 680px;
          min-width: 620px;
          max-width: none;
        }

        .walkin-info-col {
          flex: 0 1 390px;
          min-width: 320px;
          max-width: 390px;
          position: relative;
          z-index: 1;
        }

        .walkin-guest-panel {
          width: 100%;
        }

        .notification-badge.critical {
          background: linear-gradient(45deg, #dc2626, #ef4444);
          animation: pulse 2s infinite;
        }
        
        .notification-item.critical {
          border-left: 4px solid #dc2626;
          background: rgba(220, 38, 38, 0.1);
        }
        
        .notification-item.critical .notification-title {
          color: #dc2626;
          font-weight: 700;
          font-size: 0.9rem;
        }
        
        .notification-action-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #6b7280;
          color: white;
        }
        
        .notification-action-btn.primary {
          background: #FEBE52;
          color: #92400E;
        }
        
        .notification-action-btn.urgent {
          background: #dc2626;
          color: white;
        }
        
        .notification-action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        
        /* Fix potential overlapping issues */
        .receptionist-layout {
          min-height: 100vh;
          position: relative;
        }
        
        .error-banner {
          box-sizing: border-box;
        }
        
        .modal-overlay {
          box-sizing: border-box;
          padding: 20px;
        }
        
        .modal-content {
          box-sizing: border-box;
          max-width: 95vw;
          max-height: 90vh;
          overflow-y: auto;
        }
        
        .notification-panel {
          max-width: 360px;
          right: 20px;
          top: 80px;
        }
        
        /* Mobile responsiveness */
        @media (max-width: 768px) {
          .create-booking-overlay {
            padding: 8px;
          }

          .create-booking-modal {
            width: 100% !important;
            max-width: 100% !important;
            max-height: 92vh !important;
            padding: 12px !important;
            border-radius: 12px !important;
          }

          .walkin-step1-grid {
            gap: 12px;
          }

          .walkin-calendar-col,
          .walkin-info-col {
            flex: 1 1 100%;
            min-width: 100%;
            max-width: 100%;
          }

          .notification-panel {
            width: calc(100vw - 40px);
            right: 20px;
            left: 20px;
            max-width: none;
          }
          
          .modal-content {
            width: calc(100vw - 40px);
            max-width: none;
            margin: 0;
            padding: 15px;
          }
          
          .error-banner {
            padding: 8px;
            font-size: 14px;
          }
          
          /* Adjust total price display for mobile */
          .modal-content div[style*="position: fixed"] {
            position: relative !important;
            bottom: auto !important;
            right: auto !important;
            margin-top: 20px;
            box-shadow: none !important;
            border: 1px solid #FEBE52 !important;
          }
        }

        @media (max-width: 1100px) {
          .walkin-calendar-col,
          .walkin-info-col {
            flex: 1 1 100%;
            min-width: 100%;
            max-width: 100%;
          }
        }

        @media (max-width: 1360px) {
          .walkin-calendar-col {
            min-width: 560px;
          }

          .walkin-info-col {
            max-width: 360px;
          }
        }
        
        /* Ensure proper stacking order */
        .navbar-right {
          position: relative;
          z-index: 100;
        }
        
        .main-content {
          position: relative;
          z-index: 1;
        }
        
        /* Loading animations */
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Prevent error banner overlapping */
        .dashboard-container.with-error-banner {
          margin-top: 120px; /* 70px navbar + 50px error banner */
          transition: margin-top 0.3s ease;
        }
        
        /* KPI Cards Styling */
        .kpi-card-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          margin-bottom: 32px;
          width: 100%;
        }
        
        @media (max-width: 1200px) {
          .kpi-card-container {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 768px) {
          .kpi-card-container {
            grid-template-columns: 1fr;
          }
        }
        
        .kpi-card {
          background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
          border-radius: 16px;
          padding: 32px 24px;
          min-height: 180px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: visible;
          border-top: 4px solid transparent;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        
        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }
        
        .kpi-card.occupied {
          border-top-color: #10b981;
        }
        
        .kpi-card.available {
          border-top-color: #d79a2b;
        }
        
        .kpi-card.bookings {
          border-top-color: #f59e0b;
        }
        
        .kpi-card.revenue {
          border-top-color: #ef4444;
        }
        
        .kpi-card-icon {
          margin-bottom: 16px;
          opacity: 0.8;
        }
        
        .kpi-card-icon svg {
          width: 28px;
          height: 28px;
          color: #64748b;
        }
        
        .kpi-card-content {
          flex: 1;
        }
        
        .kpi-card-title {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 12px 0;
          line-height: 1.2;
        }
        
        .kpi-card-metrics {
          display: flex;
          align-items: baseline;
          gap: 4px;
          margin-bottom: 8px;
        }
        
        .kpi-card-metric {
          font-size: 36px;
          font-weight: 800;
          color: #1e293b;
          line-height: 1;
        }
        
        .kpi-card-total {
          font-size: 24px;
          font-weight: 600;
          color: #64748b;
        }
        
        .kpi-card-subtitle {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
          line-height: 1.4;
          margin: 0;
        }
        
        /* Enhanced quick action buttons */
        .quick-actions {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 32px;
        }
        
        .quick-action-btn {
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 16px 24px;
          border-radius: 12px;
          border: none;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.025em;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          cursor: pointer;
          min-width: 160px;
        }
        
        .quick-action-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
          transition: left 0.5s;
        }
        
        .quick-action-btn:hover::before {
          left: 100%;
        }
        
        .quick-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .quick-action-btn.check-in {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        
        .quick-action-btn.check-out {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
        }
        
        .quick-action-btn.guest-search {
          background: linear-gradient(135deg, #d79a2b 0%, #c4871d 100%);
          color: white;
        }
        
        .quick-action-btn.new-reservation {
          background: linear-gradient(135deg, #FEBE52 0%, #f59e0b 100%);
          color: #92400e;
          font-weight: 700;
        }
        
        /* Enhanced form styling */
        .form-field-group {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .form-field {
          flex: 1;
          min-width: 200px;
        }
        
        .form-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 8px;
          letter-spacing: 0.025em;
        }
        
        .form-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
          font-size: 14px;
          transition: all 0.3s ease;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .form-input:focus {
          outline: none;
          border-color: #d79a2b;
          box-shadow: 0 0 0 3px rgba(215, 154, 43, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
        
        .form-input:hover {
          border-color: #d1d5db;
        }
        
        .form-input::placeholder {
          color: #9ca3af;
          font-style: italic;
        }
        
        /* Enhanced date display styling */
        .date-display-group {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        
        .date-field {
          flex: 1;
          min-width: 200px;
        }
        
        .date-display {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
        }
        
        .date-display:hover {
          border-color: #d79a2b;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        .date-icon {
          font-size: 16px;
          opacity: 0.8;
        }
        
        /* Enhanced requirements status styling */
        .requirements-status {
          margin-bottom: 24px;
          padding: 20px;
          background: linear-gradient(135deg, #fff8e8 0%, #fff0cf 100%);
          border-radius: 16px;
          border: 2px solid #e7cf98;
          box-shadow: 0 4px 16px rgba(215, 154, 43, 0.12);
        }
        
        .requirements-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 700;
          color: #8f5a12;
          letter-spacing: -0.025em;
        }
        
        .requirements-icon {
          font-size: 18px;
        }
        
        .requirements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }
        
        .requirement-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }
        
        .requirement-item.completed {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          color: #065f46;
          border-color: #10b981;
        }
        
        .requirement-item.pending {
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          color: #991b1b;
          border-color: #ef4444;
        }
        
        .requirement-check {
          font-size: 16px;
          font-weight: 700;
        }
        
        .requirement-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        
        /* Enhanced room card styling */
        .room-card {
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .room-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          border-color: #FEBE52;
        }
        
        .room-card.selected {
          border-color: #FEBE52;
          box-shadow: 0 6px 15px rgba(254, 190, 82, 0.3);
        }
        
        .room-card.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .room-card.disabled:hover {
          transform: none;
          box-shadow: none;
          border-color: #e5e7eb;
        }
        
        /* Room content styling */
        .room-image-container {
          position: relative;
          margin-bottom: 16px;
        }
        
        .room-image {
          width: 100%;
          height: 140px;
          object-fit: cover;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
        }
        
        .room-card:hover .room-image {
          transform: scale(1.02);
        }
        
        .room-type-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 16px;
          backdrop-filter: blur(10px);
        }
        
        .room-content {
          text-align: left;
        }
        
        .room-name {
          margin: 0 0 12px 0;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.025em;
        }
        
        .room-capacity {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }
        
        .capacity-icon {
          font-size: 16px;
        }
        
        .room-price {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 0;
        }
        
        .price-label {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
        }
        
        .price-value {
          font-size: 20px;
          font-weight: 800;
          color: #FEBE52;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }
        
        /* Quantity selector styling */
        .quantity-selector {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 16px;
          padding: 12px;
          background: rgba(248, 250, 252, 0.8);
          border-radius: 12px;  
          border: 2px solid #e5e7eb;
        }
        
        .quantity-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #FEBE52 0%, #f59e0b 100%);
          color: white;
          cursor: pointer;
          font-weight: 700;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(254, 190, 82, 0.3);
        }
        
        .quantity-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(254, 190, 82, 0.4);
        }
        
        .quantity-btn:active {
          transform: scale(0.95);
        }
        
        .quantity-display {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          min-width: 24px;
          text-align: center;
          padding: 8px 12px;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
        }
        
        /* Rooms grid layout */
        .rooms-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          transition: opacity 0.3s ease;
        }
        
        /* Responsive rooms grid */
        @media (min-width: 1400px) {
          .rooms-grid {
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 14px;
          }
        }
        
        @media (max-width: 768px) {
          .rooms-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
        }
        
        @media (max-width: 480px) {
          .rooms-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
        }
        
        .rooms-grid.loading {
          opacity: 0.7;
        }
        
        /* Recent Bookings Section */
        .recent-bookings-section {
          margin-bottom: 40px;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-radius: 20px;
          padding: 32px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
        }
        
        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0;
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.025em;
        }
        
        .section-icon {
          width: 24px;
          height: 24px;
          color: #FEBE52;
        }
        
        .section-badge {
          background: linear-gradient(135deg, #FEBE52 0%, #f59e0b 100%);
          color: #92400e;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.025em;
          box-shadow: 0 2px 8px rgba(254, 190, 82, 0.3);
        }
        
        .recent-bookings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 16px;
        }
        
        /* Responsive booking cards */
        @media (min-width: 1400px) {
          .recent-bookings-grid {
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 14px;
          }
        }
        
        @media (max-width: 768px) {
          .recent-bookings-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
        
        .recent-booking-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          border: 2px solid #e5e7eb;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .recent-booking-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #c4871d, #d79a2b, #febe52);
          transform: translateX(-100%);
          transition: transform 0.3s ease;
        }
        
        .recent-booking-card:hover::before {
          transform: translateX(0);
        }
        
        .recent-booking-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          border-color: #FEBE52;
        }
        
        .booking-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .booking-time {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .booking-status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 1);
        }
        
        .booking-status-dot.confirmed {
          background: #10b981;
        }
        
        .booking-status-dot.pending,
        .booking-status-dot.held {
          background: #f59e0b;
        }
        
        .booking-status-dot.cancelled {
          background: #ef4444;
        }
        
        .booking-guest-name {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 16px;
          line-height: 1.2;
        }
        
        .booking-card-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .booking-detail-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
        }
        
        .detail-icon {
          width: 14px;
          height: 14px;
          opacity: 0.7;
        }
        
        .booking-card-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        
        .quick-view-btn,
        .confirm-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }
        
        .quick-view-btn {
          background: linear-gradient(135deg, #d79a2b 0%, #c4871d 100%);
          color: white;
        }
        
        .confirm-btn {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
        }
        
        .quick-view-btn:hover,
        .confirm-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
        
        .quick-view-btn svg,
        .confirm-btn svg {
          width: 16px;
          height: 16px;
        }
        
        .no-recent-bookings {
          grid-column: 1 / -1;
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
        }
        
        .no-recent-bookings svg {
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        
        .no-recent-bookings h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .no-recent-bookings p {
          margin: 0;
          font-size: 14px;
          opacity: 0.8;
        }
        
        /* Quantity selector styling */
        .quantity-selector {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 16px;
          padding: 12px;
          background: rgba(254, 190, 82, 0.1);
          border-radius: 12px;
          border: 1px solid rgba(254, 190, 82, 0.2);
        }
        
        .quantity-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #FEBE52 0%, #f59e0b 100%);
          color: white;
          cursor: pointer;
          font-weight: 700;
          font-size: 18px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(254, 190, 82, 0.3);
        }
        
        .quantity-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 16px rgba(254, 190, 82, 0.4);
        }
        
        .quantity-btn:active {
          transform: scale(0.95);
        }
        
        .quantity-display {
          min-width: 40px;
          text-align: center;
          font-size: 18px;
          font-weight: 700;
          color: #92400e;
          padding: 8px 12px;
          background: white;
          border-radius: 8px;
          border: 2px solid #FEBE52;
        }
        
        /* Fix overlapping section cards */
        .section-card {
          height: auto !important;
          min-height: 25rem;
          max-height: none;
          overflow: visible;
        }
        
        .booking-management {
          padding: 1.5rem !important;
          margin-top: 20px;
        }
        
        .section-container {
          margin: 20px 0;
          clear: both;
        }
        
        /* Ensure proper spacing between elements */
        .dashboard-container {
          padding-bottom: 40px;
        }
        
        /* Fix warning messages positioning */
        .modal-content {
          overflow-y: auto;
          max-height: calc(100vh - 40px);
        }
        
        /* Enhanced KPI cards styling */
        .kpi-card-container {
          margin: 30px 0;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          padding: 0 4px;
        }
        
        /* Responsive KPI cards */
        @media (min-width: 1400px) {
          .kpi-card-container {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }
        }
        
        @media (max-width: 768px) {
          .kpi-card-container {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin: 20px 0;
          }
        }
        
        @media (max-width: 480px) {
          .kpi-card-container {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }
        
        .kpi-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #FEBE52 0%, #f59e0b 100%);
        }
        
        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
        }
        
        .kpi-card.occupied::before {
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
        }
        
        .kpi-card.available::before {
          background: linear-gradient(90deg, #d79a2b 0%, #c4871d 100%);
        }
        
        .kpi-card.pending::before {
          background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);
        }
        
        .kpi-card.payments::before {
          background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
        }
        
        /* Ensure proper flow and no negative margins */
        * {
          box-sizing: border-box;
        }
        
        .dashboard-header,
        .kpi-card-container,
        .section-container {
          position: relative;
          z-index: 1;
        }
        
        /* Fix notification panel positioning */
        .notification-panel {
          position: fixed !important;
          top: 80px !important;
          right: 20px !important;
          z-index: 200 !important;
          max-width: 360px;
        }
        
        @media (max-width: 768px) {
          .kpi-card-container {
            flex-direction: column;
            gap: 15px;
          }
          
          .section-container {
            margin-top: 20px;
          }
          
          .notification-panel {
            right: 10px !important;
            left: 10px !important;
            max-width: none;
            width: calc(100vw - 20px);
          }
        }
      `}</style>

      {/* Logout Confirmation Modal */}
      <NavigationConfirmationModal 
        show={navigationGuard.showModal}
        onStay={navigationGuard.handleStay}
        onLeave={navigationGuard.handleLeave}
        context="logout"
        message={navigationGuard.message}
      />

      {/* Alert Modal */}
      {alertModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: '16px' }}>
              {alertModal.type === 'error' && <XCircle size={48} color="#dc2626" />}
              {alertModal.type === 'warning' && <AlertCircle size={48} color="#f59e0b" />}
              {alertModal.type === 'success' && <CheckCircle size={48} color="#16a34a" />}
              {alertModal.type === 'info' && <Info size={48} color="#d79a2b" />}
            </div>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#5a3e00',
              fontSize: '20px',
              fontWeight: 'bold',
            }}>{alertModal.title}</h3>
            <p style={{
              margin: '0 0 20px 0',
              color: '#6b4a00',
              fontSize: '14px',
              lineHeight: '1.5',
            }}>{alertModal.message}</p>
            <button
              onClick={() => {
                const onCloseCallback = alertModal.onClose;
                setAlertModal({ show: false, title: '', message: '', type: 'info', onClose: null });
                if (onCloseCallback) onCloseCallback();
              }}
              style={{
                backgroundColor: '#d79a2b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#c4871d'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#d79a2b'}
            >
              Okay
            </button>
          </div>
        </div>
      )}
      
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        onSuccess={() => {
          console.log('Receptionist password changed successfully');
        }}
      />
    </div>
  );
}