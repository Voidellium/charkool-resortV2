'use client';
import { useState, useEffect, useRef } from 'react';

import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BookingCalendar from '../../components/BookingCalendar';
import RoomAmenitiesSelector from '../../components/RoomAmenitiesSelector'; // Import the new component

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

  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [step, setStep] = useState(1);
  const [availabilityData, setAvailabilityData] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showPendingPrompt, setShowPendingPrompt] = useState(false);
  const [pendingBooking, setPendingBooking] = useState(null);
  const submittingRef = useRef(false);

  // New state for animated dots in processing button
  const [dotCount, setDotCount] = useState(1);

  // NEW: warnings & locks
  const [dateWarning, setDateWarning] = useState(''); // for single-date validation
  const [roomLockWarning, setRoomLockWarning] = useState(''); // for room-lock explanation

  // NEW: rental amenities data fetched from API
  const [rentalAmenitiesData, setRentalAmenitiesData] = useState([]);

  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    selectedRooms: {}, // { roomId: quantity }
    selectedAmenities: { optional: {}, rental: {}, cottage: null },
  });


  // --- Authentication and Progress Restoration (no changes needed here) ---
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/booking');
    }
  }, [status, router]);

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

  // Animate dots in processing button
  useEffect(() => {
    if (!submitting) {
      setDotCount(1);
      return;
    }
    const interval = setInterval(() => {
      setDotCount((prev) => (prev >= 3 ? 1 : prev + 1));
    }, 500);
    return () => clearInterval(interval);
  }, [submitting]);

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
    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  if (status === 'loading' || !session) {
    return <div>Loading...</div>;
  }

  const progressPercent = (step / 3) * 100;

  return (
    <div className="container">
      <div className="booking-card">
        <div className="progress-bar">
          <motion.div className="progress" animate={{ width: `${progressPercent}%` }} />
        </div>
        <h2>Book Your Stay</h2>

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: '20px' }}>
                  <div className="form-group">
                    <label>Select Dates</label>
                    <BookingCalendar availabilityData={availabilityData} onDateChange={handleDateChange} />
                  </div>
                  <div className="form-group">
                    <label>Guests</label>
                    <input type="number" name="guests" min="1" max="80" step="1" value={formData.guests} onChange={handleChange} required />
                  </div>
                  {(formData.checkIn || formData.checkOut) && (
                    <div className="date-display">
                      <div><strong>Check-in:</strong> {formData.checkIn || '...'}</div>
                      <div><strong>Check-out:</strong> {formData.checkOut || '...'}</div>
                    </div>
                  )}

                  {/* DATE WARNING UI */}
                  {dateWarning && (
                    <div className="date-warning">{dateWarning}</div>
                  )}

                  <div className="form-group">
                    <label>Select Rooms</label>
                    {loadingRooms ? (
                      <p>Loading rooms...</p>
                    ) : availableRooms.length === 0 ? (
                      <p>No rooms available for the selected dates.</p>
                    ) : (
                      <div className="room-selector">
                        {availableRooms.filter(room => room.type !== 'FAMILY_LODGE').map((room) => {
                          const capacity = getRoomCapacity(room.type);
                          const selectedQty = formData.selectedRooms[room.id] || 0;
                          const isFull = room.remaining <= 0;
                          const isSelected = selectedQty > 0;

                          // Lock other rooms if capacity satisfied by current selection
                          const roomLocked = isRoomLockActive() && !isSelected;

                          return (
                            <div key={room.id} className="room-option-container">
                              <div
                                className={`room-option ${isSelected ? 'selected' : ''} ${isFull || roomLocked ? 'disabled' : ''}`}
                                onClick={() => {
                                  if (!isFull && !roomLocked) handleRoomSelect(room);
                                }}
                              >
                                <img src={room.image || '/images/default.jpg'} alt={room.name} />
                                <span>{room.name}</span>
                                <p className="room-description">
                                  {room.type === 'TEPEE' && 'Tepee: 1-5 pax'}
                                  {room.type === 'LOFT' && 'Loft: 1-3 pax'}
                                  {room.type === 'VILLA' && 'Villa: 1-10 pax'}
                                </p>
                                {isFull ? (
                                  <span className="available-count full">Full</span>
                                ) : (
                                  <span className="available-count">{room.remaining} left</span>
                                )}
                              </div>
                              {isSelected && (
                                <div className="quantity-controls">
                                  <button 
                                    type="button"
                                    onClick={() => handleRoomQuantityChange(room.id, -1)}
                                    disabled={selectedQty <= 1}
                                  >-</button>
                                  <span>{selectedQty}</span>
                                  <button 
                                    type="button"
                                    onClick={() => handleRoomQuantityChange(room.id, 1)}
                                    disabled={(() => {
                                      const totalCapacity = computeTotalCapacity();
                                      const selectedQty = formData.selectedRooms[room.id] || 0;
                                      return totalCapacity >= formData.guests || selectedQty >= room.remaining;
                                    })()}
                                  >+</button>
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
                        <div className="capacity-warning">Selected rooms can accommodate {totalCapacity} guests, but you have {formData.guests} guests. Please select more rooms.</div>
                      ) : null;
                    })()}

                    {/* ROOM LOCK WARNING */}
                    {roomLockWarning && (
                      <div className="room-lock-warning">{roomLockWarning}</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <RoomAmenitiesSelector
                roomType={Object.keys(formData.selectedRooms).length > 0 ? availableRooms.find(r => r.id == Object.keys(formData.selectedRooms)[0])?.type : ''}
                selectedAmenities={formData.selectedAmenities}
                onAmenitiesChange={handleAmenitiesChange}
              />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3>Review Booking</h3>
              <p><strong>Check-in:</strong> {formData.checkIn}</p>
              <p><strong>Check-out:</strong> {formData.checkOut}</p>
              <p><strong>Guests:</strong> {formData.guests}</p>
              <p><strong>Selected Rooms:</strong></p>
              <ul>
                {Object.entries(formData.selectedRooms).map(([roomId, qty]) => {
                  const room = availableRooms.find(r => r.id == roomId);
                  return <li key={roomId}>{qty} x {room?.name}</li>;
                })}
              </ul>
              <p><strong>Selected Amenities:</strong></p>
              <ul>
                {Object.entries(formData.selectedAmenities.optional).map(([amenityId, qty]) => {
                  return <li key={amenityId}>{qty} x Optional Amenity {amenityId}</li>;
                })}
                {Object.entries(formData.selectedAmenities.rental).map(([amenityId, selection]) => {
                  const rentalAmenity = rentalAmenitiesData.find(a => a.id === parseInt(amenityId));
                  const quantity = selection.quantity || 0;
                  return (
                    <li key={amenityId}>
                      {quantity} x {rentalAmenity?.name || `Rental Amenity ${amenityId}`}
                    </li>
                  );
                })}
                {formData.selectedAmenities.cottage && (
                  <li>Cottage: {formData.selectedAmenities.cottage}</li>
                )}
              </ul>
              <p><strong>Price Breakdown:</strong></p>
              <ul>
                {Object.entries(formData.selectedRooms).map(([roomId, qty]) => {
                  const room = availableRooms.find(r => r.id == roomId);
                  const nights = formData.checkIn && formData.checkOut ? Math.max(1, (new Date(formData.checkOut) - new Date(formData.checkIn)) / (1000 * 60 * 60 * 24)) : 1;
                  const roomTotal = room ? (room.price / 100) * qty * nights : 0;
                  return (
                    <li key={roomId}>
                      {qty} x {room?.name} for {nights} night(s): ₱{roomTotal.toLocaleString()}
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

                  // Calculate display text for quantity and hours
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
                      {rentalAmenity?.name || `Rental Amenity ${amenityId}`}: {quantityHoursText} - ₱{(rentalTotal / 100).toLocaleString()}
                    </li>
                  );
                })}
                {formData.selectedAmenities.cottage ? (
                  <li>
                    Cottage: {formData.selectedAmenities.cottage.quantity} unit(s) - ₱{(formData.selectedAmenities.cottage.quantity * 1000).toLocaleString()}
                  </li>
                ) : null}
              </ul>
              <p><strong>Total Price:</strong> ₱{(totalPrice / 100).toLocaleString()}</p>
              <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e0f2fe', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
                <p><strong>Note:</strong> Upon submission, your rooms will be held for 3 hours. You must complete payment within this time to confirm your booking.</p>
                <p><strong>Cancellation Policy:</strong> Full refund if cancelled more than 24 hours before check-in, partial refund otherwise.</p>
              </div>
            </motion.div>
          )}
          <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: '#ED7709', marginTop: '10px', marginBottom: '10px' }}>
            Total Price: ₱{(totalPrice / 100).toLocaleString()}
          </div>

          <div className="navigation-buttons">
            {submitting ? (
              <button
                type="button"
                disabled
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '1.2rem',
                  color: '#6b7280',
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '14px',
                  cursor: 'not-allowed',
                }}
              >
                Processing
                {'.'.repeat(dotCount)}
              </button>
            ) : (
              <>
                {step > 1 && <button type="button" onClick={handleBack}>Back</button>}
                {step < 3 && <button type="button" onClick={handleNext} disabled={
                  // Next disabled if date invalid (single date) OR guests invalid OR capacity insufficient when on step1
                  !formData.checkIn ||
                  !formData.checkOut ||
                  formData.checkIn === formData.checkOut ||
                  formData.guests < 1 ||
                  (step === 1 && (() => {
                    const totalCapacity = computeTotalCapacity();
                    return totalCapacity < formData.guests;
                  })())
                }>Next</button>}
                {step === 3 && <button type="submit" disabled={submitting || submittingRef.current || !formData.checkIn || formData.guests < 1 || Object.keys(formData.selectedRooms).length === 0}>{submitting ? 'Submitting...' : 'Submit Booking'}</button>}
              </>
            )}
          </div>
        </form>
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
              for {new Date(pendingBooking.checkIn).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} to{' '}
              {new Date(pendingBooking.checkOut).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} was detected.
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

      {/* Styles */}
      <style jsx>{`
        .container { min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; background: linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%); padding: 20px; }
        .booking-card { background: #fff; padding: 40px; border-radius: 15px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); width: 100%; max-width: 700px; }
        .progress-bar { background-color: #e0e0e0; border-radius: 10px; overflow: hidden; height: 10px; margin-bottom: 20px; }
        .progress { height: 100%; background-color: #2563eb; transition: width 0.3s ease-in-out; }
        h2, h3 { text-align: center; color: #FEBE52; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #334155; }
        input[type="number"] { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 16px; }
        .form-group input[name="guests"] { max-width: 120px; }
        .date-display { display: flex; gap: 20px; margin-top: 10px; background: #f8f9fa; padding: 10px; border-radius: 8px; }
        .room-selector { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
        .room-option-container { position: relative; }
        .room-option { border: 2px solid #d1d5db; border-radius: 10px; padding: 10px; cursor: pointer; transition: all 0.3s ease; text-align: center; position: relative; }
        .room-option img { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; }
        .room-option.selected { border-color: #FEBE52; background-color: #FEBE52; box-shadow: 0 0 0 3px #FEBE52; }
        .room-option.disabled { cursor: not-allowed; opacity: 0.5; pointer-events: none; }
        .room-option.disabled.selected { background-color: #fef2f2; border-color: #ef4444; pointer-events: auto; } /* allow deselect if it was disabled but selected */
        .available-count { position: absolute; top: 8px; right: 8px; background-color: #ED7709; color: white; padding: 4px 8px; border-radius: 99px; font-size: 12px; font-weight: bold; }
        .available-count.full { background-color: #ef4444; }
        .quantity-controls { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 8px; }
        .quantity-controls button { width: 11px; height: 15px; border: none; background-color: #FEBE52; color: white; border-radius: 50%; cursor: pointer; font-size: 16px; font-weight: bold; display: flex; align-items: center; justify-content: center; }
        .quantity-controls button:hover { background-color: #EDEC09; }
        .quantity-controls button:disabled {
          background-color: #9ca3af;
          cursor: not-allowed;
          color: #f3f4f6;
        }
        .quantity-controls span { font-size: 14px; font-weight: bold; min-width: 18px; text-align: center; }
        .room-description { font-size: 12px; color: #6b7280; margin: 4px 0 0 0; text-align: center; }
        .capacity-warning { color: #ef4444; font-weight: bold; margin-top: 10px; padding: 10px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; }
        .navigation-buttons { display: flex; justify-content: space-between; gap: 10px; margin-top: 20px; }
        button { flex: 1; padding: 14px; font-size: 16px; font-weight: 600; background-color: #FEBE52; color: white; border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; }
        button:hover:not(:disabled) { background-color: #EDB509; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15); }
        button:disabled { background-color: #9ca3af; cursor: not-allowed; }
        .total-price-display { margin-top: 20px; text-align: left; font-size: 1.2rem; font-weight: bold; color: #FEBE52; }

        .pending-prompt-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .pending-prompt {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          text-align: center;
        }
        .pending-prompt h3 {
          color: #FEBE52;
          margin-bottom: 10px;
        }
        .pending-prompt p {
          color: #334155;
          margin-bottom: 20px;
        }
        .prompt-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .proceed-btn, .cancel-btn {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .proceed-btn {
          background-color: #10b981;
          color: white;
        }
        .proceed-btn:hover {
          background-color: #059669;
        }
        .cancel-btn {
          background-color: #ef4444;
          color: white;
        }
        .cancel-btn:hover {
          background-color: #dc2626;
        }

        /* New warning styles */
        .date-warning {
          color: #b91c1c;
          background-color: #fff1f2;
          border: 1px solid #fecaca;
          padding: 10px;
          border-radius: 8px;
          margin-top: 10px;
          font-weight: 600;
          text-align: center;
        }
        .room-lock-warning {
          color: #064e3b;
          background-color: #ecfdf5;
          border: 1px solid #bbf7d0;
          padding: 10px;
          border-radius: 8px;
          margin-top: 10px;
          font-weight: 600;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
