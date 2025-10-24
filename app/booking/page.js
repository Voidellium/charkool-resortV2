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
import DataPrivacyModal from '../../components/DataPrivacyModal';

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
  // Data Privacy modal state
  const [showDataPrivacyModal, setShowDataPrivacyModal] = useState(false);
  const [dataPrivacyAccepted, setDataPrivacyAccepted] = useState(false);

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

  const getRoomDescription = (roomType) => {
    switch (roomType) {
      case 'TEPEE':
        return 'Designed for larger groups, the Tepee Room blends comfort and space for a memorable stay. Ideal for group or barkada trips, complete with cooking facilities and a private grilling area.';
      case 'LOFT':
        return 'Perfect for small groups or families, the Loft Room offers a cozy retreat with modern amenities. Enjoy comfort and convenience in a stylish setting.';
      case 'VILLA':
        return 'Spacious and luxurious, the Villa is perfect for large gatherings and special occasions. Experience ultimate comfort with premium amenities and stunning views.';
      default:
        return 'Experience comfort and relaxation in our beautifully designed rooms.';
    }
  };

  const getRoomAmenities = (roomType) => {
    const commonAmenities = [
      { icon: '❄️', label: 'Airconditioned' },
      { icon: '📶', label: 'Wi-Fi Access' },
      { icon: '🏊', label: 'Pool Access' }
    ];

    switch (roomType) {
      case 'TEPEE':
        return [
          ...commonAmenities,
          { icon: '🛏️', label: '5 Beds' },
          { icon: '🧊', label: 'Mini Fridge' },
          { icon: '🍳', label: 'Gas and Stove' },
          { icon: '🔥', label: 'Grill Access' }
        ];
      case 'LOFT':
        return [
          ...commonAmenities,
          { icon: '🛏️', label: '3 Beds' },
          { icon: '🧊', label: 'Mini Fridge' }
        ];
      case 'VILLA':
        return [
          ...commonAmenities,
          { icon: '🛏️', label: '10 Beds' },
          { icon: '🧊', label: 'Mini Fridge' },
          { icon: '🍳', label: 'Kitchen Access' }
        ];
      default:
        return commonAmenities;
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

    // Check if data privacy policy is accepted first
    if (!dataPrivacyAccepted) {
      setShowDataPrivacyModal(true);
      alert('❌ Please accept the Data Privacy Policy to continue with your booking.');
      return;
    }

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
          numberOfGuests: formData.guests,
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
                  <div className="card review-card">
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

              {/* Data Privacy Checkbox - only on final step */}
              {step === 3 && (
                <div className="privacy-container">
                  <input
                    type="checkbox"
                    id="privacyCheckbox"
                    checked={dataPrivacyAccepted}
                    onChange={(e) => setDataPrivacyAccepted(e.target.checked)}
                    className="privacy-checkbox"
                  />
                  <label htmlFor="privacyCheckbox" className="privacy-label">
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowDataPrivacyModal(true)}
                      className="privacy-link"
                    >
                      Data Privacy Policy
                    </button>
                  </label>
                </div>
              )}

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
            {(() => {
              const room = availableRooms.find(r => r.id === roomImagesModal.selectedRoomId);
              if (!room) return null;
              const images = getRoomImages(room.type);
              const capacity = getRoomCapacity(room.type);
              const description = getRoomDescription(room.type);
              const amenities = getRoomAmenities(room.type);
              
              return (
                <>
                  <div className="image-gallery">
                    {images.map((img, idx) => (
                      <img 
                        key={idx} 
                        src={img} 
                        alt={`${room.name} image ${idx + 1}`} 
                        onClick={() => setRoomImagesModal(prev => ({ ...prev, selectedImage: img }))}
                      />
                    ))}
                  </div>
                  <h2>{room.name}</h2>
                  <p className="room-modal-capacity">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v3h16v-3c0-2.761-3.582-5-8-5z" fill="currentColor"/>
                    </svg>
                    Up to {capacity.max} pax
                  </p>
                  <p className="room-modal-description">{description}</p>
                  <ul className="room-modal-amenities">
                    {amenities.map((amenity, idx) => (
                      <li key={idx} className="room-modal-amenity-item">
                        <span className="room-modal-icon">{amenity.icon}</span> {amenity.label}
                      </li>
                    ))}
                  </ul>
                  <div className="modal-actions">
                    <button className="close-btn" onClick={() => setRoomImagesModal({ open: false, selectedRoomId: null, selectedImage: null })}>Close</button>
                  </div>
                </>
              );
            })()}
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
          /* Pull from global theme when available, fall back to closest brand values */
          --amber: var(--primary-end, #febe52);
          --amber-deep: var(--primary-start, #ffb347);
          --amber-dark: #B45309; /* deeper brand for badges/buttons */
          --accent: var(--accent, #06b6d4);
          --ink: #0f172a; /* slate-900 for stronger contrast */
          --muted: #64748b; /* improved readability */
          --bg-soft: #f8fafc;
          --panel: #ffffff;
          --line: #e2e8f0;
          --blue: #0284c7;
          --green: #10b981;
          --red: #ef4444;
          --shadow-sm: 0 2px 8px rgba(0,0,0,0.04);
          --shadow-md: 0 4px 16px rgba(0,0,0,0.08);
          --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
          --shadow-xl: 0 12px 48px rgba(0,0,0,0.16);
        }

        * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .container {
          min-height: 100vh;
          /* Subtle beach-inspired gradient matching the navbar palette */
          background: radial-gradient(1400px 360px at 50% -80px, rgba(254, 190, 82, 0.24), rgba(254, 190, 82, 0) 65%),
                      linear-gradient(135deg, rgba(254, 190, 82, 0.12), rgba(2, 132, 199, 0.04)),
                      linear-gradient(180deg, #fff, #fafbfc);
        }

        /* Hero */
        .hero {
          position: relative;
          padding: 56px 24px 32px 24px;
          margin-top: 96px; /* push below navbar */
          background: radial-gradient(1400px 340px at 50% -50px, rgba(254, 190, 82, 0.32), rgba(254, 190, 82, 0) 62%),
                      linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.1));
          overflow: hidden;
        }
        .hero-inner {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }
        .hero-title {
          font-size: clamp(2rem, 2.5vw + 1rem, 3.2rem);
          line-height: 1.2;
          color: var(--ink);
          margin: 0 0 12px 0;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .hero-subtitle {
          font-size: clamp(1.05rem, 0.8vw + 0.8rem, 1.25rem);
          color: var(--muted);
          margin: 0 auto;
          max-width: 680px;
          font-weight: 500;
          line-height: 1.6;
        }
        .wave {
          position: absolute;
          left: 0; right: 0; bottom: -1px;
          height: 32px;
          background: linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,1));
          mask-image: radial-gradient(52% 62% at 50% 110%, #000 72%, transparent 73%);
          -webkit-mask-image: radial-gradient(52% 62% at 50% 110%, #000 72%, transparent 73%);
        }

        /* Layout */
        .layout {
          max-width: 1240px;
          margin: 0 auto;
          padding: 32px 20px 60px 20px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
        }
        @media (min-width: 768px) {
          .layout {
            padding: 40px 28px 80px 28px;
          }
        }
        @media (min-width: 980px) {
          .layout {
            grid-template-columns: 1.4fr 0.6fr;
            align-items: start;
            gap: 40px;
          }
        }
        .main {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* Stepper */
        .stepper {
          display: grid;
          grid-auto-flow: column;
          grid-auto-columns: 1fr;
          gap: 10px;
          align-items: center;
          padding: 16px;
          background: linear-gradient(135deg, rgba(254, 190, 82, 0.06), rgba(255,255,255,0.8));
          border-radius: 16px;
          border: 1px solid rgba(254, 190, 82, 0.15);
          box-shadow: var(--shadow-sm);
        }
        @media (max-width: 640px) {
          .stepper {
            padding: 12px 10px;
          }
        }
        .step {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--muted);
          font-weight: 700;
          letter-spacing: 0.015em;
          font-size: clamp(0.85rem, 2vw, 0.95rem);
          transition: color 0.3s ease;
        }
        .step .badge {
          width: 36px; 
          height: 36px;
          border-radius: 999px;
          display: grid; 
          place-items: center;
          background: linear-gradient(135deg, #e5e7eb, #d1d5db);
          color: #6b7280;
          font-weight: 900;
          font-size: 16px;
          box-shadow: var(--shadow-sm);
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .step.active { 
          color: var(--ink); 
        }
        .step.active .badge { 
          background: linear-gradient(135deg, var(--amber), var(--amber-deep)); 
          color: #111827; 
          box-shadow: 0 8px 20px rgba(245, 158, 11, 0.35);
          transform: scale(1.08);
        }
        .label { 
          white-space: nowrap; 
        }
        @media (max-width: 640px) {
          .label {
            display: none;
          }
          .step .badge {
            width: 32px;
            height: 32px;
            font-size: 14px;
          }
        }
        .divider-dot { 
          height: 6px; 
          background: linear-gradient(90deg, #e5e7eb, #f3f4f6); 
          border-radius: 999px; 
          align-self: center;
          transition: background 0.3s ease;
        }

        /* Progress bar */
        .progress-bar { 
          background-color: #e5e7eb; 
          border-radius: 999px; 
          overflow: hidden; 
          height: 12px; 
          margin: 10px 0 12px 0;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
        }
        .progress { 
          height: 100%; 
          background: linear-gradient(90deg, var(--amber-deep), var(--amber), var(--amber-deep)); 
          transition: width 0.45s cubic-bezier(0.4, 0, 0.2, 1); 
          box-shadow: 0 8px 20px rgba(245,158,11,0.3) inset;
          position: relative;
        }
        .progress::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Cards */
        .card { 
          background: var(--panel); 
          border: 1px solid var(--line); 
          border-radius: 20px; 
          box-shadow: var(--shadow-lg); 
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }
        .card:hover {
          box-shadow: var(--shadow-xl);
        }
        .card-header { 
          padding: 24px 24px 0 24px; 
        }
        @media (max-width: 640px) {
          .card-header {
            padding: 20px 18px 0 18px;
          }
        }
        .card-title { 
          margin: 0; 
          font-size: clamp(1.4rem, 2vw, 1.75rem);
          color: var(--ink); 
          letter-spacing: -0.02em;
          font-weight: 800;
          line-height: 1.3;
        }
        .card-subtitle { 
          margin: 10px 0 0 0; 
          color: var(--muted); 
          font-weight: 500;
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
          line-height: 1.5;
        }
        .card-body { 
          padding: 24px; 
        }
        @media (max-width: 640px) {
          .card-body {
            padding: 18px;
          }
        }

        /* Form basics */
        .form-grid { 
          display: grid; 
          grid-template-columns: 1fr; 
          gap: 24px; 
        }
        @media (min-width: 760px) { 
          .form-grid { 
            grid-template-columns: 1.3fr 0.7fr; 
            gap: 28px;
          } 
        }
        .form-block { 
          display: flex; 
          flex-direction: column; 
          gap: 12px; 
        }
        .label { 
          display: block; 
          font-weight: 800; 
          color: var(--ink); 
          letter-spacing: 0.005em;
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
        }
        input[type="number"] { 
          width: 100%; 
          padding: 14px 16px; 
          border: 2px solid var(--line); 
          border-radius: 14px; 
          font-size: 16px; 
          outline: none; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          background: #fff;
          font-weight: 600;
          color: var(--ink);
        }
        input[type="number"]:hover {
          border-color: #cbd5e1;
        }
        input[type="number"]:focus { 
          border-color: var(--amber); 
          box-shadow: 0 0 0 4px rgba(254, 190, 82, 0.2), var(--shadow-md); 
          transform: translateY(-2px); 
        }
        .date-display { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 12px; 
          margin-top: 10px; 
          background: linear-gradient(135deg, var(--bg-soft), #fff); 
          padding: 14px 16px; 
          border-radius: 14px; 
          color: var(--ink);
          border: 1px solid rgba(226, 232, 240, 0.8);
          box-shadow: var(--shadow-sm);
        }
        .date-display > div {
          font-size: 0.95rem;
        }

        .rooms-header { 
          display: flex; 
          flex-direction: column;
          gap: 8px; 
          margin-top: 20px;
          margin-bottom: 12px;
        }
        @media (min-width: 640px) {
          .rooms-header {
            flex-direction: row;
            align-items: baseline; 
            justify-content: space-between;
            gap: 16px;
          }
        }
        .hint { 
          color: var(--muted); 
          font-size: clamp(0.85rem, 1.5vw, 0.95rem);
          line-height: 1.5;
        }

        /* Calendar chrome */
        .calendar-shell { 
          border: 2px solid var(--line); 
          background: #fff; 
          border-radius: 16px; 
          padding: 16px; 
          box-shadow: var(--shadow-md);
          transition: box-shadow 0.3s ease;
        }
        .calendar-shell:hover {
          box-shadow: var(--shadow-lg);
        }
        .calendar-shell :global(button) { 
          border-radius: 10px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .calendar-shell :global(button:hover) {
          transform: scale(1.05);
        }
        .calendar-shell :global(.selected),
        .calendar-shell :global(.in-range) { 
          outline: 3px solid rgba(254, 190, 82, 0.5); 
          background: rgba(254,190,82,0.12);
          box-shadow: var(--shadow-sm);
        }
        .calendar-shell :global(.available) { 
          background: #f9fafb; 
        }
        .calendar-shell :global(.unavailable) { 
          filter: grayscale(0.4); 
          opacity: 0.5; 
        }
        .calendar-head { 
          display: inline-flex; 
          align-items: center; 
          gap: 10px; 
          margin: 6px 2px 14px 2px;
          flex-wrap: wrap;
        }
        .pill { 
          display: inline-flex; 
          align-items: center; 
          gap: 7px; 
          padding: 8px 14px; 
          border-radius: 999px; 
          font-weight: 700; 
          font-size: 13px; 
          color: #111827; 
          background: linear-gradient(135deg, #fff, #f8fafc); 
          border: 1.5px solid var(--line);
          box-shadow: var(--shadow-sm);
        }
        .dot { 
          width: 7px; 
          height: 7px; 
          border-radius: 999px; 
          background: var(--amber); 
          display: inline-block;
          box-shadow: 0 0 8px rgba(254, 190, 82, 0.5);
        }

        /* Rooms grid */
        .room-selector { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); 
          gap: 20px; 
          margin-top: 16px; 
        }
        @media (max-width: 640px) {
          .room-selector {
            grid-template-columns: 1fr;
          }
        }
        .room-skeletons { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); 
          gap: 20px; 
          margin-top: 16px; 
        }
        @media (max-width: 640px) {
          .room-skeletons {
            grid-template-columns: 1fr;
          }
        }
        .skeleton-card { 
          border: 2px solid var(--line); 
          border-radius: 16px; 
          overflow: hidden; 
          background: #fff; 
          padding-bottom: 14px;
          box-shadow: var(--shadow-sm);
        }
        .skeleton-img { 
          height: 160px; 
          background: #e5e7eb; 
        }
        .skeleton-line { 
          height: 16px; 
          background: #e5e7eb; 
          margin: 14px 14px 8px; 
          border-radius: 10px; 
        }
        .skeleton-sub { 
          height: 12px; 
          background: #e5e7eb; 
          margin: 0 14px; 
          border-radius: 10px; 
          width: 65%; 
        }
        .shimmer { 
          position: relative; 
          overflow: hidden; 
        }
        .shimmer::after { 
          content: ""; 
          position: absolute; 
          inset: 0; 
          transform: translateX(-100%); 
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.7), rgba(255,255,255,0)); 
          animation: shimmer 1.8s infinite ease-in-out; 
        }
        @keyframes shimmer { 
          100% { transform: translateX(100%); } 
        }
        .room-option-container { 
          position: relative; 
          padding-bottom: 64px; 
        }
        .room-option { 
          border: 2px solid var(--line); 
          border-radius: 18px; 
          cursor: pointer; 
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); 
          background: #fff; 
          overflow: hidden;
          box-shadow: var(--shadow-md);
        }
        .room-option:focus-visible { 
          outline: 3px solid rgba(254, 190, 82, 0.8); 
          outline-offset: 4px; 
        }
        .room-option:hover:not(.disabled) { 
          transform: translateY(-4px); 
          box-shadow: var(--shadow-xl);
          border-color: rgba(254, 190, 82, 0.4);
        }
        .room-option.selected { 
          border-color: var(--amber); 
          box-shadow: 0 0 0 4px rgba(254, 190, 82, 0.25), var(--shadow-lg);
        }
        .room-option.disabled { 
          cursor: not-allowed; 
          opacity: 0.55; 
          filter: grayscale(0.3); 
        }
        .room-media { 
          position: relative;
          overflow: hidden;
        }
        .room-option img { 
          width: 100%; 
          height: 180px; 
          object-fit: cover; 
          display: block;
          transition: transform 0.35s ease;
        }
        .room-option:hover:not(.disabled) img {
          transform: scale(1.05);
        }
        .available-count { 
          position: absolute; 
          top: 12px; 
          right: 12px; 
          background: var(--amber-dark); 
          color: #fff; 
          padding: 8px 14px; 
          border-radius: 999px; 
          font-size: 13px; 
          font-weight: 900; 
          box-shadow: var(--shadow-md); 
          letter-spacing: 0.025em;
          backdrop-filter: blur(8px);
        }
        .available-count.full { 
          background-color: var(--red);
          animation: pulse-red 2s ease-in-out infinite;
        }
        @keyframes pulse-red {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .room-meta { 
          padding: 14px 16px 16px; 
          text-align: left; 
        }
        .room-name { 
          font-weight: 900; 
          color: var(--ink); 
          letter-spacing: 0.005em;
          font-size: clamp(1.05rem, 2vw, 1.15rem);
          line-height: 1.3;
        }
        .room-tags { 
          display: flex; 
          flex-wrap: wrap; 
          gap: 8px; 
          margin-top: 10px; 
          align-items: center; 
        }
        .tag { 
          display: inline-flex; 
          align-items: center; 
          gap: 6px; 
          font-size: 12px; 
          font-weight: 800; 
          color: #374151; 
          background: #f3f4f6; 
          border: 1px solid #e5e7eb; 
          padding: 7px 11px; 
          border-radius: 999px;
          transition: all 0.2s ease;
        }
        .tag:hover {
          background: #e5e7eb;
        }
        .tag.type { 
          text-transform: capitalize; 
        }
        .tag.price { 
          background: #fffbeb; 
          border-color: #fde68a; 
          color: #92400e;
          font-weight: 900;
        }
        /* Prevent card expansion on select by anchoring actions */
        .room-actions { 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          gap: 12px; 
          position: absolute; 
          left: 14px; 
          right: 14px; 
          bottom: 8px; 
          margin-top: 0; 
        }
        .quantity-controls { 
          display: inline-flex; 
          justify-content: center; 
          align-items: center; 
          gap: 10px;
          background: linear-gradient(135deg, #fff, #f8fafc);
          padding: 6px 8px;
          border-radius: 999px;
          border: 1.5px solid var(--line);
          box-shadow: var(--shadow-sm);
        }
        .quantity-controls button { 
          width: 40px; 
          height: 40px; 
          border: 2px solid var(--line); 
          background: linear-gradient(135deg, #fff, #f8fafc); 
          color: #111827; 
          border-radius: 999px; 
          cursor: pointer; 
          font-size: 20px; 
          font-weight: 600; 
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-sm);
          line-height: 1;
        }
        .quantity-controls button:hover:not(:disabled) { 
          transform: translateY(-2px) scale(1.05); 
          box-shadow: var(--shadow-md);
          border-color: var(--amber);
        }
        .quantity-controls button:disabled { 
          background-color: #f3f4f6; 
          cursor: not-allowed; 
          color: #9ca3af;
          border-color: #e5e7eb;
        }
        .quantity-controls span { 
          font-size: 16px; 
          font-weight: 600; 
          min-width: 24px; 
          text-align: center;
          color: var(--ink);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .capacity-warning { 
          color: #991b1b; 
          font-weight: 800; 
          margin-top: 16px; 
          padding: 16px; 
          background: linear-gradient(135deg, #fef2f2, #fee2e2); 
          border-radius: 14px; 
          border: 2px solid #fecaca;
          box-shadow: var(--shadow-sm);
          font-size: clamp(0.9rem, 1.5vw, 1rem);
        }
        .room-lock-warning { 
          color: #064e3b; 
          background: linear-gradient(135deg, #ecfdf5, #d1fae5); 
          border: 2px solid #86efac; 
          padding: 16px; 
          border-radius: 14px; 
          margin-top: 12px; 
          font-weight: 800;
          box-shadow: var(--shadow-sm);
          font-size: clamp(0.9rem, 1.5vw, 1rem);
        }
        .date-warning { 
          color: #991b1b; 
          background: linear-gradient(135deg, #fff1f2, #fecdd3); 
          border: 2px solid #fca5a5; 
          padding: 14px; 
          border-radius: 14px; 
          margin-top: 10px; 
          font-weight: 800;
          box-shadow: var(--shadow-sm);
          font-size: clamp(0.9rem, 1.5vw, 1rem);
        }

        /* Buttons */
        .navigation-buttons { 
          display: grid; 
          grid-auto-flow: column; 
          gap: 12px; 
          margin-top: 24px; 
        }
        @media (max-width: 640px) {
          .navigation-buttons {
            grid-auto-flow: row;
            gap: 10px;
          }
        }
        button { 
          padding: 16px 24px; 
          font-size: clamp(15px, 2vw, 17px); 
          font-weight: 900; 
          text-transform: uppercase; 
          letter-spacing: 0.08em; 
          background: linear-gradient(135deg, #b45309 0%, #f59e0b 52%, var(--amber) 100%); 
          color: white; 
          border: none; 
          border-radius: 16px; 
          cursor: pointer; 
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: var(--shadow-md);
          position: relative;
          overflow: hidden;
        }
        button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          transition: left 0.5s ease;
        }
        button:hover:not(:disabled)::before {
          left: 100%;
        }
        .btn-next { 
          background: linear-gradient(135deg, #FEBE52, #ffd580) !important; 
          color: #111827 !important; 
          border: 2px solid rgba(253, 230, 138, 0.5) !important; 
          box-shadow: 0 12px 32px rgba(254, 190, 82, 0.42) !important; 
        }
        .btn-secondary { 
          background: linear-gradient(135deg, #6b7280, #4b5563) !important; 
          color: #ffffff !important; 
          border: 2px solid #9ca3af !important; 
          text-transform: none !important; 
          letter-spacing: 0.02em !important; 
          font-weight: 800 !important; 
          box-shadow: 0 10px 26px rgba(107, 114, 128, 0.32) !important; 
        }
        button:hover:not(:disabled) { 
          transform: translateY(-3px) scale(1.02); 
          box-shadow: var(--shadow-xl); 
          filter: saturate(1.1) brightness(1.05); 
        }
        button:active:not(:disabled) {
          transform: translateY(-1px) scale(1);
        }
        button:disabled { 
          background: linear-gradient(135deg, #9ca3af, #6b7280) !important; 
          cursor: not-allowed; 
          filter: grayscale(0.3);
          opacity: 0.6;
          box-shadow: var(--shadow-sm) !important;
        }
        button:focus-visible { 
          outline: 4px solid rgba(253, 230, 138, 0.7); 
          outline-offset: 4px; 
        }
        .total-price-display { 
          margin-top: 18px; 
          text-align: right; 
          font-size: clamp(1.15rem, 2vw, 1.35rem); 
          font-weight: 900; 
          color: var(--amber-dark); 
          letter-spacing: 0.005em;
          padding: 14px 18px;
          background: linear-gradient(135deg, rgba(254, 190, 82, 0.1), rgba(254, 190, 82, 0.05));
          border-radius: 14px;
          border: 2px solid rgba(254, 190, 82, 0.25);
          box-shadow: var(--shadow-sm);
        }
        .cooldown { 
          margin-top: 12px; 
          color: #991b1b; 
          font-weight: 700;
          font-size: clamp(0.9rem, 1.5vw, 1rem);
          line-height: 1.5;
        }

        /* Data Privacy Checkbox Styles */
        .privacy-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1rem;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, rgba(219, 234, 254, 0.4), rgba(191, 219, 254, 0.2));
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 12px;
          transition: all 0.2s;
        }

        .privacy-container:has(input:checked) {
          background: linear-gradient(135deg, rgba(219, 234, 254, 0.6), rgba(191, 219, 254, 0.4));
          border-color: rgba(59, 130, 246, 0.5);
        }

        .privacy-checkbox {
          width: 20px;
          height: 20px;
          cursor: pointer;
          flex-shrink: 0;
          accent-color: #3b82f6;
        }

        .privacy-label {
          color: #1f2937;
          font-size: 0.95rem;
          cursor: pointer;
          margin: 0;
          user-select: none;
          font-weight: 500;
        }

        .privacy-link {
          background: none;
          border: none;
          color: #3b82f6;
          font-weight: 700;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font-size: 0.95rem;
        }

        .privacy-link:hover {
          color: #2563eb;
        }

        /* Mobile CTA bar */
        .mobile-cta { 
          position: fixed; 
          left: 0; 
          right: 0; 
          bottom: 0; 
          background: rgba(255,255,255,0.96); 
          backdrop-filter: saturate(140%) blur(12px); 
          border-top: 2px solid var(--line); 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 16px 20px; 
          gap: 16px; 
          z-index: 1500;
          box-shadow: 0 -8px 32px rgba(0,0,0,0.08);
          animation: slideUp 0.4s ease-out;
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .mobile-cta-left { 
          display: flex; 
          flex-direction: column;
          gap: 2px;
        }
        .mobile-cta-label { 
          color: var(--muted); 
          font-size: 13px; 
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .mobile-cta-amount { 
          color: var(--ink); 
          font-size: 22px; 
          font-weight: 900; 
          letter-spacing: -0.01em; 
        }
        .mobile-cta button {
          white-space: nowrap;
          padding: 14px 20px;
        }
        @media (min-width: 980px) { 
          .mobile-cta { 
            display: none; 
          } 
        }

        /* Summary */
        .summary { 
          position: sticky; 
          top: 96px; 
          height: fit-content; 
        }
        @media (max-width: 979px) { 
          .summary { 
            position: static; 
          } 
        }
        .summary-card { 
          background: linear-gradient(135deg, var(--panel), var(--bg-soft)); 
          border: 2px solid var(--line); 
          border-radius: 20px; 
          box-shadow: var(--shadow-lg); 
          padding: 24px;
          transition: box-shadow 0.3s ease;
        }
        .summary-card:hover {
          box-shadow: var(--shadow-xl);
        }
        .summary-title { 
          margin: 0 0 16px 0; 
          color: var(--ink); 
          font-weight: 900; 
          letter-spacing: -0.01em;
          font-size: clamp(1.25rem, 2vw, 1.5rem);
          padding-bottom: 12px;
          border-bottom: 2px solid var(--line);
        }
        .summary-sub { 
          color: var(--ink); 
          font-weight: 700;
          font-size: 1.05rem;
          margin-bottom: 8px;
          display: block;
        }
        .summary-rooms { 
          margin-top: 12px; 
        }
        .summary-total { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-top: 16px; 
          padding: 14px 0; 
          border-top: 2px dashed var(--line);
          font-size: clamp(1.1rem, 2vw, 1.25rem);
        }
        .summary-total strong {
          color: var(--amber-dark);
        }
        .summary-note { 
          margin-top: 10px; 
          color: var(--muted); 
          font-size: clamp(0.85rem, 1.5vw, 0.95rem);
          line-height: 1.5;
          font-weight: 500;
        }

        /* Lists */
        .kv { 
          list-style: none; 
          padding: 0; 
          margin: 0; 
          display: grid; 
          gap: 12px; 
        }
        .kv li { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          color: var(--ink); 
          font-weight: 600;
          padding: 8px 0;
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
        }
        .kv li strong {
          font-weight: 800;
        }
        .bulleted { 
          list-style: disc; 
          margin: 10px 0 0 20px; 
          color: var(--ink);
          line-height: 1.7;
        }
        .bulleted li {
          margin: 6px 0;
          font-weight: 600;
        }
        .bulleted.small { 
          font-size: clamp(0.9rem, 1.5vw, 1rem); 
        }

        .review-grid { 
          display: grid; 
          grid-template-columns: 1fr; 
          gap: 24px; 
        }
        @media (min-width: 760px) { 
          .review-grid { 
            grid-template-columns: 1fr 1fr; 
          } 
        }
        .review-section {
          background: rgba(255,255,255,0.6);
          padding: 16px;
          border-radius: 14px;
          border: 1px solid rgba(254, 190, 82, 0.15);
        }
        .section-title { 
          margin: 0 0 12px 0; 
          color: var(--ink); 
          font-size: clamp(1.1rem, 2vw, 1.25rem); 
          font-weight: 900; 
          letter-spacing: -0.01em;
          padding-bottom: 8px;
          border-bottom: 2px solid rgba(254, 190, 82, 0.3);
        }
        .total-line { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          padding: 16px 18px; 
          border-top: 2px solid var(--amber); 
          border-bottom: 2px solid var(--amber); 
          margin: 12px 0;
          font-size: clamp(1.15rem, 2vw, 1.3rem);
          font-weight: 900;
          background: rgba(254, 190, 82, 0.08);
          border-radius: 12px;
        }
        .total-line strong {
          color: var(--amber-dark);
        }
        .info-banner { 
          padding: 16px; 
          border-radius: 14px; 
          margin-top: 14px; 
          font-weight: 700;
          box-shadow: var(--shadow-sm);
          border: 2px solid;
          line-height: 1.6;
          font-size: clamp(0.9rem, 1.5vw, 1rem);
        }
        .info-blue { 
          background: linear-gradient(135deg, #e0f2fe, #dbeafe); 
          border-color: var(--blue); 
          color: #0c4a6e; 
        }
        .info-green { 
          background: linear-gradient(135deg, #ecfdf5, #d1fae5); 
          border-color: var(--green); 
          color: #064e3b; 
        }

        /* Modals */
        .pending-prompt-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(0, 0, 0, 0.6); 
          backdrop-filter: blur(4px);
          display: flex; 
          justify-content: center; 
          align-items: center; 
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .pending-prompt { 
          background: white; 
          padding: 36px; 
          border-radius: 20px; 
          box-shadow: var(--shadow-xl); 
          max-width: 540px;
          margin: 20px;
          text-align: center;
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.9);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        .pending-prompt h3 { 
          color: var(--amber-dark); 
          margin-bottom: 14px; 
          font-weight: 900;
          font-size: clamp(1.4rem, 2vw, 1.75rem);
          letter-spacing: -0.01em;
        }
        .pending-prompt p { 
          color: var(--ink); 
          margin-bottom: 24px;
          line-height: 1.6;
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
        }
        .prompt-buttons { 
          display: flex; 
          gap: 12px; 
          justify-content: center;
          flex-wrap: wrap;
        }
        .proceed-btn, .cancel-btn { 
          padding: 14px 28px; 
          border: none; 
          border-radius: 14px; 
          font-size: 16px; 
          cursor: pointer; 
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); 
          font-weight: 900; 
          text-transform: uppercase; 
          letter-spacing: 0.06em;
          box-shadow: var(--shadow-md);
        }
        .proceed-btn { 
          background: linear-gradient(135deg, var(--amber-dark), var(--amber)); 
          color: white; 
        }
        .proceed-btn:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 12px 28px rgba(245, 158, 11, 0.35); 
        }
        .cancel-btn { 
          background: linear-gradient(135deg, #ef4444, #dc2626); 
          color: white; 
        }
        .cancel-btn:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 12px 28px rgba(220, 38, 38, 0.35); 
        }

        .submit-modal-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(0, 0, 0, 0.75); 
          backdrop-filter: blur(6px);
          display: flex; 
          justify-content: center; 
          align-items: center; 
          z-index: 2000;
          animation: fadeIn 0.3s ease;
        }
        .submit-modal { 
          background: white; 
          padding: 40px; 
          border-radius: 20px; 
          box-shadow: var(--shadow-xl); 
          max-width: 440px;
          margin: 20px;
          text-align: center;
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .submit-modal h3 { 
          color: var(--amber-dark); 
          margin-bottom: 18px; 
          font-weight: 900;
          font-size: clamp(1.35rem, 2vw, 1.65rem);
          letter-spacing: -0.01em;
        }
        .submit-modal p { 
          color: var(--ink); 
          margin-bottom: 28px;
          line-height: 1.6;
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
        }
        .spinner { 
          border: 5px solid #f3f4f6; 
          border-top: 5px solid var(--amber); 
          border-radius: 50%; 
          width: 56px; 
          height: 56px; 
          animation: spin 0.8s linear infinite; 
          margin: 0 auto;
        }
        @keyframes spin { 
          0% { transform: rotate(0deg); } 
          100% { transform: rotate(360deg); } 
        }

        .view-images-btn { 
          padding: 8px 14px; 
          background: linear-gradient(135deg, #FEBE52, #ffd580) !important; 
          color: #111827 !important; 
          border: 2px solid rgba(253, 230, 138, 0.5) !important; 
          border-radius: 12px; 
          font-size: 12px; 
          cursor: pointer; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
          font-weight: 600 !important; 
          box-shadow: 0 8px 20px rgba(254, 190, 82, 0.32) !important;
          text-transform: none;
          letter-spacing: 0.02em;
        }
        .view-images-btn:hover { 
          transform: translateY(-2px) scale(1.02); 
          box-shadow: 0 12px 28px rgba(254, 190, 82, 0.42) !important; 
        }

        .modal-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(0,0,0,0.5); 
          backdrop-filter: blur(4px);
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        .modal-content { 
          background: #ffffff; 
          border-radius: 16px; 
          max-width: 720px; 
          width: 90%; 
          padding: clamp(1rem, 3vw, 2rem); 
          box-shadow: 0 10px 28px rgba(0,0,0,0.2); 
          max-height: 90vh; 
          overflow-y: auto;
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          color: #0b3a4a;
        }
        .modal-content::-webkit-scrollbar {
          width: 8px;
        }
        .modal-content::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .modal-content::-webkit-scrollbar-thumb {
          background: var(--amber);
          border-radius: 10px;
        }
        .modal-content h2 { 
          color: #FEBE54; 
          margin: 0 0 0.5rem 0;
          font-size: 1.6rem;
          font-weight: 700;
        }
        .image-gallery { 
          display: flex; 
          gap: 0.75rem; 
          overflow-x: auto; 
          margin-bottom: 1rem;
          scroll-snap-type: x mandatory;
        }
        .image-gallery::-webkit-scrollbar {
          height: 8px;
        }
        .image-gallery::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .image-gallery::-webkit-scrollbar-thumb {
          background: var(--amber);
          border-radius: 10px;
        }
        .image-gallery img { 
          width: 180px; 
          height: 110px; 
          object-fit: cover; 
          border-radius: 8px; 
          flex-shrink: 0; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          scroll-snap-align: start;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          cursor: pointer;
        }
        .image-gallery img:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
        }
        .room-modal-capacity {
          font-weight: 600;
          font-size: 1.1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #0b3a4a;
          margin-bottom: 0.5rem;
        }
        .room-modal-description {
          margin-bottom: 1rem;
          color: #0b3a4a;
          line-height: 1.5;
        }
        .room-modal-amenities {
          list-style: none;
          padding: 0;
          margin: 0 0 1rem 0;
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .room-modal-amenity-item {
          display: flex;
          align-items: center;
          color: #4b5563;
        }
        .room-modal-icon {
          margin-right: 0.5rem;
          color: #FEBE54;
        }
        .modal-actions { 
          display: flex; 
          gap: 0.75rem; 
          flex-wrap: wrap; 
        }
        .close-btn { 
          background-color: #e5e7eb; 
          color: #0b3a4a; 
          border: none; 
          padding: 0.7rem 1.2rem; 
          border-radius: 10px; 
          font-weight: 600; 
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .close-btn:hover { 
          background-color: #d1d5db;
        }

        .image-modal-overlay { 
          position: fixed; 
          inset: 0; 
          background: rgba(0,0,0,0.85); 
          backdrop-filter: blur(8px);
          display: flex; 
          align-items: center; 
          justify-content: center; 
          z-index: 1100;
          animation: fadeIn 0.3s ease;
        }
        .image-modal-content { 
          background: #fff; 
          border-radius: 16px; 
          max-width: 92%; 
          max-height: 92%; 
          padding: 20px; 
          box-shadow: var(--shadow-xl); 
          display: flex; 
          flex-direction: column; 
          align-items: center;
          animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .full-image { 
          max-width: 100%; 
          max-height: 78vh; 
          object-fit: contain; 
          border-radius: 12px;
          box-shadow: var(--shadow-lg);
        }
        .close-image-btn { 
          margin-top: 20px; 
          background: linear-gradient(135deg, #f3f4f6, #e5e7eb); 
          color: #111827; 
          border: 2px solid var(--line); 
          padding: 12px 24px; 
          border-radius: 14px; 
          cursor: pointer; 
          font-weight: 900;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: var(--shadow-sm);
        }
        .close-image-btn:hover { 
          transform: translateY(-2px); 
          box-shadow: var(--shadow-md);
          background: linear-gradient(135deg, #e5e7eb, #d1d5db);
        }

        /* Additional UI enhancements */
        .selected-check {
          position: absolute;
          top: 12px;
          left: 12px;
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--amber), var(--amber-deep));
          border-radius: 999px;
          display: grid;
          place-items: center;
          box-shadow: var(--shadow-md);
          animation: checkPop 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }
        @keyframes checkPop {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          50% {
            transform: scale(1.15);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .selected-check svg {
          width: 22px;
          height: 22px;
        }

        /* UI overrides per request */
        .btn-next { 
          background: linear-gradient(135deg, #FEBE52, #ffd580) !important; 
          color: #111827 !important; 
          border: 2px solid rgba(253,230,138,0.5) !important; 
          box-shadow: 0 12px 32px rgba(254,190,82,0.42) !important; 
        }
        .btn-secondary { 
          background: linear-gradient(135deg, #6b7280, #4b5563) !important; 
          color: #ffffff !important; 
          border: 2px solid #9ca3af !important; 
          box-shadow: 0 10px 26px rgba(107,114,128,0.32) !important; 
        }
        button[type="submit"] { 
          background: linear-gradient(135deg, #FEBE52, #ffd580) !important; 
          color: #111827 !important; 
          border: 2px solid rgba(253,230,138,0.5) !important; 
          box-shadow: 0 12px 32px rgba(254,190,82,0.42) !important; 
        }
        .room-option-container { 
          padding-bottom: 64px !important; 
        }
        .room-actions { 
          position: absolute !important; 
          left: 14px !important; 
          right: 14px !important; 
          bottom: 8px !important; 
          margin-top: 0 !important; 
        }
        .review-card { 
          background: linear-gradient(135deg, #FFF8EC, #FFF2DB) !important; 
          border-color: #fde68a !important; 
        }
        .review-card .card-header { 
          background: linear-gradient(180deg, #FFF2DB, #FFF8EC) !important; 
          margin: 0 !important; 
          padding: 24px 24px 12px 24px !important; 
          border-bottom: 2px solid #fde68a !important; 
        }
        @media (max-width: 640px) {
          .review-card .card-header {
            padding: 20px 18px 10px 18px !important;
          }
        }

        /* Responsive text improvements */
        @media (max-width: 640px) {
          .container {
            padding-bottom: 80px;
          }
        }

        /* Smooth scrolling */
        html {
          scroll-behavior: smooth;
        }

        /* Focus indicators for accessibility */
        *:focus-visible {
          outline: 3px solid rgba(254, 190, 82, 0.6);
          outline-offset: 3px;
        }

      `}</style>

      {/* Navigation Confirmation Modal */}
      <NavigationConfirmationModal 
        show={navigationGuard.showModal}
        onStay={navigationGuard.handleStay}
        onLeave={navigationGuard.handleLeave}
        context={navigationGuard.context}
        message={navigationGuard.message}
      />

      {/* Data Privacy Modal */}
      <DataPrivacyModal
        isOpen={showDataPrivacyModal}
        onClose={() => setShowDataPrivacyModal(false)}
        onAccept={() => setDataPrivacyAccepted(true)}
      />
    </div>
  );
}
