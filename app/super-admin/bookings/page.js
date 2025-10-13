"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import RoomAmenitiesSelector from '@/components/RoomAmenitiesSelector';
import RentalAmenitiesSelector from '@/components/RentalAmenitiesSelector';
import OptionalAmenitiesSelector from '@/components/OptionalAmenitiesSelector';
import BookingCalendar from '@/components/BookingCalendar';
import { useToast } from '@/components/Toast';
import { useOverrideModal, OverrideModal } from '@/components/CustomModals';

// Timezone-safe date formatting utility
function formatDate(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function BookingsPage() {
  // Add modal animation styles on component mount
  useEffect(() => {
    const styleId = 'modal-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-50px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        .modal-responsive {
          animation: modalSlideIn 0.3s ease-out;
        }
        
        @media (max-width: 768px) {
          .modal-responsive {
            padding: 1rem !important;
            margin: 0.5rem !important;
            max-width: calc(100vw - 1rem) !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentOption, setFilterPaymentOption] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [currentBooking, setCurrentBooking] = useState(null);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyBookingDetails, setHistoryBookingDetails] = useState(null);
  const [currentTab, setCurrentTab] = useState('active');
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);

  // Override modal for early check-in/out (shared)
  const [overrideModal, setOverrideModal] = useOverrideModal();
  
  // Toast notifications
  const { showToast, success, error } = useToast();

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

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      setBookings(data.filter(b => !b.isDeleted));
      setHistoryBookings(data.filter(b => b.isDeleted));
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setMessage({ type: 'error', text: 'Failed to load bookings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to move this booking to history?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDeleted: true }),
      });
      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.filter(b => b.id !== id));
        setHistoryBookings([...historyBookings, updatedBooking]);
        setMessage({ type: 'success', text: 'Booking moved to history successfully.' });
      } else {
        throw new Error('Delete failed');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to move booking to history' });
    } finally {
      setLoading(false);
    }
  };

  // Filter bookings based on search and filters
  const filteredBookings = bookings.filter((booking) => {
    const matchesStatus = !filterStatus || booking.status === filterStatus;
    const matchesPaymentOption = !filterPaymentOption || booking.paymentOption === filterPaymentOption;
    const matchesPaymentMethod = !filterPaymentMethod || (booking.paymentMethods && booking.paymentMethods.includes(filterPaymentMethod));
    const matchesSearch = !searchQuery || booking.guestName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesPaymentOption && matchesPaymentMethod && matchesSearch;
  });

  // Handle status change
  const handleStatusChange = async (id, newStatus) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.map(b => b.id === id ? updatedBooking : b));
        setMessage({ type: 'success', text: `Booking ${newStatus.toLowerCase()} successfully.` });
      } else {
        throw new Error('Status change failed');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update booking status' });
    } finally {
      setLoading(false);
    }
  };

  // Handle cancellation with remarks
  const handleCancelWithRemarks = async (id, remarks) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Cancelled', 
          cancellationRemarks: remarks || 'No remarks provided' 
        }),
      });
      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.map(b => b.id === id ? updatedBooking : b));
        setMessage({ type: 'success', text: 'Booking cancelled successfully.' });
      } else {
        throw new Error('Cancellation failed');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to cancel booking' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div style={{ padding: '20px', backgroundColor: '#f9f9f9', minHeight: '100vh' }}>
        <h1 style={{ marginBottom: '20px', color: '#333' }}>Bookings Management</h1>

        {/* Message Display */}
        {message && (
          <div
            style={{
              padding: '10px',
              marginBottom: '20px',
              borderRadius: '4px',
              color: message.type === 'success' ? '#155724' : '#721c24',
              backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
              border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            }}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              style={{
                marginLeft: '10px',
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setCurrentTab('active')}
            style={{
              padding: '10px 20px',
              marginRight: '10px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: currentTab === 'active' ? '#FEBE52' : '#e9ecef',
              color: currentTab === 'active' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Active Bookings
          </button>
          <button
            onClick={() => setCurrentTab('history')}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: currentTab === 'history' ? '#FEBE52' : '#e9ecef',
              color: currentTab === 'history' ? '#fff' : '#333',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            History
          </button>
        </div>

        {/* Filters and Search */}
        <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search by guest name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              minWidth: '200px',
            }}
          />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="CheckedIn">Checked In</option>
            <option value="CheckedOut">Checked Out</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select value={filterPaymentOption} onChange={(e) => setFilterPaymentOption(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <option value="">All Payment Options</option>
            <option value="Full Payment">Full Payment</option>
            <option value="Partial Payment">Partial Payment</option>
          </select>
          <select value={filterPaymentMethod} onChange={(e) => setFilterPaymentMethod(e.target.value)} style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <option value="">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Online">Online</option>
          </select>
          <div
            style={{
              position: 'relative',
              display: 'inline-block'
            }}
          >
            <button
              onClick={() => setShowCreateBookingModal(true)}
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#28a745',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}
              title="Create Booking"
            >
              <Plus size={24} />
            </button>
            <div
              style={{
                position: 'absolute',
                bottom: '-30px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                opacity: 0,
                transition: 'opacity 0.2s',
                pointerEvents: 'none'
              }}
              className="tooltip"
            >
              Create Booking
            </div>
            <style jsx>{`
              button:hover + .tooltip {
                opacity: 1;
              }
            `}</style>
          </div>
        </div>

        {/* Create Booking Modal */}
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
                backgroundColor: '#FFF8E1',
                borderRadius: '8px',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(251, 190, 82, 0.5)',
                padding: '20px',
                color: '#5a3e00',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              <h2 style={{ marginBottom: '20px', color: '#FEBE52' }}>Create Booking</h2>
              {/* Multi-step booking form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (submittingRef.current) return;

                  // Validation: date validity
                  if (!isDateSelectionValid()) {
                    error('Please select both check-in and check-out dates (single date selection is not allowed).');
                    return;
                  }

                  // Validation: selected rooms exist
                  if (Object.keys(createBookingForm.selectedRooms).length === 0) {
                    error('Please select at least one room.');
                    return;
                  }

                  // Validation: capacity meets guests
                  const totalCapacity = computeTotalCapacity();
                  if (totalCapacity < createBookingForm.numberOfGuests) {
                    error(`Selected rooms can accommodate ${totalCapacity} guest(s), but you have ${createBookingForm.numberOfGuests} guests. Add more rooms or decrease guest count.`);
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

                    const newBooking = await response.json();
                    setBookings([...bookings, newBooking]);
                    success('Booking created successfully');

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
                  } catch (err) {
                    console.error('Booking Error:', err);
                    error(`Booking Failed: ${err.message}`);
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
                            backgroundColor: '#FFF8E1',
                            padding: '15px',
                            borderRadius: '8px',
                            border: '1px solid rgba(251, 190, 82, 0.3)'
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

                      {/* Room Selection Below Calendar */}
                      {!dateWarning && createBookingForm.checkIn && createBookingForm.checkOut && (
                        <div style={{ marginTop: '20px' }}>
                          <h3 style={{ marginBottom: '15px', color: '#5a3e00' }}>Available Rooms</h3>
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
                                      backgroundColor: isSelected ? '#FFF8E1' : 'white',
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
                                    <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>
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
                                          <Plus size={16} />
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
                    <h3 style={{ color: '#5a3e00', marginBottom: '20px' }}>Room Amenities</h3>
                    <div style={{ 
                      backgroundColor: '#FFF8E1',
                      padding: '20px',
                      borderRadius: '8px',
                      border: '1px solid rgba(251, 190, 82, 0.3)'
                    }}>
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ color: '#5a3e00', marginBottom: '15px' }}>Selected Rooms:</h4>
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
                              <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>{room.name} Included Amenities:</h4>
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
                        <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Selected Rooms</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                          {Object.entries(createBookingForm.selectedRooms).map(([roomId, quantity]) => {
                            const room = availableRooms.find(r => r.id === roomId);
                            if (!room) return null;
                            return (
                              <div key={roomId} style={{
                                padding: '8px 12px',
                                backgroundColor: 'rgba(251, 190, 82, 0.1)',
                                borderRadius: '6px',
                                border: '1px solid rgba(251, 190, 82, 0.3)',
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
                        <h4 style={{ color: '#5a3e00', marginBottom: '10px' }}>Selected Amenities</h4>
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
                        border: '1px solid rgba(251, 190, 82, 0.2)'
                      }}>
                        <h4 style={{ color: '#5a3e00', marginBottom: '15px' }}>Price Breakdown</h4>
                        
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
                          borderTop: '2px solid rgba(251, 190, 82, 0.3)', 
                          marginTop: '15px', 
                          paddingTop: '15px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontWeight: 'bold',
                          fontSize: '18px',
                          color: '#5a3e00'
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
                        backgroundColor: '#ccc',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
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
                      backgroundColor: '#ccc',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
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
                    color: '#ED7709',
                    backgroundColor: 'rgba(255, 248, 225, 0.9)',
                    padding: '10px 15px',
                    borderRadius: '8px',
                    border: '1px solid #FEBE52'
                  }}>
                    Total Price: ₱{(createTotalPrice / 100).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Bookings Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={{ padding: '12px', border: '1px solid #ccc', position  : 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Guest Name</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Check-in</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Check-out</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Room</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Booking Status</th>
            <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Payment Option</th>
            <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Payment Method</th>
            <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Paid</th>
            <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Remaining Balance</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Total Price</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td>
                </tr>
              ) : currentTab === 'active' ? (
                filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '12px', textAlign: 'center' }}>No active bookings found</td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={`booking-${booking.id}`} style={{ transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f1f1')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.guestName}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.rooms && Array.isArray(booking.rooms) && booking.rooms.length > 0 ? booking.rooms.map(r => r.room.name).join(', ') : 'N/A'}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.status}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.paymentOption || 'Unpaid'}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{(booking.paymentMethods && booking.paymentMethods.length > 0) ? booking.paymentMethods.join(', ') : 'N/A'}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>₱{((Number(booking.totalPaid) || 0) / 100).toFixed(0)}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>
                        {booking.paymentOption && booking.paymentOption.toLowerCase() === 'full payment' ? '₱0' : `₱${((Number(booking.balanceToPay) || 0) / 100).toFixed(0)}`}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>₱{(Number(booking.totalCostWithAddons || booking.totalPrice) / 100).toFixed(0)}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          aria-label={`View details for ${booking.guestName}`}
                          onClick={() => {
                            setCurrentBooking(booking);
                            setShowDetailsModal(true);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#FEBE52',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#FAC975';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#FEBE52';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                historyBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '12px', textAlign: 'center' }}>No history bookings found</td>
                  </tr>
                ) : (
                  historyBookings.map((booking) => (
                    <tr key={booking.id} style={{ transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f1f1')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.guestName}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.rooms && Array.isArray(booking.rooms) && booking.rooms.length > 0 ? booking.rooms.map(r => r.room.name).join(', ') : 'N/A'}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.status}</td>
<td style={{ padding: '12px', border: '1px solid #ccc' }}>
  <div><strong>Payment Option:</strong> {booking.paymentOption || 'N/A'}</div>
  <div><strong>Payment Method:</strong> {(booking.paymentMethods && booking.paymentMethods.length > 0) ? booking.paymentMethods.join(', ') : 'N/A'}</div>
</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>₱{(Number(booking.totalPrice) / 100).toFixed(0)}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          aria-label={`View details for ${booking.guestName}`}
                          onClick={() => {
                            setHistoryBookingDetails(booking);
                            setShowHistoryModal(true);
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#febe52',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e6a73cff';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#febe52';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          }}
                        >
                          View Details
                        </button>
                        <button
                          aria-label={`Delete booking for ${booking.guestName}`}
                          onClick={async () => {
                            if (!confirm('Are you sure you want to permanently delete this booking?')) return;
                            setLoading(true);
                            try {
                              const res = await fetch(`/api/bookings/${booking.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
                              if (res.ok) {
                                setHistoryBookings(historyBookings.filter(b => b.id !== booking.id));
                                setMessage({ type: 'success', text: 'Booking deleted permanently.' });
                              } else {
                                throw new Error('Delete failed');
                              }
                            } catch (err) {
                              console.error(err);
                              setMessage({ type: 'error', text: 'Failed to delete booking' });
                            } finally {
                              setLoading(false);
                            }
                          }}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#dc3545',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#c82333';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#dc3545';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Cancellation Modal */}
        {showCancelModal && currentBooking && (
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
                width: '400px',
                maxWidth: '90%',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              }}
            >
              <h3>Cancel Booking</h3>
              <p>Are you sure you want to cancel the booking for {currentBooking.guestName}? This action cannot be undone.</p>
              <label>
                Remarks/Comments:
                <textarea
                  value={cancelRemarks}
                  onChange={(e) => setCancelRemarks(e.target.value)}
                  placeholder="Explain why the booking is being cancelled..."
                  style={{
                    width: '100%',
                    height: '80px',
                    marginTop: '10px',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </label>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelRemarks('');
                    setCurrentBooking(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await handleCancelWithRemarks(currentBooking.id, cancelRemarks);
                    setShowCancelModal(false);
                    setCancelRemarks('');
                    setCurrentBooking(null);
                    // Disable actions after cancellation
                    setBookings(prev => prev.map(b => b.id === currentBooking.id ? { ...b, status: 'Cancelled' } : b));
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#dc3545',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Professional Booking Details Modal */}
        {showDetailsModal && currentBooking && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '1rem',
              backdropFilter: 'blur(4px)',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowDetailsModal(false);
                setCurrentBooking(null);
              }
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.98)',
                padding: '2rem',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.3)',
                position: 'relative',
                animation: 'modalSlideIn 0.3s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Professional Modal Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
                paddingBottom: '1rem',
                borderBottom: '1px solid rgba(0,0,0,0.1)'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '1.75rem',
                    fontWeight: '700',
                    margin: 0,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    Booking Details
                  </h3>
                  <p style={{
                    margin: '0.25rem 0 0 0',
                    color: '#6b7280',
                    fontSize: '0.875rem'
                  }}>
                    Booking ID: {currentBooking.id}
                  </p>
                </div>
                <button
                  style={{
                    background: 'rgba(107, 114, 128, 0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    cursor: 'pointer',
                    color: '#6b7280',
                    fontSize: '1.25rem',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px'
                  }}
                  onClick={() => {
                    setShowDetailsModal(false);
                    setCurrentBooking(null);
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(239, 68, 68, 0.1)';
                    e.target.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(107, 114, 128, 0.1)';
                    e.target.style.color = '#6b7280';
                  }}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Check-in:</strong> {new Date(currentBooking.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Check-out:</strong> {new Date(currentBooking.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Guests:</strong> {currentBooking.numberOfGuests || 'N/A'}
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Selected Rooms:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {currentBooking.rooms && Array.isArray(currentBooking.rooms) && currentBooking.rooms.length > 0 ? 
                    currentBooking.rooms.map((r) => (
                      <li key={`room-${r.room.id}`}>{r.room.name} x{r.quantity}</li>
                    )) : 
                    <li>No rooms selected</li>
                  }
                </ul>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Selected Amenities:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {currentBooking.optionalAmenities && Array.isArray(currentBooking.optionalAmenities) && currentBooking.optionalAmenities.length > 0 ? 
                    currentBooking.optionalAmenities.map((oa) => (
                      <li key={`optional-${oa.optionalAmenity.id}`}>{oa.optionalAmenity.name} x{oa.quantity}</li>
                    )) : 
                    <li>No optional amenities selected</li>
                  }
                  {currentBooking.rentalAmenities && Array.isArray(currentBooking.rentalAmenities) && currentBooking.rentalAmenities.length > 0 ? 
                    currentBooking.rentalAmenities.map((ra) => (
                      <li key={`rental-${ra.rentalAmenity.id}`}>{ra.rentalAmenity.name} x{ra.quantity} {ra.hoursUsed ? `(${ra.hoursUsed}h)` : ''}</li>
                    )) : 
                    <li>No rental amenities selected</li>
                  }
                </ul>
              </div>

              <div style={{ marginBottom: '10px' }}>
                <strong>Price Breakdown:</strong>
                <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                  {(() => {
                    const nights = Math.max(1, (new Date(currentBooking.checkOut) - new Date(currentBooking.checkIn)) / (1000 * 60 * 60 * 24));
                    return (
                      <>
                        {currentBooking.rooms && Array.isArray(currentBooking.rooms) && currentBooking.rooms.map((r, idx) => {
                          const roomTotal = Number(r.room.price) * r.quantity * nights;
                          return (
                            <li key={`room-${idx}`}>
                              {r.room.name} x{r.quantity} ({nights} nights): ₱{(roomTotal / 100).toFixed(0)}
                            </li>
                          );
                        })}
                        {currentBooking.optionalAmenities && Array.isArray(currentBooking.optionalAmenities) && currentBooking.optionalAmenities.map((oa, idx) => {
                          const optionalTotal = (Number(oa.optionalAmenity.price || 0) * oa.quantity);
                          return (
                            <li key={`amenity-${idx}`}>
                              {oa.optionalAmenity.name} x{oa.quantity}: ₱{(optionalTotal / 100).toFixed(0)}
                            </li>
                          );
                        })}
                        {currentBooking.rentalAmenities && Array.isArray(currentBooking.rentalAmenities) && currentBooking.rentalAmenities.map((ra, idx) => (
                          <li key={`rental-${idx}`}>
                            {ra.rentalAmenity.name} x{ra.quantity} {ra.hoursUsed ? `(${ra.hoursUsed}h)` : ''}: ₱{(Number(ra.totalPrice) / 100).toFixed(0)}
                          </li>
                        ))}
                        <li style={{ marginTop: '10px', fontWeight: 'bold' }}>
                          Total Price: ₱{(Number(currentBooking.totalCostWithAddons || currentBooking.totalPrice) / 100).toFixed(0)}
                        </li>
                      </>
                    );
                  })()}
                </ul>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                {/* Confirm and Cancel for new bookings (not confirmed or checked in/out) */}
                {(['PENDING', 'HELD', 'NEW'].includes(currentBooking.status) && !currentBooking.actualCheckIn) && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowConfirmModal(true);
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowCancelModal(true);
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#ffc107',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {/* Check In, Check Out, Cancel for confirmed but not checked in */}
                {(currentBooking.status === 'Confirmed' && !currentBooking.actualCheckIn) && (
                  <>
                    <button
                      onClick={async () => {
                        const today = new Date();
                        const checkInDate = new Date(currentBooking.checkIn);
                        if (today < new Date(checkInDate.getFullYear(), checkInDate.getMonth(), checkInDate.getDate())) {
                          setOverrideModal({
                            show: true,
                            type: 'checkin',
                            date: checkInDate,
                            bookingId: currentBooking.id
                          });
                          return;
                        }
                        await handleCheckIn(currentBooking.id);
                        setShowDetailsModal(false);
                        setCurrentBooking(null);
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#56A86B',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Check In
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        setShowCancelModal(true);
                      }}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#ffc107',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
                {/* Check Out only after check-in (actualCheckIn set, not checked out) */}
                {(currentBooking.status === 'Confirmed' && currentBooking.actualCheckIn && !currentBooking.actualCheckOut) && (
                  <button
                    onClick={async () => {
                      const today = new Date();
                      const checkOutDate = new Date(currentBooking.checkOut);
                      if (today < new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), checkOutDate.getDate())) {
                        setOverrideModal({
                          show: true,
                          type: 'checkout',
                          date: checkOutDate,
                          bookingId: currentBooking.id
                        });
                        return;
                      }
                      await handleCheckOut(currentBooking.id);
                      setShowDetailsModal(false);
                      setCurrentBooking(null);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#E74C3C',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Check Out
                  </button>
                )}
        {/* Override Modal for Super Admin (shared) */}
        <OverrideModal
          modal={overrideModal}
          setModal={setOverrideModal}
          onConfirm={async () => {
            if (overrideModal.type === 'checkin') {
              await handleCheckIn(overrideModal.bookingId);
            } else if (overrideModal.type === 'checkout') {
              await handleCheckOut(overrideModal.bookingId);
            }
            setShowDetailsModal(false);
            setCurrentBooking(null);
          }}
        />
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && currentBooking && (
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
                width: '400px',
                maxWidth: '90%',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              }}
            >
              <h3>Confirm Booking</h3>
              <p>Are you sure you want to confirm this booking?</p>
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  No
                </button>
                <button
                  onClick={async () => {
                    await handleStatusChange(currentBooking.id, 'Confirmed');
                    setShowConfirmModal(false);
                    setCurrentBooking(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#28a745',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Details Modal */}
        {showHistoryModal && historyBookingDetails && (
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
                <strong>Guest Name:</strong> {historyBookingDetails.guestName}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Check-in:</strong> {new Date(historyBookingDetails.checkIn).toLocaleDateString()}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Check-out:</strong> {new Date(historyBookingDetails.checkOut).toLocaleDateString()}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Rooms:</strong> {historyBookingDetails.rooms.length > 0 ? historyBookingDetails.rooms.map(r => r.room.name).join(', ') : 'N/A'}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Status:</strong> {historyBookingDetails.status}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Payment Status:</strong> {historyBookingDetails.paymentStatus}
              </div>
              <div style={{ marginBottom: '10px' }}>
                <strong>Total Price:</strong> ₱{(Number(historyBookingDetails.totalPrice) / 100).toFixed(0)}
              </div>
              {historyBookingDetails.optionalAmenities && Array.isArray(historyBookingDetails.optionalAmenities) && historyBookingDetails.optionalAmenities.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Optional Amenities:</strong>
                  <ul>
                    {historyBookingDetails.optionalAmenities.map((oa, idx) => (
                      <li key={idx}>{oa.optionalAmenity.name} x{oa.quantity}</li>
                    ))}
                  </ul>
                </div>
              )}
              {historyBookingDetails.rentalAmenities && Array.isArray(historyBookingDetails.rentalAmenities) && historyBookingDetails.rentalAmenities.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Rental Amenities:</strong>
                  <ul>
                    {historyBookingDetails.rentalAmenities.map((ra, idx) => (
                      <li key={idx}>{ra.rentalAmenity.name} x{ra.quantity} {ra.hoursUsed ? `(${ra.hoursUsed} hours)` : ''} - ₱{(Number(ra.totalPrice) / 100).toFixed(0)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {historyBookingDetails.cottage && Array.isArray(historyBookingDetails.cottage) && historyBookingDetails.cottage.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Cottages:</strong>
                  <ul>
                    {historyBookingDetails.cottage.map((c, idx) => (
                      <li key={idx}>{c.cottage.name} x{c.quantity} - ₱{(Number(c.totalPrice) / 100).toFixed(0)}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowHistoryModal(false);
                    setHistoryBookingDetails(null);
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
