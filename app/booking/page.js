'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import BookingCalendar from '../../components/BookingCalendar';
import RoomAmenitiesSelector from '../../components/RoomAmenitiesSelector'; // Import the new component

export default function BookingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [availableRooms, setAvailableRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [step, setStep] = useState(1);
  const [availabilityData, setAvailabilityData] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);

  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    roomType: '', // This will now store the room *name*
    selectedRoomType: '', // This will store the room *type* enum
    selectedAmenities: { optional: {}, rental: {}, cottage: null },
  });

  // --- Authentication and Progress Restoration (no changes needed here) ---
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirect=/booking');
    }
  }, [status, router]);


  // --- Data Fetching ---
  useEffect(() => {
    // Fetch room availability for the calendar
    async function fetchAvailability() {
      try {
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
        if (res.ok) {
          const data = await res.json();
          setAvailabilityData(data.availability || {});
        }
      } catch (err) { console.error('❌ Failed to load availability:', err); }
    }
    fetchAvailability();
  }, []);

  useEffect(() => {
    // Fetch available rooms when dates change
    async function fetchAvailableRooms() {
      if (!formData.checkIn || !formData.checkOut) return;
      setLoadingRooms(true);
      try {
        const res = await fetch(`/api/rooms?checkIn=${formData.checkIn}&checkOut=${formData.checkOut}`);
        const data = await res.json();
        if (res.ok) {
          setAvailableRooms(data.filter(room => room.quantity > 0));
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

  // --- Price Calculation ---
  useEffect(() => {
    const selectedRoom = availableRooms.find(r => r.name === formData.roomType);
    const roomPrice = selectedRoom ? selectedRoom.price : 0;
    const nights = formData.checkIn && formData.checkOut ? Math.max(1, (new Date(formData.checkOut) - new Date(formData.checkIn)) / (1000 * 60 * 60 * 24)) : 1;

    async function calculateTotal() {
        try {
            const res = await fetch('/api/bookings/calculate-total', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roomPrice,
                    nights,
                    ...formData.selectedAmenities
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
  }, [formData.roomType, formData.selectedAmenities, formData.checkIn, formData.checkOut, availableRooms]);


  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = ({ checkInDate, checkOutDate }) => {
    const checkInStr = checkInDate ? checkInDate.toISOString().split('T')[0] : '';
    const checkOutStr = checkOutDate ? checkOutDate.toISOString().split('T')[0] : '';
    setFormData(prev => ({ ...prev, checkIn: checkInStr, checkOut: checkOutStr }));
  };

  const handleRoomSelect = (room) => {
    setFormData(prev => ({ ...prev, roomType: room.name, selectedRoomType: room.type }));
  };

  const handleAmenitiesChange = (updater) => {
    if (typeof updater === 'function') {
      setFormData(prev => ({ ...prev, selectedAmenities: updater(prev.selectedAmenities) }));
    } else {
      setFormData(prev => ({ ...prev, selectedAmenities: updater }));
    }
  };

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedRoom = availableRooms.find(r => r.name === formData.roomType);
    if (!selectedRoom) {
      alert('❌ Please select a valid room.');
      return;
    }

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: session.user.name || 'Guest',
          roomId: selectedRoom.id,
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
      localStorage.setItem('bookingAmount', data.booking.totalPrice);

      // Redirect to checkout page
      router.push('/checkout');

    } catch (err) {
      console.error('❌ Booking Error:', err);
      alert(`❌ Booking Failed: ${err.message}`);
    }
  };

  if (status === 'loading' || !session) {
    return <div>Loading...</div>;
  }

  const progressPercent = (step / 4) * 100;

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

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="form-group">
                <label>Select Room</label>
                {loadingRooms ? <p>Loading rooms...</p> :
                  availableRooms.length === 0 ? <p>No rooms available for the selected dates.</p> :
                  <div className="room-selector">
                    {availableRooms.map(room => (
                      <div key={room.id} className={`room-option ${formData.roomType === room.name ? 'selected' : ''}`} onClick={() => handleRoomSelect(room)}>
                        <img src={room.image || '/images/default.jpg'} alt={room.name} />
                        <span>{room.name}</span>
                        <span className="available-count">{room.remaining} left</span>
                      </div>
                    ))}
                  </div>
                }
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <RoomAmenitiesSelector 
                    roomType={formData.selectedRoomType}
                    selectedAmenities={formData.selectedAmenities}
                    onAmenitiesChange={handleAmenitiesChange}
                />
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h3>Review Booking</h3>
              <p><strong>Check-in:</strong> {formData.checkIn}</p>
              <p><strong>Check-out:</strong> {formData.checkOut}</p>
              <p><strong>Guests:</strong> {formData.guests}</p>
              <p><strong>Room:</strong> {formData.roomType}</p>
              <p><strong>Total Price:</strong> ₱{totalPrice.toLocaleString()}</p>
              <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e0f2fe', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
                <p><strong>Note:</strong> Upon submission, your room will be held for 15 minutes. You must complete payment within this time to confirm your booking.</p>
              </div>
            </motion.div>
          )}

          <div className="navigation-buttons">
            {step > 1 && <button type="button" onClick={handleBack}>Back</button>}
            {step < 4 && <button type="button" onClick={handleNext} disabled={!formData.checkIn || (step === 2 && !formData.roomType)}>Next</button>}
            {step === 4 && <button type="submit">Submit Booking</button>}
          </div>
        </form>
      </div>

      {/* Styles */}
      <style jsx>{`
        .container { min-height: 100vh; display: flex; justify-content: center; align-items: flex-start; background: #f0f4f8; padding: 20px; }
        .booking-card { background: #fff; padding: 40px; border-radius: 15px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); width: 100%; max-width: 700px; }
        .progress-bar { background-color: #e0e0e0; border-radius: 10px; overflow: hidden; height: 10px; margin-bottom: 20px; }
        .progress { height: 100%; background-color: #2563eb; transition: width 0.3s ease-in-out; }
        h2, h3 { text-align: center; color: #1e3a8a; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #334155; }
        input[type="number"] { width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 8px; font-size: 16px; }
        .room-selector { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
        .room-option { border: 2px solid #d1d5db; border-radius: 10px; padding: 10px; cursor: pointer; transition: all 0.3s ease; text-align: center; position: relative; }
        .room-option img { width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; }
        .room-option.selected { border-color: #2563eb; background-color: #eff6ff; box-shadow: 0 0 0 3px #bfdbfe; }
        .available-count { position: absolute; top: 8px; right: 8px; background-color: #10b981; color: white; padding: 4px 8px; border-radius: 99px; font-size: 12px; font-weight: bold; }
        .navigation-buttons { display: flex; justify-content: space-between; gap: 10px; margin-top: 20px; }
        button { flex: 1; padding: 14px; font-size: 16px; font-weight: 600; background-color: #2563eb; color: white; border: none; border-radius: 10px; cursor: pointer; transition: all 0.3s ease; }
        button:hover:not(:disabled) { background-color: #1d4ed8; transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15); }
        button:disabled { background-color: #9ca3af; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
