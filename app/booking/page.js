'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useFormStatus } from 'react-dom';
  
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BookingCalendar from '../../components/BookingCalendar';
import RoomAmenitiesSelector from '../../components/RoomAmenitiesSelector'; // Import the new component
import { useNavigationGuard } from '../../hooks/useNavigationGuard.simple';
import { useNavigationContext } from '../../context/NavigationContext';
import { NavigationConfirmationModal } from '../../components/CustomModals';

// Timezone-safe date formatting utility
function formatDate(date) {
  if (!date) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function BookingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Role-based access control - CUSTOMER only
  useEffect(() => {
    if (status !== 'loading') {
      if (!session) {
        // Not authenticated, redirect to login
        router.push('/login?redirect=/booking');
        return;
      }
      
      if (session.user.role !== 'CUSTOMER') {
        // Not a customer, redirect to appropriate dashboard
        const role = session.user.role;
        switch (role) {
          case 'SUPERADMIN':
            router.push('/super-admin/dashboard');
            break;
          case 'ADMIN':
            router.push('/admin/dashboard');
            break;
          case 'RECEPTIONIST':
            router.push('/receptionist');
            break;
          case 'CASHIER':
            router.push('/cashier');
            break;
          case 'AMENITYINVENTORYMANAGER':
            router.push('/amenityinventorymanager');
            break;
          default:
            router.push('/unauthorized');
            break;
        }
        return;
      }
    }
  }, [session, status, router]);

  // Don't render booking page for non-customers or while checking auth
  if (status === 'loading' || !session || session.user.role !== 'CUSTOMER') {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        {status === 'loading' ? 'Loading...' : 'Redirecting...'}
      </div>
    );
  }

  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [step, setStep] = useState(1);
  const [availabilityData, setAvailabilityData] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [showPendingPrompt, setShowPendingPrompt] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const submittingRef = useRef(false);

  // Modal state to prevent spam clicks
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // New state for animated dots in modal
  const [dotCount, setDotCount] = useState(1);

  // Room images modal state
  const [roomImagesModal, setRoomImagesModal] = useState({ open: false, selectedRoomId: null, selectedImage: null });
  // Cooldown UI state
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [cooldownTimer, setCooldownTimer] = useState('');

  // Navigation Guard Setup
  const navigationContext = useNavigationContext();
  const navigationGuard = useNavigationGuard({
    trackBooking: true,
    customMessage: 'You have an active booking in progress. Leaving now may lose your selection and require starting over.',
    bypassPaths: ['/booking/payment', '/checkout'] // Allow flow between booking steps
  });

  // SubmitButton component using useFormStatus
  function SubmitButton({ disabled, children, ...props }) {
    const { pending } = useFormStatus();
    return (
      <button type="submit" disabled={pending || disabled} {...props}>
        {pending ? 'Submitting...' : children}
      </button>
    );
  }

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

  // NEW: warnings & locks
  const [dateWarning, setDateWarning] = useState(''); // for single-date validation
  const [roomLockWarning, setRoomLockWarning] = useState(''); // for room-lock explanation

  // NEW: rental amenities data fetched from API
  const [rentalAmenitiesData, setRentalAmenitiesData] = useState([]);
  // NEW: optional amenities data for displaying names in review
  const [optionalAmenitiesData, setOptionalAmenitiesData] = useState([]);

  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    selectedRooms: {}, // { roomId: quantity }
    selectedAmenities: { optional: {}, rental: {}, cottage: null },
  });

  // Track booking state for navigation protection with memo
  const bookingStateData = useMemo(() => {
    const hasBookingData = !!(
      formData.checkIn || 
      formData.checkOut || 
      Object.keys(formData.selectedRooms).length > 0 ||
      Object.keys(formData.selectedAmenities.optional || {}).length > 0 ||
      Object.keys(formData.selectedAmenities.rental || {}).length > 0 ||
      formData.selectedAmenities.cottage ||
      step > 1
    );

    return {
      isActive: true,
      step: step,
      hasData: hasBookingData
    };
  }, [
    formData.checkIn,
    formData.checkOut,
    JSON.stringify(Object.keys(formData.selectedRooms).sort()),
    JSON.stringify(Object.keys(formData.selectedAmenities.optional || {}).sort()),
    JSON.stringify(Object.keys(formData.selectedAmenities.rental || {}).sort()),
    formData.selectedAmenities.cottage,
    step
  ]);

  // Update navigation context when booking state changes
  useEffect(() => {
    navigationContext.updateBookingState(bookingStateData);
  }, [bookingStateData]); // Only navigationContext.updateBookingState is stable now

  // --- Authentication and Progress Restoration (no changes needed here) ---
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/booking');
    }
  }, [status, router]);

  // Poll user cooldown on mount (requires session)
  useEffect(() => {
    async function fetchCooldown() {
      if (!session) return;
      try {
        const res = await fetch('/api/guest/me');
        if (!res.ok) return;
        const data = await res.json();
        const until = data?.guest?.paymentCooldownUntil ? new Date(data.guest.paymentCooldownUntil) : null;
        setCooldownUntil(until);
      } catch (e) { console.error('Failed to fetch cooldown:', e); }
    }
    fetchCooldown();
  }, [session]);

  // Countdown logic
  useEffect(() => {
    if (!cooldownUntil) { setCooldownTimer(''); return; }
    const interval = setInterval(() => {
      const now = new Date();
      const ms = cooldownUntil - now;
      if (ms <= 0) {
        setCooldownTimer('');
        setCooldownUntil(null);
        clearInterval(interval);
      } else {
        const m = Math.floor(ms / 60000);
        const s = Math.floor((ms % 60000) / 1000);
        setCooldownTimer(`${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  // Check for pending booking on mount
  useEffect(() => {
    if (status !== 'loading' && session) {
      const storedBookingId = localStorage.getItem('bookingId');
      if (storedBookingId) {
        fetch(`/api/bookings/${storedBookingId}`)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'Pending') {
              setPendingBooking(data);
              setShowPendingPrompt(true);
            } else if (data.status === 'Cancelled') {
              localStorage.removeItem('bookingId');
              localStorage.removeItem('bookingAmount');
            }
            // If confirmed or paid, clear localStorage to allow new bookings
            else if (data.status === 'Confirmed' || data.paymentStatus === 'Paid') {
              localStorage.removeItem('bookingId');
              localStorage.removeItem('bookingAmount');
            }
          })
          .catch(err => {
            console.error('Error checking pending booking:', err);
            localStorage.removeItem('bookingId');
            localStorage.removeItem('bookingAmount');
          });
      }
    }
  }, [status, session, router]);


  // --- Data Fetching ---
  useEffect(() => {
    // Fetch room availability for the calendar
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
      } catch (err) { console.error('❌ Failed to load availability:', err); }
    }
    fetchAvailability();

    // NEW: Fetch rental amenities data for price breakdown
    async function fetchRentalAmenities() {
      try {
        const res = await fetch('/api/amenities/rental');
        if (res.ok) {
          const data = await res.json();
          setRentalAmenitiesData(data);
        }
      } catch (err) {
        console.error('❌ Failed to load rental amenities:', err);
      }
    }
    fetchRentalAmenities();

    // NEW: Fetch optional amenities to resolve names in review
    async function fetchOptionalAmenities() {
      try {
        const res = await fetch('/api/amenities/optional');
        if (res.ok) {
          const data = await res.json();
          setOptionalAmenitiesData(data);
        }
      } catch (err) {
        console.error('❌ Failed to load optional amenities:', err);
      }
    }
    fetchOptionalAmenities();
  }, []);

  useEffect(() => {
    // Fetch available rooms when dates change
    async function fetchAvailableRooms() {
      if (!formData.checkIn || !formData.checkOut) {
        setAvailableRooms([]);
        return;
      }
      setLoadingRooms(true);
      try {
        // Clean up expired bookings before checking availability
        fetch('/api/cleanup/expired-bookings', { method: 'POST' })
          .catch(err => console.warn('Cleanup failed:', err));

        const res = await fetch(`/api/rooms?checkIn=${formData.checkIn}&checkOut=${formData.checkOut}`);
        const data = await res.json();
        if (res.ok) {
          setAvailableRooms(data.filter(room => room.remaining > 0));
        }
      } catch (err) {
        console.error('❌ Failed to load available rooms:', err);
        setAvailableRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    }
    fetchAvailableRooms();
  }, [formData.checkIn, formData.checkOut]);

  const getRoomCapacity = (roomType) => {
    switch (roomType) {
      case 'TEPEE':
        return { min: 1, max: 5 };
      case 'LOFT':
        return { min: 1, max: 3 };
      case 'VILLA':
        return { min: 1, max: 10 };
      default:
        // Default capacity for other rooms, can be adjusted
        return { min: 1, max: 100 };
    }
  };

  const getRoomImages = (roomType) => {
    switch (roomType) {
      case 'LOFT':
        return ['/images/Loft.jpg', '/images/LoftInterior1.jpg', '/images/LoftInterior2.jpg'];
      case 'TEPEE':
        return ['/images/Tepee.jpg', '/images/TepeeInterior1.jpg', '/images/TepeeInterior2.jpg'];
      case 'VILLA':
        return ['/images/Villa.jpg', '/images/VillaInterior1.jpg', '/images/VillaInterior2.jpg'];
      default:
        return ['/images/default.jpg'];
    }
  };

  // --- Price Calculation ---
  useEffect(() => {
    const nights = formData.checkIn && formData.checkOut ? Math.max(1, (new Date(formData.checkOut) - new Date(formData.checkIn)) / (1000 * 60 * 60 * 24)) : 1;

    async function calculateTotal() {
        try {
            // Prepare rental amenities in expected format
            const rentalAmenitiesFormatted = {};
            for (const [id, selection] of Object.entries(formData.selectedAmenities.rental)) {
                rentalAmenitiesFormatted[id] = {
                    quantity: selection.quantity || 0,
                    hoursUsed: selection.hoursUsed || 0
                };
            }

            console.log("Rental Amenities Data Sent to API:", rentalAmenitiesFormatted);

            const res = await fetch('/api/bookings/calculate-total', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    selectedRooms: formData.selectedRooms,
                    nights,
                    optionalAmenities: formData.selectedAmenities.optional,
                    rentalAmenities: rentalAmenitiesFormatted,
                    cottage: formData.selectedAmenities.cottage
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
  }, [formData.selectedRooms, formData.selectedAmenities, formData.checkIn, formData.checkOut]);


  // --- Helpers for validation & locking ---
  // compute total capacity from selectedRooms
  const computeTotalCapacity = () => {
    return Object.entries(formData.selectedRooms).reduce((sum, [roomId, qty]) => {
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
    return totalCap >= formData.guests && Object.keys(formData.selectedRooms).length > 0;
  };

  // date selection validity: we treat single-date selection (checkOut empty OR checkOut === checkIn) as invalid
  const isDateSelectionValid = () => {
    if (!formData.checkIn) return false;
    if (!formData.checkOut) return false;
    if (formData.checkIn === formData.checkOut) return false;
    return true;
  };

  // Update date warning when dates change
  useEffect(() => {
    if (!formData.checkIn) {
      setDateWarning('Please select a check-in date.');
    } else if (!formData.checkOut) {
      // single date picked (only checkIn)
      setDateWarning('Please select a check-out date. Single date selection is not allowed.');
    } else if (formData.checkIn === formData.checkOut) {
      setDateWarning('Check-out must be different from check-in.');
    } else {
      setDateWarning('');
    }
  }, [formData.checkIn, formData.checkOut]);

  // Update room lock warning when selection changes
  useEffect(() => {
    if (isRoomLockActive()) {
      const totalCap = computeTotalCapacity();
      setRoomLockWarning(`Selected rooms now accommodate ${totalCap} guest(s). Other room options are locked to prevent over-selection.`);
    } else {
      setRoomLockWarning('');
    }
  }, [formData.selectedRooms, formData.guests, availableRooms]);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'guests') {
      const intValue = parseInt(value) || 1;
      setFormData(prev => ({ ...prev, [name]: Math.min(80, Math.max(1, intValue)) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };



  const handleDateChange = ({ checkInDate, checkOutDate }) => {
    setFormData(prev => ({
      ...prev,
      checkIn: formatDate(checkInDate),
      checkOut: formatDate(checkOutDate)
    }));
  };

  const handleRoomSelect = (room) => {
    // if other rooms locked and this room is not selected, ignore clicks
    const locked = isRoomLockActive();
    const alreadySelected = !!formData.selectedRooms[room.id];
    if (locked && !alreadySelected) {
      // do nothing — other rooms are locked
      return;
    }
    setFormData(prev => {
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
    // If other rooms locked and this room isn't selected, prevent quantity changes
    const locked = isRoomLockActive();
    const isSelected = !!formData.selectedRooms[roomId];
    if (locked && !isSelected) return;

    setFormData(prev => {
      const selectedRooms = { ...prev.selectedRooms };
      const currentQty = selectedRooms[roomId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      // Check if newQty exceeds remaining availability
      const room = availableRooms.find(r => r.id == roomId);
      if (room && newQty > room.remaining) {
        return prev; // Don't update if exceeds remaining
      }
      if (newQty === 0) {
        delete selectedRooms[roomId];
      } else {
        selectedRooms[roomId] = newQty;
      }
      return { ...prev, selectedRooms };
    });
  };

  const handleAmenitiesChange = (updater) => {
    if (typeof updater === 'function') {
      setFormData(prev => ({ ...prev, selectedAmenities: updater(prev.selectedAmenities) }));
    } else {
      setFormData(prev => ({ ...prev, selectedAmenities: updater }));
    }
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return; // Prevent multiple submissions

    // Validation: date validity
    if (!isDateSelectionValid()) {
      if (!formData.checkIn || !formData.checkOut) {
        alert('❌ Please select both check-in and check-out dates (single date selection is not allowed).');
      } else if (formData.checkIn === formData.checkOut) {
        alert('❌ Check-out date must be different from check-in.');
      } else {
        alert('❌ Invalid date selection.');
      }
      return;
    }

    // Validation: selected rooms exist
    if (Object.keys(formData.selectedRooms).length === 0) {
      alert('❌ Please select at least one room.');
      return;
    }

    // Validation: capacity meets guests
    const totalCapacity = computeTotalCapacity();
    if (totalCapacity < formData.guests) {
      alert(`❌ Selected rooms can accommodate ${totalCapacity} guest(s), but you have ${formData.guests} guests. Add more rooms or decrease guest count.`);
      return;
    }

    submittingRef.current = true;
    setShowSubmitModal(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: session.user.name || 'Guest',
          selectedRooms: formData.selectedRooms,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          userId: session.user.id,
          ...formData.selectedAmenities
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || 'Booking failed');
      }

  // Store booking details for checkout page
  localStorage.setItem('bookingId', data.booking.id);
  // bookingAmount kept optional for display; checkout will compute reservation fee from rooms
  localStorage.setItem('bookingAmount', totalPrice / 100);

      // Redirect to checkout page
      router.push('/checkout');

    } catch (err) {
      console.error('❌ Booking Error:', err);
      alert(`❌ Booking Failed: ${err.message}`);
      // Clear localStorage on error to prevent stale data
      localStorage.removeItem('bookingId');
      localStorage.removeItem('bookingAmount');
    } finally {
      submittingRef.current = false;
      setShowSubmitModal(false);
    }
  };

  if (status === 'loading' || !session) {
    return <div>Loading...</div>;
  }

  const progressPercent = (step / 3) * 100;

  return (
    <div className="container">
      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <h1 className="hero-title">Book Your Beachside Escape</h1>
          <p className="hero-subtitle">Sun-kissed days, starlit nights, and effortless reservations.</p>
        </div>
        <div className="wave" aria-hidden="true" />
      </section>

      {/* Layout */}
      <div className="layout">
        <div className="main">
          {/* Stepper */}
          <div className="stepper" role="navigation" aria-label="Booking steps">
            <div className={`step ${step >= 1 ? 'active' : ''}`} aria-current={step === 1 ? 'step' : undefined}>
              <span className="badge" aria-hidden="true">{step > 1 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : '1'}</span>
              <span className="label">Dates & Rooms</span>
            </div>
            <div className="divider-dot" />
            <div className={`step ${step >= 2 ? 'active' : ''}`} aria-current={step === 2 ? 'step' : undefined}>
              <span className="badge" aria-hidden="true">{step > 2 ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6L9 17L4 12" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : '2'}</span>
              <span className="label">Amenities</span>
            </div>
            <div className="divider-dot" />
            <div className={`step ${step >= 3 ? 'active' : ''}`} aria-current={step === 3 ? 'step' : undefined}>
              <span className="badge" aria-hidden="true">3</span>
              <span className="label">Review</span>
            </div>
          </div>

          {/* Progress bar (mobile aid) */}
          <div className="progress-bar">
            <motion.div className="progress" animate={{ width: `${progressPercent}%` }} />
          </div>

          {!showSubmitModal && (
            <form onSubmit={handleSubmit}>
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="card">
                    <div className="card-header">
                      <h2 className="card-title">Choose your dates</h2>
                      <p className="card-subtitle">Pick check-in and check-out, then select your ideal room.</p>
                    </div>
                    <div className="card-body">
                      <div className="form-grid">
                        <div className="form-block">
                          <label id="calendar-heading" className="label">Select Dates</label>
                          <div className="calendar-shell" role="region" aria-labelledby="calendar-heading">
                            <div className="calendar-head" aria-hidden="true">
                              <span className="pill">Check-in: 2:00 PM</span>
                              <span className="dot" />
                              <span className="pill">Check-out: 12:00 PM</span>
                            </div>
                            <BookingCalendar availabilityData={availabilityData} onDateChange={handleDateChange} />
                          </div>
                        </div>
                        <div className="form-block">
                          <label htmlFor="guests" className="label">Guests</label>
                          <input id="guests" aria-label="Guests" type="number" name="guests" min="1" max="80" step="1" value={formData.guests} onChange={handleChange} required />
                          {(formData.checkIn || formData.checkOut) && (
                            <div className="date-display" aria-live="polite">
                              <div><strong>Check-in:</strong> {formData.checkIn ? new Date(formData.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '...'}</div>
                              <div><strong>Check-out:</strong> {formData.checkOut ? new Date(formData.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '...'}</div>
                            </div>
                          )}
                          {dateWarning && (
                            <div className="date-warning" role="alert">{dateWarning}</div>
                          )}
                        </div>
                      </div>

                      <div className="rooms-header">
                        <label className="label">Select Rooms</label>
                        <span className="hint">Tap a card to select. We’ll lock other options once capacity is met.</span>
                      </div>

                      {loadingRooms ? (
                        <div className="room-skeletons" aria-live="polite" aria-busy="true">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="skeleton-card">
                              <div className="skeleton-img shimmer" />
                              <div className="skeleton-line shimmer" />
                              <div className="skeleton-sub shimmer" />
                            </div>
                          ))}
                        </div>
                      ) : availableRooms.length === 0 ? (
                        <p>No rooms available for the selected dates.</p>
                      ) : (
                        <div className="room-selector">
                          {availableRooms.filter(room => room.type !== 'FAMILY_LODGE').map((room) => {
                            const capacity = getRoomCapacity(room.type);
                            const selectedQty = formData.selectedRooms[room.id] || 0;
                            const isFull = room.remaining <= 0;
                            const isSelected = selectedQty > 0;
                            const roomLocked = isRoomLockActive() && !isSelected;

                            return (
                              <div key={room.id} className="room-option-container">
                                <div
                                  className={`room-option ${isSelected ? 'selected' : ''} ${isFull || roomLocked ? 'disabled' : ''}`}
                                  onClick={() => {
                                    if (!isFull && !roomLocked) handleRoomSelect(room);
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ' ') && !isFull && !roomLocked) handleRoomSelect(room);
                                  }}
                                  aria-pressed={isSelected}
                                  aria-disabled={isFull || roomLocked}
                                >
                                  {isSelected && (
                                    <div className="selected-check" aria-hidden="true">
                                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                  )}
                                  <div className="room-media">
                                    <img src={room.image || '/images/default.jpg'} alt={room.name} />
                                    {isFull ? (
                                      <span className="available-count full">Full</span>
                                    ) : (
                                      <span className="available-count">{room.remaining} left</span>
                                    )}
                                  </div>
                                  <div className="room-meta">
                                    <span className="room-name">{room.name}</span>
                                    <div className="room-tags">
                                      <span className="tag type">{room.type}</span>
                                      <span className="tag pax" title={`Up to ${capacity.max} guests`}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                          <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v3h16v-3c0-2.761-3.582-5-8-5z" fill="#6b7280"/>
                                        </svg>
                                        {capacity.max}
                                      </span>
                                      {room.price ? (
                                        <span className="tag price">₱{(room.price / 100).toLocaleString()} / night</span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="room-actions">
                                    <div className="quantity-controls" aria-label={`Quantity for ${room.name}`}>
                                      <button
                                        type="button"
                                        aria-label={`Decrease ${room.name} quantity`}
                                        onClick={() => handleRoomQuantityChange(room.id, -1)}
                                        disabled={selectedQty <= 1}
                                      >−</button>
                                      <span aria-live="polite">{selectedQty}</span>
                                      <button
                                        type="button"
                                        aria-label={`Increase ${room.name} quantity`}
                                        onClick={() => handleRoomQuantityChange(room.id, 1)}
                                        disabled={(() => {
                                          const totalCapacity = computeTotalCapacity();
                                          const selectedQty = formData.selectedRooms[room.id] || 0;
                                          return totalCapacity >= formData.guests || selectedQty >= room.remaining;
                                        })()}
                                      >+</button>
                                    </div>
                                    <button
                                      type="button"
                                      className="view-images-btn"
                                      title="View room images"
                                      onClick={() => setRoomImagesModal({ open: true, selectedRoomId: room.id, selectedImage: null })}
                                    >
                                      View Images
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {(() => {
                        const totalCapacity = computeTotalCapacity();
                        const isSufficient = totalCapacity >= formData.guests;
                        return !isSufficient && Object.keys(formData.selectedRooms).length > 0 ? (
                          <div className="capacity-warning" role="alert">Selected rooms can accommodate {totalCapacity} guests, but you have {formData.guests} guests. Please select more rooms.</div>
                        ) : null;
                      })()}

                      {roomLockWarning && (
                        <div className="room-lock-warning" role="status">{roomLockWarning}</div>
                      )}
                    </div>
                  </div>

                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="card">
                    <div className="card-header">
                      <h2 className="card-title">Enhance your stay</h2>
                      <p className="card-subtitle">Add optional amenities and rentals to personalize your experience.</p>
                    </div>
                    <div className="card-body">
                      <RoomAmenitiesSelector
                        roomType={Object.keys(formData.selectedRooms).length > 0 ? availableRooms.find(r => r.id == Object.keys(formData.selectedRooms)[0])?.type : ''}
                        selectedAmenities={formData.selectedAmenities}
                        onAmenitiesChange={handleAmenitiesChange}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="card">
                    <div className="card-header">
                      <h2 className="card-title">Review your booking</h2>
                      <p className="card-subtitle">Double-check your details before securing your reservation.</p>
                    </div>
                    <div className="card-body">
                      <div className="review-grid">
                        <div className="review-section">
                          <h3 className="section-title">Details</h3>
                          <ul className="kv">
                            <li><span>Check-in</span><strong>{new Date(formData.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></li>
                            <li><span>Check-out</span><strong>{new Date(formData.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong></li>
                            <li><span>Guests</span><strong>{formData.guests}</strong></li>
                          </ul>
                        </div>
                        <div className="review-section">
                          <h3 className="section-title">Rooms</h3>
                          <ul className="bulleted">
                            {Object.entries(formData.selectedRooms).map(([roomId, qty]) => {
                              const room = availableRooms.find(r => r.id == roomId);
                              return <li key={roomId}>{qty} × {room?.name}</li>;
                            })}
                          </ul>
                        </div>
                        <div className="review-section">
                          <h3 className="section-title">Amenities</h3>
                          <ul className="bulleted">
                            {Object.entries(formData.selectedAmenities.optional).map(([amenityId, qty]) => {
                              const amenity = optionalAmenitiesData.find(a => a.id === parseInt(amenityId));
                              return (
                                <li key={amenityId}>{qty} × {amenity?.name || `Optional Amenity ${amenityId}`}</li>
                              );
                            })}
                            {Object.entries(formData.selectedAmenities.rental).map(([amenityId, selection]) => {
                              const rentalAmenity = rentalAmenitiesData.find(a => a.id === parseInt(amenityId));
                              const quantity = selection.quantity || 0;
                              return (
                                <li key={amenityId}>{quantity} × {rentalAmenity?.name || `Rental Amenity ${amenityId}`}</li>
                              );
                            })}
                            {formData.selectedAmenities.cottage && (
                              <li>Cottage: {formData.selectedAmenities.cottage}</li>
                            )}
                          </ul>
                        </div>
                        <div className="review-section">
                          <h3 className="section-title">Price breakdown</h3>
                          <ul className="bulleted">
                            {Object.entries(formData.selectedRooms).map(([roomId, qty]) => {
                              const room = availableRooms.find(r => r.id == roomId);
                              const nights = formData.checkIn && formData.checkOut ? Math.max(1, (new Date(formData.checkOut) - new Date(formData.checkIn)) / (1000 * 60 * 60 * 24)) : 1;
                              const roomTotal = room ? (room.price / 100) * qty * nights : 0;
                              return (
                                <li key={roomId}>
                                  {qty} × {room?.name} for {nights} night(s): <strong>₱{roomTotal.toLocaleString()}</strong>
                                </li>
                              );
                            })}
                            {Object.entries(formData.selectedAmenities.rental).map(([amenityId, selection]) => {
                              const rentalAmenity = rentalAmenitiesData.find(a => a.id === parseInt(amenityId));
                              const pricePerHour = rentalAmenity?.pricePerHour || 0;
                              const pricePerUnit = rentalAmenity?.pricePerUnit || 0;
                              const hoursUsed = selection.hoursUsed || 0;
                              const quantity = selection.quantity || 0;
                              const rentalTotal = hoursUsed > 0 ? hoursUsed * pricePerHour : quantity * pricePerUnit;

                              let quantityHoursText = '';
                              if (hoursUsed > 0) {
                                const totalHours = quantity * hoursUsed;
                                quantityHoursText = `${totalHours} hour(s)`;
                              } else {
                                const unitText = rentalAmenity?.unitType ? `per ${rentalAmenity.unitType}` : 'unit(s)';
                                quantityHoursText = `${quantity} ${unitText}`;
                              }

                              return (
                                <li key={amenityId}>
                                  {rentalAmenity?.name || `Rental Amenity ${amenityId}`}: {quantityHoursText} – <strong>₱{(rentalTotal / 100).toLocaleString()}</strong>
                                </li>
                              );
                            })}
                            {formData.selectedAmenities.cottage ? (
                              <li>
                                Cottage: {formData.selectedAmenities.cottage.quantity} unit(s) – <strong>₱{(formData.selectedAmenities.cottage.quantity * 1000).toLocaleString()}</strong>
                              </li>
                            ) : null}
                          </ul>
                          <div className="total-line">
                            <span>Total</span>
                            <strong>₱{(totalPrice / 100).toLocaleString()}</strong>
                          </div>
                          <div className="info-banner info-blue">
                            <p><strong>Note:</strong> Upon submission, your rooms will be held for 15 minutes. Complete the reservation fee payment within this time to avoid automatic cancellation.</p>
                          </div>
                          {(() => {
                            const roomsCount = Object.values(formData.selectedRooms || {}).reduce((sum, qty) => sum + (Number(qty) || 0), 0);
                            const reservationFeeNow = roomsCount * 2000;
                            return (
                              <div className="info-banner info-green">
                                <p><strong>Reservation fee:</strong> ₱2,000 per room. You currently have <strong>{roomsCount}</strong> room(s), so your reservation fee at checkout will be <strong>₱{reservationFeeNow.toLocaleString()}</strong>.</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="total-price-display" aria-live="polite">
                Total Price: ₱{(totalPrice / 100).toLocaleString()}
              </div>

              <div className="navigation-buttons">
                {step > 1 && <button type="button" onClick={handleBack} className="btn-secondary">Back</button>}
                {step < 3 && (
                  <button type="button" className="btn-next" onClick={handleNext} disabled={
                    !formData.checkIn ||
                    !formData.checkOut ||
                    formData.checkIn === formData.checkOut ||
                    formData.guests < 1 ||
                    (step === 1 && (() => {
                      const totalCapacity = computeTotalCapacity();
                      return totalCapacity < formData.guests;
                    })())
                  }>Next</button>
                )}
                {step === 3 && (
                  <div style={{ position: 'relative' }}>
                    <SubmitButton disabled={!formData.checkIn || formData.guests < 1 || Object.keys(formData.selectedRooms).length === 0 || !!cooldownUntil}>Submit Booking</SubmitButton>
                    {!!cooldownUntil && (
                      <div className="cooldown" title={`You have failed to pay multiple times. Please wait until the cooldown ends.`}>
                        You have failed to pay for your booking multiple times. Please wait {cooldownTimer || '...'} before trying again.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mobile sticky action bar */}
              <div className="mobile-cta" aria-live="polite">
                <div className="mobile-cta-left">
                  <span className="mobile-cta-label">Total</span>
                  <strong className="mobile-cta-amount">₱{(totalPrice / 100).toLocaleString()}</strong>
                </div>
                {step < 3 ? (
                  <button
                    type="button"
                    className="btn-next"
                    onClick={handleNext}
                    disabled={
                      !formData.checkIn ||
                      !formData.checkOut ||
                      formData.checkIn === formData.checkOut ||
                      formData.guests < 1 ||
                      (step === 1 && (() => {
                        const totalCapacity = computeTotalCapacity();
                        return totalCapacity < formData.guests;
                      })())
                    }
                  >Continue</button>
                ) : (
                  <SubmitButton disabled={!formData.checkIn || formData.guests < 1 || Object.keys(formData.selectedRooms).length === 0 || !!cooldownUntil}>Submit</SubmitButton>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Summary aside */}
        <aside className="summary" aria-label="Booking summary">
          <div className="summary-card">
            <h3 className="summary-title">Your Summary</h3>
            <ul className="kv">
              <li><span>Check-in</span><strong>{formData.checkIn ? new Date(formData.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</strong></li>
              <li><span>Check-out</span><strong>{formData.checkOut ? new Date(formData.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</strong></li>
              <li><span>Guests</span><strong>{formData.guests}</strong></li>
            </ul>
            <div className="summary-rooms">
              <span className="summary-sub">Rooms</span>
              {Object.keys(formData.selectedRooms).length === 0 ? (
                <p className="muted">No rooms selected yet.</p>
              ) : (
                <ul className="bulleted small">
                  {Object.entries(formData.selectedRooms).map(([roomId, qty]) => {
                    const room = availableRooms.find(r => r.id == roomId);
                    return <li key={roomId}>{qty} × {room?.name}</li>;
                  })}
                </ul>
              )}
            </div>

            <div className="summary-total">
              <span>Estimated total</span>
              <strong>₱{(totalPrice / 100).toLocaleString()}</strong>
            </div>
            <div className="summary-note">No charges yet. You’ll pay a reservation fee at checkout.</div>
          </div>
        </aside>
      </div>

      {showPendingPrompt && pendingBooking && (
        <div className="pending-prompt-overlay">
          <div className="pending-prompt">
            <h3>Pending Booking Found</h3>
            <p>
              A pending booking created at{' '}
              {new Date(pendingBooking.createdAt).toLocaleString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}{' '}
              for {new Date(pendingBooking.checkIn).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} to{' '}
              {new Date(pendingBooking.checkOut).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} was detected.
            </p>
            <p>What would you like to do?</p>
            <div className="prompt-buttons">
              <button 
                onClick={() => {
                  setShowPendingPrompt(false);
                  router.push('/checkout');
                }}
                className="proceed-btn"
              >
                Proceed to Checkout
              </button>
              <button 
                onClick={async () => {
                  try {
                    await fetch(`/api/bookings/${pendingBooking.id}`, { method: 'DELETE' });
                    localStorage.removeItem('bookingId');
                    localStorage.removeItem('bookingAmount');
                    setShowPendingPrompt(false);
                    alert('Booking cancelled successfully.');
                  } catch (err) {
                    console.error('Cancel error:', err);
                    alert('Failed to cancel booking. Please contact support.');
                  }
                }}
                className="cancel-btn"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {showSubmitModal && (
        <div className="submit-modal-overlay">
          <div className="submit-modal">
            <h3>Processing Your Booking{'.'.repeat(dotCount)}</h3>
            <p>Please wait while we process your booking request. Do not close this window or navigate away.</p>
            <div className="spinner"></div>
          </div>
        </div>
      )}

      {roomImagesModal.open && (
        <div className="modal-overlay" onClick={() => setRoomImagesModal({ open: false, selectedRoomId: null, selectedImage: null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="image-gallery">
              {(() => {
                const room = availableRooms.find(r => r.id === roomImagesModal.selectedRoomId);
                const images = room ? getRoomImages(room.type) : [];
                return images.map((img, idx) => (
                  <img key={idx} src={img} alt={`${room?.name} image ${idx + 1}`} onClick={() => setRoomImagesModal(prev => ({ ...prev, selectedImage: img }))} style={{ cursor: 'pointer' }} />
                ));
              })()}
            </div>
            <button className="close-btn" onClick={() => setRoomImagesModal({ open: false, selectedRoomId: null, selectedImage: null })}>Close</button>
          </div>
        </div>
      )}

      {roomImagesModal.selectedImage && (
        <div className="image-modal-overlay" onClick={() => setRoomImagesModal(prev => ({ ...prev, selectedImage: null }))}>
          <div className="image-modal-content" onClick={e => e.stopPropagation()}>
            <img src={roomImagesModal.selectedImage} alt="Full view" className="full-image" />
            <button className="close-image-btn" onClick={() => setRoomImagesModal(prev => ({ ...prev, selectedImage: null }))}>Close</button>
          </div>
        </div>
      )}

      {/* Styles */}
      <style jsx>{`
        :root {
          --amber: #FEBE52; /* primary brand */
          --amber-deep: #EDB509;
          --amber-dark: #ED7709; /* used across the app */
          --ink: #334155;
          --muted: #6b7280;
          --bg-soft: #f8fafc;
          --panel: #ffffff;
          --line: #e5e7eb;
          --blue: #0ea5e9;
          --green: #10b981;
          --red: #ef4444;
        }

        .container {
          min-height: 100vh;
          background: linear-gradient(135deg, rgba(254, 190, 82, 0.28), rgba(230, 244, 248, 0.65));
        }

        /* Hero */
        .hero {
          position: relative;
          padding: 36px 20px 20px 20px; /* more top padding */
          margin-top: 96px; /* push below navbar */
          background: radial-gradient(1200px 300px at 50% -50px, rgba(254, 190, 82, 0.28), rgba(254, 190, 82, 0) 60%),
                      linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0));
          overflow: hidden;
        }
        .hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }
        .hero-title {
          font-size: clamp(1.6rem, 2vw + 0.9rem, 2.4rem);
          line-height: 1.15;
          color: var(--ink);
          margin: 0 0 4px 0;
        }
        .hero-subtitle {
          font-size: clamp(0.95rem, 0.7vw + 0.65rem, 1.05rem);
          color: var(--muted);
          margin: 0 auto;
          max-width: 640px;
        }
        .wave {
          position: absolute;
          left: 0; right: 0; bottom: -1px;
          height: 26px; /* slimmer divider to reduce dominance */
          background: linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,1));
          mask-image: radial-gradient(50% 60% at 50% 110%, #000 70%, transparent 71%);
          -webkit-mask-image: radial-gradient(50% 60% at 50% 110%, #000 70%, transparent 71%);
        }

        /* Layout */
        .layout {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 20px 40px 20px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 980px) {
          .layout {
            grid-template-columns: 1.35fr 0.65fr;
            align-items: start;
          }
        }
        .main {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Stepper */
        .stepper {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          gap: 8px;
          align-items: center;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--muted);
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .step .badge {
          width: 28px; height: 28px;
          border-radius: 999px;
          display: grid; place-items: center;
          background: #e5e7eb;
          color: #111827;
          font-weight: 700;
        }
        .step.active { color: var(--ink); }
        .step.active .badge { background: var(--amber); color: #111827; }
        .label { white-space: nowrap; }
        .divider-dot { height: 4px; background: #e5e7eb; border-radius: 999px; align-self: center; }

        /* Progress bar */
        .progress-bar { background-color: #e5e7eb; border-radius: 999px; overflow: hidden; height: 8px; margin: 6px 0 8px 0; }
        .progress { height: 100%; background: linear-gradient(90deg, var(--amber), var(--amber-deep)); transition: width 0.35s ease; }

        /* Cards */
        .card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); overflow: hidden; }
        .card-header { padding: 18px 18px 0 18px; }
        .card-title { margin: 0; font-size: 1.25rem; color: var(--ink); }
        .card-subtitle { margin: 6px 0 0 0; color: var(--muted); font-weight: 500; }
        .card-body { padding: 18px; }

        /* Form basics */
        .form-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 760px) { .form-grid { grid-template-columns: 1.2fr 0.8fr; } }
        .form-block { display: flex; flex-direction: column; gap: 10px; }
        .label { display: block; font-weight: 700; color: var(--ink); }
        input[type="number"] { width: 100%; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; font-size: 16px; outline: none; transition: box-shadow 0.25s ease, border-color 0.25s ease; }
        input[type="number"]:focus { border-color: var(--amber); box-shadow: 0 0 0 4px rgba(254, 190, 82, 0.18); }
        .date-display { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; background: var(--bg-soft); padding: 10px; border-radius: 10px; color: var(--ink); }

        .rooms-header { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-top: 16px; }
        .hint { color: var(--muted); font-size: 0.9rem; }

  /* Calendar chrome */
  .calendar-shell { border: 1px solid var(--line); background: #fff; border-radius: 12px; padding: 10px; box-shadow: 0 8px 22px rgba(0,0,0,0.05); }
  .calendar-shell :global(button) { border-radius: 8px; }
  .calendar-shell :global(.selected),
  .calendar-shell :global(.in-range) { outline: 2px solid rgba(254, 190, 82, 0.4); }
  .calendar-shell :global(.available) { background: #f9fafb; }
  .calendar-shell :global(.unavailable) { filter: grayscale(0.3); opacity: 0.55; }
  .calendar-head { display: inline-flex; align-items: center; gap: 8px; margin: 4px 2px 10px 2px; }
  .pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 999px; font-weight: 700; font-size: 12px; color: #111827; background: linear-gradient(180deg, #fff, #f8fafc); border: 1px solid var(--line); }
  .dot { width: 6px; height: 6px; border-radius: 999px; background: var(--amber); display: inline-block; }

        /* Rooms grid */
        .room-selector { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 10px; }
  .room-skeletons { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-top: 10px; }
  .skeleton-card { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: #fff; padding-bottom: 12px; }
  .skeleton-img { height: 140px; background: #e5e7eb; }
  .skeleton-line { height: 14px; background: #e5e7eb; margin: 12px 12px 6px; border-radius: 8px; }
  .skeleton-sub { height: 10px; background: #e5e7eb; margin: 0 12px; border-radius: 8px; width: 60%; }
  .shimmer { position: relative; overflow: hidden; }
  .shimmer::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%); background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.6), rgba(255,255,255,0)); animation: shimmer 1.5s infinite; }
  @keyframes shimmer { 100% { transform: translateX(100%); } }
        .room-option-container { position: relative; }
        .room-option { border: 1px solid var(--line); border-radius: 12px; cursor: pointer; transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease; background: #fff; overflow: hidden; }
        .room-option:focus-visible { outline: 2px solid rgba(254, 190, 82, 0.7); outline-offset: 3px; }
        .room-option:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
        .room-option.selected { border-color: var(--amber); box-shadow: 0 0 0 3px rgba(254, 190, 82, 0.3); }
        .room-option.disabled { cursor: not-allowed; opacity: 0.6; filter: grayscale(0.15); }
        .room-media { position: relative; }
        .room-option img { width: 100%; height: 140px; object-fit: cover; display: block; }
        .available-count { position: absolute; top: 10px; right: 10px; background: var(--amber-dark); color: #fff; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
        .available-count.full { background-color: var(--red); }
        .room-meta { padding: 10px 12px 12px; text-align: left; }
  .room-name { font-weight: 800; color: var(--ink); }
  .room-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; align-items: center; }
  .tag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #374151; background: #f3f4f6; border: 1px solid #e5e7eb; padding: 6px 8px; border-radius: 999px; }
  .tag.type { text-transform: capitalize; }
  .tag.price { background: #fffbeb; border-color: #fde68a; color: #92400e; }
        .room-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 8px; }
        .quantity-controls { display: inline-flex; justify-content: center; align-items: center; gap: 8px; }
        .quantity-controls button { width: 34px; height: 34px; border: 1px solid var(--line); background: linear-gradient(180deg, #fff, #f8fafc); color: #111827; border-radius: 999px; cursor: pointer; font-size: 18px; font-weight: 800; display: grid; place-items: center; transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .quantity-controls button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); }
        .quantity-controls button:disabled { background-color: #f3f4f6; cursor: not-allowed; color: #9ca3af; }
        .quantity-controls span { font-size: 14px; font-weight: 800; min-width: 18px; text-align: center; }

        .capacity-warning { color: var(--red); font-weight: 700; margin-top: 12px; padding: 12px; background-color: #fef2f2; border-radius: 10px; border: 1px solid #fecaca; }
        .room-lock-warning { color: #064e3b; background-color: #ecfdf5; border: 1px solid #bbf7d0; padding: 12px; border-radius: 10px; margin-top: 10px; font-weight: 700; }
        .date-warning { color: #b91c1c; background-color: #fff1f2; border: 1px solid #fecaca; padding: 10px; border-radius: 10px; margin-top: 8px; font-weight: 700; }

        /* Buttons */
        .navigation-buttons { display: grid; grid-auto-flow: column; gap: 10px; margin-top: 16px; }
        button { padding: 14px 16px; font-size: 16px; font-weight: 800; background: linear-gradient(135deg, #b45309 0%, #f59e0b 52%, var(--amber) 100%); color: white; border: none; border-radius: 12px; cursor: pointer; transition: transform 0.3s ease, box-shadow 0.3s ease; }
        .btn-secondary { background: linear-gradient(135deg, #f3f4f6, #e5e7eb); color: #111827; border: 1px solid var(--line); }
        button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 28px rgba(245, 158, 11, 0.28); }
        button:disabled { background: #9ca3af; cursor: not-allowed; }
        .total-price-display { margin-top: 14px; text-align: right; font-size: 1.1rem; font-weight: 800; color: var(--amber-dark); }
        .cooldown { margin-top: 8px; color: #b91c1c; font-weight: 700; }

  /* Mobile CTA bar */
  .mobile-cta { position: fixed; left: 0; right: 0; bottom: 0; background: rgba(255,255,255,0.92); backdrop-filter: saturate(120%) blur(6px); border-top: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; gap: 12px; z-index: 1500; }
  .mobile-cta-left { display: flex; flex-direction: column; }
  .mobile-cta-label { color: var(--muted); font-size: 12px; }
  .mobile-cta-amount { color: var(--ink); font-size: 18px; }
  @media (min-width: 980px) { .mobile-cta { display: none; } }

        /* Summary */
        .summary { position: sticky; top: 84px; height: fit-content; }
        @media (max-width: 979px) { .summary { position: static; } }
        .summary-card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; box-shadow: 0 8px 24px rgba(0,0,0,0.06); padding: 18px; }
        .summary-title { margin: 0 0 10px 0; color: var(--ink); }
        .summary-sub { color: var(--ink); font-weight: 700; }
        .summary-rooms { margin-top: 8px; }
        .summary-total { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--line); }
        .summary-note { margin-top: 6px; color: var(--muted); font-size: 0.9rem; }

        /* Lists */
        .kv { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
        .kv li { display: flex; justify-content: space-between; align-items: center; color: var(--ink); }
        .bulleted { list-style: disc; margin: 8px 0 0 18px; color: var(--ink); }
        .bulleted.small { font-size: 0.95rem; }

        .review-grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
        @media (min-width: 760px) { .review-grid { grid-template-columns: 1fr 1fr; } }
        .section-title { margin: 0 0 6px 0; color: var(--ink); font-size: 1.05rem; }
        .total-line { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); margin: 8px 0; }
        .info-banner { padding: 12px; border-radius: 10px; margin-top: 10px; font-weight: 600; }
        .info-blue { background: #e0f2fe; border: 1px solid var(--blue); color: #0c4a6e; }
        .info-green { background: #ecfdf5; border: 1px solid var(--green); color: #064e3b; }

        /* Modals */
        .pending-prompt-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .pending-prompt { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); max-width: 500px; text-align: center; }
        .pending-prompt h3 { color: var(--amber); margin-bottom: 10px; }
        .pending-prompt p { color: var(--ink); margin-bottom: 20px; }
        .prompt-buttons { display: flex; gap: 10px; justify-content: center; }
        .proceed-btn, .cancel-btn { padding: 12px 24px; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; transition: all 0.3s ease; }
        .proceed-btn { background-color: var(--green); color: white; }
        .proceed-btn:hover { background-color: #059669; }
        .cancel-btn { background-color: var(--red); color: white; }
        .cancel-btn:hover { background-color: #dc2626; }

        .submit-modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; justify-content: center; align-items: center; z-index: 2000; }
        .submit-modal { background: white; padding: 30px; border-radius: 15px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); max-width: 400px; text-align: center; }
        .submit-modal h3 { color: var(--amber); margin-bottom: 15px; }
        .submit-modal p { color: var(--ink); margin-bottom: 20px; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid var(--amber); border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .view-images-btn { padding: 8px 12px; background-color: var(--amber); color: white; border: none; border-radius: 8px; font-size: 13px; cursor: pointer; transition: background-color 0.3s ease; }
        .view-images-btn:hover { background-color: var(--amber-deep); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: #fff; border-radius: 12px; max-width: 600px; width: 90%; padding: 2rem; box-shadow: 0 8px 20px rgba(0,0,0,0.2); max-height: 90vh; overflow-y: auto; }
        .image-gallery { display: flex; gap: 0.75rem; overflow-x: auto; margin-bottom: 1rem; }
        .image-gallery img { width: 170px; height: 100px; object-fit: cover; border-radius: 6px; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        .close-btn { background-color: #ccc; color: #333; border: none; padding: 0.7rem 1.2rem; border-radius: 6px; font-weight: 600; cursor: pointer; }
        .close-btn:hover { background-color: #aaa; }

        .image-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1100; }
        .image-modal-content { background: #fff; border-radius: 12px; max-width: 90%; max-height: 90%; padding: 1rem; box-shadow: 0 8px 20px rgba(0,0,0,0.3); display: flex; flex-direction: column; align-items: center; }
        .full-image { max-width: 100%; max-height: 80vh; object-fit: contain; border-radius: 6px; }
        .close-image-btn { margin-top: 1rem; background-color: #ccc; color: #333; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }
        .close-image-btn:hover { background-color: #aaa; }
      `}</style>

      {/* Navigation Confirmation Modal */}
      <NavigationConfirmationModal 
        show={navigationGuard.showModal}
        onStay={navigationGuard.handleStay}
        onLeave={navigationGuard.handleLeave}
        context={navigationGuard.context}
        message={navigationGuard.message}
      />
    </div>
  );
}
