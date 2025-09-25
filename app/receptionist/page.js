'use client';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import './receptionist-styles.css';

export default function ReceptionistDashboard() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    guestName: '',
    checkIn: '',
    checkOut: '',
    roomId: '',
    amenityIds: [],
  });
  const [allRooms, setAllRooms] = useState([]);
  const [allAmenities, setAllAmenities] = useState({
    inventory: [],
    optional: [],
    rental: []
  });

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
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

  const handleCreateWalkInBooking = async (e) => {
    e.preventDefault();
    if (!newBooking.guestName || !newBooking.checkIn || !newBooking.checkOut || !newBooking.roomId) {
      alert("Please fill in all required fields: Guest Name, Check-in/out Dates, and Room.");
      return;
    }
    
    // Ensure guestName is not an empty string
    const guestName = newBooking.guestName.trim();
    if (guestName === '') {
      alert("Guest Name cannot be empty.");
      return;
    }
    
    const checkInDate = new Date(newBooking.checkIn).toISOString();
    const checkOutDate = new Date(newBooking.checkOut).toISOString();

    try {
      const payload = {
        guestName: guestName,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        roomId: newBooking.roomId,
        amenityIds: newBooking.amenityIds,
        status: 'Confirmed',
        paymentStatus: 'Pending',
      };
      
      // Log the payload to debug before sending
      console.log('Sending payload:', payload);

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Handle cases where the server returns a non-JSON error
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server returned an error:', res.status, errorText);
        throw new Error('Failed to create walk-in booking');
      }

      const responseBody = await res.json();
      
      alert(`Booking for ${guestName} created successfully.`);
      setIsModalOpen(false);
      setNewBooking({ guestName: '', checkIn: '', checkOut: '', roomId: '', amenityIds: [] });
      await fetchBookings();
      await fetchRooms();
    } catch (error) {
      console.error('Error creating walk-in booking:', error);
      alert('Failed to create walk-in booking.');
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchAmenities();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (newBooking.checkIn && newBooking.checkOut) {
      fetchRooms(newBooking.checkIn, newBooking.checkOut);
    } else {
      fetchRooms();
    }
  }, [newBooking.checkIn, newBooking.checkOut]);


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
              setIsModalOpen(true);
              fetchRooms();
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">New Walk-In Booking</h2>
              <button onClick={() => setIsModalOpen(false)} className="modal-close-button">&times;</button>
            </div>
            <form onSubmit={handleCreateWalkInBooking}>
              <div className="form-group">
                <label className="form-label">Guest Name:</label>
                <input
                  type="text"
                  className="form-input"
                  value={newBooking.guestName}
                  onChange={(e) => setNewBooking({ ...newBooking, guestName: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Check-in Date:</label>
                <input
                  type="date"
                  className="form-input"
                  value={newBooking.checkIn}
                  onChange={(e) => setNewBooking({ ...newBooking, checkIn: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Check-out Date:</label>
                <input
                  type="date"
                  className="form-input"
                  value={newBooking.checkOut}
                  onChange={(e) => setNewBooking({ ...newBooking, checkOut: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Select Room:</label>
                <select
                  className="form-input"
                  value={newBooking.roomId}
                  onChange={(e) => setNewBooking({ ...newBooking, roomId: e.target.value })}
                  required
                >
                  <option value="">-- Select an Available Room --</option>
                  {allRooms.map(room => (
                    <option key={room.id} value={room.id} disabled={!room.available}>
                      {room.name} ({room.type}) - ({room.remaining} available)
                    </option>
                  ))}
                </select>
              </div>
              {/* Optional Amenities Section */}
              <div className="form-group">
                <label className="form-label">Optional Amenities (Extra/Optional):</label>
                <div className="checkbox-container">
                  {allAmenities.optional.map(amenity => (
                    <label key={`optional-${amenity.id}`} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newBooking.amenityIds.includes(amenity.id)}
                        onChange={(e) => {
                          const { checked } = e.target;
                          setNewBooking(prev => {
                            const updatedAmenities = checked
                              ? [...prev.amenityIds, amenity.id]
                              : prev.amenityIds.filter(id => id !== amenity.id);
                            return { ...prev, amenityIds: updatedAmenities };
                          });
                        }}
                      />
                      {amenity.name} {amenity.description && `(${amenity.description})`}
                    </label>
                  ))}
                </div>
              </div>

              {/* Rental Amenities Section */}
              <div className="form-group">
                <label className="form-label">Rental Amenities (Paid per use):</label>
                <div className="checkbox-container">
                  {allAmenities.rental.map(amenity => (
                    <label key={`rental-${amenity.id}`} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newBooking.amenityIds.includes(amenity.id)}
                        onChange={(e) => {
                          const { checked } = e.target;
                          setNewBooking(prev => {
                            const updatedAmenities = checked
                              ? [...prev.amenityIds, amenity.id]
                              : prev.amenityIds.filter(id => id !== amenity.id);
                            return { ...prev, amenityIds: updatedAmenities };
                          });
                        }}
                      />
                      {amenity.name} - ₱{Math.floor(amenity.pricePerUnit/100)}/{amenity.unitType}
                      {amenity.description && ` (${amenity.description})`}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="form-button">Create Booking</button>
            </form>
          </div>
        </div>
      )}

      <div className="section-container">
        <div className="section-card">
          <h2 className="section-title">
            Upcoming Reservations ({upcomingReservations.length})
          </h2>
          <div className="guest-list-container">
            {upcomingReservations.map((guest) => (
              <div key={guest.id} className="guest-card">
                <div>
                  <p className="guest-name">{guest.guestName}</p>
                  <p className="guest-details">Check-in: {new Date(guest.checkIn).toLocaleDateString()}</p>
                </div>
                <button
                  className="check-in-button green"
                  onClick={() => handleCheckIn(guest.id)}>
                  Confirm
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card">
          <h2 className="section-title">
            Current Guests ({currentGuests.length})
          </h2>
          <div className="guest-list-container">
            {currentGuests.map((guest) => (
              <div key={guest.id} className="guest-card">
                <div>
                  <p className="guest-name">{guest.guestName}</p>
                  <p className="guest-details">Check-in: {new Date(guest.checkIn).toLocaleDateString()}</p>
                </div>
                <button
                  className="check-out-button red"
                  onClick={() => handleCheckOut(guest.id)}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}