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
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState('');
  const [currentBooking, setCurrentBooking] = useState(null);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyBookingDetails, setHistoryBookingDetails] = useState(null);
  const [currentTab, setCurrentTab] = useState('active');

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

  const handleCancelWithRemarks = async (id, remarks) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Cancelled', cancellationRemarks: remarks }),
      });
      if (res.ok) {
        const updatedBooking = await res.json();
        setBookings(bookings.map(b => b.id === id ? updatedBooking : b));
        setMessage({ type: 'success', text: 'Booking cancelled successfully.' });
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Cancellation failed');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: `Failed to cancel booking: ${err.message}` });
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

        {/* Tabs */}
        <div style={{ display: 'flex', marginBottom: '20px' }}>
          <button
            onClick={() => setCurrentTab('active')}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: currentTab === 'active' ? '#007bff' : '#f8f9fa',
              color: currentTab === 'active' ? '#fff' : '#000',
              cursor: 'pointer',
              borderRadius: '4px 0 0 4px',
            }}
          >
            Active Bookings
          </button>
          <button
            onClick={() => setCurrentTab('history')}
            style={{
              padding: '10px 20px',
              border: 'none',
              backgroundColor: currentTab === 'history' ? '#007bff' : '#f8f9fa',
              color: currentTab === 'history' ? '#fff' : '#000',
              cursor: 'pointer',
              borderRadius: '0 4px 4px 0',
            }}
          >
            History
          </button>
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
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Booking Status</th>
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
              ) : currentTab === 'active' ? (
                filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '12px', textAlign: 'center' }}>No active bookings found</td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} style={{ transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f1f1')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.guestName}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.rooms && Array.isArray(booking.rooms) && booking.rooms.length > 0 ? booking.rooms.map(r => r.room.name).join(', ') : 'N/A'}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.status}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>
                        {(() => {
                          const totalPaid = Number(booking.totalPaid) || 0;
                          const balancePaid = Number(booking.balancePaid) || 0;
                          const paymentOption = booking.paymentOption || 'Unpaid';
                          const paymentMethods = booking.paymentMethods || [];
                          const amountPaid = (totalPaid / 10000).toFixed(0);
                          const amountDue = (balancePaid / 10000).toFixed(0);
                          return (
                            <>
                              <div><strong>Payment Option:</strong> {paymentOption}</div>
                              <div><strong>Payment Method:</strong> {paymentMethods.join(', ') || 'N/A'}</div>
                              <div><strong>Paid:</strong> ₱{amountPaid}</div>
                              <div><strong>Due:</strong> ₱{amountDue}</div>
                            </>
                          );
                        })()}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>₱{(Number(booking.totalCostWithAddons || booking.totalPrice) / 100).toFixed(0)}</td>
                      <td style={{ padding: '12px', border: '1px solid #ccc', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                        {booking.status !== 'Cancelled' && booking.status !== 'CheckedIn' && booking.status !== 'CheckedOut' && (
                          <button
                            aria-label={`Cancel booking for ${booking.guestName}`}
                            onClick={() => {
                              setCurrentBooking(booking);
                              setShowCancelModal(true);
                            }}
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
                      <td style={{ padding: '12px', border: '1px solid #ccc' }}>{booking.paymentStatus}</td>
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
                            backgroundColor: '#17a2b8',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#138496';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#17a2b8';
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
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: '#fff',
                padding: '20px',
                borderRadius: '8px',
                width: '400px',
                maxWidth: '90%',
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

        {/* History Details Modal */}
        {showHistoryModal && historyBookingDetails && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                backgroundColor: '#fff',
                padding: '20px',
                borderRadius: '8px',
                width: '600px',
                maxWidth: '90%',
                maxHeight: '80%',
                overflowY: 'auto',
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
