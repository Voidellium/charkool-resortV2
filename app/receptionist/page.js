'use client';
import React, { useEffect, useState, useRef } from 'react';
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
    upcomingReservations: 0,
  });
  const [shiftSummary, setShiftSummary] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [pastGuests, setPastGuests] = useState([]);
  const [guestNameInput, setGuestNameInput] = useState('');
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);

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

    const pendingCheckIns = allBookings.filter(b => b.checkIn.startsWith(today) && b.status === 'HELD');
    const pendingCheckOuts = allBookings.filter(b => b.checkOut.startsWith(today) && b.status === 'Confirmed');
    const upcomingReservations = allBookings.filter(b => b.checkIn.startsWith(tomorrowStr)).length;

    setNotifications({
      pendingCheckIns,
      pendingCheckOuts,
      upcomingReservations,
    });
  };

  const generateShiftSummary = () => {
    const today = new Date().toISOString().split('T')[0];
    const summary = {
      date: today,
      walkInBookings: bookings.filter(b => b.createdAt?.startsWith(today) && b.status === 'Confirmed').length,
      checkedIn: bookings.filter(b => b.checkIn.startsWith(today) && b.status === 'Confirmed').length,
      checkedOut: bookings.filter(b => b.checkOut.startsWith(today) && b.status === 'CHECKED_OUT').length,
      cancelled: bookings.filter(b => b.status === 'Cancelled').length,
      noShows: bookings.filter(b => b.status === 'No-Show').length,
      pendingReservations: bookings.filter(b => b.status === 'HELD').length,
    };
    setShiftSummary(summary);
    setShowShiftSummaryModal(true);
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
      checkIns: bookings.filter(b => b.checkIn.startsWith(today) && b.status === 'HELD'),
      checkOuts: bookings.filter(b => b.checkOut.startsWith(today) && b.status === 'Confirmed'),
      maintenance: [], // Would be populated from maintenance API
      housekeeping: [], // Would be populated from housekeeping API
      general: bookings.filter(b => b.checkIn.startsWith(tomorrowStr)).slice(0, 3),
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
      const updatedData = { ...bookingToUpdate, status: 'Confirmed' };
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
      const updatedData = { ...bookingToUpdate, status: 'CHECKED_OUT' };
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

  const upcomingReservations = bookings.filter(
    (b) => ['HELD', 'PENDING'].includes(b.status)
  );
    const currentGuests = bookings.filter(
    (b) => b.status === 'Confirmed'
  );

  if (loading) {
    return (
      <div className="loading-container">
        <p>Loading dashboard...</p>
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
    <div className="dashboard-container">
      <div className="header-container">
        <div>
          <h1 className="header-title">Receptionist Dashboard</h1>
          <p className="user-id">User ID: 1234113340746626333</p>
        </div>
        <div className="header-actions">
          <button
            className="create-booking-button"
            onClick={() => {
              setShowCreateBookingModal(true);
            }}
          >
            Create Walk-In Booking
          </button>
          <div className="profile-icon" onClick={toggleDropdown}>
            <svg className="profile-image" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0a4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.149.337L18.667 21h-13.334c-.276 0-.54-.094-.75-.25a.75.75 0 0 1-.149-.337Z" clipRule="evenodd" />
            </svg>
            {isDropdownOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-item">Profile</div>
                <div className="dropdown-item">Settings</div>
                <div className="dropdown-item logout" onClick={handleSignOut}>
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="kpi-card-container">
        <div className="kpi-card">
          <p className="kpi-card-title">Rooms Occupied</p>
          <p className="kpi-card-metric">{occupiedRoomsCount}</p>
          <p className="kpi-card-total">/{totalRoomsCount}</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-card-title">Rooms Available</p>
          <p className="kpi-card-metric">{availableRoomsCount}</p>
        </div>
      </div>

      {showCreateBookingModal && (
        <div
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
            style={{
              backgroundColor: '#FFF7ED', // Light yellow from FEBE52 theme
              borderRadius: '8px',
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(254, 190, 82, 0.5)',
              padding: '20px',
              color: '#92400E', // Darker brown/orange
              fontFamily: 'Arial, sans-serif',
            }}
          >
            <h2 style={{ marginBottom: '20px', color: '#FEBE52' }}>Create Walk-In Booking</h2>
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

      {/* Notification Bell Icon */}
      <div className="notification-bell" onClick={() => { loadNotifications(); setShowNotificationPanel(true); }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 14 3 18 3 18H21C21 18 18 14 18 8Z" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21C13.554 21.55 13.24 22.04 12.81 22.41C12.38 22.78 11.87 23 11.34 23C10.81 23 10.29 22.78 9.86 22.41C9.43 22.04 9.13 21.55 8.95 21" stroke="#92400E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {notifications.pendingCheckIns.length > 0 && <span className="notification-dot"></span>}
      </div>

      {/* Shift Summary Button */}
      <button className="shift-summary-button" onClick={generateShiftSummary}>
        Shift Summary
      </button>

      <div className="section-container">
        <div className="section-card">
          <h2 className="section-title">
            Upcoming Reservations ({upcomingReservations.length})
          </h2>
          <div className="guest-list-container">
            {upcomingReservations.map((booking) => (
              <div key={booking.id} className="guest-card">
                <div className="guest-info">
                  <p className="guest-name" onClick={() => openQuickView(booking)}>{booking.guestName}</p>
                  <p className="guest-details">Check-in: {new Date(booking.checkIn).toLocaleDateString()}</p>
                  {booking.remarks && <p className="guest-remarks">Notes: {booking.remarks}</p>}
                </div>
                <div className="guest-actions">
                  <button
                    className="action-button adjust"
                    onClick={() => openAdjustBookingModal(booking)}
                    title="Adjust Booking"
                  >
                    Edit
                  </button>
                  <button
                    className="action-button details"
                    onClick={() => openDetailsModal(booking)}
                    title="View Details"
                  >
                    View Details
                  </button>
                  <button
                    className="check-in-button green"
                    onClick={() => openStatusModal(booking.id, 'Confirmed')}
                  >
                    Confirm
                  </button>
                  <button
                    className="action-button print"
                    onClick={() => printBookingSummary(booking)}
                    title="Print Summary"
                  >
                    Print
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card">
          <h2 className="section-title">
            Current Guests ({currentGuests.length})
          </h2>
          <div className="guest-list-container">
            {currentGuests.map((booking) => (
              <div key={booking.id} className="guest-card">
                <div className="guest-info">
                  <p className="guest-name" onClick={() => openQuickView(booking)}>{booking.guestName}</p>
                  <p className="guest-details">Room: {booking.roomAssignments?.[0]?.roomName || 'N/A'}</p>
                  {booking.remarks && <p className="guest-remarks">Notes: {booking.remarks}</p>}
                </div>
                <div className="guest-actions">
                  <button
                    className="action-button adjust"
                    onClick={() => openAdjustBookingModal(booking)}
                    title="Adjust Booking"
                  >
                    Edit
                  </button>
                  <button
                    className="action-button details"
                    onClick={() => openDetailsModal(booking)}
                    title="View Details"
                  >
                    View Details
                  </button>
                  <button
                    className="check-out-button red"
                    onClick={() => openStatusModal(booking.id, 'CHECKED_OUT')}
                  >
                    Check Out
                  </button>
                  <button
                    className="action-button print"
                    onClick={() => printBookingSummary(booking)}
                    title="Print Summary"
                  >
                    Print
                  </button>
                </div>
              </div>
            ))}
          </div>
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

      {/* Notification Panel */}
      {showNotificationPanel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '80vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">Notifications</h3>
              <button className="modal-close-button" onClick={() => setShowNotificationPanel(false)}>×</button>
            </div>
            <div className="notification-categories">
              <div className="category-section">
                <h4>Pending Check-ins ({notificationCategories.checkIns.length})</h4>
                {notificationCategories.checkIns.map(booking => (
                  <div key={booking.id} className="notification-item">
                    <span>{booking.guestName} - {new Date(booking.checkIn).toLocaleTimeString()}</span>
                    <button onClick={() => openStatusModal(booking.id, 'Confirmed')}>Confirm</button>
                  </div>
                ))}
              </div>
              <div className="category-section">
                <h4>Pending Check-outs ({notificationCategories.checkOuts.length})</h4>
                {notificationCategories.checkOuts.map(booking => (
                  <div key={booking.id} className="notification-item">
                    <span>{booking.guestName} - {new Date(booking.checkOut).toLocaleTimeString()}</span>
                    <button onClick={() => openStatusModal(booking.id, 'CHECKED_OUT')}>Check Out</button>
                  </div>
                ))}
              </div>
              <div className="category-section">
                <h4>Upcoming Reservations ({notificationCategories.general.length})</h4>
                {notificationCategories.general.map(booking => (
                  <div key={booking.id} className="notification-item">
                    <span>{booking.guestName} arriving tomorrow</span>
                  </div>
                ))}
              </div>
            </div>
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
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%)',
              padding: '20px',
              borderRadius: '8px',
              width: '600px',
              maxWidth: '90%',
              maxHeight: '80%',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            }}
          >
            <h3>Booking Details</h3>
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

            <button
              onClick={() => {
                setShowDetailsModal(false);
                setBookingForDetails(null);
              }}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}