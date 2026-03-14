'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useFormStatus } from 'react-dom';
  
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BookingCalendar from '../../components/BookingCalendar';
import RoomAmenitiesSelector from '../../components/RoomAmenitiesSelector'; // Import the new component
import OptionalAmenitiesSelector from '../../components/OptionalAmenitiesSelector';
import RentalAmenitiesSelector from '../../components/RentalAmenitiesSelector';
import RoomUnitSelector from '../../components/RoomUnitSelector'; // NEW: Import unit selector
import { useNavigationGuard } from '../../hooks/useNavigationGuard.simple';
import { useNavigationContext } from '../../context/NavigationContext';
import { NavigationConfirmationModal, ThreeDRoomViewerModal, MaxCapacityModal, MidnightAlertModal } from '../../components/CustomModals';
import DataPrivacyModal from '../../components/DataPrivacyModal';
import { useAvailabilityUpdates } from '../../hooks/usePusher';

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

  // ALL HOOKS MUST BE DECLARED BEFORE ANY CONDITIONAL RETURNS
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [step, setStep] = useState(1);
  const [availabilityData, setAvailabilityData] = useState({});
  const [disabledDates, setDisabledDates] = useState([]); // Dates disabled by super admin
  const [maxBookingMonths, setMaxBookingMonths] = useState(2); // Max months ahead for booking
  const [totalPrice, setTotalPrice] = useState(0);
  const [showPendingPrompt, setShowPendingPrompt] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const submittingRef = useRef(false);
  const availableRoomsSectionRef = useRef(null);
  const selectedRoomsSectionRef = useRef(null);
  const selectedRoomCardRefs = useRef({});
  const shouldAutoScrollToRoomsRef = useRef(false);

  // Modal state to prevent spam clicks
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  // NEW: State for unit reassignment notification
  const [showReassignmentModal, setShowReassignmentModal] = useState(false);
  const [reassignmentInfo, setReassignmentInfo] = useState(null);

  // New state for animated dots in modal
  const [dotCount, setDotCount] = useState(1);

  // Room images modal state
  const [roomImagesModal, setRoomImagesModal] = useState({ open: false, selectedRoomId: null, selectedImage: null });
  
  // 3D Viewer modal state
  const [threeDViewerModal, setThreeDViewerModal] = useState({ open: false, roomType: null });
  
  // Cooldown UI state
  const [cooldownUntil, setCooldownUntil] = useState(null);
  const [cooldownTimer, setCooldownTimer] = useState('');
  // Data Privacy modal state
  const [showDataPrivacyModal, setShowDataPrivacyModal] = useState(false);
  const [dataPrivacyAccepted, setDataPrivacyAccepted] = useState(false);

  // Max capacity modal state
  const [maxCapacityModal, setMaxCapacityModal] = useState({ show: false, roomType: null, maxCapacity: 0 });

  // Midnight alert modal state
  const [showMidnightAlert, setShowMidnightAlert] = useState(false);

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

  // NEW: Updated state structure for rooms array format
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    selectedRooms: {}, // DEPRECATED: Keep for backward compatibility
    rooms: [], // NEW: Array of { roomId, quantity, adults, additionalPax, children, optionalAmenities, rentalAmenities, unitNumber }
    selectedAmenities: { optional: {}, rental: {}, cottage: null }, // Keep for backward compatibility
  });

  // NEW: Track which room cards are expanded in selected rooms section
  const [expandedRooms, setExpandedRooms] = useState({});
  
  // NEW: Track if booking is within one week
  const [isWithinOneWeek, setIsWithinOneWeek] = useState(false);

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
    
    // Fetch disabled dates from super admin configuration
    async function fetchDisabledDates() {
      try {
        const res = await fetch('/api/booking-config/disabled-dates');
        console.log('Disabled dates response status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('Disabled dates from API:', data);
          // Extract date strings in yyyy-mm-dd format using UTC
          const dateStrings = data.map(d => {
            const utcDate = new Date(d.date);
            const year = utcDate.getUTCFullYear();
            const month = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(utcDate.getUTCDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          });
          console.log('Formatted disabled dates:', dateStrings);
          setDisabledDates(dateStrings);
        }
      } catch (err) { console.error('❌ Failed to load disabled dates:', err); }
    }
    
    // Fetch max booking months configuration
    async function fetchBookingConfig() {
      try {
        const res = await fetch('/api/booking-config/max-months');
        if (res.ok) {
          const data = await res.json();
          console.log('Max booking months from API:', data.maxBookingMonths);
          setMaxBookingMonths(data.maxBookingMonths || 2);
        }
      } catch (err) { console.error('❌ Failed to load booking config:', err); }
    }
    
    fetchAvailability();
    fetchDisabledDates();
    fetchBookingConfig();

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

    // Store fetchAvailability reference for Pusher hook
    window._refetchAvailability = fetchAvailability;
  }, []);

  // 🔔 PUSHER: Real-time room availability updates
  // Callback to refresh availability when another user books
  const refetchAvailability = useCallback(async () => {
    console.log('[Pusher] Room availability changed, refreshing...');
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
    } catch (err) {
      console.error('[Pusher] Failed to refresh availability:', err);
    }
  }, []);

  // Subscribe to availability updates - refreshes when someone else books a room
  useAvailabilityUpdates({
    onAvailabilityChange: () => {
      console.log('[Pusher] Availability changed');
      refetchAvailability();
    },
    onRoomBooked: (data) => {
      console.log('[Pusher] Room booked by another user:', data);
      refetchAvailability();
      // Optionally show a notification
      if (formData.checkInDate && formData.checkOutDate) {
        // Only show if user is actively booking
        console.log('[Pusher] Updating availability for active booking session');
      }
    },
  });

  // Midnight polling: Start at 11:55 PM, stop at 12:05 AM
  useEffect(() => {
    let pollingInterval = null;

    const checkMidnight = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Check if we're in polling window (11:55 PM to 12:05 AM)
      const isInPollingWindow = 
        (hours === 23 && minutes >= 55) || // 11:55 PM - 11:59 PM
        (hours === 0 && minutes <= 5);      // 12:00 AM - 12:05 AM

      if (isInPollingWindow) {
        // Check if we've crossed midnight
        if (hours === 0 && !showMidnightAlert) {
          setShowMidnightAlert(true);
        }

        // Start polling if not already started
        if (!pollingInterval) {
          pollingInterval = setInterval(() => {
            const currentTime = new Date();
            if (currentTime.getHours() === 0 && !showMidnightAlert) {
              setShowMidnightAlert(true);
            }
          }, 1000); // Check every second
        }
      } else {
        // Stop polling if we're outside the window
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
      }
    };

    // Initial check
    checkMidnight();

    // Check every minute to see if we should start/stop polling
    const mainInterval = setInterval(checkMidnight, 60000);

    return () => {
      clearInterval(mainInterval);
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [showMidnightAlert]);

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

        const res = await fetch(`/api/rooms?checkIn=${formData.checkIn}&checkOut=${formData.checkOut}`, {
          cache: 'no-store' // Force fresh availability data
        });
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
    // Base capacity is the minimum (1 guest), max includes +2 additional pax, children max is always 2
    switch (roomType) {
      case 'TEPEE':
        return { min: 1, base: 5, max: 7, additionalPaxMax: 2, childrenMax: 2 }; // 5 base + 2 additional pax, 2 children
      case 'LOFT':
        return { min: 1, base: 2, max: 4, additionalPaxMax: 2, childrenMax: 2 }; // 2 base + 2 additional pax, 2 children
      case 'VILLA':
        return { min: 1, base: 8, max: 10, additionalPaxMax: 2, childrenMax: 2 }; // 8 base + 2 additional pax, 2 children
      case 'FAMILY_LODGE':
        return { min: 1, base: 20, max: 22, additionalPaxMax: 2, childrenMax: 2 }; // 20 base + 2 additional pax, 2 children
      default:
        // Default capacity for other rooms
        return { min: 1, base: 100, max: 100, additionalPaxMax: 0, childrenMax: 2 };
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
      case 'FAMILY_LODGE':
        return ['/images/default.jpg']; // Placeholder for coming soon
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
      case 'FAMILY_LODGE':
        return 'Perfect for very large groups and family gatherings. This spacious lodge is currently under preparation and will be available soon. Stay tuned for updates!';
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
            // Use new format if rooms array has data, otherwise fall back to old format
            const useNewFormat = formData.rooms && formData.rooms.length > 0;
            
            let requestBody = { nights };

            if (useNewFormat) {
                // NEW FORMAT: Send rooms array with guest details and amenities
                requestBody.rooms = formData.rooms;
            } else {
                // OLD FORMAT: Send selectedRooms and amenities separately (backward compatibility)
                const rentalAmenitiesFormatted = {};
                for (const [id, selection] of Object.entries(formData.selectedAmenities.rental)) {
                    rentalAmenitiesFormatted[id] = {
                        quantity: selection.quantity || 0,
                        hoursUsed: selection.hoursUsed || 0
                    };
                }

                requestBody = {
                    selectedRooms: formData.selectedRooms,
                    nights,
                    optionalAmenities: formData.selectedAmenities.optional,
                    rentalAmenities: rentalAmenitiesFormatted,
                    cottage: formData.selectedAmenities.cottage
                };
            }

            const res = await fetch('/api/bookings/calculate-total', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
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
  }, [formData.selectedRooms, formData.selectedAmenities, formData.rooms, formData.checkIn, formData.checkOut]);


  // --- Helpers for validation & locking ---
  // compute total capacity from selectedRooms or rooms array
  const computeTotalCapacity = () => {
    // Use new format if available - each room instance is separate
    if (formData.rooms && formData.rooms.length > 0) {
      return formData.rooms.reduce((sum, roomData) => {
        const r = availableRooms.find(room => room.id == roomData.roomId);
        if (r) {
          // Each room instance has its own capacity calculation
          const roomCapacity = roomData.adults + roomData.additionalPax;
          return sum + roomCapacity;
        }
        return sum;
      }, 0);
    }
    
    // Fallback to old format
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
    const hasFullRange = !!checkInDate && !!checkOutDate && formatDate(checkInDate) !== formatDate(checkOutDate);

    setFormData(prev => ({
      ...prev,
      checkIn: formatDate(checkInDate),
      checkOut: formatDate(checkOutDate)
    }));

    if (hasFullRange) {
      shouldAutoScrollToRoomsRef.current = true;
    }
    
    // Check if check-in date is within one week from today
    if (checkInDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
      const checkIn = new Date(checkInDate);
      checkIn.setHours(0, 0, 0, 0);
      const diffDays = (checkIn - now) / (1000 * 60 * 60 * 24);
      setIsWithinOneWeek(diffDays < 7 && diffDays >= 0);
    } else {
      setIsWithinOneWeek(false);
    }
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

  // NEW: Handler functions for rooms array format
  const handleAddRoom = (room) => {
    const capacity = getRoomCapacity(room.type);
    let newRoomKey = '';

    setFormData(prev => {
      // Count how many instances of this room type already exist
      const existingInstances = prev.rooms.filter(r => r.roomId === room.id);
      const instanceNumber = existingInstances.length + 1;
      newRoomKey = `${room.id}-${instanceNumber}`;
      
      const newRoom = {
        roomId: room.id,
        instanceNumber, // NEW: Track which instance this is (1, 2, 3, etc.)
        unitNumber: null, // NEW: Selected unit number (will be assigned)
        adults: 1,
        additionalPax: 0,
        children: 0,
        optionalAmenities: {},
        rentalAmenities: {}
      };
      return {
        ...prev,
        rooms: [...prev.rooms, newRoom]
      };
    });
    // Auto-expand the newly added room instance
    setExpandedRooms(prev => ({ ...prev, [`${room.id}-${prev.rooms ? prev.rooms.filter(r => r.roomId === room.id).length + 1 : 1}`]: true }));

    // Auto-scroll to selected rooms, then focus the newly added room card.
    setTimeout(() => {
      selectedRoomsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      setTimeout(() => {
        const roomCard = selectedRoomCardRefs.current[newRoomKey];
        if (roomCard) {
          roomCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 220);
    }, 120);
  };

  useEffect(() => {
    if (!shouldAutoScrollToRoomsRef.current) return;
    if (loadingRooms) return;

    availableRoomsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    shouldAutoScrollToRoomsRef.current = false;
  }, [loadingRooms, availableRooms.length, formData.checkIn, formData.checkOut]);

  const handleRemoveRoom = (roomId, instanceNumber) => {
    setFormData(prev => ({
      ...prev,
      rooms: prev.rooms.filter(r => !(r.roomId === roomId && r.instanceNumber === instanceNumber))
    }));
    setExpandedRooms(prev => {
      const updated = { ...prev };
      delete updated[`${roomId}-${instanceNumber}`];
      return updated;
    });
  };

  // NEW: Handler for unit selection
  const handleUnitSelection = (roomId, instanceNumber, unitNumber) => {
    setFormData(prev => {
      const updatedRooms = prev.rooms.map(r => {
        if (r.roomId === roomId && r.instanceNumber === instanceNumber) {
          return { ...r, unitNumber };
        }
        return r;
      });
      return { ...prev, rooms: updatedRooms };
    });
  };

  const handleRoomGuestChange = (roomId, instanceNumber, field, value, increment = 0) => {
    setFormData(prev => {
      const updatedRooms = prev.rooms.map(r => {
        if (r.roomId === roomId && r.instanceNumber === instanceNumber) {
          const room = availableRooms.find(ar => ar.id === roomId);
          const capacity = room ? getRoomCapacity(room.type) : { base: 10, additionalPaxMax: 2, max: 10 };
          
          let updatedRoom = { ...r };
          let newValue = increment !== 0 ? (parseInt(r[field]) || 0) + increment : parseInt(value) || 0;
          
          // Validation logic
          if (field === 'adults') {
            const targetAdults = Math.max(1, Math.min(newValue, capacity.base));
            
            // Check if trying to exceed capacity
            if (newValue > capacity.base) {
              setMaxCapacityModal({ show: true, roomType: room.type, maxCapacity: capacity.max });
              return r; // Don't update
            }
            
            updatedRoom.adults = targetAdults;
            // Children can't exceed childrenMax (always 2)
            if (updatedRoom.children > (capacity.childrenMax || 2)) {
              updatedRoom.children = (capacity.childrenMax || 2);
            }
          } else if (field === 'additionalPax') {
            const targetPax = Math.max(0, Math.min(newValue, capacity.additionalPaxMax));
            
            // Check if trying to exceed capacity
            if (newValue > capacity.additionalPaxMax) {
              setMaxCapacityModal({ show: true, roomType: room.type, maxCapacity: capacity.max });
              return r; // Don't update
            }
            
            updatedRoom.additionalPax = targetPax;
          } else if (field === 'children') {
            // Children limited to max 2 for all room types
            const targetChildren = Math.max(0, Math.min(newValue, capacity.childrenMax || 2));
            
            // Check if trying to exceed children limit
            if (newValue > (capacity.childrenMax || 2)) {
              setMaxCapacityModal({ show: true, roomType: room.type, maxCapacity: capacity.childrenMax || 2 });
              return r; // Don't update
            }
            
            updatedRoom.children = targetChildren;
          }
          
          return updatedRoom;
        }
        return r;
      });
      return { ...prev, rooms: updatedRooms };
    });
  };

  const handleRoomAmenityChange = (roomId, instanceNumber, amenityType, amenityId, value) => {
    setFormData(prev => {
      const updatedRooms = prev.rooms.map(r => {
        if (r.roomId === roomId && r.instanceNumber === instanceNumber) {
          const updatedRoom = { ...r };
          
          // If amenityId is null, value is the entire amenities object
          if (amenityId === null) {
            if (amenityType === 'optional') {
              updatedRoom.optionalAmenities = value;
            } else if (amenityType === 'rental') {
              updatedRoom.rentalAmenities = value;
            }
          } else {
            // Individual amenity update (legacy support)
            if (amenityType === 'optional') {
              updatedRoom.optionalAmenities = { ...r.optionalAmenities };
              if (value > 0) {
                updatedRoom.optionalAmenities[amenityId] = value;
              } else {
                delete updatedRoom.optionalAmenities[amenityId];
              }
            } else if (amenityType === 'rental') {
              updatedRoom.rentalAmenities = { ...r.rentalAmenities };
              if (value && (value.quantity > 0 || value.hoursUsed > 0)) {
                updatedRoom.rentalAmenities[amenityId] = value;
              } else {
                delete updatedRoom.rentalAmenities[amenityId];
              }
            }
          }
          return updatedRoom;
        }
        return r;
      });
      return { ...prev, rooms: updatedRooms };
    });
  };

  const toggleRoomExpansion = (roomId, instanceNumber) => {
    const key = `${roomId}-${instanceNumber}`;
    setExpandedRooms(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 2)); // Changed from 3 to 2 steps
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

    // Validation: selected rooms exist (check new format first, then old)
    const hasRooms = formData.rooms.length > 0 || Object.keys(formData.selectedRooms).length > 0;
    if (!hasRooms) {
      alert('❌ Please select at least one room.');
      return;
    }

    // NEW: Validation: all rooms must have a unit selected
    if (formData.rooms.length > 0) {
      const roomsWithoutUnit = formData.rooms.filter(r => !r.unitNumber);
      if (roomsWithoutUnit.length > 0) {
        const roomNames = roomsWithoutUnit.map(r => {
          const room = availableRooms.find(ar => ar.id === r.roomId);
          const roomTypeName = room?.type === 'LOFT' ? 'Loft' : room?.type === 'TEPEE' ? 'Tepee' : room?.type === 'VILLA' ? 'Villa' : room?.name || 'Room';
          return `${roomTypeName} ${r.instanceNumber}`;
        }).join(', ');
        alert(`❌ Please select a unit number for: ${roomNames}`);
        return;
      }
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
      // Prepare request body - use new format if rooms array exists
      const requestBody = {
        guestName: session.user.name || 'Guest',
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        numberOfGuests: formData.guests,
        userId: session.user.id,
      };

      if (formData.rooms.length > 0) {
        // NEW FORMAT: Send rooms array with guest details
        requestBody.rooms = formData.rooms;
      } else {
        // OLD FORMAT: Fall back to selectedRooms (backward compatibility)
        requestBody.selectedRooms = formData.selectedRooms;
        requestBody.optional = formData.selectedAmenities.optional;
        requestBody.rental = formData.selectedAmenities.rental;
        requestBody.cottage = formData.selectedAmenities.cottage;
      }

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      if (!res.ok) {
        // Handle specific error cases
        if (data.error && data.error.includes('only') && data.error.includes('units available')) {
          // Room availability error - clear message
          throw new Error(data.error);
        } else if (data.error && data.error.includes('cooldown')) {
          // Cooldown error
          throw new Error(`${data.error}\nPlease try again later.`);
        } else {
          throw new Error(data.error || data.details || 'Booking failed. Please try again.');
        }
      }

      // Check if there's a unit assignment warning
      if (data.booking?.unitAssignmentWarning) {
        setReassignmentInfo({
          bookingId: data.booking.id,
          warning: data.booking.unitAssignmentWarning,
          totalPrice: totalPrice / 100
        });
        setShowReassignmentModal(true);
        return; // Don't auto-redirect, let user acknowledge the warning
      }

  // Store booking details for checkout page
  localStorage.setItem('bookingId', data.booking.id);
  // bookingAmount kept optional for display; checkout will compute reservation fee from rooms
  localStorage.setItem('bookingAmount', totalPrice / 100);

      // Redirect to checkout page
      router.push('/checkout');

    } catch (err) {
      console.error('❌ Booking Error:', err);
      
      // More user-friendly error messages
      let errorMessage = err.message;
      
      if (errorMessage.includes('only') && errorMessage.includes('units available')) {
        errorMessage = `${errorMessage}\n\nThe rooms may have just been booked by another guest. Please try selecting different dates or rooms.`;
      } else if (errorMessage.includes('no longer available')) {
        errorMessage = 'Selected room units are no longer available. Please refresh the page and try again with different units.';
      } else if (!errorMessage || errorMessage === 'Failed to fetch') {
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      }
      
      alert(`❌ Booking Failed\n\n${errorMessage}`);
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

  // Don't render booking page for non-customers or while checking auth
  if (status === 'loading' || !session || session?.user?.role !== 'CUSTOMER') {
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

  const progressPercent = (step / 2) * 100; // Changed from 3 to 2 steps

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
          {/* Stepper - Updated to 2 steps */}
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
              <span className="badge" aria-hidden="true">2</span>
              <span className="label">Review & Submit</span>
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
                      <h2 className="card-title">Choose your dates & rooms</h2>
                      <p className="card-subtitle">Select dates, pick rooms, and customize guest details.</p>
                    </div>
                    <div className="card-body">
                      {/* Booking Calendar Section */}
                      <div className="calendar-section">
                        <div className="section-header">
                          <h3 className="section-title">Select Your Dates</h3>
                          <p className="section-subtitle">Pick your check-in and check-out dates</p>
                        </div>
                        
                        <div className="calendar-wrapper">
                          <div className="calendar-container">
                            <BookingCalendar
                              availabilityData={availabilityData}
                              disabledDates={disabledDates}
                              maxBookingMonths={maxBookingMonths}
                              onDateChange={handleDateChange}
                              checkIn={formData.checkIn ? new Date(formData.checkIn) : null}
                              checkOut={formData.checkOut ? new Date(formData.checkOut) : null}
                            />
                          </div>

                          <div className="date-summary-card">
                            <div className="date-summary-header">
                              <h4>Selected Dates</h4>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M16 1V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M8 1V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M3 9H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                            
                            <div className="date-info-grid">
                              <div className="date-info-item">
                                <span className="date-label">Check-in</span>
                                <div className="date-value">
                                  {formData.checkIn ? new Date(formData.checkIn).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  }) : 'Select date'}
                                </div>
                                <small className="date-time">Check-in time: 2:00 PM</small>
                              </div>
                              
                              <div className="date-divider">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                              
                              <div className="date-info-item">
                                <span className="date-label">Check-out</span>
                                <div className="date-value">
                                  {formData.checkOut ? new Date(formData.checkOut).toLocaleDateString('en-US', { 
                                    weekday: 'short', 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                  }) : 'Select date'}
                                </div>
                                <small className="date-time">Check-out time: 12:00 PM</small>
                              </div>
                            </div>
                            
                            {formData.checkIn && formData.checkOut && (
                              <div className="stay-duration">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                {Math.max(1, (new Date(formData.checkOut) - new Date(formData.checkIn)) / (1000 * 60 * 60 * 24))} night(s) stay
                              </div>
                            )}
                            
                            {/* Warning for bookings within one week - Inside date-summary-card */}
                            {isWithinOneWeek && formData.checkIn && (
                              <div className="one-week-warning" role="alert">
                                <div className="warning-icon">⚠️</div>
                                <div className="warning-content">
                                  <strong>Short Notice Booking</strong>
                                  <p>You are booking within one week from today. Please note that reschedule requests can only be made up to 7 days before check-in.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {dateWarning && (
                        <div className="date-warning" role="alert">{dateWarning}</div>
                      )}

                      <div className="rooms-header" style={{ marginBottom: '1rem' }} ref={availableRoomsSectionRef}>
                        <div className="section-header">
                          <h3 className="section-title">Available Rooms</h3>
                          <p className="section-subtitle">Browse and select rooms for your stay. Customize each room individually.</p>
                        </div>
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
                        <div className="room-selector" style={{ marginBottom: '2rem' }}>
                          {availableRooms.map((room) => {
                            const capacity = getRoomCapacity(room.type);
                            const instancesAdded = formData.rooms.filter(r => r.roomId === room.id).length;
                            const isFull = room.remaining <= 0;
                            const allInstancesAdded = instancesAdded >= room.remaining;
                            const isFamilyLodge = room.type === 'FAMILY_LODGE'; // Family Lodge is coming soon
                            const isFullyBooked = !isFamilyLodge && isFull; // Other rooms fully booked for this date

                            return (
                              <div 
                                key={room.id} 
                                className={`room-option ${instancesAdded > 0 ? 'in-cart' : ''} ${isFull || isFamilyLodge ? 'disabled' : ''} ${isFamilyLodge ? 'unavailable' : ''} ${isFullyBooked ? 'fully-booked' : ''}`}
                                style={{ cursor: 'default', position: 'relative' }}
                              >
                                {instancesAdded > 0 && !isFamilyLodge && !isFullyBooked && (
                                  <div className="selected-check" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                                )}
                                {isFamilyLodge && (
                                  <div className="unavailable-overlay">
                                    <div className="unavailable-badge">COMING SOON</div>
                                  </div>
                                )}
                                {isFullyBooked && (
                                  <div className="unavailable-overlay fully-booked-overlay">
                                    <div className="unavailable-badge fully-booked-badge">FULLY BOOKED</div>
                                    <p className="unavailable-message">No availability for selected dates</p>
                                  </div>
                                )}
                                <div className="room-media">
                                  <img src={room.image || '/images/default.jpg'} alt={room.name} />
                                  {isFamilyLodge ? (
                                    <span className="available-count unavailable-tag">Coming Soon</span>
                                  ) : isFullyBooked ? (
                                    <span className="available-count fully-booked-tag">Fully Booked</span>
                                  ) : (
                                    <span className="available-count">{room.remaining} left</span>
                                  )}
                                </div>
                                <div className="room-meta">
                                  <span className="room-name">{room.name}</span>
                                  <div className="room-tags">
                                    <span className="tag type">{room.type}</span>
                                    <span className="tag pax" title={`Base: ${capacity.base}, Max: ${capacity.max} (with +${capacity.additionalPaxMax} pax)`}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                        <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v3h16v-3c0-2.761-3.582-5-8-5z" fill="#6b7280"/>
                                      </svg>
                                      {capacity.base}–{capacity.max}
                                    </span>
                                    {room.price ? (
                                      <span className="tag price">₱{(room.price / 100).toLocaleString()} / night</span>
                                    ) : null}
                                  </div>
                                  
                                  {/* Action Buttons */}
                                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isFamilyLodge) {
                                          alert('Coming Soon! Images for Family Lodge will be available soon.');
                                        } else if (isFullyBooked) {
                                          alert('This room is fully booked for the selected dates. Please try different dates.');
                                        } else {
                                          setRoomImagesModal({ open: true, selectedRoomId: room.id, selectedImage: null });
                                        }
                                      }}
                                      style={{
                                        flex: '1',
                                        minWidth: '90px',
                                        padding: '0.5rem 0.75rem',
                                        background: (isFamilyLodge || isFullyBooked) ? '#9ca3af' : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: (isFamilyLodge || isFullyBooked) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: (isFamilyLodge || isFullyBooked) ? 0.7 : 1,
                                        boxShadow: (isFamilyLodge || isFullyBooked) ? 'none' : '0 2px 8px rgba(245, 158, 11, 0.3)'
                                      }}
                                      onMouseEnter={(e) => { 
                                        if (!isFamilyLodge && !isFullyBooked) {
                                          e.target.style.background = 'linear-gradient(135deg, #d97706, #f59e0b)';
                                          e.target.style.transform = 'translateY(-1px)';
                                          e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
                                        }
                                      }}
                                      onMouseLeave={(e) => { 
                                        if (!isFamilyLodge && !isFullyBooked) {
                                          e.target.style.background = 'linear-gradient(135deg, #f59e0b, #fbbf24)';
                                          e.target.style.transform = 'translateY(0)';
                                          e.target.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.3)';
                                        }
                                      }}
                                    >
                                      View Images
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isFamilyLodge) {
                                          alert('Coming Soon! 3D view for Family Lodge will be available soon.');
                                        } else if (isFullyBooked) {
                                          alert('This room is fully booked for the selected dates. Please try different dates.');
                                        } else {
                                          setThreeDViewerModal({ open: true, roomType: room.type });
                                        }
                                      }}
                                      style={{
                                        flex: '1',
                                        minWidth: '90px',
                                        padding: '0.5rem 0.75rem',
                                        background: (isFamilyLodge || isFullyBooked) ? '#9ca3af' : 'linear-gradient(135deg, #fb923c, #fdba74)',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: (isFamilyLodge || isFullyBooked) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: (isFamilyLodge || isFullyBooked) ? 0.7 : 1,
                                        boxShadow: (isFamilyLodge || isFullyBooked) ? 'none' : '0 2px 8px rgba(251, 146, 60, 0.3)'
                                      }}
                                      onMouseEnter={(e) => { 
                                        if (!isFamilyLodge && !isFullyBooked) {
                                          e.target.style.background = 'linear-gradient(135deg, #f97316, #fb923c)';
                                          e.target.style.transform = 'translateY(-1px)';
                                          e.target.style.boxShadow = '0 4px 12px rgba(251, 146, 60, 0.4)';
                                        }
                                      }}
                                      onMouseLeave={(e) => { 
                                        if (!isFamilyLodge && !isFullyBooked) {
                                          e.target.style.background = 'linear-gradient(135deg, #fb923c, #fdba74)';
                                          e.target.style.transform = 'translateY(0)';
                                          e.target.style.boxShadow = '0 2px 8px rgba(251, 146, 60, 0.3)';
                                        }
                                      }}
                                    >
                                      View in 3D
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isFull && !allInstancesAdded && !isFamilyLodge && !isFullyBooked) handleAddRoom(room);
                                      }}
                                      disabled={isFull || allInstancesAdded || isFamilyLodge || isFullyBooked}
                                      style={{
                                        flex: '1',
                                        minWidth: '90px',
                                        padding: '0.5rem 0.75rem',
                                        background: (isFull || allInstancesAdded || isFamilyLodge || isFullyBooked) ? '#e5e7eb' : 'linear-gradient(135deg, #fbbf24, #fcd34d)',
                                        color: (isFull || allInstancesAdded || isFamilyLodge || isFullyBooked) ? '#9ca3af' : '#92400e',
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.75rem',
                                        fontWeight: '600',
                                        cursor: (isFull || allInstancesAdded || isFamilyLodge || isFullyBooked) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        position: 'relative',
                                        boxShadow: (isFull || allInstancesAdded || isFamilyLodge || isFullyBooked) ? 'none' : '0 2px 8px rgba(251, 191, 36, 0.3)'
                                      }}
                                      onMouseEnter={(e) => {
                                        if (!isFull && !allInstancesAdded && !isFamilyLodge && !isFullyBooked) {
                                          e.target.style.background = 'linear-gradient(135deg, #f59e0b, #fbbf24)';
                                          e.target.style.transform = 'translateY(-1px)';
                                          e.target.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.4)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (!isFull && !allInstancesAdded && !isFamilyLodge && !isFullyBooked) {
                                          e.target.style.background = 'linear-gradient(135deg, #fbbf24, #fcd34d)';
                                          e.target.style.transform = 'translateY(0)';
                                          e.target.style.boxShadow = '0 2px 8px rgba(251, 191, 36, 0.3)';
                                        }
                                      }}
                                    >
                                      {isFamilyLodge ? 'Coming Soon' : isFullyBooked ? 'Fully Booked' : isFull ? 'Full' : allInstancesAdded ? 'All Added' : instancesAdded > 0 ? `Add Room (${instancesAdded}/${room.remaining})` : 'Add Room'}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Selected Rooms Section */}
                      {formData.rooms.length > 0 && (
                        <div className="selected-rooms-section" ref={selectedRoomsSectionRef}>
                          <div className="section-header">
                            <h3 className="section-title">Your Selected Rooms</h3>
                            <p className="section-subtitle">Expand each room to customize guest details and amenities.</p>
                          </div>
                          
                          <div className="selected-rooms-list">
                            {formData.rooms.map((roomData) => {
                              const room = availableRooms.find(r => r.id === roomData.roomId);
                              if (!room) return null;
                              
                              const capacity = getRoomCapacity(room.type);
                              const key = `${room.id}-${roomData.instanceNumber}`;
                              const isExpanded = expandedRooms[key];
                              
                              // Get room type name without number
                              const roomTypeName = room.type === 'LOFT' ? 'Loft' : room.type === 'TEPEE' ? 'Tepee' : room.type === 'VILLA' ? 'Villa' : room.name;
                              
                              return (
                                <div 
                                  key={key} 
                                  ref={(el) => { selectedRoomCardRefs.current[key] = el; }}
                                  style={{ 
                                    border: '2px solid #2563eb',
                                    borderRadius: '0.75rem',
                                    overflow: 'hidden',
                                    backgroundColor: '#fff'
                                  }}
                                >
                                  {/* Room Card Header */}
                                  <div 
                                    style={{ 
                                      padding: '1rem',
                                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                                      color: '#fff',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      cursor: 'pointer'
                                    }}
                                    onClick={() => toggleRoomExpansion(room.id, roomData.instanceNumber)}
                                  >
                                    <div>
                                      <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600' }}>
                                        {roomTypeName} {roomData.instanceNumber}
                                      </h3>
                                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
                                        {roomData.adults} Adult{roomData.adults !== 1 ? 's' : ''}{roomData.additionalPax > 0 ? ` + ${roomData.additionalPax} Extra` : ''}{roomData.children > 0 ? ` + ${roomData.children} ${roomData.children === 1 ? 'Child' : 'Children'}` : ''}
                                      </p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveRoom(room.id, roomData.instanceNumber);
                                        }}
                                        style={{
                                          background: 'rgba(239, 68, 68, 0.9)',
                                          border: 'none',
                                          borderRadius: '0.375rem',
                                          padding: '0.5rem 1rem',
                                          color: '#fff',
                                          cursor: 'pointer',
                                          fontSize: '0.875rem',
                                          fontWeight: '500',
                                          transition: 'background 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = 'rgba(220, 38, 38, 1)'}
                                        onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.9)'}
                                      >
                                        Remove
                                      </button>
                                      <svg 
                                        width="20" 
                                        height="20" 
                                        viewBox="0 0 24 24" 
                                        fill="none"
                                        style={{ 
                                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                          transition: 'transform 0.2s'
                                        }}
                                      >
                                        <path d="M6 9L12 15L18 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                  </div>

                                  {/* Expanded Content */}
                                  {isExpanded && (
                                    <div style={{ padding: '1.5rem' }}>
                                      {/* Guest Assignment */}
                                      <div style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                                          Guest Details
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                          {/* Adults */}
                                          <div>
                                            <label htmlFor={`adults-${key}`} style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#4b5563' }}>
                                              Adults (1-{capacity.base})
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleRoomGuestChange(room.id, roomData.instanceNumber, 'adults', null, -1)}
                                                disabled={roomData.adults <= 1}
                                                style={{
                                                  width: '40px',
                                                  height: '40px',
                                                  background: roomData.adults <= 1 ? '#e5e7eb' : '#2563eb',
                                                  color: roomData.adults <= 1 ? '#9ca3af' : '#fff',
                                                  border: 'none',
                                                  borderRadius: '0.375rem',
                                                  fontSize: '1.25rem',
                                                  fontWeight: '600',
                                                  cursor: roomData.adults <= 1 ? 'not-allowed' : 'pointer',
                                                  transition: 'all 0.2s',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => { if (roomData.adults > 1) e.target.style.background = '#1d4ed8'; }}
                                                onMouseLeave={(e) => { if (roomData.adults > 1) e.target.style.background = '#2563eb'; }}
                                              >
                                                −
                                              </button>
                                              <input
                                                type="number"
                                                id={`adults-${key}`}
                                                min="1"
                                                max={capacity.base}
                                                value={roomData.adults}
                                                onChange={(e) => handleRoomGuestChange(room.id, roomData.instanceNumber, 'adults', e.target.value)}
                                                style={{
                                                  flex: 1,
                                                  padding: '0.5rem',
                                                  border: '1px solid #d1d5db',
                                                  borderRadius: '0.375rem',
                                                  fontSize: '1rem',
                                                  textAlign: 'center'
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleRoomGuestChange(room.id, roomData.instanceNumber, 'adults', null, 1)}
                                                style={{
                                                  width: '40px',
                                                  height: '40px',
                                                  background: '#2563eb',
                                                  color: '#fff',
                                                  border: 'none',
                                                  borderRadius: '0.375rem',
                                                  fontSize: '1.25rem',
                                                  fontWeight: '600',
                                                  cursor: 'pointer',
                                                  transition: 'all 0.2s',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = '#1d4ed8'}
                                                onMouseLeave={(e) => e.target.style.background = '#2563eb'}
                                              >
                                                +
                                              </button>
                                            </div>
                                          </div>

                                          {/* Additional Pax */}
                                          <div>
                                            <label htmlFor={`additionalPax-${key}`} style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#4b5563' }}>
                                              Additional Pax (0-{capacity.additionalPaxMax}) <span style={{ color: '#059669', fontWeight: '600' }}>+₱400 each</span>
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleRoomGuestChange(room.id, roomData.instanceNumber, 'additionalPax', null, -1)}
                                                disabled={roomData.additionalPax <= 0}
                                                style={{
                                                  width: '40px',
                                                  height: '40px',
                                                  background: roomData.additionalPax <= 0 ? '#e5e7eb' : '#2563eb',
                                                  color: roomData.additionalPax <= 0 ? '#9ca3af' : '#fff',
                                                  border: 'none',
                                                  borderRadius: '0.375rem',
                                                  fontSize: '1.25rem',
                                                  fontWeight: '600',
                                                  cursor: roomData.additionalPax <= 0 ? 'not-allowed' : 'pointer',
                                                  transition: 'all 0.2s',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => { if (roomData.additionalPax > 0) e.target.style.background = '#1d4ed8'; }}
                                                onMouseLeave={(e) => { if (roomData.additionalPax > 0) e.target.style.background = '#2563eb'; }}
                                              >
                                                −
                                              </button>
                                              <input
                                                type="number"
                                                id={`additionalPax-${key}`}
                                                min="0"
                                                max={capacity.additionalPaxMax}
                                                value={roomData.additionalPax}
                                                onChange={(e) => handleRoomGuestChange(room.id, roomData.instanceNumber, 'additionalPax', e.target.value)}
                                                style={{
                                                  flex: 1,
                                                  padding: '0.5rem',
                                                  border: '1px solid #d1d5db',
                                                  borderRadius: '0.375rem',
                                                  fontSize: '1rem',
                                                  textAlign: 'center'
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleRoomGuestChange(room.id, roomData.instanceNumber, 'additionalPax', null, 1)}
                                                style={{
                                                  width: '40px',
                                                  height: '40px',
                                                  background: '#2563eb',
                                                  color: '#fff',
                                                  border: 'none',
                                                  borderRadius: '0.375rem',
                                                  fontSize: '1.25rem',
                                                  fontWeight: '600',
                                                  cursor: 'pointer',
                                                  transition: 'all 0.2s',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = '#1d4ed8'}
                                                onMouseLeave={(e) => e.target.style.background = '#2563eb'}
                                              >
                                                +
                                              </button>
                                            </div>
                                          </div>

                                          {/* Children */}
                                          <div>
                                            <label htmlFor={`children-${key}`} style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', color: '#4b5563' }}>
                                              Children (0-{capacity.childrenMax || 2}) <span style={{ color: '#059669', fontWeight: '600' }}>Free</span>
                                            </label>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                              <button
                                                type="button"
                                                onClick={() => handleRoomGuestChange(room.id, roomData.instanceNumber, 'children', null, -1)}
                                                disabled={roomData.children <= 0}
                                                style={{
                                                  width: '40px',
                                                  height: '40px',
                                                  background: roomData.children <= 0 ? '#e5e7eb' : '#2563eb',
                                                  color: roomData.children <= 0 ? '#9ca3af' : '#fff',
                                                  border: 'none',
                                                  borderRadius: '0.375rem',
                                                  fontSize: '1.25rem',
                                                  fontWeight: '600',
                                                  cursor: roomData.children <= 0 ? 'not-allowed' : 'pointer',
                                                  transition: 'all 0.2s',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => { if (roomData.children > 0) e.target.style.background = '#1d4ed8'; }}
                                                onMouseLeave={(e) => { if (roomData.children > 0) e.target.style.background = '#2563eb'; }}
                                              >
                                                −
                                              </button>
                                              <input
                                                type="number"
                                                id={`children-${key}`}
                                                min="0"
                                                max={capacity.childrenMax || 2}
                                                value={roomData.children}
                                                onChange={(e) => handleRoomGuestChange(room.id, roomData.instanceNumber, 'children', e.target.value)}
                                                style={{
                                                  flex: 1,
                                                  padding: '0.5rem',
                                                  border: '1px solid #d1d5db',
                                                  borderRadius: '0.375rem',
                                                  fontSize: '1rem',
                                                  textAlign: 'center'
                                                }}
                                              />
                                              <button
                                                type="button"
                                                onClick={() => handleRoomGuestChange(room.id, roomData.instanceNumber, 'children', null, 1)}
                                                style={{
                                                  width: '40px',
                                                  height: '40px',
                                                  background: '#2563eb',
                                                  color: '#fff',
                                                  border: 'none',
                                                  borderRadius: '0.375rem',
                                                  fontSize: '1.25rem',
                                                  fontWeight: '600',
                                                  cursor: 'pointer',
                                                  transition: 'all 0.2s',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center'
                                                }}
                                                onMouseEnter={(e) => e.target.style.background = '#1d4ed8'}
                                                onMouseLeave={(e) => e.target.style.background = '#2563eb'}
                                              >
                                                +
                                              </button>
                                            </div>
                                            <small style={{ display: 'block', marginTop: '0.5rem', color: '#6b7280', fontSize: '0.75rem' }}>
                                              Children don't count toward capacity
                                            </small>
                                          </div>
                                        </div>
                                      </div>

                                      {/* NEW: Room Unit Selector */}
                                      <div style={{ marginBottom: '1.5rem' }}>
                                        <RoomUnitSelector
                                          roomId={room.id}
                                          roomName={room.name}
                                          roomType={room.type}
                                          checkIn={formData.checkIn}
                                          checkOut={formData.checkOut}
                                          selectedUnit={roomData.unitNumber}
                                          onUnitSelect={(unitNumber) => handleUnitSelection(room.id, roomData.instanceNumber, unitNumber)}
                                          disabled={!formData.checkIn || !formData.checkOut}
                                        />
                                        
                                        {/* Unit Assignment Warning */}
                                        <div style={{ 
                                          marginTop: '0.75rem',
                                          padding: '0.75rem 1rem',
                                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                                          border: '1px solid #93c5fd',
                                          borderRadius: '0.5rem',
                                          display: 'flex',
                                          alignItems: 'flex-start',
                                          gap: '0.625rem'
                                        }}>
                                          <span style={{ fontSize: '1.125rem', flexShrink: 0 }}>ℹ️</span>
                                          <p style={{ 
                                            margin: 0, 
                                            fontSize: '0.8125rem', 
                                            lineHeight: '1.5',
                                            color: '#1e3a8a',
                                            fontWeight: '500'
                                          }}>
                                            <strong>Note:</strong> Room unit assignments are subject to availability at the time of payment confirmation. If your selected unit becomes unavailable, you may be automatically reassigned to another available unit of the same type.
                                          </p>
                                        </div>
                                      </div>

                                      {/* Included Room Amenities */}
                                      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
                                        <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem', fontWeight: '600', color: '#374151' }}>
                                          ✨ Included Amenities
                                        </h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                                          {getRoomAmenities(room.type).map((amenity, idx) => (
                                            <div 
                                              key={idx}
                                              style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '0.5rem',
                                                fontSize: '0.875rem',
                                                color: '#4b5563'
                                              }}
                                            >
                                              <span style={{ fontSize: '1.25rem' }}>{amenity.icon}</span>
                                              <span>{amenity.label}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Room Amenities Selectors */}
                                      <div style={{ marginTop: '1.5rem' }}>
                                        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                                          Additional Amenities for this Room
                                        </h4>
                                        
                                        {/* Optional Amenities */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                          <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem', fontWeight: '600', color: '#4b5563' }}>
                                            Optional Amenities (Free add-ons)
                                          </h5>
                                          <OptionalAmenitiesSelector
                                            selectedAmenities={roomData.optionalAmenities || {}}
                                            excludedAmenityNames={['Broom & Dustpan', 'Toiletries Kit']}
                                            onAmenitiesChange={(newOptional) => {
                                              handleRoomAmenityChange(room.id, roomData.instanceNumber, 'optional', null, newOptional);
                                            }}
                                          />
                                        </div>

                                        {/* Rental Amenities */}
                                        <div style={{ marginBottom: '1rem' }}>
                                          <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9375rem', fontWeight: '600', color: '#4b5563' }}>
                                            Rental Services (Paid)
                                          </h5>
                                          <RentalAmenitiesSelector
                                            selectedAmenities={roomData.rentalAmenities || {}}
                                            onAmenitiesChange={(newRental) => {
                                              handleRoomAmenityChange(room.id, roomData.instanceNumber, 'rental', null, newRental);
                                            }}
                                          />
                                        </div>

                                        {/* Auto-fill info for Additional Pax */}
                                        {roomData.additionalPax > 0 && (
                                          <div style={{ 
                                            padding: '0.75rem', 
                                            background: '#dbeafe', 
                                            border: '1px solid #3b82f6',
                                            borderRadius: '0.5rem',
                                            marginTop: '1rem'
                                          }}>
                                            <p style={{ margin: 0, color: '#1e40af', fontSize: '0.875rem' }}>
                                              💡 {roomData.additionalPax} extra bed(s) will be automatically included for your {roomData.additionalPax} additional pax.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {roomLockWarning && (
                        <div className="room-lock-warning" role="status">{roomLockWarning}</div>
                      )}
                    </div>
                  </div>

                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
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
                          </ul>
                        </div>
                        <div className="review-section">
                          <h3 className="section-title">Rooms</h3>
                          <ul className="bulleted" style={{ listStyleType: 'none', padding: 0 }}>
                            {formData.rooms.map((roomData) => {
                              const room = availableRooms.find(r => r.id === roomData.roomId);
                              const roomTypeName = room?.type === 'LOFT' ? 'Loft' : room?.type === 'TEPEE' ? 'Tepee' : room?.type === 'VILLA' ? 'Villa' : room?.name;
                              return (
                                <li key={`${roomData.roomId}-${roomData.instanceNumber}`} style={{ marginBottom: '0.75rem' }}>
                                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>• {roomTypeName} {roomData.instanceNumber}</div>
                                  <ul style={{ listStyleType: 'none', paddingLeft: '1.5rem', margin: '0.25rem 0' }}>
                                    {roomData.adults > 0 && <li style={{ fontSize: '0.9rem', color: '#4b5563' }}>- {roomData.adults} adult{roomData.adults !== 1 ? 's' : ''}</li>}
                                    {roomData.additionalPax > 0 && <li style={{ fontSize: '0.9rem', color: '#4b5563' }}>- {roomData.additionalPax} additional pax</li>}
                                    {roomData.additionalPax > 0 && <li style={{ fontSize: '0.9rem', color: '#059669', fontWeight: '500' }}>- {roomData.additionalPax} extra bed{roomData.additionalPax !== 1 ? 's' : ''} (included)</li>}
                                    {roomData.children > 0 && <li style={{ fontSize: '0.9rem', color: '#4b5563' }}>- {roomData.children} {roomData.children === 1 ? 'child' : 'children'}</li>}
                                  </ul>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                        <div className="review-section">
                          <h3 className="section-title">Amenities</h3>
                          {(() => {
                            // Aggregate amenities from all rooms
                            const amenityMap = new Map();
                            
                            formData.rooms.forEach((roomData) => {
                              const room = availableRooms.find(r => r.id === roomData.roomId);
                              const roomTypeName = room?.type === 'LOFT' ? 'Loft' : room?.type === 'TEPEE' ? 'Tepee' : room?.type === 'VILLA' ? 'Villa' : room?.name;
                              const roomLabel = `${roomTypeName} ${roomData.instanceNumber}`;
                              
                              // Process optional amenities
                              if (roomData.optionalAmenities) {
                                Object.entries(roomData.optionalAmenities).forEach(([amenityId, qty]) => {
                                  if (qty > 0) {
                                    const amenity = optionalAmenitiesData.find(a => a.id === parseInt(amenityId));
                                    const amenityName = amenity?.name || `Optional Amenity ${amenityId}`;
                                    const key = `optional-${amenityId}`;
                                    
                                    if (!amenityMap.has(key)) {
                                      amenityMap.set(key, { name: amenityName, rooms: [], type: 'optional' });
                                    }
                                    amenityMap.get(key).rooms.push({ roomLabel, qty });
                                  }
                                });
                              }
                              
                              // Process rental amenities
                              if (roomData.rentalAmenities) {
                                Object.entries(roomData.rentalAmenities).forEach(([amenityId, selection]) => {
                                  const quantity = selection.quantity || 0;
                                  const hoursUsed = selection.hoursUsed || 0;
                                  
                                  if (quantity > 0 || hoursUsed > 0) {
                                    const amenity = rentalAmenitiesData.find(a => a.id === parseInt(amenityId));
                                    const amenityName = amenity?.name || `Rental Amenity ${amenityId}`;
                                    const key = `rental-${amenityId}`;
                                    
                                    if (!amenityMap.has(key)) {
                                      amenityMap.set(key, { name: amenityName, rooms: [], type: 'rental' });
                                    }
                                    amenityMap.get(key).rooms.push({ roomLabel, qty: quantity, hours: hoursUsed });
                                  }
                                });
                              }
                            });
                            
                            if (amenityMap.size === 0) {
                              return <p style={{ color: '#6b7280', fontStyle: 'italic' }}>No additional amenities requested</p>;
                            }
                            
                            return (
                              <ul className="bulleted">
                                {Array.from(amenityMap.entries()).map(([key, data]) => {
                                  const totalQty = data.rooms.reduce((sum, r) => sum + (r.qty || 0), 0);
                                  const roomsText = data.rooms.map(r => {
                                    if (r.hours && r.hours > 0) {
                                      return `${r.roomLabel} (${r.hours} hrs)`;
                                    }
                                    return r.roomLabel;
                                  }).join(' & ');
                                  
                                  return (
                                    <li key={key}>
                                      {totalQty}× {data.name} <span style={{ color: '#6b7280', fontSize: '0.9em' }}>(from {roomsText})</span>
                                    </li>
                                  );
                                })}
                              </ul>
                            );
                          })()}
                        </div>
                        <div className="review-section">
                          <h3 className="section-title">Price breakdown</h3>
                          <ul className="bulleted">
                            {formData.rooms.map((roomData) => {
                              const room = availableRooms.find(r => r.id === roomData.roomId);
                              const nights = formData.checkIn && formData.checkOut ? Math.max(1, (new Date(formData.checkOut) - new Date(formData.checkIn)) / (1000 * 60 * 60 * 24)) : 1;
                              const roomTotal = room ? (room.price / 100) * nights : 0;
                              const roomTypeName = room?.type === 'LOFT' ? 'Loft' : room?.type === 'TEPEE' ? 'Tepee' : room?.type === 'VILLA' ? 'Villa' : room?.name;
                              const additionalPaxFee = roomData.additionalPax * 400 * nights;
                              return (
                                <li key={`${roomData.roomId}-${roomData.instanceNumber}`}>
                                  {roomTypeName} {roomData.instanceNumber} for {nights} night(s): <strong>₱{roomTotal.toLocaleString()}</strong>
                                  {roomData.additionalPax > 0 && (
                                    <div style={{ fontSize: '0.9em', color: '#6b7280', marginLeft: '1rem' }}>
                                      + {roomData.additionalPax} extra guest(s): ₱{additionalPaxFee.toLocaleString()}
                                    </div>
                                  )}
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
                            const roomsCount = formData.rooms.length;
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
              {step === 2 && (
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
                {step < 2 && (
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
                {step === 2 && (
                  <div style={{ position: 'relative' }}>
                    <SubmitButton disabled={!formData.checkIn || formData.guests < 1 || formData.rooms.length === 0 || !!cooldownUntil}>Submit Booking</SubmitButton>
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
                {step < 2 ? (
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
                  <SubmitButton disabled={!formData.checkIn || formData.guests < 1 || formData.rooms.length === 0 || !!cooldownUntil}>Submit</SubmitButton>
                )}
              </div>
            </form>
          )}
        </div>

        {/* Summary aside - Hide in review step */}
        {step !== 2 && (
        <aside className="summary" aria-label="Booking summary">
          <div className="summary-card">
            <h3 className="summary-title">Your Summary</h3>
            <ul className="kv">
              <li><span>Check-in</span><strong>{formData.checkIn ? new Date(formData.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</strong></li>
              <li><span>Check-out</span><strong>{formData.checkOut ? new Date(formData.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</strong></li>
            </ul>
            <div className="summary-rooms">
              <span className="summary-sub">Rooms</span>
              {formData.rooms.length === 0 ? (
                <p className="muted">No rooms selected yet.</p>
              ) : (
                <ul className="bulleted small" style={{ listStyleType: 'none', padding: 0 }}>
                  {formData.rooms.map((roomData) => {
                    const room = availableRooms.find(r => r.id === roomData.roomId);
                    const roomTypeName = room?.type === 'LOFT' ? 'Loft' : room?.type === 'TEPEE' ? 'Tepee' : room?.type === 'VILLA' ? 'Villa' : room?.name;
                    return (
                      <li key={`${roomData.roomId}-${roomData.instanceNumber}`} style={{ marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          {roomTypeName} {roomData.instanceNumber}
                        </div>
                        <ul style={{ listStyleType: 'none', paddingLeft: '0.75rem', margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
                          {roomData.adults > 0 && <li>- {roomData.adults} adult{roomData.adults !== 1 ? 's' : ''}</li>}
                          {roomData.additionalPax > 0 && <li>- {roomData.additionalPax} additional pax</li>}
                          {roomData.additionalPax > 0 && <li style={{ color: '#059669' }}>- {roomData.additionalPax} extra bed{roomData.additionalPax !== 1 ? 's' : ''}</li>}
                          {roomData.children > 0 && <li>- {roomData.children} {roomData.children === 1 ? 'child' : 'children'}</li>}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              )}
              {formData.rooms.length > 0 && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
                  <small style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                    Total: {formData.rooms.reduce((sum, r) => sum + r.adults, 0)} Adults
                    {formData.rooms.reduce((sum, r) => sum + r.additionalPax, 0) > 0 && 
                      ` + ${formData.rooms.reduce((sum, r) => sum + r.additionalPax, 0)} Extra`}
                    {formData.rooms.reduce((sum, r) => sum + r.children, 0) > 0 && 
                      `, ${formData.rooms.reduce((sum, r) => sum + r.children, 0)} Children`}
                  </small>
                </div>
              )}
            </div>

            <div className="summary-total">
              <span>Estimated total</span>
              <strong>₱{(totalPrice / 100).toLocaleString()}</strong>
            </div>
            <div className="summary-note">No charges yet. You’ll pay a reservation fee at checkout.</div>
          </div>
        </aside>
        )}
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
          box-sizing: border-box;
        }
        
        html {
          overflow-x: hidden !important;
          width: 100%;
          max-width: 100vw;
          position: relative;
        }
        
        body {
          overflow-x: hidden !important;
          width: 100%;
          max-width: 100vw;
          margin: 0;
          padding: 0;
          position: relative;
        }
        
        #__next {
          overflow-x: hidden !important;
          width: 100%;
          max-width: 100vw;
          position: relative;
        }

        .container {
          min-height: 100vh;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          position: relative;
          box-sizing: border-box;
          /* Subtle beach-inspired gradient matching the navbar palette */
          background: radial-gradient(1400px 360px at 50% -80px, rgba(254, 190, 82, 0.24), rgba(254, 190, 82, 0) 65%),
                      linear-gradient(135deg, rgba(254, 190, 82, 0.12), rgba(2, 132, 199, 0.04)),
                      linear-gradient(180deg, #fff, #fafbfc);
        }
        
        .container * {
          max-width: 100%;
          box-sizing: border-box;
        }

        /* Hero */
        .hero {
          position: relative;
          padding: 56px 12px 32px 12px;
          margin-top: 96px; /* push below navbar */
          background: radial-gradient(1400px 340px at 50% -50px, rgba(254, 190, 82, 0.32), rgba(254, 190, 82, 0) 62%),
                      linear-gradient(180deg, rgba(255,255,255,0.85), rgba(255,255,255,0.1));
          overflow: hidden;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        .hero-inner {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
          text-align: center;
          box-sizing: border-box;
          padding: 0 12px;
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
          max-width: 100%;
          width: 100%;
          margin: 0 auto;
          padding: 32px 12px 60px 12px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          box-sizing: border-box;
          position: relative;
        }
        @media (min-width: 768px) {
          .layout {
            padding: 40px 20px 80px 20px;
            gap: 28px;
          }
        }
        @media (min-width: 980px) {
          .layout {
            grid-template-columns: 1fr;
            align-items: start;
            gap: 28px;
            padding: 40px 24px 80px 24px;
            max-width: 1200px;
            min-height: 100vh;
          }
        }
        .main {
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
          padding-bottom: 40px;
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
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
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

        /* === NEW: Enhanced Section Styles === */
        .calendar-section {
          margin-bottom: 3rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        
        .section-header {
          margin-bottom: 1.5rem;
          width: 100%;
          max-width: 100%;
        }
        
        .section-title {
          font-size: clamp(1.25rem, 2vw, 1.5rem);
          font-weight: 800;
          color: var(--ink);
          margin: 0 0 0.5rem 0;
          letter-spacing: -0.01em;
          line-height: 1.3;
        }
        
        .section-subtitle {
          font-size: clamp(0.9rem, 1.5vw, 1rem);
          color: var(--muted);
          margin: 0;
          font-weight: 500;
          line-height: 1.5;
        }
        
        /* Calendar Layout */
        .calendar-wrapper {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        
        .calendar-container {
          background: #fff;
          border-radius: 16px;
          padding: 1rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
          border: 2px solid var(--line);
          box-shadow: var(--shadow-md);
          transition: all 0.3s ease;
        }
        
        .calendar-container:hover {
          box-shadow: var(--shadow-lg);
          border-color: rgba(254, 190, 82, 0.3);
        }
        
        /* Date Summary Card */
        .date-summary-card {
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border: 2px solid var(--line);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: var(--shadow-md);
          transition: all 0.3s ease;
          height: fit-content;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
        }
        
        .date-summary-card:hover {
          box-shadow: var(--shadow-lg);
          border-color: rgba(254, 190, 82, 0.3);
        }
        
        .date-summary-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid var(--line);
        }
        
        .date-summary-header h4 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--ink);
        }
        
        .date-summary-header svg {
          color: var(--amber);
          flex-shrink: 0;
        }
        
        .date-info-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 1rem;
          align-items: center;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        
        @media (max-width: 640px) {
          .date-info-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          
          .date-divider {
            display: none;
          }
        }
        
        .date-info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .date-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .date-value {
          font-size: 1rem;
          font-weight: 700;
          color: var(--ink);
          line-height: 1.4;
          min-height: 2.5rem;
          display: flex;
          align-items: center;
        }
        
        .date-time {
          font-size: 0.75rem;
          color: var(--muted);
          font-weight: 500;
        }
        
        .date-divider {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--amber);
        }
        
        .stay-duration {
          margin-top: 1.25rem;
          padding: 1rem;
          background: linear-gradient(135deg, rgba(254, 190, 82, 0.1), rgba(254, 190, 82, 0.05));
          border-radius: 12px;
          border: 1.5px solid rgba(254, 190, 82, 0.3);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 700;
          color: var(--amber-dark);
          font-size: 0.95rem;
        }
        
        .stay-duration svg {
          color: var(--amber);
          flex-shrink: 0;
        }
        
        /* Rooms Section Header */
        .rooms-section-header {
          margin-top: 3rem;
          margin-bottom: 1.75rem;
        }
        
        .rooms-hint {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: linear-gradient(135deg, rgba(219, 234, 254, 0.4), rgba(191, 219, 254, 0.2));
          border: 2px solid rgba(59, 130, 246, 0.3);
          border-radius: 12px;
          margin-top: 1rem;
          font-size: 0.9rem;
          color: #1e40af;
          font-weight: 600;
          line-height: 1.6;
        }
        
        .rooms-hint svg {
          flex-shrink: 0;
          margin-top: 0.125rem;
          color: #3b82f6;
        }
        
        /* Date Warning Enhanced */
        .date-warning {
          color: #991b1b;
          background: linear-gradient(135deg, #fff1f2, #fecdd3);
          border: 2px solid #fca5a5;
          padding: 1rem 1.25rem;
          border-radius: 14px;
          margin-top: 1.5rem;
          margin-bottom: 2rem;
          font-weight: 800;
          box-shadow: var(--shadow-sm);
          font-size: clamp(0.9rem, 1.5vw, 1rem);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .date-warning::before {
          content: '⚠';
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        /* One Week Warning */
        .one-week-warning {
          background: linear-gradient(135deg, #fffbeb, #fef3c7);
          border: 2px solid #fbbf24;
          border-radius: 14px;
          padding: 1rem;
          margin-top: 1rem;
          margin-bottom: 0;
          display: flex;
          gap: 0.875rem;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.15);
        }
        
        .warning-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
          line-height: 1;
        }
        
        .warning-content {
          flex: 1;
        }
        
        .warning-content strong {
          display: block;
          color: #92400e;
          font-size: 1rem;
          font-weight: 700;
          margin-bottom: 0.375rem;
          letter-spacing: -0.01em;
        }
        
        .warning-content p {
          color: #78350f;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0;
          font-weight: 500;
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
          grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); 
          gap: 24px; 
          margin-top: 1.5rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 640px) {
          .room-selector {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        @media (min-width: 1024px) {
          .room-selector {
            grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
            gap: 28px;
          }
        }
        .room-skeletons {
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr)); 
          gap: 24px; 
          margin-top: 1.5rem;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 640px) {
          .room-skeletons {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }
        @media (min-width: 1024px) {
          .room-skeletons {
            grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
            gap: 28px;
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
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
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
        .room-option.unavailable { 
          position: relative;
          opacity: 0.85;
        }
        .room-option.unavailable .room-media::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(100, 116, 139, 0.75);
          backdrop-filter: blur(4px);
          z-index: 1;
        }
        .room-option.unavailable img {
          filter: grayscale(0.8) brightness(0.7);
        }
        .unavailable-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          text-align: center;
          pointer-events: none;
        }
        .unavailable-badge {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 16px rgba(239, 68, 68, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
        }
        
        /* Fully Booked Overlay */
        .room-option.fully-booked::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(107, 114, 128, 0.5);
          backdrop-filter: blur(3px);
          z-index: 1;
        }
        .room-option.fully-booked img {
          filter: grayscale(0.6) brightness(0.75);
        }
        .fully-booked-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          text-align: center;
          pointer-events: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .fully-booked-badge {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 16px rgba(107, 114, 128, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.9);
          text-transform: uppercase;
        }
        .unavailable-message {
          color: #374151;
          font-size: 13px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.95);
          padding: 6px 12px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          margin: 0;
        }
        .available-count.fully-booked-tag {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          opacity: 0.9;
        }
        
        .available-count.unavailable-tag {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          animation: pulse-purple 2s ease-in-out infinite;
        }
        @keyframes pulse-purple {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.05); }
        }
        .room-media { 
          position: relative;
          overflow: hidden;
        }
        .room-option img { 
          width: 100%; 
          max-width: 100%;
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

        /* Selected Rooms Section */
        .selected-rooms-section {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 2px dashed rgba(254, 190, 82, 0.3);
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        
        .selected-rooms-list {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          max-width: 100%;
        }
        
        .selected-room-card {
          border: 2px solid #2563eb;
          border-radius: 16px;
          overflow: hidden;
          background: #fff;
          box-shadow: var(--shadow-md);
          transition: all 0.3s ease;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }
        
        .selected-room-card:hover {
          box-shadow: var(--shadow-lg);
          transform: translateY(-2px);
        }
        
        .room-card-header {
          padding: 1.25rem;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: #fff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .room-card-header:hover {
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
        }
        
        .room-card-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          line-height: 1.3;
        }
        
        .room-card-subtitle {
          margin: 0.375rem 0 0 0;
          font-size: 0.9375rem;
          opacity: 0.95;
          font-weight: 500;
        }
        
        .room-card-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
        }
        
        .room-card-body {
          padding: 1.75rem;
        }
        
        @media (max-width: 640px) {
          .room-card-header {
            padding: 1rem;
          }
          
          .room-card-body {
            padding: 1.25rem;
          }
          
          .room-card-title {
            font-size: 1.125rem;
          }
          
          .room-card-subtitle {
            font-size: 0.875rem;
          }
        }
        
        /* Guest Details Section in Selected Rooms */
        .guest-details-section {
          margin-bottom: 1.75rem;
        }
        
        .guest-details-section h4 {
          margin: 0 0 1.25rem 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .guest-details-section h4::before {
          content: '👥';
          font-size: 1.25rem;
        }
        
        .guest-input-grid {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .guest-input-item {
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
        }
        
        .guest-input-label {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #4b5563;
        }
        
        .guest-input-label .price-badge {
          font-size: 0.875rem;
          color: #059669;
          font-weight: 700;
        }
        
        .guest-input-label .free-badge {
          font-size: 0.875rem;
          color: #059669;
          font-weight: 700;
        }
        
        .guest-input-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .guest-input-button {
          width: 44px;
          height: 44px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 1.5rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: var(--shadow-sm);
        }
        
        .guest-input-button:hover:not(:disabled) {
          background: #1d4ed8;
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }
        
        .guest-input-button:disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
          box-shadow: none;
        }
        
        .guest-input-field {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid #d1d5db;
          border-radius: 10px;
          font-size: 1.0625rem;
          text-align: center;
          font-weight: 700;
          color: var(--ink);
          transition: all 0.2s ease;
        }
        
        .guest-input-field:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
        
        .guest-input-help {
          font-size: 0.8125rem;
          color: #6b7280;
          font-weight: 500;
          margin-top: 0.375rem;
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
          display: none;
        }
        .summary-card { 
          background: linear-gradient(135deg, var(--panel), var(--bg-soft)); 
          border: 2px solid var(--line); 
          border-radius: 20px; 
          box-shadow: var(--shadow-lg); 
          padding: 24px;
          transition: box-shadow 0.3s ease;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
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
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
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
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
          min-width: 0;
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

        /* ===========================
           COMPREHENSIVE RESPONSIVE STYLES FOR BOOKING PAGE
           =========================== */
        
        /* Extra Small Mobile (320px - 479px) */
        @media (max-width: 479px) {
          .container {
            padding: 12px 8px 80px 8px;
          }
          
          h1 {
            font-size: clamp(1.5rem, 5vw, 1.8rem);
            margin-bottom: 12px;
          }
          
          h2 {
            font-size: clamp(1.3rem, 4.5vw, 1.5rem);
          }
          
          .step-indicator {
            font-size: 0.8rem;
            padding: 6px 12px;
          }
          
          .calendar-container {
            padding: 12px;
          }
          
          .room-option {
            padding: 12px;
            margin-bottom: 12px;
          }
          
          .room-title {
            font-size: 1.2rem;
          }
          
          .room-description {
            font-size: 0.85rem;
          }
          
          .room-details {
            flex-direction: column;
            gap: 8px;
          }
          
          .room-price {
            font-size: 1.3rem;
          }
          
          .room-actions {
            flex-direction: column;
            gap: 8px;
          }
          
          .room-actions button {
            width: 100%;
            font-size: 0.85rem;
            padding: 10px 16px;
          }
          
          .form-group {
            margin-bottom: 14px;
          }
          
          .form-group label {
            font-size: 0.9rem;
            margin-bottom: 6px;
          }
          
          .form-group input,
          .form-group select,
          .form-group textarea {
            font-size: 14px;
            padding: 10px 12px;
          }
          
          .modal-content {
            width: 95%;
            padding: 16px;
            max-height: 92vh;
          }
          
          .modal-content h2 {
            font-size: 1.3rem;
          }
          
          .image-gallery img {
            width: 120px;
            height: 80px;
          }
          
          .modal-actions {
            flex-direction: column;
          }
          
          .modal-actions button {
            width: 100%;
          }
          
          .review-section {
            padding: 12px;
          }
          
          .review-item {
            padding: 10px;
            font-size: 0.9rem;
          }
          
          .btn-next,
          .btn-prev,
          .btn-secondary,
          button[type="submit"] {
            font-size: 0.9rem;
            padding: 12px 20px;
          }
          
          .navigation-buttons {
            flex-direction: column;
            gap: 10px;
          }
          
          .navigation-buttons button {
            width: 100%;
          }
        }
        
        /* Small Mobile (480px - 639px) */
        @media (min-width: 480px) and (max-width: 639px) {
          .container {
            padding: 16px 12px 80px 12px;
          }
          
          h1 {
            font-size: clamp(1.8rem, 5vw, 2.2rem);
          }
          
          .room-option {
            padding: 14px;
          }
          
          .room-title {
            font-size: 1.35rem;
          }
          
          .room-actions {
            flex-wrap: wrap;
            gap: 8px;
          }
          
          .room-actions button {
            flex: 1 1 calc(50% - 4px);
            min-width: 140px;
          }
          
          .modal-content {
            width: 92%;
            padding: 20px;
          }
          
          .image-gallery img {
            width: 140px;
            height: 90px;
          }
          
          .form-group input,
          .form-group select,
          .form-group textarea {
            font-size: 15px;
            padding: 11px 14px;
          }
        }
        
        /* Tablets Portrait (640px - 767px) */
        @media (min-width: 640px) and (max-width: 767px) {
          .container {
            padding: 20px 16px 80px 16px;
            max-width: 640px;
          }
          
          h1 {
            font-size: clamp(2rem, 4.5vw, 2.5rem);
          }
          
          .room-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .room-option {
            padding: 18px;
          }
          
          .room-actions button {
            font-size: 0.95rem;
          }
          
          .modal-content {
            width: 88%;
            max-width: 600px;
            padding: 24px;
          }
          
          .image-gallery img {
            width: 160px;
            height: 100px;
          }
          
          .review-card {
            padding: 18px;
          }
          
          .form-group input,
          .form-group select,
          .form-group textarea {
            font-size: 16px;
            padding: 12px 16px;
          }
        }
        
        /* Tablets Landscape (768px - 1023px) */
        @media (min-width: 768px) and (max-width: 1023px) {
          .container {
            padding: 24px 20px 80px 20px;
            max-width: 768px;
          }
          
          h1 {
            font-size: clamp(2.2rem, 4vw, 2.8rem);
          }
          
          .room-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 18px;
          }
          
          .room-option {
            padding: 20px;
          }
          
          .room-title {
            font-size: 1.5rem;
          }
          
          .room-details {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
          
          .room-actions {
            flex-direction: column;
            gap: 10px;
          }
          
          .room-actions button {
            width: 100%;
          }
          
          .modal-content {
            width: 85%;
            max-width: 680px;
            padding: 28px;
          }
          
          .image-gallery {
            gap: 12px;
          }
          
          .image-gallery img {
            width: 180px;
            height: 110px;
          }
          
          .calendar-container {
            padding: 18px;
          }
          
          .form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          
          .navigation-buttons {
            gap: 14px;
          }
        }
        
        /* Laptops (1024px - 1279px) */
        @media (min-width: 1024px) and (max-width: 1279px) {
          .container {
            padding: 32px 28px 80px 28px;
            max-width: 1024px;
          }
          
          h1 {
            font-size: clamp(2.5rem, 3.5vw, 3rem);
          }
          
          .room-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 22px;
          }
          
          .room-option {
            padding: 24px;
          }
          
          .room-title {
            font-size: 1.6rem;
          }
          
          .room-description {
            font-size: 1rem;
          }
          
          .room-price {
            font-size: 1.75rem;
          }
          
          .modal-content {
            max-width: 760px;
            padding: 32px;
          }
          
          .image-gallery img {
            width: 200px;
            height: 120px;
          }
          
          .form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 18px;
          }
          
          .review-card {
            padding: 24px;
          }
          
          .btn-next,
          .btn-prev,
          .btn-secondary,
          button[type="submit"] {
            font-size: 1.05rem;
            padding: 14px 28px;
          }
        }
        
        /* Desktops (1280px - 1535px) */
        @media (min-width: 1280px) and (max-width: 1535px) {
          .container {
            padding: 40px 32px 80px 32px;
            max-width: 1280px;
          }
          
          h1 {
            font-size: clamp(2.8rem, 3.2vw, 3.5rem);
          }
          
          h2 {
            font-size: clamp(2rem, 2.5vw, 2.5rem);
          }
          
          .room-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 24px;
          }
          
          .room-option {
            padding: 26px;
          }
          
          .room-title {
            font-size: 1.7rem;
          }
          
          .modal-content {
            max-width: 820px;
            padding: 36px;
          }
          
          .image-gallery img {
            width: 220px;
            height: 135px;
          }
          
          .calendar-container {
            padding: 24px;
          }
        }
        
        /* Large Screens / TVs (1536px and above) */
        @media (min-width: 1536px) {
          .container {
            padding: 50px 40px 100px 40px;
            max-width: 1536px;
          }
          
          h1 {
            font-size: clamp(3.5rem, 3vw, 4.5rem);
            margin-bottom: 32px;
          }
          
          h2 {
            font-size: clamp(2.5rem, 2.3vw, 3rem);
            margin-bottom: 28px;
          }
          
          h3 {
            font-size: clamp(1.8rem, 2vw, 2.2rem);
          }
          
          .step-indicator {
            font-size: 1.15rem;
            padding: 14px 28px;
          }
          
          .room-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 32px;
          }
          
          .room-option {
            padding: 32px;
            border-radius: 20px;
          }
          
          .room-image {
            height: 280px;
            border-radius: 16px;
          }
          
          .room-title {
            font-size: 2rem;
            margin-bottom: 14px;
          }
          
          .room-description {
            font-size: 1.15rem;
            line-height: 1.7;
          }
          
          .room-details {
            gap: 20px;
            margin: 20px 0;
          }
          
          .room-capacity,
          .room-price {
            font-size: 1.2rem;
          }
          
          .room-price {
            font-size: 2rem;
          }
          
          .room-actions {
            gap: 16px;
            margin-top: 24px;
          }
          
          .room-actions button {
            font-size: 1.1rem;
            padding: 14px 24px;
            border-radius: 12px;
          }
          
          .calendar-container {
            padding: 32px;
            border-radius: 20px;
          }
          
          .calendar-title {
            font-size: 1.5rem;
            margin-bottom: 20px;
          }
          
          .form-group {
            margin-bottom: 26px;
          }
          
          .form-group label {
            font-size: 1.15rem;
            margin-bottom: 10px;
          }
          
          .form-group input,
          .form-group select,
          .form-group textarea {
            font-size: 1.05rem;
            padding: 16px 20px;
            border-radius: 12px;
          }
          
          .form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
          
          .modal-content {
            max-width: 1000px;
            padding: 48px;
            border-radius: 24px;
          }
          
          .modal-content h2 {
            font-size: 2.2rem;
            margin-bottom: 20px;
          }
          
          .image-gallery {
            gap: 16px;
            margin-bottom: 28px;
          }
          
          .image-gallery img {
            width: 260px;
            height: 160px;
            border-radius: 12px;
          }
          
          .room-modal-capacity {
            font-size: 1.35rem;
            margin-bottom: 16px;
          }
          
          .room-modal-description {
            font-size: 1.15rem;
            line-height: 1.75;
            margin-bottom: 24px;
          }
          
          .room-modal-amenities {
            gap: 18px;
            margin-bottom: 28px;
          }
          
          .room-modal-amenity-item {
            font-size: 1.1rem;
          }
          
          .modal-actions {
            gap: 16px;
          }
          
          .modal-actions button {
            font-size: 1.1rem;
            padding: 14px 28px;
            border-radius: 12px;
          }
          
          .review-card {
            padding: 32px;
            border-radius: 20px;
          }
          
          .review-card .card-header {
            padding: 32px 32px 16px 32px;
          }
          
          .review-section {
            padding: 28px;
          }
          
          .review-item {
            padding: 18px 20px;
            font-size: 1.08rem;
          }
          
          .review-label {
            font-size: 1.05rem;
          }
          
          .review-value {
            font-size: 1.15rem;
          }
          
          .total-section {
            padding: 28px;
            border-radius: 16px;
          }
          
          .total-label {
            font-size: 1.4rem;
          }
          
          .total-amount {
            font-size: 2.5rem;
          }
          
          .navigation-buttons {
            gap: 20px;
            margin-top: 36px;
          }
          
          .btn-next,
          .btn-prev,
          .btn-secondary,
          button[type="submit"] {
            font-size: 1.2rem;
            padding: 18px 38px;
            border-radius: 14px;
            min-width: 180px;
          }
          
          .submit-modal {
            max-width: 560px;
            padding: 56px;
            border-radius: 28px;
          }
          
          .submit-modal h3 {
            font-size: 2rem;
            margin-bottom: 24px;
          }
          
          .submit-modal p {
            font-size: 1.2rem;
            margin-bottom: 36px;
          }
          
          .spinner {
            width: 72px;
            height: 72px;
            border-width: 6px;
          }
        }
        
        /* Ultra-wide screens (2560px and above) */
        @media (min-width: 2560px) {
          .container {
            padding: 70px 60px 120px 60px;
            max-width: 2000px;
          }
          
          h1 {
            font-size: clamp(4.5rem, 2.8vw, 5.5rem);
            margin-bottom: 48px;
          }
          
          h2 {
            font-size: clamp(3rem, 2.2vw, 3.8rem);
          }
          
          .room-grid {
            grid-template-columns: repeat(4, 1fr);
            gap: 44px;
          }
          
          .room-option {
            padding: 44px;
          }
          
          .room-image {
            height: 360px;
          }
          
          .room-title {
            font-size: 2.5rem;
          }
          
          .room-description {
            font-size: 1.3rem;
          }
          
          .modal-content {
            max-width: 1400px;
            padding: 64px;
          }
          
          .image-gallery img {
            width: 320px;
            height: 200px;
          }
        }
        
        /* Landscape orientation adjustments for tablets/mobile */
        @media (max-width: 1023px) and (orientation: landscape) {
          .container {
            padding-top: 16px;
            padding-bottom: 70px;
          }
          
          h1 {
            font-size: clamp(1.8rem, 4vw, 2.5rem);
            margin-bottom: 16px;
          }
          
          .room-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          
          .room-option {
            padding: 14px;
          }
          
          .room-image {
            height: 140px;
          }
          
          .modal-content {
            max-height: 85vh;
            padding: 20px;
          }
          
          .form-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 14px;
          }
        }
        
        /* Touch-friendly adjustments */
        @media (hover: none) and (pointer: coarse) {
          .room-actions button,
          .modal-actions button,
          .navigation-buttons button {
            min-height: 48px;
            min-width: 48px;
            padding: 14px 20px;
          }
          
          .form-group input,
          .form-group select,
          .form-group textarea {
            min-height: 48px;
            font-size: 16px;
          }
          
          .room-option {
            cursor: default;
          }
          
          .room-option:hover {
            transform: none;
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

        /* === COMPREHENSIVE OVERFLOW PREVENTION === */
        /* Prevent horizontal overflow on all major containers */
        .hero,
        .hero-inner,
        .layout,
        .main,
        .card,
        .card-body,
        .calendar-section,
        .calendar-wrapper,
        .calendar-container,
        .date-summary-card,
        .rooms-section-header,
        .room-selector,
        .room-skeletons,
        .selected-rooms-section,
        .selected-rooms-list,
        .review-grid,
        .review-section,
        form,
        .navigation-buttons {
          max-width: 100%;
          box-sizing: border-box;
        }

        /* Ensure all images don't overflow */
        img {
          max-width: 100%;
          height: auto;
        }

        /* Prevent text overflow */
        .section-title,
        .section-subtitle,
        .card-title,
        .card-subtitle,
        .room-name,
        .date-value,
        h1, h2, h3, h4, h5, h6,
        p, span, div {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Ensure modals don't cause overflow */
        .modal-overlay,
        .modal-content,
        .pending-prompt,
        .submit-modal {
          max-width: 100vw;
          box-sizing: border-box;
        }

        /* Fix for mobile CTA */
        .mobile-cta {
          max-width: 100vw;
          box-sizing: border-box;
          left: 0;
          right: 0;
        }

        /* Ensure summary sidebar fits properly */
        @media (min-width: 980px) {
          .summary {
            min-width: 0;
          }
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

      {/* 3D Room Viewer Modal */}
      <ThreeDRoomViewerModal
        show={threeDViewerModal.open}
        onClose={() => setThreeDViewerModal({ open: false, roomType: null })}
        roomType={threeDViewerModal.roomType}
      />

      {/* Max Capacity Modal */}
      <MaxCapacityModal
        show={maxCapacityModal.show}
        onClose={() => setMaxCapacityModal({ show: false, roomType: null, maxCapacity: 0 })}
        roomType={maxCapacityModal.roomType}
        maxCapacity={maxCapacityModal.maxCapacity}
      />

      {/* Midnight Alert Modal */}
      <MidnightAlertModal
        show={showMidnightAlert}
        onReload={() => window.location.reload()}
      />

      {/* Room Unit Reassignment Modal */}
      {showReassignmentModal && reassignmentInfo && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              // Clicking backdrop - prevent close, user must acknowledge
            }
          }}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '1rem',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              background: reassignmentInfo.warning.type === 'AUTO_REASSIGNED' 
                ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '2rem' }}>
                  {reassignmentInfo.warning.type === 'AUTO_REASSIGNED' ? '⚠️' : 'ℹ️'}
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>
                    {reassignmentInfo.warning.type === 'AUTO_REASSIGNED' 
                      ? 'Room Unit Reassignment' 
                      : 'Room Assignment Pending'}
                  </h3>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#4b5563' }}>
                    Booking #{reassignmentInfo.bookingId}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
              <div style={{
                padding: '1rem',
                background: '#f9fafb',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb',
                marginBottom: '1.5rem'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.9375rem', 
                  lineHeight: '1.6',
                  color: '#374151',
                  fontWeight: '500'
                }}>
                  {reassignmentInfo.warning.message}
                </p>
              </div>

              {/* Show reassignment details if available */}
              {reassignmentInfo.warning.type === 'AUTO_REASSIGNED' && reassignmentInfo.warning.reassignedUnits && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ 
                    margin: '0 0 0.75rem 0', 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#111827' 
                  }}>
                    Your New Room Assignments:
                  </h4>
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.5rem' 
                  }}>
                    {reassignmentInfo.warning.reassignedUnits.map((unit, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: '0.75rem',
                          background: 'white',
                          border: '2px solid #10b981',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>✅</span>
                        <span style={{ fontSize: '0.9375rem', color: '#374151', fontWeight: '600' }}>
                          {unit.roomName} <span style={{ color: '#10b981' }}>#{unit.assignedUnit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Important notice */}
              <div style={{
                padding: '1rem',
                background: '#eff6ff',
                border: '1px solid #93c5fd',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                <p style={{ 
                  margin: 0, 
                  fontSize: '0.8125rem', 
                  lineHeight: '1.5',
                  color: '#1e3a8a'
                }}>
                  <strong>Important:</strong> {reassignmentInfo.warning.type === 'AUTO_REASSIGNED' 
                    ? 'Your room type and pricing remain the same. Only the unit number has changed.'
                    : 'This does not affect your reservation. Our team will contact you with your assigned room units.'}
                </p>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column' }}>
                <button
                  onClick={() => {
                    localStorage.setItem('bookingId', reassignmentInfo.bookingId);
                    localStorage.setItem('bookingAmount', reassignmentInfo.totalPrice);
                    router.push('/checkout');
                  }}
                  style={{
                    padding: '0.875rem 1.5rem',
                    background: 'linear-gradient(135deg, #c89f65 0%, #a67c52 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  Continue to Payment
                </button>
                
                {reassignmentInfo.warning.type === 'ASSIGNMENT_FAILED' && (
                  <button
                    onClick={() => {
                      setShowReassignmentModal(false);
                      setReassignmentInfo(null);
                      // Optionally refresh the page to try again
                      window.location.reload();
                    }}
                    style={{
                      padding: '0.875rem 1.5rem',
                      background: 'white',
                      color: '#6b7280',
                      border: '2px solid #e5e7eb',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.borderColor = '#9ca3af';
                      e.currentTarget.style.color = '#374151';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.borderColor = '#e5e7eb';
                      e.currentTarget.style.color = '#6b7280';
                    }}
                  >
                    Start New Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
