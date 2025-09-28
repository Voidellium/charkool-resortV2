'use client';
import React, { useState, useEffect } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch bookings
  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/bookings', { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      setBookings(data);
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
      setMessage({ type: 'error', text: 'Failed to load bookings' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        setBookings(bookings.filter(b => b.id !== id));
        setMessage({ type: 'success', text: 'Booking deleted successfully.' });
      } else {
        throw new Error('Delete failed');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to delete booking' });
    } finally {
      setLoading(false);
    }
  };

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
        throw new Error('Status update failed');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to update booking status' });
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings
    .filter(b => filterStatus ? b.status === filterStatus : true)
    .filter(b => filterPaymentStatus ? b.paymentStatus === filterPaymentStatus : true)
    .filter(b => b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 (b.room && b.room.roomNumber.toString().includes(searchQuery)));

  return (
    <SuperAdminLayout activePage="bookings">
      <div style={{ maxWidth: 'none', margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '2rem', fontWeight: 'bold' }}>Booking Management</h1>

        {/* Feedback Message */}
        {message && (
          <div
            role="alert"
            style={{
              padding: '12px 20px',
              marginBottom: '20px',
              borderRadius: '8px',
              backgroundColor: message.type === 'error' ? '#f8d7da' : '#d4edda',
              color: message.type === 'error' ? '#721c24' : '#155724',
              transition: 'all 0.3s ease',
            }}
          >
            {message.text}
          </div>
        )}

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '15px',
            borderRadius: '8px',
            background: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          {/* Filter Status */}
          <select
            aria-label="Filter by status"
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              minWidth: '150px',
            }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="CheckedIn">Checked In</option>
            <option value="CheckedOut">Checked Out</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {/* Filter Payment Status */}
          <select
            aria-label="Filter by payment status"
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              minWidth: '150px',
            }}
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
          >
            <option value="">All Payment Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Refunded">Refunded</option>
          </select>

          {/* Search Input */}
          <input
            aria-label="Search bookings"
            type="text"
            placeholder="Search by guest name or room number"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
        </div>

        {/* Bookings Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={{ padding: '12px', border: '1px solid #ccc', position  : 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Guest Name</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Check-in</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Check-out</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Room</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Status</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Payment Status</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Total Price</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '12px', textAlign: 'center' }}>No bookings found</td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} style={{ transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f1f1')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.guestName}</td>
                    <td style={{ padding: '12px', border: '1px solid #ccc' }}>{new Date(booking.checkIn).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', border: '1px solid #ccc' }}>{new Date(booking.checkOut).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.room ? booking.room.roomNumber : 'N/A'}</td>
                    <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.status}</td>
                    <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.paymentStatus}</td>
                    <td style={{ padding: '12px', border: '1px solid #ccc' }}>₱{booking.totalPrice}</td>
                    {/* Action buttons */}
                    <td style={{ padding: '12px', border: '1px solid #ccc', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Confirm Button */}
                      {booking.status !== 'Confirmed' && booking.status !== 'CheckedIn' && booking.status !== 'CheckedOut' && (
                        <button
                          aria-label={`Confirm booking for ${booking.guestName}`}
                          onClick={() => handleStatusChange(booking.id, 'Confirmed')}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#28a745',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#218838';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#28a745';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          }}
                        >
                          ✓ Confirm
                        </button>
                      )}
                      {/* Cancel Button */}
                      {booking.status !== 'Cancelled' && booking.status !== 'CheckedIn' && booking.status !== 'CheckedOut' && (
                        <button
                          aria-label={`Cancel booking for ${booking.guestName}`}
                          onClick={() => handleStatusChange(booking.id, 'Cancelled')}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: '#ffc107',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#e0a800';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#ffc107';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                          }}
                        >
                          ✕ Cancel
                        </button>
                      )}
                      {/* Delete Button */}
                      <button
                        aria-label={`Delete booking for ${booking.guestName}`}
                        onClick={() => handleDelete(booking.id)}
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
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
