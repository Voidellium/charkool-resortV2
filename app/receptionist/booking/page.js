'use client';
import { useEffect, useState } from 'react';

export default function ReceptionistBookingList() {
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterRoom, setFilterRoom] = useState('All');
  const [sortBy, setSortBy] = useState('Check-in');
  const [loading, setLoading] = useState(true);

  // Add booking states
  const [showForm, setShowForm] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [guestName, setGuestName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Add manual refresh handler
  const handleRefresh = () => {
    fetchAllData();
  };

  async function fetchAllData() {
    await Promise.all([fetchBookings(), fetchRooms(), fetchAmenities()]);
  }

  async function fetchBookings() {
    try {
      const res = await fetch('http://localhost:3000/api/bookings');
      const data = await res.json();
      setBookings(data || []);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchRooms() {
    try {
      const res = await fetch('http://localhost:3000/api/rooms');
      const data = await res.json();
      setRooms(data || []);
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  }

  async function fetchAmenities() {
    try {
      const res = await fetch('http://localhost:3000/api/amenities/inventory');
      const data = await res.json();
      setAmenities(data || []);
    } catch (err) {
      console.error('Failed to fetch amenities:', err);
    }
  }

  // === Booking actions ===
  async function handleConfirm(id) {
    await fetch(`http://localhost:3000/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' }),
    });
    fetchBookings();
  }

  async function handleCancel(id) {
    await fetch(`http://localhost:3000/api/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    });
    fetchBookings();
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    await fetch(`http://localhost:3000/api/bookings/${id}`, { method: 'DELETE' });
    fetchBookings();
  }

  async function handleAddBooking(e) {
    e.preventDefault();

    // Validate room availability
    const room = rooms.find((r) => r.id === parseInt(roomId));
    const availableRooms = rooms.filter((r) => {
      if (!checkIn || !checkOut) return true;
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      return !bookings.some((b) => {
        if (b.roomId !== r.id || b.status === 'cancelled') return false;
        const bCheckIn = new Date(b.checkIn);
        const bCheckOut = new Date(b.checkOut);
        return checkInDate < bCheckOut && checkOutDate > bCheckIn;
      });
    });

    if (!room || !availableRooms.includes(room)) {
      return alert('Selected room is not available for the chosen dates.');
    }

    try {
      await fetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: guestName || 'Walk-in Guest',
          roomId: parseInt(roomId),
          checkIn,
          checkOut,
          amenityIds: selectedAmenities,
          totalPrice: parseFloat(totalPrice || 0),
        }),
      });

      // Reset form
      setShowForm(false);
      setGuestName('');
      setRoomId('');
      setCheckIn('');
      setCheckOut('');
      setTotalPrice('');
      setSelectedAmenities([]);

      fetchBookings();
    } catch (err) {
      console.error('Error adding booking:', err);
    }
  }

  // === Derived filtered + sorted bookings ===
  const filtered = bookings
    .filter((b) => b.guestName?.toLowerCase().includes(search.toLowerCase()))
    .filter((b) => filterStatus === 'All' || b.status.toLowerCase() === filterStatus.toLowerCase())
    .filter((b) => filterRoom === 'All' || b.room?.name === filterRoom)
    .sort((a, b) => {
      const aDate = new Date(a.checkIn);
      const bDate = new Date(b.checkIn);
      return sortBy === 'Check-in' ? aDate - bDate : bDate - aDate;
    });

  if (loading) return <p>Loading...</p>;

  // Compute available rooms for form dropdown
  const availableRoomsForForm = rooms.filter((r) => {
    if (!checkIn || !checkOut) return true;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    return !bookings.some((b) => {
      if (b.roomId !== r.id || b.status === 'cancelled') return false;
      const bCheckIn = new Date(b.checkIn);
      const bCheckOut = new Date(b.checkOut);
      return checkInDate < bCheckOut && checkOutDate > bCheckIn;
    });
  });

  return (
    <div style={{ padding: '20px' }}>
      <h2>Receptionist – Booking Management</h2>

      {/* Refresh button */}
      <button onClick={handleRefresh} style={{ marginBottom: '1rem', marginRight: '1rem' }}>
        🔄 Refresh
      </button>

      {/* Add booking form toggle */}
      <button onClick={() => setShowForm(!showForm)} style={{ marginBottom: '1rem' }}>
        {showForm ? 'Close Form' : '➕ Add Booking'}
      </button>

      {showForm && (
        <form
          onSubmit={handleAddBooking}
          style={{
            margin: '1rem 0',
            padding: '1rem',
            border: '1px solid #ccc',
            borderRadius: '6px',
            display: 'grid',
            gap: '0.75rem',
            maxWidth: '500px',
          }}
        >
          <label>Guest Name:</label>
          <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Walk-in Guest" />

          <label>Room:</label>
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)} required>
            <option value="">Select Room</option>
            {availableRoomsForForm.length > 0 ? (
              availableRoomsForForm.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))
            ) : (
              <option value="">No rooms available for selected dates</option>
            )}
          </select>

          <label>Check-in:</label>
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required />

          <label>Check-out:</label>
          <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} required />

          <label>Amenities:</label>
          {amenities.map((a) => (
            <label key={a.id} style={{ display: 'block' }}>
              <input
                type="checkbox"
                value={a.id}
                checked={selectedAmenities.includes(a.id)}
                onChange={(e) => {
                  const id = parseInt(e.target.value);
                  setSelectedAmenities((prev) =>
                    e.target.checked ? [...prev, id] : prev.filter((x) => x !== id)
                  );
                }}
              />
              {a.name} ({a.quantity} available)
            </label>
          ))}

          <label>Total Price:</label>
          <input type="number" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} />

          <button type="submit">Save Booking</button>
        </form>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="🔍 Search by Guest Name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option>All</option>
          <option>Pending</option>
          <option>Confirmed</option>
          <option>Cancelled</option>
        </select>
        <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
          <option>All</option>
          {rooms.map((room) => (
            <option key={room.id}>{room.name}</option>
          ))}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option>Check-in</option>
          <option>Check-out</option>
        </select>
      </div>

      {/* Booking table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Guest</th>
            <th>Room</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Amenities</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length > 0 ? (
            filtered.map((b) => (
              <tr key={b.id}>
                <td>{b.id}</td>
                <td>{b.guestName}</td>
                <td>{b.room?.name}</td>
                <td>{new Date(b.checkIn).toLocaleDateString()}</td>
                <td>{new Date(b.checkOut).toLocaleDateString()}</td>
                <td>
                  {b.amenities?.length > 0
                    ? b.amenities.map((a) => a.amenity.name).join(', ')
                    : '—'}
                </td>
                <td>
                  <span
                    style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      color: '#fff',
                      background:
                        b.status === 'confirmed'
                          ? 'green'
                          : b.status === 'cancelled'
                          ? 'red'
                          : 'orange',
                    }}
                  >
                    {b.status}
                  </span>
                </td>
                <td>{b.paymentStatus || 'unpaid'}</td>
                <td>
                  <button onClick={() => handleConfirm(b.id)}>Confirm</button>{' '}
                  <button onClick={() => handleCancel(b.id)}>Cancel</button>{' '}
                  <button onClick={() => handleDelete(b.id)}>Delete</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="9" style={{ textAlign: 'center' }}>No bookings found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
