'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useEarlyCheckInModal, EarlyCheckInModal, NavigationConfirmationModal } from '@/components/CustomModals';
import { signOut, useSession } from 'next-auth/react';
import { useNavigationGuard } from '../../hooks/useNavigationGuard.simple';
import { User } from 'lucide-react';
import './receptionist-styles.css';
import RoomAmenitiesSelector from '@/components/RoomAmenitiesSelector';
import RentalAmenitiesSelector from '@/components/RentalAmenitiesSelector';
import OptionalAmenitiesSelector from '@/components/OptionalAmenitiesSelector';
import BookingCalendar from '@/components/BookingCalendar';

// Timezone-safe date formatting utility
function formatDate(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function ReceptionistDashboard() {
  // Session hook
  const { data: session } = useSession();
  
  // Core state
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
  
  // Logout Navigation Guard
  const navigationGuard = useNavigationGuard({
    shouldPreventNavigation: () => true,
    onNavigationAttempt: () => {
      console.log('Receptionist Dashboard: Navigation attempt detected, showing logout confirmation');
    },
    customAction: () => signOut({ callbackUrl: '/login' }),
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
    selectedRooms: {},
    selectedRoomDetails: {},
    selectedAmenities: { optional: {}, rental: {}, cottage: null },
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
      alert('Please provide a reason for cancellation.');
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
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const pendingCheckIns = allBookings.filter(b => b.checkIn && b.checkIn.startsWith(today) && b.status === 'HELD');
  const pendingCheckOuts = allBookings.filter(b => b.checkOut && b.checkOut.startsWith(today) && b.status === 'Confirmed');
  const pendingBookingsCount = allBookings.filter(b => b.checkIn && b.checkIn.startsWith(tomorrowStr)).length;

    setNotifications({
      pendingCheckIns,
      pendingCheckOuts,
      pendingBookings: pendingBookingsCount,
    });
  };

  const generateShiftSummary = () => {
    const today = new Date().toISOString().split('T')[0];
    const summary = {
      date: today,
      walkInBookings: bookings.filter(b => b.createdAt && b.createdAt.startsWith(today) && b.status === 'Confirmed').length,
      checkedIn: bookings.filter(b => b.checkIn && b.checkIn.startsWith(today) && b.status === 'Confirmed').length,
      checkedOut: bookings.filter(b => b.checkOut && b.checkOut.startsWith(today) && b.status === 'CHECKED_OUT').length,
      cancelled: bookings.filter(b => b.status === 'Cancelled').length,
      noShows: bookings.filter(b => b.status === 'No-Show').length,
      pendingReservations: bookings.filter(b => b.status === 'HELD').length,
    };
    setShiftSummary(summary);
    setShowShiftSummaryModal(true);
  };

  // Pagination and filtering utilities
  const getAllBookings = () => {
    return [...(pendingBookings || []), ...(confirmedBookings || [])];
  };

  const getFilteredBookings = () => {
    let filteredBookings = [];
    
    // Apply filter by status
    if (activeBookingFilter === 'pending') {
      filteredBookings = pendingBookings || [];
    } else if (activeBookingFilter === 'confirmed') {
      filteredBookings = confirmedBookings || [];
    } else {
      filteredBookings = getAllBookings();
    }

    // Apply search filter
    if (searchTerm) {
      filteredBookings = filteredBookings.filter(booking => 
        booking.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.roomAssignments?.[0]?.roomName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.id?.toString().includes(searchTerm) ||
        booking.remarks?.toLowerCase().includes(searchTerm.toLowerCase())
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
    // Ensure numberOfGuests and guestName are always present
    setQuickViewGuest({
      ...guest,
      numberOfGuests: guest.numberOfGuests ?? 1,
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
      numberOfGuests: booking.numberOfGuests ?? 1,
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
      alert('❌ Guest name is required.');
      return;
    }
    if (!adjustBookingForm.numberOfGuests || adjustBookingForm.numberOfGuests < 1) {
      alert('❌ Number of guests must be at least 1.');
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
      alert('Please provide a reason for the status change.');
      return;
    }
    
    // Prevent receptionist from confirming bookings
    if (statusChangeData.newStatus === 'Confirmed') {
      alert('Only cashier and super admin can confirm bookings after payment verification.');
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
      alert('Failed to update status. Please try again.');
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
      if (!b.checkOut || b.status !== 'Confirmed') return false;
      const checkoutDate = new Date(b.checkOut);
      return checkoutDate < now;
    });

    const lateArrivals = bookings.filter(b => {
      if (!b.checkIn || b.status !== 'HELD') return false;
      const checkinDate = new Date(b.checkIn);
      const expectedTime = new Date(checkinDate);
      expectedTime.setHours(15, 0, 0, 0); // 3 PM check-in time
      return now > expectedTime;
    });

    setNotificationCategories({
      checkIns: bookings.filter(b => b.checkIn && b.checkIn.startsWith(today) && b.status === 'HELD'),
      checkOuts: bookings.filter(b => b.checkOut && b.checkOut.startsWith(today) && b.status === 'Confirmed'),
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
    printWindow.document.write(`<div class="detail-row"><span class="label">Guests:</span> <span>${booking.numberOfGuests}</span></div>`);
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

  const fetchBookings = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
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
      const updatedData = { ...bookingToUpdate, status: 'Confirmed', actualCheckIn: true };
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to check in');
      await fetchBookings();
    } catch (error) {
      console.error('Error checking in guest:', error);
    }
  };

  const handleCheckOut = async (bookingId) => {
    try {
      const bookingToUpdate = bookings.find(b => b.id === bookingId);
      if (!bookingToUpdate) throw new Error('Booking not found');
      const updatedData = { ...bookingToUpdate, status: 'CHECKED_OUT', actualCheckOut: true };
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to check out');
      await fetchBookings();
    } catch (error) {
      console.error('Error checking out guest:', error);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchAmenities();
    fetchRooms(null, null, true); // Initial load flag
  }, []);

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
      if (!createBookingForm.checkIn || !createBookingForm.checkOut || Object.keys(createBookingForm.selectedRooms).length === 0) {
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
            selectedRooms: createBookingForm.selectedRooms,
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
  }, [createBookingForm.selectedRooms, createBookingForm.selectedAmenities, createBookingForm.checkIn, createBookingForm.checkOut]);

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

  // compute total capacity from selectedRooms
  const computeTotalCapacity = () => {
    return Object.entries(createBookingForm.selectedRooms).reduce((sum, [roomId, qty]) => {
      const r = availableRooms.find(room => room.id == roomId);
      if (r) {
        const cap = getRoomCapacity(r.type);
        return sum + (cap.max * qty);
      }
      return sum;
    }, 0);
  };

  // is room lock active (other rooms locked when true)
  const isRoomLockActive = () => {
    const totalCap = computeTotalCapacity();
    return totalCap >= createBookingForm.numberOfGuests && Object.keys(createBookingForm.selectedRooms).length > 0;
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

    const occupiedRoomsCount = bookings.filter(
    (b) => b.status === 'Confirmed'
  ).length;

  const totalRoomsCount = allRooms.reduce((sum, room) => sum + room.quantity, 0);

  // Fix: Ensure the value is a number by providing a default value if 'remaining' is not defined.
  const availableRoomsCount = allRooms.reduce((sum, room) => sum + (room.remaining || 0), 0);
  
  // Computed booking filters
  const pendingBookings = bookings.filter(b => ['HELD', 'PENDING'].includes(b.status));
  const confirmedBookings = bookings.filter(b => b.status === 'Confirmed');

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
            }}>⟳</div>
          </div>
        </div>
      )}
      
      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        <div className="navbar-left">
          <div className="brand-section">
            <svg className="brand-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C7 2 3 6 3 11c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.2c0 .21.15.46.55.38A8.013 8.013 0 0 0 21 11c0-5-4-9-9-9z"/>
            </svg>
            <span className="brand-text">Charkool Leisure</span>
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
                  <div className="dropdown-item">
                    <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                    </svg>
                    Profile
                  </div>
                  <div className="dropdown-item">
                    <svg className="dropdown-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                    </svg>
                    Settings
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
          background: 'linear-gradient(135deg, #bb8f44ff 0%, #FEBE52 100%)',
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
              {Math.round((occupiedRoomsCount / totalRoomsCount) * 100)}% Occupancy Rate
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
                {notifications.pendingCheckIns.length + notifications.pendingCheckOuts.length}
              </span>
            </div>
            <div className="kpi-card-subtitle">
              Arrivals & Departures pending
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
              const today = new Date().toISOString().split('T')[0];
              return b.createdAt && b.createdAt.startsWith(today);
            }).length} bookings
          </div>
        </div>
        
        <div className="recent-bookings-grid">
          {bookings
            .filter(b => {
              const today = new Date().toISOString().split('T')[0];
              return b.createdAt && b.createdAt.startsWith(today);
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
                    <span>{booking.roomAssignments?.[0]?.roomName || 'Unassigned'}</span>
                  </div>
                  
                  <div className="booking-detail-item">
                    <svg className="detail-icon" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M7 14s-3-2-3-6a3 3 0 1 1 6 0c0 4-3 6-3 6z"/>
                    </svg>
                    <span>{booking.numberOfGuests || 1} guests</span>
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
            const today = new Date().toISOString().split('T')[0];
            return b.createdAt && b.createdAt.startsWith(today);
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
            🔔 Live Notifications
            <button 
              style={{ 
                float: 'right', 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                fontSize: '1.2rem',
                cursor: 'pointer'
              }}
              onClick={() => setShowNotificationPanel(false)}
            >
              ✕
            </button>
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
                      onClick={() => handleCheckIn(booking)}
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
                      onClick={() => handleCheckOut(booking)}
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
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Create Walk-In Reservation</h2>
              <button 
                className="modal-close-button" 
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
                    selectedRoomDetails: {},
                    selectedAmenities: { optional: {}, rental: {}, cottage: null },
                  });
                }}
              >
                ✕
              </button>
            </div>
            {/* Multi-step booking form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (submittingRef.current) return;

                // Validation: Required name fields
                if (!createBookingForm.firstName?.trim()) {
                  alert('❌ First name is required.');
                  return;
                }
                
                if (!createBookingForm.lastName?.trim()) {
                  alert('❌ Last name is required.');
                  return;
                }

                // Validation: Number of guests
                if (createBookingForm.numberOfGuests < 1) {
                  alert('❌ Number of guests must be at least 1.');
                  return;
                }

                // Validation: date validity
                if (!isDateSelectionValid()) {
                  alert('❌ Please select both check-in and check-out dates (single date selection is not allowed).');
                  return;
                }

                // Validation: Check-in date not in the past
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const checkInDate = new Date(createBookingForm.checkIn);
                if (checkInDate < today) {
                  alert('❌ Check-in date cannot be in the past.');
                  return;
                }

                // Validation: Check-out after check-in
                const checkOutDate = new Date(createBookingForm.checkOut);
                if (checkOutDate <= checkInDate) {
                  alert('❌ Check-out date must be after check-in date.');
                  return;
                }

                // Validation: selected rooms exist
                if (Object.keys(createBookingForm.selectedRooms).length === 0) {
                  alert('❌ Please select at least one room.');
                  return;
                }

                // Validation: capacity meets guests
                const totalCapacity = computeTotalCapacity();
                if (totalCapacity < createBookingForm.numberOfGuests) {
                  alert(`❌ Selected rooms can accommodate ${totalCapacity} guest(s), but you have ${createBookingForm.numberOfGuests} guests. Add more rooms or decrease guest count.`);
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

                  const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      guestName,
                      checkIn: createBookingForm.checkIn,
                      checkOut: createBookingForm.checkOut,
                      numberOfGuests: createBookingForm.numberOfGuests,
                      paymentMode: createBookingForm.paymentMode,
                      selectedRooms: createBookingForm.selectedRooms,
                      optional,
                      rental,
                      cottage,
                      nights,
                      status: 'Pending', // Changed from 'Confirmed' - only cashier/super admin can confirm
                      paymentStatus: 'Pending'
                    })
                  });

                  if (!response.ok) {
                    throw new Error('Failed to create booking');
                  }

                  const newBookingData = await response.json();
                  setBookings([...bookings, newBookingData]);
                  alert('Booking created successfully!');

                  // Reset form
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
                    selectedRoomDetails: {},
                    selectedAmenities: { optional: {}, rental: {}, cottage: null },
                  });
                  await fetchBookings();
                } catch (error) {
                  console.error('❌ Booking Error:', error);
                  alert(`❌ Booking Failed: ${error.message}`);
                } finally {
                  submittingRef.current = false;
                  setShowSubmitModal(false);
                }
              }}
            >
              {createBookingStep === 1 && (
                <>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', alignItems: 'flex-start' }}>
                      <div style={{ flex: '0 0 300px' }}>
                        {/* Left side - Calendar */}
                        <BookingCalendar
                          availabilityData={availabilityData}
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
                      
                      <div style={{ flex: '1' }}>
                        {/* Right side - Guest Info and Dates */}
                        <div style={{ 
                          backgroundColor: '#FFF7ED',
                          padding: '15px',
                          borderRadius: '8px',
                          border: '1px solid rgba(254, 190, 82, 0.3)'
                        }}>
                          <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                              Guest Name:
                            </label>
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <div style={{ flex: '1' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px', color: '#666' }}>
                                  First Name *
                                </label>
                                <input
                                  type="text"
                                  name="firstName"
                                  value={createBookingForm.firstName}
                                  onChange={(e) => setCreateBookingForm(prev => ({ ...prev, firstName: e.target.value }))}
                                  required
                                  placeholder="First name"
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                  }}
                                />
                              </div>
                              <div style={{ flex: '0.8' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px', color: '#666' }}>
                                  Middle Name
                                </label>
                                <input
                                  type="text"
                                  name="middleName"
                                  value={createBookingForm.middleName}
                                  onChange={(e) => setCreateBookingForm(prev => ({ ...prev, middleName: e.target.value }))}
                                  placeholder="Middle name (optional)"
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                  }}
                                />
                              </div>
                              <div style={{ flex: '1' }}>
                                <label style={{ display: 'block', fontSize: '12px', marginBottom: '2px', color: '#666' }}>
                                  Last Name *
                                </label>
                                <input
                                  type="text"
                                  name="lastName"
                                  value={createBookingForm.lastName}
                                  onChange={(e) => setCreateBookingForm(prev => ({ ...prev, lastName: e.target.value }))}
                                  required
                                  placeholder="Last name"
                                  style={{
                                    width: '100%',
                                    padding: '8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                  }}
                                />
                              </div>
                            </div>
                          </div>

          <div className="form-field-group">
            <div className="form-field">
              <label className="form-label">
                Number of Guests:
              </label>
              <input
                type="number"
                name="numberOfGuests"
                min="1"
                value={createBookingForm.numberOfGuests}
                onChange={(e) => setCreateBookingForm(prev => ({ ...prev, numberOfGuests: parseInt(e.target.value) || 1 }))}
                required
                className="form-input"
              />
            </div>
          </div>                          <div className="date-display-group">
                            <div className="date-field">
                              <label className="form-label">Check-in:</label>
                              <div className="date-display">
                                <span className="date-icon">📅</span>
                                {createBookingForm.checkIn ? new Date(createBookingForm.checkIn).toLocaleDateString() : 'Select date'}
                              </div>
                            </div>
                            <div className="date-field">
                              <label className="form-label">Check-out:</label>
                              <div className="date-display">
                                <span className="date-icon">📅</span>
                                {createBookingForm.checkOut ? new Date(createBookingForm.checkOut).toLocaleDateString() : 'Select date'}
                              </div>
                            </div>
                          </div>
                        </div>

                        {dateWarning && (
                          <div style={{ 
                            color: '#92400E', 
                            backgroundColor: '#FEF3C7', 
                            padding: '12px 16px', 
                            borderRadius: '8px',
                            margin: '15px 0',
                            border: '1px solid #FCD34D',
                            fontSize: '14px',
                            fontWeight: '500',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                            position: 'relative',
                            zIndex: 10
                          }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px' 
                            }}>
                              <span style={{ fontSize: '16px' }}>⚠️</span>
                              {dateWarning}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Room Selection Below Calendar */}
                    {!dateWarning && createBookingForm.checkIn && createBookingForm.checkOut && (
                      <div style={{ marginTop: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                          <h3 style={{ margin: 0, color: '#92400E' }}>Available Rooms</h3>
                          {roomSearchInProgress && (
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px',
                              color: '#6b7280',
                              fontSize: '14px'
                            }}>
                              <div style={{ 
                                width: '16px', 
                                height: '16px', 
                                border: '2px solid #e5e7eb',
                                borderTop: '2px solid #FEBE52',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                              }}></div>
                              Updating...
                            </div>
                          )}
                        </div>
                        {availableRooms.length === 0 && !roomSearchInProgress ? (
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
                          <div>
                            {/* Requirements Status */}
                            <div className="requirements-status">
                              <h4 className="requirements-title">
                                <span className="requirements-icon">📋</span>
                                Booking Requirements
                              </h4>
                              <div className="requirements-grid">
                                <div className={`requirement-item ${(createBookingForm.firstName && createBookingForm.lastName) ? 'completed' : 'pending'}`}>
                                  <span className="requirement-check">
                                    {(createBookingForm.firstName && createBookingForm.lastName) ? '✓' : '○'}
                                  </span>
                                  <span>Guest Name</span>
                                </div>
                                <div className={`requirement-item ${(createBookingForm.checkIn && createBookingForm.checkOut) ? 'completed' : 'pending'}`}>
                                  <span className="requirement-check">
                                    {(createBookingForm.checkIn && createBookingForm.checkOut) ? '✓' : '○'}
                                  </span>
                                  <span>Dates</span>
                                </div>
                                <div className={`requirement-item ${(Object.keys(createBookingForm.selectedRooms).length > 0) ? 'completed' : 'pending'}`}>
                                  <span className="requirement-check">
                                    {(Object.keys(createBookingForm.selectedRooms).length > 0) ? '✓' : '○'}
                                  </span>
                                  <span>Room Selection</span>
                                </div>
                                <div className={`requirement-item ${(computeTotalCapacity() >= createBookingForm.numberOfGuests) ? 'completed' : 'pending'}`}>
                                  <span className="requirement-check">
                                    {(computeTotalCapacity() >= createBookingForm.numberOfGuests) ? '✓' : '○'}
                                  </span>
                                  <span>Capacity</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className={`rooms-grid ${roomSearchInProgress ? 'loading' : ''}`}>
                            {availableRooms
                              .filter(room => room.type !== 'FAMILY_LODGE')
                              .map((room) => {
                              const selectedQty = createBookingForm.selectedRooms[room.id] || 0;
                              const isFull = room.remaining <= 0;
                              const isSelected = selectedQty > 0;

                              // Calculate total capacity of all selected rooms
                              const totalCapacity = Object.entries(createBookingForm.selectedRooms).reduce((acc, [roomId, qty]) => {
                                const r = availableRooms.find(r => r.id === roomId);
                                if (!r) return acc;
                                let capacity = 0;
                                if (r.type === 'TEPEE') capacity = 5;
                                else if (r.type === 'LOFT') capacity = 3;
                                else if (r.type === 'VILLA') capacity = 10;
                                return acc + (capacity * qty);
                              }, 0);

                              const isCapacitySatisfied = totalCapacity >= createBookingForm.numberOfGuests;
                              const isDisabled = (isFull || (isCapacitySatisfied && !isSelected));

                              return (
                                <div
                                  key={room.id}
                                  className={`room-card ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                                  onClick={() => {
                                    if (isDisabled && !isSelected) return;
                                    setCreateBookingForm(prev => {
                                      const selectedRooms = { ...prev.selectedRooms };
                                      const selectedRoomDetails = { ...prev.selectedRoomDetails };
                                      const currentCapacity = Object.entries(selectedRooms).reduce((acc, [rId, qty]) => {
                                        const r = availableRooms.find(r => r.id === rId);
                                        if (!r) return acc;
                                        let cap = 0;
                                        if (r.type === 'TEPEE') cap = 5;
                                        else if (r.type === 'LOFT') cap = 3;
                                        else if (r.type === 'VILLA') cap = 10;
                                        return acc + (cap * qty);
                                      }, 0);

                                      if (!selectedRooms[room.id]) {
                                        // Adding a room - store details
                                        selectedRooms[room.id] = 1;
                                        selectedRoomDetails[room.id] = {
                                          name: room.name,
                                          type: room.type,
                                          price: room.price,
                                          image: room.image,
                                          remaining: room.remaining
                                        };
                                      } else {
                                        // Removing a room - remove details
                                        delete selectedRooms[room.id];
                                        delete selectedRoomDetails[room.id];
                                      }
                                      return { ...prev, selectedRooms, selectedRoomDetails };
                                    });
                                  }}
                                >
                                  {/* Room Image with Availability Badge */}
                                  <div style={{ position: 'relative', width: '100%', height: '140px' }}>
                                    <img 
                                      src={room.image || '/images/default-room.jpg'} 
                                      alt={room.name}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: '8px 8px 0 0'
                                      }}
                                    />
                                    {/* Availability Badge */}
                                    <div style={{
                                      position: 'absolute',
                                      top: '8px',
                                      right: '8px',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                      backgroundColor: room.remaining === 0 ? '#ef4444' : room.remaining <= 3 ? '#f59e0b' : '#10b981',
                                      color: 'white',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                    }}>
                                      {room.remaining === 0 ? 'Full' : `${room.remaining} left`}
                                    </div>
                                    {/* Selected Checkmark */}
                                    {isSelected && (
                                      <div style={{
                                        position: 'absolute',
                                        top: '8px',
                                        left: '8px',
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: '#10b981',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '14px',
                                        fontWeight: 'bold',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                                      }}>
                                        ✓
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Room Content */}
                                  <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h4 style={{ 
                                      margin: '0 0 8px 0',
                                      fontSize: '16px',
                                      fontWeight: '600',
                                      color: '#1f2937'
                                    }}>
                                      {room.name}
                                    </h4>
                                    
                                    {/* Type and Capacity Tags */}
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                      <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '500',
                                        backgroundColor: '#fef3c7',
                                        color: '#92400e',
                                        border: '1px solid #fcd34d'
                                      }}>
                                        {room.type === 'TEPEE' ? '🏕️ Tepee' : room.type === 'LOFT' ? '🏠 Loft' : '🏰 Villa'}
                                      </span>
                                      <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '11px',
                                        fontWeight: '500',
                                        backgroundColor: '#dbeafe',
                                        color: '#1e40af',
                                        border: '1px solid #93c5fd'
                                      }}>
                                        👥 {room.type === 'TEPEE' ? '1-5' : room.type === 'LOFT' ? '1-3' : '1-10'} guests
                                      </span>
                                    </div>
                                    
                                    {/* Price */}
                                    <div style={{ 
                                      marginTop: 'auto',
                                      paddingTop: '8px'
                                    }}>
                                      <div style={{ 
                                        fontSize: '18px',
                                        fontWeight: '700',
                                        color: '#92400e'
                                      }}>
                                        ₱{(room.price / 100).toFixed(2)}
                                        <span style={{ fontSize: '12px', fontWeight: '400', color: '#6b7280' }}>/night</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Quantity Controls */}
                                  {isSelected && (
                                    <div style={{
                                      borderTop: '1px solid #e5e7eb',
                                      padding: '8px 12px',
                                      backgroundColor: '#fffbeb',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between'
                                    }}>
                                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#92400e' }}>Quantity:</span>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCreateBookingForm(prev => {
                                              const selectedRooms = { ...prev.selectedRooms };
                                              if (selectedRooms[room.id] > 1) {
                                                selectedRooms[room.id] = selectedRooms[room.id] - 1;
                                              }
                                              return { ...prev, selectedRooms };
                                            });
                                          }}
                                          disabled={selectedQty <= 1}
                                          style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            backgroundColor: selectedQty <= 1 ? '#f3f4f6' : 'white',
                                            color: selectedQty <= 1 ? '#9ca3af' : '#374151',
                                            cursor: selectedQty <= 1 ? 'not-allowed' : 'pointer',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            if (selectedQty > 1) {
                                              e.currentTarget.style.borderColor = '#FEBE52';
                                              e.currentTarget.style.backgroundColor = '#fffbeb';
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (selectedQty > 1) {
                                              e.currentTarget.style.borderColor = '#d1d5db';
                                              e.currentTarget.style.backgroundColor = 'white';
                                            }
                                          }}
                                        >
                                          −
                                        </button>
                                        <span style={{
                                          minWidth: '30px',
                                          textAlign: 'center',
                                          fontSize: '15px',
                                          fontWeight: '600',
                                          color: '#1f2937'
                                        }}>
                                          {selectedQty}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCreateBookingForm(prev => {
                                              const selectedRooms = { ...prev.selectedRooms };
                                              if ((selectedRooms[room.id] || 0) < room.remaining) {
                                                selectedRooms[room.id] = (selectedRooms[room.id] || 0) + 1;
                                              }
                                              return { ...prev, selectedRooms };
                                            });
                                          }}
                                          disabled={selectedQty >= room.remaining}
                                          style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            backgroundColor: selectedQty >= room.remaining ? '#f3f4f6' : 'white',
                                            color: selectedQty >= room.remaining ? '#9ca3af' : '#374151',
                                            cursor: selectedQty >= room.remaining ? 'not-allowed' : 'pointer',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                          }}
                                          onMouseEnter={(e) => {
                                            if (selectedQty < room.remaining) {
                                              e.currentTarget.style.borderColor = '#FEBE52';
                                              e.currentTarget.style.backgroundColor = '#fffbeb';
                                            }
                                          }}
                                          onMouseLeave={(e) => {
                                            if (selectedQty < room.remaining) {
                                              e.currentTarget.style.borderColor = '#d1d5db';
                                              e.currentTarget.style.backgroundColor = 'white';
                                            }
                                          }}
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            </div>
                          </div>
                        )}
                        
                        {/* Capacity Status Indicator */}
                        {Object.keys(createBookingForm.selectedRooms).length > 0 && (() => {
                          const totalCapacity = computeTotalCapacity();
                          const isCapacitySufficient = totalCapacity >= createBookingForm.numberOfGuests;
                          
                          return (
                            <div style={{ 
                              marginTop: '15px',
                              padding: '12px',
                              borderRadius: '8px',
                              backgroundColor: isCapacitySufficient ? '#d1fae5' : '#fee2e2',
                              border: `1px solid ${isCapacitySufficient ? '#10b981' : '#ef4444'}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <div style={{ 
                                fontSize: '18px',
                                color: isCapacitySufficient ? '#10b981' : '#ef4444'
                              }}>
                                {isCapacitySufficient ? '✓' : '⚠'}
                              </div>
                              <div style={{ 
                                fontSize: '14px',
                                color: isCapacitySufficient ? '#065f46' : '#991b1b'
                              }}>
                                <strong>Capacity Status:</strong> Selected rooms can accommodate {totalCapacity} guest{totalCapacity !== 1 ? 's' : ''}.
                                {!isCapacitySufficient && (
                                  <span> You need {createBookingForm.numberOfGuests - totalCapacity} more guest capacity.</span>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Payment Mode Selection */}
                    <div style={{ 
                      backgroundColor: '#FFF7ED',
                      padding: '20px',
                      borderRadius: '8px',
                      border: '1px solid rgba(254, 190, 82, 0.3)',
                      marginTop: '20px'
                    }}>
                      <h4 style={{ color: '#92400E', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>💳</span>
                        Payment Mode Selection
                      </h4>
                      <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
                        Choose the payment method the customer will use for this booking:
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                        {[
                          { value: 'cash', label: 'Cash', icon: '💵' },
                          { value: 'gcash', label: 'GCash', icon: '📱' },
                          { value: 'maya', label: 'Maya', icon: '💳' },
                          { value: 'card', label: 'Card', icon: '💳' }
                        ].map((mode) => (
                          <label key={mode.value} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px',
                            borderRadius: '6px',
                            border: `2px solid ${createBookingForm.paymentMode === mode.value ? '#FEBE52' : '#e5e7eb'}`,
                            backgroundColor: createBookingForm.paymentMode === mode.value ? '#FEF3C7' : '#f9fafb',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '14px',
                            fontWeight: createBookingForm.paymentMode === mode.value ? '600' : '400'
                          }}>
                            <input
                              type="radio"
                              name="paymentMode"
                              value={mode.value}
                              checked={createBookingForm.paymentMode === mode.value}
                              onChange={(e) => setCreateBookingForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                              style={{ margin: 0 }}
                            />
                            <span>{mode.icon}</span>
                            <span>{mode.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {createBookingStep === 2 && (
                <>
                  <h3 style={{ color: '#92400E', marginBottom: '20px' }}>Room Amenities</h3>
                  <div style={{ 
                    backgroundColor: '#FFF7ED',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(254, 190, 82, 0.3)'
                  }}>
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ color: '#92400E', marginBottom: '15px' }}>Selected Rooms:</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {Object.entries(createBookingForm.selectedRooms).map(([roomId, quantity]) => {
                        const roomDetails = createBookingForm.selectedRoomDetails[roomId];
                        if (!roomDetails) return null;
                        return (
                          <div key={`selected-room-${roomId}`}>
                            {roomDetails.name} x{quantity}
                          </div>
                        );
                      })}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                      {/* Room Type Based Amenities */}
                      {Object.entries(createBookingForm.selectedRooms).map(([roomId, quantity]) => {
                        const roomDetails = createBookingForm.selectedRoomDetails[roomId];
                        if (!roomDetails) return null;
                        return (
                          <div key={roomId}>
                            <h4 style={{ color: '#92400E', marginBottom: '10px' }}>{roomDetails.name} Included Amenities:</h4>
                            <RoomAmenitiesSelector
                              roomTypes={[roomDetails.type]}
                              selectedAmenities={createBookingForm.selectedAmenities}
                              onAmenitiesChange={(newAmenities) => setCreateBookingForm(prev => ({ 
                                ...prev, 
                                selectedAmenities: newAmenities 
                              }))}
                              showIncludedOnly={true}
                            />
                          </div>
                        );
                      })}

                      {/* Optional Amenities */}
                      <div>
                        <h4 style={{ color: '#92400E', marginBottom: '10px' }}>Optional Amenities:</h4>
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
                        <h4 style={{ color: '#92400E', marginBottom: '10px' }}>Rental Amenities:</h4>
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
                  <h3 style={{ color: '#92400E', marginBottom: '20px' }}>Booking Summary</h3>
                  <div style={{ 
                    backgroundColor: '#FFF7ED',
                    padding: '20px',
                    borderRadius: '8px',
                    border: '1px solid rgba(254, 190, 82, 0.3)'
                  }}>
                    {/* Guest Information */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ color: '#92400E', marginBottom: '10px' }}>Guest Information</h4>
                      <div style={{ display: 'grid', gap: '10px' }}>
                        <div>
                          <strong>Guest Name:</strong> {`${createBookingForm.firstName}${createBookingForm.middleName ? ' ' + createBookingForm.middleName : ''} ${createBookingForm.lastName}`.trim()}
                        </div>
                        <div>
                          <strong>Number of Guests:</strong> {createBookingForm.numberOfGuests}
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
                      <h4 style={{ color: '#92400E', marginBottom: '10px' }}>Selected Rooms</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {Object.entries(createBookingForm.selectedRooms).map(([roomId, quantity]) => {
                          const roomDetails = createBookingForm.selectedRoomDetails[roomId];
                          if (!roomDetails) return null;
                          return (
                            <div key={roomId} style={{
                              padding: '8px 12px',
                              backgroundColor: 'rgba(254, 190, 82, 0.1)',
                              borderRadius: '6px',
                              border: '1px solid rgba(254, 190, 82, 0.3)',
                              fontSize: '14px'
                            }}>
                              {roomDetails.name} x{quantity}
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
                      {Object.entries(createBookingForm.selectedRooms).map(([roomId, quantity]) => {
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
                      {Object.entries(createBookingForm.selectedAmenities.optional).map(([amenityId, quantity]) => {
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
                      {Object.entries(createBookingForm.selectedAmenities.rental).map(([amenityId, details]) => {
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
                          alert('❌ First name is required.');
                          return;
                        }
                        if (!createBookingForm.lastName?.trim()) {
                          alert('❌ Last name is required.');
                          return;
                        }
                        if (createBookingForm.numberOfGuests < 1) {
                          alert('❌ Number of guests must be at least 1.');
                          return;
                        }
                        if (!createBookingForm.checkIn || !createBookingForm.checkOut) {
                          alert('❌ Please select both check-in and check-out dates.');
                          return;
                        }
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const checkInDate = new Date(createBookingForm.checkIn);
                        if (checkInDate < today) {
                          alert('❌ Check-in date cannot be in the past.');
                          return;
                        }
                        const checkOutDate = new Date(createBookingForm.checkOut);
                        if (checkOutDate <= checkInDate) {
                          alert('❌ Check-out date must be after check-in date.');
                          return;
                        }
                        if (Object.keys(createBookingForm.selectedRooms).length === 0) {
                          alert('❌ Please select at least one room.');
                          return;
                        }
                        const totalCapacity = computeTotalCapacity();
                        if (totalCapacity < createBookingForm.numberOfGuests) {
                          alert(`❌ Selected rooms can accommodate ${totalCapacity} guest(s), but you have ${createBookingForm.numberOfGuests} guests.`);
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
                {createBookingStep === 3 && (() => {
                  // Check if all requirements are satisfied
                  const isValidForSubmission = 
                    createBookingForm.firstName?.trim() &&
                    createBookingForm.lastName?.trim() &&
                    createBookingForm.numberOfGuests >= 1 &&
                    createBookingForm.checkIn &&
                    createBookingForm.checkOut &&
                    Object.keys(createBookingForm.selectedRooms).length > 0 &&
                    computeTotalCapacity() >= createBookingForm.numberOfGuests;

                  return (
                    <button
                      type="submit"
                      disabled={!isValidForSubmission}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: isValidForSubmission ? '#FEBE52' : '#d1d5db',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isValidForSubmission ? 'pointer' : 'not-allowed',
                        color: isValidForSubmission ? '#fff' : '#9ca3af',
                        fontWeight: 'bold',
                        opacity: isValidForSubmission ? 1 : 0.6,
                        transition: 'all 0.2s ease'
                      }}
                      title={!isValidForSubmission ? 'Please complete all required fields and selections' : 'Create booking'}
                    >
                      {isValidForSubmission ? 'Create Booking' : 'Complete Requirements'}
                    </button>
                  );
                })()}
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
                      <span className={`status-badge ${booking.status?.toLowerCase() || 'pending'}`}>
                        {booking.status || 'Pending'}
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
                        {booking.roomAssignments?.[0]?.roomName || 'Not assigned'}
                      </span>
                    </div>
                    
                    <div className="detail-row">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                      </svg>
                      <span className="detail-label">Guests:</span>
                      <span className="detail-value">{typeof booking.numberOfGuests === 'number' ? booking.numberOfGuests : (booking.numberOfGuests ?? 1)}</span>
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
                    
                    {booking.status === 'HELD' || booking.status === 'Pending' ? (
                      <>
                        {/* Pending bookings can only be confirmed by super admin or cashier */}
                        {booking.status === 'Pending' && (
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
              <p><strong>Guests:</strong> {typeof quickViewGuest.numberOfGuests === 'number' ? quickViewGuest.numberOfGuests : (quickViewGuest.numberOfGuests ?? 1)}</p>
              <p><strong>Status:</strong> <span className={`status-${quickViewGuest.status.toLowerCase()}`}>{quickViewGuest.status}</span></p>
              {quickViewGuest.remarks && <p><strong>Remarks:</strong> {quickViewGuest.remarks}</p>}
              {quickViewGuest.roomAssignments && (
                <div>
                  <p><strong>Room Assignment:</strong></p>
                  <ul>
                    {quickViewGuest.roomAssignments.map((room, index) => (
                      <li key={index}>{room.roomName} ({room.type})</li>
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
            style={{
              background: 'linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%)',
              padding: '20px',
              borderRadius: '8px',
              width: '600px',
              maxWidth: '90%',
              maxHeight: '80%',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              position: 'relative',
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
              <strong>Check-out:</strong> {new Date(modalData.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Guests:</strong> {typeof modalData.numberOfGuests === 'number' ? modalData.numberOfGuests : (modalData.numberOfGuests ?? 'N/A')}
            </div>

            {modalData.rooms && Array.isArray(modalData.rooms) && modalData.rooms.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Selected Rooms:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {modalData.rooms.map((r) => (
                    <li key={`room-${r.room.id}`}>{r.room.name} x{r.quantity}</li>
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

            <div style={{ marginBottom: '10px' }}>
              <strong>Payment Mode:</strong> 
              <span style={{
                marginLeft: '10px',
                padding: '4px 8px',
                borderRadius: '4px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FEBE52',
                fontSize: '14px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {(() => {
                  const mode = modalData.paymentMode?.toLowerCase() || 'cash';
                  const icons = { cash: '💵', gcash: '📱', maya: '💳', card: '💳' };
                  const labels = { cash: 'Cash', gcash: 'GCash', maya: 'Maya', card: 'Card' };
                  return (
                    <>
                      <span>{icons[mode] || '💵'}</span>
                      <span>{labels[mode] || 'Cash'}</span>
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
                      <li style={{ marginTop: '10px', fontWeight: 'bold' }}>
                        Total Price: ₱{(Number(modalData.totalCostWithAddons || modalData.totalPrice) / 100).toFixed(0)}
                      </li>
                    </>
                  );
                })()}
              </ul>
            </div>

            {/* Action Buttons - always show row, buttons conditionally rendered */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end', flexWrap: 'wrap', minHeight: '44px' }}>
              {/* Show Check In button if not checked in yet (actualCheckIn is null and status is HELD, PENDING, or Confirmed) */}
              {(['HELD', 'PENDING', 'Confirmed'].includes(modalData.status) && !modalData.actualCheckIn) && (
                <button
                  onClick={async () => {
                    const today = new Date();
                    const checkInDate = new Date(modalData.checkIn);
                    if (today < new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate())) {
                      setEarlyCheckInModal({
                        show: true,
                        date: checkInDate
                      });
                      return;
                    }
                    try {
                      await handleCheckIn(modalData.id);
                      closeModal();
                    } catch (error) {
                      console.error('Error checking in:', error);
                    }
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
              {(modalData.actualCheckIn && !modalData.actualCheckOut && ['Confirmed', 'Checked-In'].includes(modalData.status)) && (
                <button
                  onClick={() => {
                    closeModal();
                    openStatusModal(modalData.id, 'CHECKED_OUT');
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
      
      <style jsx>{`
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
          border-top-color: #3b82f6;
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
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1), 0 1px 3px rgba(0, 0, 0, 0.1);
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
          border-color: #3b82f6;
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
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border-radius: 16px;
          border: 2px solid #0ea5e9;
          box-shadow: 0 4px 16px rgba(14, 165, 233, 0.1);
        }
        
        .requirements-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 700;
          color: #0c4a6e;
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
          background: linear-gradient(90deg, #FEBE52, #3b82f6, #10b981);
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
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
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
          background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
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
    </div>
  );
}