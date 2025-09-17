'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BookingCalendar from '../../components/BookingCalendar';

export default function BookingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'unauthenticated') {
    // Save booking progress before redirecting
    if (typeof window !== 'undefined') {
      const progressData = {
        formData: {
          checkIn: '',
          checkOut: '',
          guests: 1,
          roomType: '',
          selectedRoomType: '',
          selectedAmenities: [],
        },
        step: 1,
        timestamp: Date.now()
      };
      try {
        localStorage.setItem('bookingProgress', JSON.stringify(progressData));
      } catch (error) {
        console.error('Error saving booking progress:', error);
      }
    }
    router.push('/login?redirect=/booking');
    return <div>Redirecting to login...</div>;
  }

  // Ensure session is fully loaded before proceeding
  if (!session || !session.user) {
    // Show loading or fallback UI instead of crashing
    return (
      <div>
        <p>Loading session...</p>
      </div>
    );
  }

  const [amenities, setAmenities] = useState([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);

  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);

  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    roomType: '',
    selectedRoomType: '',
    selectedAmenities: [],
  });

  const [step, setStep] = useState(1);

  const [availabilityData, setAvailabilityData] = useState({}); // For calendar availability

  // ✅ Booking Progress Persistence
  const saveBookingProgress = () => {
    const progressData = {
      formData,
      step,
      timestamp: Date.now()
    };
    localStorage.setItem('bookingProgress', JSON.stringify(progressData));
  };

  const restoreBookingProgress = () => {
    try {
      const savedProgress = localStorage.getItem('bookingProgress');
      if (savedProgress) {
        const progressData = JSON.parse(savedProgress);
        const hoursSinceSave = (Date.now() - progressData.timestamp) / (1000 * 60 * 60);

        // Only restore if data is less than 24 hours old
        if (hoursSinceSave < 24) {
          setFormData(progressData.formData);
          setStep(progressData.step);
        }
        // Clear the saved data after restoration
        localStorage.removeItem('bookingProgress');
      }
    } catch (error) {
      console.error('Error restoring booking progress:', error);
      localStorage.removeItem('bookingProgress'); // Clear corrupted data
    }
  };

  const clearBookingProgress = () => {
    localStorage.removeItem('bookingProgress');
  };

  // ✅ Save progress before page unloads (redirect to login)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only save if we have meaningful data
      if (formData.checkIn || formData.checkOut || formData.roomType || formData.selectedAmenities.length > 0) {
        saveBookingProgress();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, step]);

  // ✅ Restore progress on component mount
  useEffect(() => {
    restoreBookingProgress();
  }, []);

  // ✅ Fetch amenities
  useEffect(() => {
    async function fetchAmenities() {
      try {
        const res = await fetch('/api/amenities');
        if (!res.ok) throw new Error('Failed to fetch amenities');
        const data = await res.json();
        setAmenities(data);
      } catch (err) {
        console.error('❌ Failed to load amenities:', err);
      } finally {
        setLoadingAmenities(false);
      }
    }
    fetchAmenities();
  }, []);

  // ✅ Fetch availability data for calendar (3 months)
  useEffect(() => {
    async function fetchAvailability() {
      try {
        // Calculate date range for 3 months ahead
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOf3Months = new Date(today.getFullYear(), today.getMonth() + 3, 0);

        const res = await fetch('/api/availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkIn: startOfMonth.toISOString().split('T')[0],
            checkOut: endOf3Months.toISOString().split('T')[0],
          }),
        });

        if (!res.ok) throw new Error('Failed to fetch availability');
        const data = await res.json();

        if (data.availability) {
          setAvailabilityData(data.availability);
        }
      } catch (err) {
        console.error('❌ Failed to load availability:', err);
      }
    }
    fetchAvailability();
  }, []);

  // ✅ Fetch available rooms
  useEffect(() => {
    async function fetchAvailableRooms() {
      if (!formData.checkIn || !formData.checkOut) return;

      setLoadingRooms(true);
      try {
        // A hardcoded URL
        const res = await fetch(`/api/rooms?checkIn=${formData.checkIn}&checkOut=${formData.checkOut}`);
        if (!res.ok) throw new Error('Failed to fetch rooms');
        const data = await res.json();

        const availableRoomsWithQty = data.filter(room => room.quantity > 0);
        setAvailableRooms(availableRoomsWithQty);

        // Set default selectedRoomType if not set
        if (!formData.selectedRoomType && availableRoomsWithQty.length > 0) {
          setFormData(prev => ({ ...prev, selectedRoomType: availableRoomsWithQty[0].type }));
        }

        // Reset roomType if it doesn't belong to selectedRoomType
        if (!availableRoomsWithQty.some(r => r.name === formData.roomType && r.type === formData.selectedRoomType)) {
          const firstRoomOfType = availableRoomsWithQty.find(r => r.type === formData.selectedRoomType);
          setFormData(prev => ({ ...prev, roomType: firstRoomOfType ? firstRoomOfType.name : '' }));
        }
      } catch (err) {
        console.error('❌ Failed to load available rooms:', err);
        setAvailableRooms([]);
      } finally {
        setLoadingRooms(false);
      }
    }
    fetchAvailableRooms();
  }, [formData.checkIn, formData.checkOut, formData.selectedRoomType]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'checkIn') {
      const checkInDate = new Date(value);
      const checkOutDate = new Date(checkInDate);
      checkOutDate.setDate(checkOutDate.getDate() + 1);
      setFormData({ ...formData, checkIn: value, checkOut: checkOutDate.toISOString().split('T')[0] });
    } else if (name === 'checkOut') {
      if (formData.checkIn && new Date(value) <= new Date(formData.checkIn)) {
        alert('Check-out date must be after check-in date.');
        return;
      }
      setFormData({ ...formData, checkOut: value });
    } else if (name === 'selectedRoomType') {
      setFormData(prev => ({ ...prev, selectedRoomType: value, roomType: '' }));
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleDateChange = ({ checkInDate, checkOutDate }) => {
    const checkInStr = checkInDate ? checkInDate.toISOString().split('T')[0] : '';
    const checkOutStr = checkOutDate ? checkOutDate.toISOString().split('T')[0] : '';
    setFormData(prev => ({ ...prev, checkIn: checkInStr, checkOut: checkOutStr }));
  };

  const handleAmenityChange = (id) => {
    setFormData(prev => {
      const selected = prev.selectedAmenities.includes(id)
        ? prev.selectedAmenities.filter(a => a !== id)
        : [...prev.selectedAmenities, id];
      return { ...prev, selectedAmenities: selected };
    });
  };

  const handleRoomSelect = (roomType) => setFormData({ ...formData, roomType });

  const handleNext = () => { if (step < 4) setStep(step + 1); };
  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const selectedRoom = availableRooms.find(r => r.name === formData.roomType);
    if (!selectedRoom) {
      alert('❌ Invalid Room Selection');
      return;
    }

    // Calculate total price
    const pricePerNight = selectedRoom.price || 0;
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const nights = Math.max(1, (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
    const totalPrice = pricePerNight * nights;

    // Create booking via API
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guestName: session.user.name || 'Guest',
        roomId: selectedRoom.id,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        totalPrice,
        amenityIds: formData.selectedAmenities,
        userId: session.user.id,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data.error || 'Booking failed';
      throw new Error(errorMsg);
    }

    // ✅ Store booking details for checkout page
    localStorage.setItem('bookingId', data.booking.id);
    localStorage.setItem('bookingAmount', totalPrice);

    // ✅ Clear saved booking progress after successful booking
    clearBookingProgress();

    // Redirect to checkout page
    window.location.href = '/checkout';

  } catch (err) {
    console.error('❌ Booking Error:', err);
    alert(`❌ Booking Failed: ${err.message}`);
  }
};

  const progressPercent = (step / 4) * 100;

  return (
    <div className="container">
      {/* Booking Card */}
      <div className="booking-card">
        <div className="progress-bar">
          <motion.div className="progress" animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.3 }} />
        </div>
        <h2>Book Your Stay</h2>

        <form onSubmit={handleSubmit}>
          {/* Step 1 - Dates */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
              <div className="form-group">
                <label>Select Dates</label>
                <BookingCalendar availabilityData={availabilityData} onDateChange={handleDateChange} />
              </div>
              <div className="form-group">
                <label>Guests</label>
                <input type="number" name="guests" min="1" value={formData.guests} onChange={handleChange} required />
              </div>
            </motion.div>
          )}

          {/* Step 2 - Rooms */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
              <div className="form-group">
                <label>Select Room Type</label>
                {loadingRooms ? <p>Loading rooms...</p> :
                  availableRooms.length === 0 ? <p>No rooms available for selected dates.</p> :
                  <>
                  {/* Removed dropdown for room types as per user request */}
                  <div className="room-selector">
                    {availableRooms.filter(r => r.name !== 'Beachfront Villa').map(room => (
                      <div key={room.id} className={`room-option ${formData.roomType === room.name ? 'selected' : ''} ${room.quantity === 0 ? 'disabled' : ''}`} onClick={() => room.quantity > 0 && handleRoomSelect(room.name)}>
                        <img src={room.image || '/images/default.jpg'} alt={room.name} />
                        <span>{room.name}</span>
                        {room.quantity === 0 ? <span className="unavailable-label">Fully Booked</span> : <span className="available-count">{room.quantity} left</span>}
                      </div>
                    ))}
                  </div>
                  </>
                }
              </div>
            </motion.div>
          )}

          {/* Step 3 - Amenities */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
              <div className="form-group">
                <label>Select Amenities</label>
                {loadingAmenities ? <p>Loading amenities...</p> :
                  <div className="amenities-selector">
                    {amenities.map(a => (
                      <label key={a.id} className="amenity-item">
                        <input type="checkbox" checked={formData.selectedAmenities.includes(a.id)} onChange={() => handleAmenityChange(a.id)} />
                        {a.name}
                      </label>
                    ))}
                  </div>
                }
              </div>
            </motion.div>
          )}

          {/* Step 4 - Review */}
          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
              <div className="form-group">
                <h3>Review Booking</h3>
                <p><strong>Check-in:</strong> {formData.checkIn}</p>
                <p><strong>Check-out:</strong> {formData.checkOut}</p>
                <p><strong>Guests:</strong> {formData.guests}</p>
                <p><strong>Room:</strong> {formData.roomType}</p>
                <p><strong>Amenities:</strong> {amenities.filter(a => formData.selectedAmenities.includes(a.id)).map(a => a.name).join(', ')}</p>
                <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e0f2fe', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
                  <p><strong>Note:</strong> Upon submission, your room will be held for 15 minutes. You must complete payment within this time to confirm your booking. If payment is not made, the hold will be released automatically.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="navigation-buttons">
            {step > 1 && <button type="button" onClick={handleBack}>Back</button>}
            {step < 4 && <button type="button" onClick={handleNext}>Next</button>}
            {step === 4 && <button type="submit">Submit Booking</button>}
          </div>
        </form>
      </div>

      {/* Styles */}
      <style jsx>{`
        .container { min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; background: linear-gradient(to bottom right, #dbeafe, #bfdbfe); padding: 20px; }
        .booking-card { background: #fff; padding: 40px; border-radius: 15px; box-shadow: 0 8px 16px rgba(0,0,0,0.2); width: 100%; max-width: 600px; }
        .progress-bar { background-color: #e0e0e0; border-radius: 10px; overflow: hidden; height: 10px; margin-bottom: 20px; }
        .progress { height: 100%; background-color: #2563eb; transition: width 0.3s ease-in-out; }
        h2 { text-align: center; color: #2563eb; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #333; }
        input[type="date"], input[type="number"] { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 16px; }
        .room-selector { display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between; }
        .room-option { width: 47%; border: 2px solid #ccc; border-radius: 10px; padding: 10px; cursor: pointer; transition: all 0.3s ease; text-align: center; position: relative; }
        .room-option img { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; }
        .room-option.selected { border-color: #2563eb; background-color: #eff6ff; }
        .room-option.disabled { opacity: 0.5; cursor: not-allowed; }
        .unavailable-label { position: absolute; top: 8px; right: 8px; background-color: #ef4444; color: white; padding: 4px 8px; border-radius: 5px; font-size: 12px; font-weight: bold; }
        .available-count { position: absolute; top: 8px; right: 8px; background-color: #10b981; color: white; padding: 4px 8px; border-radius: 5px; font-size: 12px; font-weight: bold; }
        .amenities-selector { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
        .amenity-item { display: flex; align-items: center; background-color: #f0f8ff; border: 1px solid #cce0ff; border-radius: 8px; padding: 12px 15px; font-weight: 500; color: #333; }
        .amenity-item input[type="checkbox"] { width: 20px; height: 20px; margin-right: 10px; accent-color: #2563eb; }
        .navigation-buttons { display: flex; justify-content: space-between; gap: 10px; }
        button { flex: 1; padding: 12px; font-size: 16px; background-color: #2563eb; color: white; border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; }
        button:hover { background-color: #1d4ed8; transform: scale(1.05); box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2); }
        @media (max-width: 768px) { .room-option { width: 100%; } .amenities-selector { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
