'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useEarlyCheckInModal, EarlyCheckInModal } from '@/components/CustomModals';
import { signOut } from 'next-auth/react';
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
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [allRooms, setAllRooms] = useState([]);
  const [allAmenities, setAllAmenities] = useState({
    inventory: [],
    optional: [],
    rental: []
  });
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);

  // New state for booking creation form
  const [createBookingStep, setCreateBookingStep] = useState(1);
  const [createBookingForm, setCreateBookingForm] = useState({
    guestName: '',
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1,
    selectedRooms: {},
    selectedAmenities: { optional: {}, rental: {}, cottage: null },
  });
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [dateWarning, setDateWarning] = useState('');
  const [roomLockWarning, setRoomLockWarning] = useState('');
  const [rentalAmenitiesData, setRentalAmenitiesData] = useState([]);
  const [optionalAmenitiesData, setOptionalAmenitiesData] = useState([]);
  const [createTotalPrice, setCreateTotalPrice] = useState(0);
  const [availabilityData, setAvailabilityData] = useState({});

  // Modal state to prevent spam clicks
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // New state for animated dots in modal
  const [dotCount, setDotCount] = useState(1);

  // Submit ref to prevent multiple submissions
  const submittingRef = useRef(false);

  // State for new features
  const [quickViewGuest, setQuickViewGuest] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    pendingCheckIns: [],
    pendingCheckOuts: [],
    pendingBookings: 0,
  });
  const [shiftSummary, setShiftSummary] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [bookingToCancel, setBookingToCancel] = useState(null);
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

  // Booking adjustment controls
  const [showAdjustBookingModal, setShowAdjustBookingModal] = useState(false);
  const [bookingToAdjust, setBookingToAdjust] = useState(null);
  const [adjustBookingForm, setAdjustBookingForm] = useState({
    guestName: '',
    checkIn: '',
    checkOut: '',
    numberOfGuests: 1,
    selectedAmenities: { optional: {}, rental: {}, cottage: null },
    remarks: '',
  });

  // Booking remarks
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [bookingForRemarks, setBookingForRemarks] = useState(null);
  const [bookingRemarks, setBookingRemarks] = useState('');

  // Booking details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [bookingForDetails, setBookingForDetails] = useState(null);
  // Early check-in modal (shared)
  const [earlyCheckInModal, setEarlyCheckInModal] = useEarlyCheckInModal();

  // Enhanced status shortcuts
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusChangeData, setStatusChangeData] = useState({
    bookingId: null,
    newStatus: '',
    reason: '',
  });

  // Enhanced guest lookup
  const [guestLookupResults, setGuestLookupResults] = useState([]);
  const [isSearchingGuests, setIsSearchingGuests] = useState(false);

  // Notification panel
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notificationCategories, setNotificationCategories] = useState({
    checkIns: [],
    checkOuts: [],
    maintenance: [],
    housekeeping: [],
    general: [],
  });

  // Shift summary
  const [showShiftSummaryModal, setShowShiftSummaryModal] = useState(false);

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

  const handleCancelBooking = async () => {
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
      setShowCancelModal(false);
      setCancelReason('');
      setBookingToCancel(null);
    } catch (error) {
      console.error('Error cancelling booking:', error);
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
    setCreateBookingForm(prev => ({ ...prev, guestName: name }));
    if (name.length > 2) {
      setShowGuestSuggestions(true);
      searchGuests(name);
    } else {
      setShowGuestSuggestions(false);
      setGuestLookupResults([]);
    }
  };

  const handleGuestSelect = (guest) => {
    setGuestNameInput(guest.name);
    setCreateBookingForm(prev => ({ ...prev, guestName: guest.name }));
    setShowGuestSuggestions(false);
  };

  const openQuickView = (guest) => {
    setQuickViewGuest(guest);
    setIsQuickViewOpen(true);
  };

  const closeQuickView = () => {
    setIsQuickViewOpen(false);
    setQuickViewGuest(null);
  };

  // Booking adjustment controls
  const openAdjustBookingModal = (booking) => {
    setBookingToAdjust(booking);
    setAdjustBookingForm({
      guestName: booking.guestName,
      checkIn: booking.checkIn.split('T')[0],
      checkOut: booking.checkOut.split('T')[0],
      numberOfGuests: booking.numberOfGuests,
      selectedAmenities: booking.selectedAmenities || { optional: {}, rental: {}, cottage: null },
      remarks: booking.remarks || '',
    });
    setShowAdjustBookingModal(true);
  };

  const handleAdjustBooking = async () => {
    if (!bookingToAdjust) return;
    try {
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
      setShowAdjustBookingModal(false);
      setBookingToAdjust(null);
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking. Please try again.');
    }
  };

  // Booking remarks functionality
  const openRemarksModal = (booking) => {
    setBookingForRemarks(booking);
    setBookingRemarks(booking.remarks || '');
    setShowRemarksModal(true);
  };

  // Booking details modal functionality
  const openDetailsModal = (booking) => {
    setBookingForDetails(booking);
    setShowDetailsModal(true);
  };

  const handleSaveRemarks = async () => {
    if (!bookingForRemarks) return;
    try {
      const updatedData = {
        ...bookingForRemarks,
        remarks: bookingRemarks,
      };
      const res = await fetch(`/api/bookings/${bookingForRemarks.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      if (!res.ok) throw new Error('Failed to save remarks');
      await fetchBookings();
      setShowRemarksModal(false);
      setBookingForRemarks(null);
      setBookingRemarks('');
    } catch (error) {
      console.error('Error saving remarks:', error);
      alert('Failed to save remarks. Please try again.');
    }
  };

  // Enhanced status shortcuts
  const openStatusModal = (bookingId, newStatus) => {
    setStatusChangeData({
      bookingId,
      newStatus,
      reason: '',
    });
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!statusChangeData.bookingId || !statusChangeData.reason.trim()) {
      alert('Please provide a reason for the status change.');
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
    setGuestNameInput(guest.name);
    setCreateBookingForm(prev => ({ ...prev, guestName: guest.name }));
    setGuestLookupResults([]);
    setShowGuestSuggestions(false);
  };

  // Notification panel functionality
  const loadNotifications = () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    setNotificationCategories({
      checkIns: bookings.filter(b => b.checkIn && b.checkIn.startsWith(today) && b.status === 'HELD'),
      checkOuts: bookings.filter(b => b.checkOut && b.checkOut.startsWith(today) && b.status === 'Confirmed'),
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
      const res = await fetch('/api/bookings');
      if (!res.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const allBookings = await res.json();
      setBookings(allBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (checkIn, checkOut) => {
    try {
      const url = new URL('/api/rooms', window.location.origin);
      if (checkIn) url.searchParams.append('checkIn', checkIn);
      if (checkOut) url.searchParams.append('checkOut', checkOut);

      const res = await fetch(url);
      if (!res || !res.ok) { 
        throw new Error('Failed to fetch rooms');
      }
      const rooms = await res.json();
      setAllRooms(rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const fetchAmenities = async () => {
    try {
      const res = await fetch('/api/amenities');
      if (!res.ok) {
        throw new Error('Failed to fetch amenities');
      }
      const amenities = await res.json();
      setAllAmenities(amenities);
    } catch (error) {
      console.error('Error fetching amenities:', error);
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
    fetchRooms();
  }, []);

  useEffect(() => {
    if (bookings.length > 0) {
      updateNotifications(bookings);
      loadNotifications();
    }
  }, [bookings]);

  useEffect(() => {
    if (createBookingForm.checkIn && createBookingForm.checkOut) {
      fetchRooms(createBookingForm.checkIn, createBookingForm.checkOut);
    } else {
      fetchRooms();
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

  const pendingBookings = bookings.filter(
    (b) => ['HELD', 'PENDING'].includes(b.status)
  );
  const confirmedBookings = bookings.filter(
    (b) => b.status === 'Confirmed'
  );

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

  return (
    <div className="receptionist-layout">
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
          <div className="current-time">
            {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
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
            {(notifications.pendingCheckIns.length + notifications.pendingCheckOuts.length + notifications.pendingBookings) > 0 && (
              <span className="notification-badge urgent">
                {notifications.pendingCheckIns.length + notifications.pendingCheckOuts.length + notifications.pendingBookings}
              </span>
            )}
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
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">Resort Receptionist Dashboard</h1>
          
          {/* Quick Action Panel */}
          <div className="quick-actions">
            <button 
              className="quick-action-btn check-in" 
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
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <span className="action-label">Arrivals</span>
              {notifications.pendingCheckIns.length > 0 && (
                <span className="notification-badge">{notifications.pendingCheckIns.length}</span>
              )}
            </button>
            
            <button 
              className="quick-action-btn check-out" 
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
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              <span className="action-label">Departures</span>
              {notifications.pendingCheckOuts.length > 0 && (
                <span className="notification-badge">{notifications.pendingCheckOuts.length}</span>
              )}
            </button>
            
            <button 
              className="quick-action-btn guest-lookup" 
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
                setShowCreateBookingModal(true);
              }}
            >
              <svg className="action-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="action-label">New Reservation</span>
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
                </div>
              </div>
            ))}
            
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

      {showCreateBookingModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Create Walk-In Reservation</h2>
              <button 
                className="modal-close-button" 
                onClick={() => {
                  setShowCreateBookingModal(false);
                  setCreateBookingStep(1);
                  setCreateBookingForm({
                    guestName: '',
                    checkIn: '',
                    checkOut: '',
                    numberOfGuests: 1,
                    selectedRooms: {},
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

                // Validation: date validity
                if (!isDateSelectionValid()) {
                  alert('❌ Please select both check-in and check-out dates (single date selection is not allowed).');
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

                  const response = await fetch('/api/bookings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      guestName: createBookingForm.guestName,
                      checkIn: createBookingForm.checkIn,
                      checkOut: createBookingForm.checkOut,
                      numberOfGuests: createBookingForm.numberOfGuests,
                      selectedRooms: createBookingForm.selectedRooms,
                      optional,
                      rental,
                      cottage,
                      nights,
                      status: 'Confirmed',
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
                  setShowCreateBookingModal(false);
                  setCreateBookingStep(1);
                  setCreateBookingForm({
                    guestName: '',
                    checkIn: '',
                    checkOut: '',
                    numberOfGuests: 1,
                    selectedRooms: {},
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
                          <label style={{ display: 'block', marginBottom: '15px' }}>
                            Guest Name:
                            <input
                              type="text"
                              name="guestName"
                              value={createBookingForm.guestName}
                              onChange={(e) => setCreateBookingForm(prev => ({ ...prev, guestName: e.target.value }))}
                              required
                              style={{
                                width: '100%',
                                padding: '8px',
                                marginTop: '4px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                              }}
                            />
                          </label>

                          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                            <div style={{ flex: '1' }}>
                              <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
                                Number of Guests:
                              </label>
                              <input
                                type="number"
                                name="numberOfGuests"
                                min="1"
                                value={createBookingForm.numberOfGuests}
                                onChange={(e) => setCreateBookingForm(prev => ({ ...prev, numberOfGuests: parseInt(e.target.value) || 1 }))}
                                required
                                style={{
                                  width: '100%',
                                  padding: '8px',
                                  borderRadius: '4px',
                                  border: '1px solid #ccc',
                                }}
                              />
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
                            color: '#92400E', 
                            backgroundColor: '#FEF3C7', 
                            padding: '10px', 
                            borderRadius: '4px',
                            marginTop: '10px',
                            border: '1px solid #FCD34D',
                            fontSize: '14px'
                          }}>
                            {dateWarning}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Room Selection Below Calendar */}
                    {!dateWarning && createBookingForm.checkIn && createBookingForm.checkOut && (
                      <div style={{ marginTop: '20px' }}>
                        <h3 style={{ marginBottom: '15px', color: '#92400E' }}>Available Rooms</h3>
                        {loadingRooms ? (
                          <p>Loading rooms...</p>
                        ) : availableRooms.length === 0 ? (
                          <p>No rooms available for the selected dates.</p>
                        ) : (
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                            gap: '15px' 
                          }}>
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
                                  style={{
                                    border: isSelected ? '2px solid #FEBE52' : '1px solid #e2e8f0',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    backgroundColor: isSelected ? '#FFF7ED' : 'white',
                                    cursor: isFull ? 'not-allowed' : 'pointer',
                                    opacity: isFull ? 0.6 : 1,
                                  }}
                                  onClick={() => {
                                    if (isDisabled && !isSelected) return;
                                    setCreateBookingForm(prev => {
                                      const selectedRooms = { ...prev.selectedRooms };
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
                                        // Adding a room
                                        selectedRooms[room.id] = 1;
                                      } else {
                                        // Removing a room
                                        delete selectedRooms[room.id];
                                      }
                                      return { ...prev, selectedRooms };
                                    });
                                  }}
                                >
                                  <img 
                                    src={room.image || '/images/default-room.jpg'} 
                                    alt={room.name}
                                    style={{
                                      width: '100%',
                                      height: '120px',
                                      objectFit: 'cover',
                                      borderRadius: '4px',
                                      marginBottom: '8px'
                                    }}
                                  />
                                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{room.name}</h4>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#92400E' }}>
                                    Capacity: {
                                      room.type === 'TEPEE' ? '1-5 guests' :
                                      room.type === 'LOFT' ? '1-3 guests' :
                                      room.type === 'VILLA' ? '1-10 guests' : 'N/A'
                                    }
                                  </p>
                                  <p style={{ margin: '0', fontSize: '16px', fontWeight: 'bold', color: '#FEBE52' }}>
                                    ₱{(room.price / 100).toFixed(2)}
                                  </p>
                                  {isSelected && (
                                    <div style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      justifyContent: 'center',
                                      gap: '10px',
                                      marginTop: '10px' 
                                    }}>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setCreateBookingForm(prev => {
                                            const selectedRooms = { ...prev.selectedRooms };
                                            selectedRooms[room.id] = Math.max(1, (selectedRooms[room.id] || 1) - 1);
                                            return { ...prev, selectedRooms };
                                          });
                                        }}
                                        style={{
                                          width: '30px',
                                          height: '30px',
                                          borderRadius: '50%',
                                          border: 'none',
                                          backgroundColor: '#FEBE52',
                                          color: 'white',
                                          cursor: 'pointer',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        -
                                      </button>
                                      <span>{selectedQty}</span>
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
                                        style={{
                                          width: '30px',
                                          height: '30px',
                                          borderRadius: '50%',
                                          border: 'none',
                                          backgroundColor: '#FEBE52',
                                          color: 'white',
                                          cursor: 'pointer',
                                          fontWeight: 'bold'
                                        }}
                                      >
                                        +
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
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
                        const room = availableRooms.find(r => r.id === roomId);
                        if (!room) return null;
                        return (
                          <div key={`selected-room-${roomId}`}>
                            {room.name} x{quantity}
                          </div>
                        );
                      })}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '20px' }}>
                      {/* Room Type Based Amenities */}
                      {Object.entries(createBookingForm.selectedRooms).map(([roomId, quantity]) => {
                        const room = availableRooms.find(r => r.id === roomId);
                        if (!room) return null;
                        return (
                          <div key={roomId}>
                            <h4 style={{ color: '#92400E', marginBottom: '10px' }}>{room.name} Included Amenities:</h4>
                            <RoomAmenitiesSelector
                              roomTypes={[room.type]}
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
                          <strong>Guest Name:</strong> {createBookingForm.guestName}
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
                          const room = availableRooms.find(r => r.id === roomId);
                          if (!room) return null;
                          return (
                            <div key={roomId} style={{
                              padding: '8px 12px',
                              backgroundColor: 'rgba(254, 190, 82, 0.1)',
                              borderRadius: '6px',
                              border: '1px solid rgba(254, 190, 82, 0.3)',
                              fontSize: '14px'
                            }}>
                              {room.name} x{quantity}
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
                        const room = availableRooms.find(r => r.id === roomId);
                        if (!room) return null;
                        const nights = Math.max(1, (new Date(createBookingForm.checkOut) - new Date(createBookingForm.checkIn)) / (1000 * 60 * 60 * 24));
                        const roomTotal = (room.price * quantity * nights);
                        return (
                          <div key={roomId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>{room.name} x{quantity} ({nights} nights)</span>
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
                    onClick={() => setCreateBookingStep(step => Math.min(3, step + 1))}
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
                    setShowCreateBookingModal(false);
                    setCreateBookingStep(1);
                    setCreateBookingForm({
                      guestName: '',
                      checkIn: '',
                      checkOut: '',
                      numberOfGuests: 1,
                      selectedRooms: {},
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

              {/* Live Total Display - Bottom Left */}
              {createTotalPrice > 0 && (
                <div style={{ 
                  position: 'absolute', 
                  bottom: '20px', 
                  left: '20px', 
                  fontWeight: 'bold', 
                  fontSize: '1.2rem', 
                  color: '#B45309',
                  backgroundColor: 'rgba(254, 248, 237, 0.9)',
                  padding: '10px 15px',
                  borderRadius: '8px',
                  border: '1px solid #FEBE52'
                }}>
                  Total Price: ₱{(createTotalPrice / 100).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
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
                  zIndex: 1001
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
      <div className="section-container">
        <div className="section-card booking-management">
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
                      <span className="detail-value">{booking.numberOfGuests || 1}</span>
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
                    
                    {booking.status === 'HELD' ? (
                      <>
                        <button 
                          className="action-btn success" 
                          onClick={() => openStatusModal(booking.id, 'Confirmed')}
                          title="Confirm Booking"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Confirm
                        </button>
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
      {showAdjustBookingModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Adjust Booking</h3>
              <button className="modal-close-button" onClick={() => setShowAdjustBookingModal(false)}>×</button>
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
      {showRemarksModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Booking Remarks</h3>
              <button className="modal-close-button" onClick={() => setShowRemarksModal(false)}>×</button>
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
              <p><strong>Guests:</strong> {quickViewGuest.numberOfGuests}</p>
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
      {showDetailsModal && bookingForDetails && (
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
                  setShowDetailsModal(false);
                  setBookingForDetails(null);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Check-in:</strong> {new Date(bookingForDetails.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Check-out:</strong> {new Date(bookingForDetails.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong>Guests:</strong> {bookingForDetails.numberOfGuests || 'N/A'}
            </div>

            {bookingForDetails.rooms && Array.isArray(bookingForDetails.rooms) && bookingForDetails.rooms.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Selected Rooms:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {bookingForDetails.rooms.map((r) => (
                    <li key={`room-${r.room.id}`}>{r.room.name} x{r.quantity}</li>
                  ))}
                </ul>
              </div>
            )}

            {bookingForDetails.optionalAmenities && Array.isArray(bookingForDetails.optionalAmenities) && bookingForDetails.optionalAmenities.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Optional Amenities:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {bookingForDetails.optionalAmenities.map((oa) => (
                    <li key={`optional-${oa.optionalAmenity.id}`}>{oa.optionalAmenity.name} x{oa.quantity}</li>
                  ))}
                </ul>
              </div>
            )}

            {bookingForDetails.rentalAmenities && Array.isArray(bookingForDetails.rentalAmenities) && bookingForDetails.rentalAmenities.length > 0 && (
              <div style={{ marginBottom: '10px' }}>
                <strong>Rental Amenities:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {bookingForDetails.rentalAmenities.map((ra) => (
                    <li key={`rental-${ra.rentalAmenity.id}`}>{ra.rentalAmenity.name} x{ra.quantity} {ra.hoursUsed ? `(${ra.hoursUsed}h)` : ''}</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginBottom: '10px' }}>
              <strong>Price Breakdown:</strong>
              <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                {(() => {
                  const nights = Math.max(1, (new Date(bookingForDetails.checkOut) - new Date(bookingForDetails.checkIn)) / (1000 * 60 * 60 * 24));
                  return (
                    <>
                      {bookingForDetails.rooms && Array.isArray(bookingForDetails.rooms) && bookingForDetails.rooms.map((r, idx) => {
                        const roomTotal = Number(r.room.price) * r.quantity * nights;
                        return (
                          <li key={`room-${idx}`}>
                            {r.room.name} x{r.quantity} ({nights} nights): ₱{(roomTotal / 100).toFixed(0)}
                          </li>
                        );
                      })}
                      {bookingForDetails.optionalAmenities && Array.isArray(bookingForDetails.optionalAmenities) && bookingForDetails.optionalAmenities.map((oa, idx) => {
                        const optionalTotal = (Number(oa.optionalAmenity.price || 0) * oa.quantity);
                        return (
                          <li key={`amenity-${idx}`}>
                            {oa.optionalAmenity.name} x{oa.quantity}: ₱{(optionalTotal / 100).toFixed(0)}
                          </li>
                        );
                      })}
                      {bookingForDetails.rentalAmenities && Array.isArray(bookingForDetails.rentalAmenities) && bookingForDetails.rentalAmenities.map((ra, idx) => (
                        <li key={`rental-${idx}`}>
                          {ra.rentalAmenity.name} x{ra.quantity} {ra.hoursUsed ? `(${ra.hoursUsed}h)` : ''}: ₱{(Number(ra.totalPrice) / 100).toFixed(0)}
                        </li>
                      ))}
                      <li style={{ marginTop: '10px', fontWeight: 'bold' }}>
                        Total Price: ₱{(Number(bookingForDetails.totalCostWithAddons || bookingForDetails.totalPrice) / 100).toFixed(0)}
                      </li>
                    </>
                  );
                })()}
              </ul>
            </div>

            {/* Action Buttons - always show row, buttons conditionally rendered */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end', flexWrap: 'wrap', minHeight: '44px' }}>
              {/* Show Check In button if not checked in yet (actualCheckIn is null and status is HELD, PENDING, or Confirmed) */}
              {(['HELD', 'PENDING', 'Confirmed'].includes(bookingForDetails.status) && !bookingForDetails.actualCheckIn) && (
                <button
                  onClick={async () => {
                    const today = new Date();
                    const checkInDate = new Date(bookingForDetails.checkIn);
                    if (today < new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate())) {
                      setEarlyCheckInModal({
                        show: true,
                        date: checkInDate
                      });
                      return;
                    }
                    try {
                      await handleCheckIn(bookingForDetails.id);
                      setShowDetailsModal(false);
                      setBookingForDetails(null);
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
              {(bookingForDetails.actualCheckIn && !bookingForDetails.actualCheckOut && ['Confirmed', 'Checked-In'].includes(bookingForDetails.status)) && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setBookingForDetails(null);
                    openStatusModal(bookingForDetails.id, 'CHECKED_OUT');
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
    </div>
  );
}