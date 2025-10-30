'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useNavigationGuard } from '../../../hooks/useNavigationGuard.simple';
import { NavigationConfirmationModal } from '../../../components/CustomModals';
import BookingCalendar from '../../../components/BookingCalendar';
import PromotionPopup from '../../../components/PromotionPopup';

// Modal Component
const Modal = ({ show, onClose, children }) => {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <div className="modal-scroll-content">
          {children}
        </div>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.75);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
        }
        .close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: #666;
        }
        .close-btn:hover {
          color: #000;
        }
        .modal-scroll-content {
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
};

// Portal Modal Component
const PortalModal = ({ show, onClose, children }) => {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        <div className="modal-scroll-content">
          {children}
        </div>
      </div>
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          background-color: rgba(0, 0, 0, 0.75);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          max-width: 600px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          position: relative;
        }
        .close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: transparent;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: #666;
        }
        .close-btn:hover {
          color: #000;
        }
        .modal-scroll-content {
          margin-top: 1rem;
        }
        .modal-details-content p {
          margin: 0.75rem 0;
          font-size: 1rem;
          color: #333;
        }
      `}</style>
    </div>
  );
};

// Reschedule Modal Content Component
function RescheduleModalContent({ booking, guest }) {
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState(null); // 'pending', 'success', 'error'
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedDates, setSelectedDates] = useState({ checkInDate: null, checkOutDate: null });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDates.checkInDate || !selectedDates.checkOutDate) {
      setStatus('error');
      setInfo('Please select both check-in and check-out dates.');
      return;
    }
    if (!reason.trim()) {
      setStatus('error');
      setInfo('Please provide a reason for rescheduling.');
      return;
    }
    setSubmitting(true);
    setStatus('pending');
    try {
      const res = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn: selectedDates.checkInDate,
          checkOut: selectedDates.checkOutDate,
          context: reason,
          guestId: guest?.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setStatus('success');
        setInfo('Reschedule request submitted successfully!');
      } else {
        let errorMsg = 'Failed to submit reschedule request.';
        try {
          const errorData = await res.json();
          errorMsg = errorData.error || errorData.message || errorMsg;
        } catch {}
        setStatus('error');
        setInfo(errorMsg);
      }
    } catch (err) {
      console.error('Reschedule submission error:', err);
      setStatus('error');
      setInfo('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Request Reschedule</h2>
      <div style={{
        background: 'linear-gradient(135deg, #febe52 0%, #ebd591 100%)',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        color: '#6b4700',
        fontWeight: 500
      }}>
        <span>Policy: Reschedule is allowed 2 weeks prior of the check-in date. No-shows are considered forfeited.</span>
      </div>
      <div style={{ marginBottom: '1.5rem' }}>
        <BookingCalendar onDateChange={setSelectedDates} />
      </div>
      <p>Booking ID: {booking.id} ({booking.rooms && booking.rooms[0] ? booking.rooms[0].room.name : 'N/A'})</p>
      <p>Original Dates: {new Date(booking.checkIn).toLocaleDateString()} to {new Date(booking.checkOut).toLocaleDateString()}</p>
      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <label htmlFor="reschedule-reason" style={{ fontWeight: 500 }}>Reason for reschedule:</label>
        <textarea
          id="reschedule-reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          style={{ width: '100%', marginTop: 8, marginBottom: 8, borderRadius: 4, border: '1px solid #ccc', padding: 8 }}
          placeholder="Please explain why you need to reschedule..."
          disabled={submitting || status === 'success'}
        />
        <button
          type="submit"
          className="submit-request-btn"
          disabled={submitting || status === 'success'}
          style={{ marginTop: 8 }}
        >
          {submitting ? "Submitting..." : status === 'success' ? "Submitted" : "Submit Request"}
        </button>
      </form>
      {status === 'success' && (
        <div style={{ color: 'green', marginTop: 12 }}>{info}</div>
      )}
      {status === 'error' && (
        <div style={{ color: 'red', marginTop: 12 }}>{info}</div>
      )}
      <style jsx>{`
        .submit-request-btn {
          width: 100%;
          padding: 0.8rem;
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
          font-weight: 600;
          transition: background-color 0.3s ease;
        }
        .submit-request-btn:hover:not(:disabled) {
          background-color: #218838;
        }
        .submit-request-btn:disabled {
          background-color: #6c757d;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// Unified Details Modal Component
const UnifiedDetailsModal = ({ booking, guest }) => {
  const [fullBookingDetails, setFullBookingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchFullDetails() {
      try {
        setLoading(true);
        const res = await fetch(`/api/bookings/${booking.id}`);
        if (res.ok) {
          const data = await res.json();
          setFullBookingDetails(data);
        } else {
          throw new Error('Failed to fetch detailed booking information');
        }
      } catch (err) {
        console.error('Error fetching full booking details:', err);
        setError(err.message);
        setFullBookingDetails(booking); // Fallback to existing data
      } finally {
        setLoading(false);
      }
    }

    fetchFullDetails();
  }, [booking.id, booking]);

  const handleDownloadReceipt = (receiptUrl) => {
    if (receiptUrl) {
      window.open(receiptUrl, '_blank');
    } else {
      alert('Receipt not available for this payment.');
    }
  };

  const handlePrintDetails = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="modal-loading">
        <div className="loading-spinner"></div>
        <p>Loading booking details...</p>
        <style jsx>{`
          .modal-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 2rem;
            color: #8B4513;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #F4E4BC;
            border-top: 3px solid #FEBE52;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const details = fullBookingDetails || booking;
  const totalAmount = details.payments?.reduce((sum, p) => (p.status === 'Paid' || p.status === 'Reservation') ? sum + Number(p.amount) : sum, 0) || 0;
  
  // Calculate total from all components to ensure rental amenities are included
  const reservationFee = (details.rooms?.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) || 0) * 2000;
  const roomCharges = (details.rooms || []).reduce((sum, roomBooking) => {
    const nights = Math.ceil((new Date(details.checkOut) - new Date(details.checkIn)) / (1000 * 60 * 60 * 24));
    const roomPricePerNight = (Number(roomBooking.room?.price) || 0) / 100;
    const roomTotal = roomPricePerNight * (Number(roomBooking.quantity) || 0) * nights;
    const roomReservationFee = (Number(roomBooking.quantity) || 0) * 2000;
    return sum + (roomTotal - roomReservationFee);
  }, 0);
  const rentalTotal = (details.rentalAmenities || []).reduce((sum, rental) => sum + ((Number(rental.totalPrice) || 0) / 100), 0);
  const optionalTotal = (details.optionalAmenities || []).reduce((sum, optional) => {
    const amenityPrice = (Number(optional.optionalAmenity?.price) || 0) / 100;
    return sum + (amenityPrice * (Number(optional.quantity) || 0));
  }, 0);
  const cottageTotal = (details.cottage || []).reduce((sum, cottageBooking) => sum + ((Number(cottageBooking.totalPrice) || 0) / 100), 0);
  const calculatedTotal = reservationFee + roomCharges + rentalTotal + optionalTotal + cottageTotal;
  const totalPrice = calculatedTotal;
  const remainingBalance = calculatedTotal - (totalAmount / 100);
  
  const room = details.rooms?.[0]?.room;
  const isCancelled = String(details.status).toLowerCase() === 'cancelled';

  return (
    <div className="unified-modal">
      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <div className="cancellation-banner">
          <div className="banner-icon">⚠️</div>
          <div className="banner-content">
            <h3>Booking Cancelled</h3>
            <p>This booking has been cancelled and is no longer active.</p>
          </div>
        </div>
      )}

      <div className="modal-header">
        <h2>{isCancelled ? 'Cancelled Booking Details' : 'Booking & Payment Details'}</h2>
        <div className="modal-actions">
          <button className="action-btn secondary" onClick={handlePrintDetails}>
            🖨️ Print
          </button>
        </div>
      </div>

      {error && (
        <div className="error-notice">
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="details-container">
        {/* Reschedule Policy */}
        {!isCancelled && (
          <div className="details-section">
            <h3>📋 Reschedule Policy</h3>
            <div className="policy-note">
              <p>
                <strong>Reschedule Policy:</strong> Bookings can only be rescheduled up to 2 weeks before the check-in date.
              </p>
            </div>
          </div>
        )}

        {/* Guest Information */}
        {!isCancelled && (
          <div className="details-section">
            <h3>👤 Guest Information</h3>
            <div className="details-grid">
              <div className="detail-item">
                <span className="label">Name</span>
                <span className="value">{guest ? `${guest.firstName} ${guest.lastName}` : 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Email</span>
                <span className="value">{guest?.email || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="label">Contact Number</span>
                <span className="value">{guest?.contactNumber || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Booking Information */}
        <div className="details-section">
          <h3>🏨 Accommodation Details</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">Room</span>
              <span className="value">{room ? `${room.name} - ${room.type}` : 'N/A'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Check-in</span>
              <span className="value">
                {new Date(details.checkIn).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} at 2:00 PM
              </span>
            </div>
            <div className="detail-item">
              <span className="label">Check-out</span>
              <span className="value">
                {new Date(details.checkOut).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} at 12:00 PM
              </span>
            </div>
            {!isCancelled && (
              <div className="detail-item">
                <span className="label">Number of Guests</span>
                <span className="value">{details.guests} {details.guests === 1 ? 'guest' : 'guests'}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="label">Booking Status</span>
              <span className={`value status-${details.status.toLowerCase()}`}>{details.status}</span>
            </div>
            <div className="detail-item">
              <span className="label">{isCancelled ? 'Originally Booked' : 'Booking Date'}</span>
              <span className="value">
                {new Date(details.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} at {new Date(details.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
            {isCancelled && details.updatedAt && (
              <div className="detail-item">
                <span className="label">Cancelled On</span>
                <span className="value cancellation-date">
                  {new Date(details.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} at {new Date(details.updatedAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cancellation Details - Only show for cancelled bookings */}
        {isCancelled && details.cancellationRemarks && (
          <div className="details-section cancellation-section">
            <h3>📝 Cancellation Information</h3>
            <div className="cancellation-remarks">
              <div className="remarks-label">Reason for Cancellation:</div>
              <div className="remarks-text">{details.cancellationRemarks}</div>
            </div>
          </div>
        )}

        {/* Payment Information with Breakdown */}
        <div className="details-section">
          <h3>💳 {isCancelled ? 'Payment Summary' : 'Payment Details'}</h3>
          
          {isCancelled ? (
            <div className="payment-summary">
              <div className="summary-row">
                <span className="label">Reservation Amount Paid</span>
                <span className="value amount">₱{(totalAmount / 100).toFixed(2)}</span>
              </div>
              <div className="cancellation-notice">
                <p><strong>Note:</strong> Reservation payments are non-refundable as per our cancellation policy.</p>
              </div>
            </div>
          ) : (
            <div className="breakdown-container">
              {/* Payment Breakdown */}
              <div className="breakdown-list">
                {/* Reservation Fee */}
                <div className="breakdown-item">
                  <span className="breakdown-label">
                    Reservation Fee ({details.rooms?.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) || 0} room{details.rooms?.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) > 1 ? 's' : ''} × ₱2,000)
                  </span>
                  <span className="breakdown-value">
                    ₱{((details.rooms?.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) || 0) * 2000).toLocaleString()}
                  </span>
                </div>

                {/* Room Charges */}
                {details.rooms && details.rooms.length > 0 && (
                  <>
                    {details.rooms.map((roomBooking, idx) => {
                      const nights = Math.ceil((new Date(details.checkOut) - new Date(details.checkIn)) / (1000 * 60 * 60 * 24));
                      const roomPricePerNight = (Number(roomBooking.room?.price) || 0) / 100;
                      const roomTotal = roomPricePerNight * (Number(roomBooking.quantity) || 0) * nights;
                      const reservationFee = (Number(roomBooking.quantity) || 0) * 2000;
                      const roomBalance = roomTotal - reservationFee;
                      
                      return roomBalance > 0 ? (
                        <div key={idx} className="breakdown-item">
                          <span className="breakdown-label">
                            {roomBooking.room?.name} ({roomBooking.quantity} room{roomBooking.quantity > 1 ? 's' : ''} × {nights} night{nights > 1 ? 's' : ''} × ₱{roomPricePerNight.toLocaleString()})
                          </span>
                          <span className="breakdown-value">
                            ₱{roomBalance.toLocaleString()}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </>
                )}

                {/* Rental Amenities */}
                {details.rentalAmenities && details.rentalAmenities.length > 0 && (
                  <>
                    {details.rentalAmenities.map((rental, idx) => (
                      <div key={idx} className="breakdown-item">
                        <span className="breakdown-label">
                          {rental.rentalAmenity?.name} ({rental.quantity} × ₱{((Number(rental.totalPrice) || 0) / 100 / rental.quantity).toLocaleString()})
                        </span>
                        <span className="breakdown-value">
                          ₱{((Number(rental.totalPrice) || 0) / 100).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {/* Optional Amenities */}
                {details.optionalAmenities && details.optionalAmenities.length > 0 && (
                  <>
                    {details.optionalAmenities.map((optional, idx) => {
                      const amenityPrice = (Number(optional.optionalAmenity?.price) || 0) / 100;
                      const amenityTotal = amenityPrice * (Number(optional.quantity) || 0);
                      return amenityTotal > 0 ? (
                        <div key={idx} className="breakdown-item">
                          <span className="breakdown-label">
                            {optional.optionalAmenity?.name} ({optional.quantity} × ₱{amenityPrice.toLocaleString()})
                          </span>
                          <span className="breakdown-value">
                            ₱{amenityTotal.toLocaleString()}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </>
                )}

                {/* Cottage */}
                {details.cottage && details.cottage.length > 0 && (
                  <>
                    {details.cottage.map((cottageBooking, idx) => (
                      <div key={idx} className="breakdown-item">
                        <span className="breakdown-label">
                          {cottageBooking.cottage?.name}
                        </span>
                        <span className="breakdown-value">
                          ₱{((Number(cottageBooking.totalPrice) || 0) / 100).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {/* Divider */}
                <div className="breakdown-divider"></div>

                {/* Total */}
                <div className="breakdown-item breakdown-total">
                  <span className="breakdown-label"><strong>Total Amount</strong></span>
                  <span className="breakdown-value"><strong>₱{(() => {
                    const reservationFee = (details.rooms?.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) || 0) * 2000;
                    const roomCharges = (details.rooms || []).reduce((sum, roomBooking) => {
                      const nights = Math.ceil((new Date(details.checkOut) - new Date(details.checkIn)) / (1000 * 60 * 60 * 24));
                      const roomPricePerNight = (Number(roomBooking.room?.price) || 0) / 100;
                      const roomTotal = roomPricePerNight * (Number(roomBooking.quantity) || 0) * nights;
                      const roomReservationFee = (Number(roomBooking.quantity) || 0) * 2000;
                      return sum + (roomTotal - roomReservationFee);
                    }, 0);
                    const rentalTotal = (details.rentalAmenities || []).reduce((sum, rental) => sum + ((Number(rental.totalPrice) || 0) / 100), 0);
                    const optionalTotal = (details.optionalAmenities || []).reduce((sum, optional) => {
                      const amenityPrice = (Number(optional.optionalAmenity?.price) || 0) / 100;
                      return sum + (amenityPrice * (Number(optional.quantity) || 0));
                    }, 0);
                    const cottageTotal = (details.cottage || []).reduce((sum, cottageBooking) => sum + ((Number(cottageBooking.totalPrice) || 0) / 100), 0);
                    return (reservationFee + roomCharges + rentalTotal + optionalTotal + cottageTotal).toLocaleString();
                  })()}</strong></span>
                </div>

                {/* Amount Paid */}
                <div className="breakdown-item breakdown-paid">
                  <span className="breakdown-label">Amount Paid</span>
                  <span className="breakdown-value paid">
                    ₱{(totalAmount / 100).toLocaleString()}
                  </span>
                </div>

                {/* Remaining Balance */}
                {details.paymentStatus !== 'Paid' && (
                  <div className="breakdown-item breakdown-remaining">
                    <span className="breakdown-label"><strong>Remaining Balance</strong></span>
                    <span className="breakdown-value remaining">
                      <strong>₱{(() => {
                        const reservationFee = (details.rooms?.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) || 0) * 2000;
                        const roomCharges = (details.rooms || []).reduce((sum, roomBooking) => {
                          const nights = Math.ceil((new Date(details.checkOut) - new Date(details.checkIn)) / (1000 * 60 * 60 * 24));
                          const roomPricePerNight = (Number(roomBooking.room?.price) || 0) / 100;
                          const roomTotal = roomPricePerNight * (Number(roomBooking.quantity) || 0) * nights;
                          const roomReservationFee = (Number(roomBooking.quantity) || 0) * 2000;
                          return sum + (roomTotal - roomReservationFee);
                        }, 0);
                        const rentalTotal = (details.rentalAmenities || []).reduce((sum, rental) => sum + ((Number(rental.totalPrice) || 0) / 100), 0);
                        const optionalTotal = (details.optionalAmenities || []).reduce((sum, optional) => {
                          const amenityPrice = (Number(optional.optionalAmenity?.price) || 0) / 100;
                          return sum + (amenityPrice * (Number(optional.quantity) || 0));
                        }, 0);
                        const cottageTotal = (details.cottage || []).reduce((sum, cottageBooking) => sum + ((Number(cottageBooking.totalPrice) || 0) / 100), 0);
                        const calculatedTotal = reservationFee + roomCharges + rentalTotal + optionalTotal + cottageTotal;
                        const amountPaid = totalAmount / 100;
                        return (calculatedTotal - amountPaid).toLocaleString();
                      })()}</strong>
                    </span>
                  </div>
                )}

                <div className="breakdown-item breakdown-status">
                  <span className="breakdown-label">Payment Status</span>
                  <span className={`breakdown-value status-${details.paymentStatus.toLowerCase()}`}>{details.paymentStatus}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment Transactions */}
        {!isCancelled && details.payments && details.payments.filter(p => p.status === 'Paid' || p.status === 'Reservation').length > 0 && (
          <div className="details-section">
            <h3>💰 Payment Transactions</h3>
            <div className="payments-list">
              {details.payments.filter(p => p.status === 'Paid' || p.status === 'Reservation').map((payment, index) => (
                <div key={payment.id || index} className="payment-item">
                  <div className="payment-info">
                    <div className="payment-row">
                      <span className="label">Amount</span>
                      <span className="value">₱{(Number(payment.amount) / 100).toFixed(2)}</span>
                    </div>
                    <div className="payment-row">
                      <span className="label">Method</span>
                      <span className="value">{payment.method || 'N/A'}</span>
                    </div>
                    <div className="payment-row">
                      <span className="label">Status</span>
                      <span className={`value status-${payment.status?.toLowerCase() || 'unknown'}`}>
                        {payment.status || 'Unknown'}
                      </span>
                    </div>
                    <div className="payment-row">
                      <span className="label">Date</span>
                      <span className="value">
                        {new Date(payment.createdAt || payment.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                    {payment.referenceId && (
                      <div className="payment-row">
                        <span className="label">Reference ID</span>
                        <span className="value reference-id">{payment.referenceId}</span>
                      </div>
                    )}
                  </div>
                  {payment.receiptUrl && (
                    <button 
                      className="receipt-btn"
                      onClick={() => handleDownloadReceipt(payment.receiptUrl)}
                    >
                      📄 Download Receipt
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .unified-modal {
          max-width: 700px;
          margin: 0 auto;
        }
        
        .cancellation-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
          border: 2px solid #ef4444;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
        }
        
        .banner-icon {
          font-size: 2.5rem;
          line-height: 1;
        }
        
        .banner-content h3 {
          color: #dc2626;
          margin: 0 0 0.25rem 0;
          font-size: 1.25rem;
          font-weight: 700;
        }
        
        .banner-content p {
          color: #991b1b;
          margin: 0;
          font-size: 0.95rem;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #F4E4BC;
        }
        
        .modal-header h2 {
          color: #8B4513;
          margin: 0;
          font-size: 1.8rem;
          font-weight: 700;
        }
        
        .modal-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .error-notice {
          background: linear-gradient(135deg, #ffebee, #ffcdd2);
          border: 1px solid #e57373;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
          color: #c62828;
          font-weight: 500;
        }
        
        .details-container {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        
        .details-section {
          background: linear-gradient(135deg, #FFF8DC 0%, #F5F5DC 100%);
          border: 1px solid #E5D5A3;
          border-radius: 12px;
          padding: 1.5rem;
        }
        
        .details-section h3 {
          color: #8B4513;
          margin: 0 0 1.25rem 0;
          font-size: 1.3rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }
        
        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .detail-item .label {
          font-size: 0.85rem;
          color: #A0826D;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .detail-item .value {
          font-size: 1rem;
          color: #654321;
          font-weight: 500;
        }
        
        .value.status-confirmed { color: #28a745; font-weight: 600; }
        .value.status-pending { color: #ffc107; font-weight: 600; }
        .value.status-cancelled { color: #dc3545; font-weight: 600; }
        .value.status-refunded { color: #28a745; font-weight: 600; }
        .value.status-processing { color: #ffc107; font-weight: 600; }
        .value.cancellation-date { color: #dc2626; font-weight: 600; }
        
        .cancellation-section {
          background: linear-gradient(135deg, #fff5f5 0%, #ffe4e6 100%);
          border: 1px solid #fecaca;
        }
        
        .cancellation-remarks {
          padding: 1rem;
          background: white;
          border-radius: 8px;
          border-left: 4px solid #ef4444;
        }
        
        .remarks-label {
          font-size: 0.85rem;
          color: #991b1b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }
        
        .remarks-text {
          font-size: 1rem;
          color: #dc2626;
          line-height: 1.6;
          font-weight: 500;
        }
        
        .cancellation-notice {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 6px;
          font-size: 0.9rem;
          color: #856404;
        }
        
        .cancellation-notice p {
          margin: 0;
        }
        
        .cancellation-notice strong {
          color: #664d03;
        }
        
        .value.status-paid { color: #28a745; font-weight: 600; }
        .value.status-failed { color: #dc3545; font-weight: 600; }
        .value.status-refunded { color: #17a2b8; font-weight: 600; }
        
        .payment-summary {
          background: linear-gradient(135deg, #FEBE52, #F4E4BC);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }
        
        .summary-row:last-child {
          margin-bottom: 0;
        }
        
        .summary-row.highlight {
          background: linear-gradient(135deg, #fff3cd, #ffeaa7);
          border: 2px solid #ffc107;
          border-radius: 8px;
          padding: 0.75rem;
          margin: 0.75rem 0;
        }
        
        .summary-row .value.amount {
          font-size: 1.4rem;
          font-weight: 700;
          color: #654321;
        }
        
        .summary-row .value.amount.balance {
          color: #dc3545;
          font-size: 1.5rem;
          font-weight: 800;
        }
        
        .refund-row {
          padding-top: 0.75rem;
          margin-top: 0.75rem;
          border-top: 1px solid rgba(139, 69, 19, 0.2);
        }
        
        .refund-amount-row .value.refund-amount {
          color: #28a745;
          font-size: 1.5rem;
          font-weight: 800;
        }

        .breakdown-container {
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border: 2px solid #10b981;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .breakdown-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          background: white;
          border-radius: 10px;
          transition: all 0.2s ease;
        }

        .breakdown-item:hover {
          background: #f9fafb;
          transform: translateX(3px);
        }

        .breakdown-label {
          flex: 1;
          font-size: 0.95rem;
          color: #374151;
          font-weight: 500;
        }

        .breakdown-value {
          font-size: 1rem;
          color: #1f2937;
          font-weight: 600;
          white-space: nowrap;
        }

        .breakdown-divider {
          height: 2px;
          background: linear-gradient(90deg, transparent, #10b981, transparent);
          margin: 0.5rem 0;
        }

        .breakdown-total {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
          padding: 1rem 1.25rem;
        }

        .breakdown-total .breakdown-label,
        .breakdown-total .breakdown-value {
          font-size: 1.1rem;
          color: #78350f;
        }

        .breakdown-paid {
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
          border: 1px solid #10b981;
        }

        .breakdown-paid .breakdown-value.paid {
          color: #065f46;
        }

        .breakdown-remaining {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 2px solid #ef4444;
          padding: 1rem 1.25rem;
        }

        .breakdown-remaining .breakdown-label,
        .breakdown-remaining .breakdown-value.remaining {
          color: #991b1b;
          font-size: 1.1rem;
        }

        .breakdown-status {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 1px solid #3b82f6;
        }

        .breakdown-status .breakdown-value {
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .breakdown-value.status-paid,
        .breakdown-value.status-reservation {
          color: #059669;
        }

        .breakdown-value.status-pending {
          color: #f59e0b;
        }
        
        .payments-list h4 {
          color: #8B4513;
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
        }
        
        .payment-item {
          background: white;
          border: 1px solid #E5D5A3;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .payment-info {
          flex: 1;
          min-width: 250px;
        }
        
        .payment-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
        }
        
        .payment-row:last-child {
          margin-bottom: 0;
        }
        
        .reference-id {
          font-family: monospace;
          background: #f8f9fa;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.85rem;
        }
        
        .receipt-btn {
          background: linear-gradient(135deg, #28a745, #20c997);
          color: white;
          border: none;
          border-radius: 6px;
          padding: 0.6rem 1rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        
        .receipt-btn:hover {
          background: linear-gradient(135deg, #218838, #1e7e34);
          transform: translateY(-1px);
        }
        
        .action-btn {
          padding: 0.6rem 1rem;
          border: none;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .action-btn.secondary {
          background: linear-gradient(135deg, #F4E4BC, #E5D5A3);
          color: #8B4513;
          border: 1px solid #E5D5A3;
        }
        
        .action-btn.secondary:hover {
          background: linear-gradient(135deg, #E5D5A3, #D4AF37);
        }
        
        .service-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid #E5D5A3;
          font-size: 0.9rem;
        }
        
        .service-item:last-child {
          border-bottom: none;
        }

        .policy-note {
          background: linear-gradient(135deg, #e3f2fd, #f1f8e9);
          border: 1px solid #81c784;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 0.5rem;
        }

        .policy-note p {
          margin: 0;
          color: #2e7d32;
          font-size: 0.9rem;
          line-height: 1.4;
        }

        .policy-note strong {
          color: #1b5e20;
        }
        
        @media (max-width: 768px) {
          .modal-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
          
          .details-grid {
            grid-template-columns: 1fr;
          }
          
          .payment-item {
            flex-direction: column;
            align-items: stretch;
          }
          
          .receipt-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

// Combined History Card Component
const BookingHistoryCard = ({ booking, guest, onViewDetails, onReschedule, rescheduleRequest }) => {
  // Use the reschedule request data passed as prop instead of fetching individually
  const rescheduleStatus = rescheduleRequest?.status || null;
  const adminContext = rescheduleRequest?.adminContext || '';
  const [showDeniedModal, setShowDeniedModal] = useState(false);

  const guestFirstName = guest?.firstName || '';
  const guestLastName = guest?.lastName || '';
  const guestName = (guestFirstName || guestLastName) ? `${guestFirstName} ${guestLastName}`.trim() : 'N/A';

  const isRescheduleAllowed = () => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);
    // Only allow if booking is confirmed (not completed), no request or last was denied, and not cancelled, and 2 weeks (14 days) before check-in
    return (
      booking.status === 'Confirmed' &&
      booking.status !== 'Cancelled' &&
      booking.status !== 'Completed' &&
      now <= checkOutDate &&
      (checkInDate - now) / (1000 * 60 * 60 * 24) >= 14 &&
      (!rescheduleStatus || rescheduleStatus === 'DENIED')
    );
  };

  const isWithinTwoWeeks = () => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    return (checkInDate - now) / (1000 * 60 * 60 * 24) < 14;
  };

  const shouldShowRescheduleButton = () => {
    return (booking.status === 'Confirmed' || booking.status === 'Pending') && booking.status !== 'Cancelled' && booking.status !== 'Completed';
  };

  const isCancelled = String(booking.status).toLowerCase() === 'cancelled';
  const refundedPayments = isCancelled 
    ? booking.payments?.filter(p => p.status === 'Refunded' || p.status === 'refunded') || []
    : [];
  const totalPaid = booking.payments?.reduce((sum, p) => (p.status === 'Paid' || p.status === 'Reservation') ? sum + Number(p.amount) : sum, 0) || 0;
  const totalRefunded = refundedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  
  // Calculate total from all components
  const reservationFee = (booking.rooms?.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) || 0) * 2000;
  const roomCharges = (booking.rooms || []).reduce((sum, roomBooking) => {
    const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
    const roomPricePerNight = (Number(roomBooking.room?.price) || 0) / 100;
    const roomTotal = roomPricePerNight * (Number(roomBooking.quantity) || 0) * nights;
    const roomReservationFee = (Number(roomBooking.quantity) || 0) * 2000;
    return sum + (roomTotal - roomReservationFee);
  }, 0);
  const rentalTotal = (booking.rentalAmenities || []).reduce((sum, rental) => sum + ((Number(rental.totalPrice) || 0) / 100), 0);
  const optionalTotal = (booking.optionalAmenities || []).reduce((sum, optional) => {
    const amenityPrice = (Number(optional.optionalAmenity?.price) || 0) / 100;
    return sum + (amenityPrice * (Number(optional.quantity) || 0));
  }, 0);
  const cottageTotal = (booking.cottage || []).reduce((sum, cottageBooking) => sum + ((Number(cottageBooking.totalPrice) || 0) / 100), 0);
  const calculatedTotal = reservationFee + roomCharges + rentalTotal + optionalTotal + cottageTotal;
  const remainingBalance = calculatedTotal - (totalPaid / 100);

  return (
    <div className="booking-history-card">
      <div className="card-header">
        <h3>{booking.rooms && booking.rooms[0] ? `${booking.rooms[0].room.name} - ${booking.rooms[0].room.type}` : 'N/A'}</h3>
        <span className="status-badge">
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </span>
      </div>
      <div className="card-details">
        <p><strong>Check-in:</strong> {new Date(booking.checkIn).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric'
        })} at 2:00 PM</p>
        <p><strong>Check-out:</strong> {new Date(booking.checkOut).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric'
        })} at 12:00 PM</p>
        <p><strong>{isCancelled ? 'Originally Booked' : 'Booked on'}:</strong> {new Date(booking.createdAt).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric',
        })} at {new Date(booking.createdAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}</p>
        {isCancelled && booking.updatedAt && (
          <p style={{ color: '#dc2626', fontWeight: '600' }}>
            <strong>Cancelled on:</strong> {new Date(booking.updatedAt).toLocaleDateString('en-US', { 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric'
            })} at {new Date(booking.updatedAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}
          </p>
        )}
        {!isCancelled && (
          <p><strong>Remaining Balance:</strong> ₱{(remainingBalance / 100).toLocaleString()}</p>
        )}
        {/* Show refund status for cancelled bookings */}
        {isCancelled ? (
          totalRefunded > 0 ? (
            <p style={{ color: '#28a745', fontWeight: '600' }}>
              <strong>Refund Status:</strong> ✅ Refunded ₱{(totalRefunded / 100).toFixed(0)}
            </p>
          ) : totalPaid > 0 ? (
            <p style={{ color: '#ffc107', fontWeight: '600' }}>
              <strong>Refund Status:</strong> ⏳ Processing Refund
            </p>
          ) : null
        ) : (
          <p><strong>Payment Status:</strong> {booking.paymentStatus}</p>
        )}
        {!isCancelled && (
          <p><strong>Total Paid:</strong> ₱{(totalPaid / 100).toFixed(0)}</p>
        )}
      </div>
      <div className="card-actions">
        <button className="view-details-btn" onClick={() => onViewDetails(booking)}>
          View Details
        </button>
        {/* Only show reschedule actions for non-cancelled bookings */}
        {!isCancelled && (
          <>
            {/* Reschedule button/status logic */}
            {rescheduleStatus === 'PENDING' && (
              <button className="reschedule-btn" disabled style={{ backgroundColor: '#e0e0e0', color: '#888', cursor: 'not-allowed' }}>
                Waiting for approval
              </button>
            )}
            {rescheduleStatus === 'APPROVED' && (
              <span className="reschedule-success">Request Approved</span>
            )}
            {rescheduleStatus === 'DENIED' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="reschedule-denied">Request Denied</span>
                <button className="view-details-btn" style={{ marginTop: 6, background: '#eee', color: '#92400E' }} onClick={() => setShowDeniedModal(true)}>
                  View Details
                </button>
              </div>
            )}
            {shouldShowRescheduleButton() && (!rescheduleStatus || rescheduleStatus === 'DENIED') && (
              isRescheduleAllowed() ? (
                <button className="reschedule-btn" onClick={() => onReschedule(booking)}>
                  Reschedule
                </button>
              ) : isWithinTwoWeeks() ? (
                <button 
                  className="reschedule-btn" 
                  disabled 
                  style={{ 
                    backgroundColor: '#e0e0e0', 
                    color: '#888', 
                    cursor: 'not-allowed',
                    position: 'relative'
              }}
              title="Reschedule not available - must be done at least 2 weeks before check-in date"
            >
              Reschedule
            </button>
          ) : null
        )}
          </>
        )}
      </div>

      {/* Denial Details Modal */}
      {showDeniedModal && (
        <Modal show={showDeniedModal} onClose={() => setShowDeniedModal(false)}>
          <h2 style={{ color: '#d32f2f', marginBottom: 12 }}>Reschedule Request Denied</h2>
          <div style={{ marginBottom: 18 }}>
            <b>Reason from Superadmin:</b>
            <div style={{ marginTop: 8, color: '#92400E', background: '#fffbe6', borderRadius: 6, padding: 12, fontSize: 15 }}>
              {adminContext || 'No reason provided.'}
            </div>
          </div>
          <button className="view-details-btn" style={{ background: '#FEBE54', color: '#fff' }} onClick={() => setShowDeniedModal(false)}>
            Close
          </button>
        </Modal>
      )}

      <style jsx>{`
        .booking-history-card {
          background-color: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease-in-out;
        }
        .booking-history-card:hover {
          transform: translateY(-5px);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .card-header h3 {
          margin: 0;
          font-size: 1.25rem;
          color: #333;
        }
        .status-badge {
          background-color: #28a745;
          color: white;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: bold;
        }
        .card-details p {
          margin: 0.5rem 0;
          font-size: 0.95rem;
          color: #666;
        }
        .card-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1rem;
          align-items: center;
        }
        .view-details-btn {
          background-color: #FEBE54;
          color: white;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: background-color 0.3s ease;
        }
        .view-details-btn:hover {
          background-color: #DBA90F;
        }
        .reschedule-btn {
          background-color: #DBDB0F;
          color: white;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: background-color 0.3s ease;
        }
        .reschedule-btn:hover {
          background-color: #DBC20F;
        }
        .reschedule-success {
          color: #28a745;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .reschedule-denied {
          color: #dc3545;
          font-weight: 600;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
};

// Combined History Card Component
const HistoryCard = ({ booking, guest, onViewDetails, onReschedule, rescheduleRequests = {} }) => {
  const [showDeniedModal, setShowDeniedModal] = useState(false);
  
  // Get reschedule status from the batch-fetched data
  const rescheduleData = rescheduleRequests[booking.id];
  const rescheduleStatus = rescheduleData?.status || null;
  const adminContext = rescheduleData?.adminContext || '';

  // Calculate remaining balance
  const isCancelled = String(booking.status).toLowerCase() === 'cancelled';
  const totalPaid = booking.payments?.reduce((sum, p) => (p.status === 'Paid' || p.status === 'Reservation') ? sum + Number(p.amount) : sum, 0) || 0;
  
  // Calculate total from all components
  const reservationFee = (booking.rooms?.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) || 0) * 2000;
  const roomCharges = (booking.rooms || []).reduce((sum, roomBooking) => {
    const nights = Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24));
    const roomPricePerNight = (Number(roomBooking.room?.price) || 0) / 100;
    const roomTotal = roomPricePerNight * (Number(roomBooking.quantity) || 0) * nights;
    const roomReservationFee = (Number(roomBooking.quantity) || 0) * 2000;
    return sum + (roomTotal - roomReservationFee);
  }, 0);
  const rentalTotal = (booking.rentalAmenities || []).reduce((sum, rental) => sum + ((Number(rental.totalPrice) || 0) / 100), 0);
  const optionalTotal = (booking.optionalAmenities || []).reduce((sum, optional) => {
    const amenityPrice = (Number(optional.optionalAmenity?.price) || 0) / 100;
    return sum + (amenityPrice * (Number(optional.quantity) || 0));
  }, 0);
  const cottageTotal = (booking.cottage || []).reduce((sum, cottageBooking) => sum + ((Number(cottageBooking.totalPrice) || 0) / 100), 0);
  const calculatedTotal = reservationFee + roomCharges + rentalTotal + optionalTotal + cottageTotal;
  const remainingBalance = calculatedTotal - (totalPaid / 100);

  const isRescheduleAllowed = () => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);
    // Only allow if booking is confirmed (not completed), no request or last was denied, and not cancelled, and 2 weeks (14 days) before check-in
    return (
      booking.status === 'Confirmed' &&
      booking.status !== 'Cancelled' &&
      booking.status !== 'Completed' &&
      now <= checkOutDate &&
      (checkInDate - now) / (1000 * 60 * 60 * 24) >= 14 &&
      (!rescheduleStatus || rescheduleStatus === 'DENIED')
    );
  };

  const isWithinTwoWeeks = () => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    return (checkInDate - now) / (1000 * 60 * 60 * 24) < 14;
  };

  const shouldShowRescheduleButton = () => {
    return (booking.status === 'Confirmed' || booking.status === 'Pending') && booking.status !== 'Cancelled' && booking.status !== 'Completed';
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'confirmed': return '#28a745';
      case 'completed': return '#0d6efd';
      case 'pending': return '#ffc107';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'paid': return '#28a745';
      case 'pending': return '#ffc107';
      case 'failed': return '#dc3545';
      case 'refunded': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  return (
    <div className="history-card">
      <div className="card-header">
        <div className="room-info">
          <h3>{booking.rooms && booking.rooms[0] ? booking.rooms[0].room.name : 'N/A'}</h3>
          <span className="room-type">{booking.rooms && booking.rooms[0] ? booking.rooms[0].room.type : ''}</span>
        </div>
        <div className="status-badges">
          <span className="status-badge booking-status" style={{ backgroundColor: getStatusColor(booking.status) }}>
            {booking.status}
          </span>
          {String(booking.status).toLowerCase() !== 'cancelled' && (
            <span className="status-badge payment-status" style={{ backgroundColor: getPaymentStatusColor(booking.paymentStatus) }}>
              {booking.paymentStatus}
            </span>
          )}
        </div>
      </div>
      
      <div className="card-content">
        <div className="date-info">
          <div className="date-group">
            <span className="date-label">Check-in</span>
            <span className="date-value">{new Date(booking.checkIn).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            })}</span>
          </div>
          <div className="date-separator">→</div>
          <div className="date-group">
            <span className="date-label">Check-out</span>
            <span className="date-value">{new Date(booking.checkOut).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric'
            })}</span>
          </div>
        </div>
        
        <div className="booking-meta">
          <div className="meta-item">
            <span className="meta-label">Balance</span>
            <span className="meta-value">₱{remainingBalance.toLocaleString()}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Total Paid</span>
            <span className="meta-value">₱{(totalPaid / 100).toLocaleString()}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Booked At</span>
            <span className="meta-value">{new Date(booking.createdAt).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            })}</span>
          </div>
        </div>
      </div>
      
      <div className="card-actions">
        <button className="action-btn primary" onClick={() => onViewDetails(booking)}>
          View Full Details
        </button>
        
        {/* Reschedule Logic */}
        {rescheduleStatus === 'PENDING' && (
          <button className="action-btn disabled" disabled>
            Approval Pending
          </button>
        )}
        {rescheduleStatus === 'APPROVED' && (
          <span className="reschedule-success">✓ Approved</span>
        )}
        {rescheduleStatus === 'DENIED' && (
          <div className="reschedule-denied-container">
            <span className="reschedule-denied">✗ Denied</span>
            <button className="action-btn secondary" onClick={() => setShowDeniedModal(true)}>
              View Reason
            </button>
          </div>
        )}
        {shouldShowRescheduleButton() && (!rescheduleStatus || rescheduleStatus === 'DENIED') && (
          isRescheduleAllowed() ? (
            <button className="action-btn secondary" onClick={() => onReschedule(booking)}>
              Reschedule
            </button>
          ) : isWithinTwoWeeks() ? (
            <button 
              className="action-btn disabled" 
              disabled 
              title="Reschedule not available - must be done at least 2 weeks before check-in date"
            >
              Reschedule
            </button>
          ) : null
        )}
      </div>

      {/* Denial Details Modal */}
      {showDeniedModal && (
        <Modal show={showDeniedModal} onClose={() => setShowDeniedModal(false)}>
          <h2 style={{ color: '#d32f2f', marginBottom: 12 }}>Reschedule Request Denied</h2>
          <div style={{ marginBottom: 18 }}>
            <strong>Reason from Admin:</strong>
            <div style={{ marginTop: 8, color: '#8B4513', background: '#FFF8DC', borderRadius: 6, padding: 12, fontSize: 15, border: '1px solid #D4AF37' }}>
              {adminContext || 'No reason provided.'}
            </div>
          </div>
          <button className="action-btn primary" onClick={() => setShowDeniedModal(false)}>
            Close
          </button>
        </Modal>
      )}

      <style jsx>{`
        .history-card {
          background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%);
          border: 1px solid #E5D5A3;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 12px rgba(254, 190, 82, 0.15);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .history-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #FEBE52, #F4E4BC, #D4AF37);
        }
        
        .history-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(254, 190, 82, 0.25);
          border-color: #FEBE52;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.2rem;
        }
        
        .room-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.3rem;
          font-weight: 700;
          color: #8B4513;
        }
        
        .room-type {
          font-size: 0.9rem;
          color: #A0826D;
          font-weight: 500;
        }
        
        .status-badges {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-end;
        }
        
        .status-badge {
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          color: white;
          text-transform: capitalize;
        }
        
        .card-content {
          margin-bottom: 1.5rem;
        }
        
        .date-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #FFF8DC 0%, #F5F5DC 100%);
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          border: 1px solid #E5D5A3;
        }
        
        .date-group {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .date-label {
          font-size: 0.8rem;
          color: #8B4513;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .date-value {
          font-size: 1rem;
          font-weight: 700;
          color: #654321;
        }
        
        .date-separator {
          font-size: 1.2rem;
          color: #FEBE52;
          font-weight: bold;
        }
        
        .booking-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        
        .meta-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        
        .meta-label {
          font-size: 0.8rem;
          color: #A0826D;
          font-weight: 500;
          margin-bottom: 0.25rem;
        }
        
        .meta-value {
          font-size: 0.95rem;
          font-weight: 600;
          color: #654321;
        }
        
        .card-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          align-items: center;
        }
        
        .action-btn {
          padding: 0.7rem 1.4rem;
          border: none;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .action-btn.primary {
          background: linear-gradient(135deg, #FEBE52, #E6A835);
          color: white;
          border: 2px solid transparent;
        }
        
        .action-btn.primary:hover {
          background: linear-gradient(135deg, #E6A835, #D4961F);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(254, 190, 82, 0.4);
        }
        
        .action-btn.secondary {
          background: linear-gradient(135deg, #F4E4BC, #E5D5A3);
          color: #8B4513;
          border: 2px solid #E5D5A3;
        }
        
        .action-btn.secondary:hover {
          background: linear-gradient(135deg, #E5D5A3, #D4AF37);
          border-color: #D4AF37;
          transform: translateY(-1px);
        }
        
        .action-btn.disabled {
          background: #f8f9fa;
          color: #6c757d;
          cursor: not-allowed;
          border: 2px solid #e9ecef;
        }
        
        .reschedule-success {
          color: #28a745;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        .reschedule-denied-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          align-items: flex-start;
        }
        
        .reschedule-denied {
          color: #dc3545;
          font-weight: 600;
          font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
          .card-header {
            flex-direction: column;
            gap: 1rem;
          }
          
          .status-badges {
            flex-direction: row;
            align-items: flex-start;
          }
          
          .date-info {
            flex-direction: column;
            gap: 0.75rem;
          }
          
          .date-separator {
            transform: rotate(90deg);
          }
          
          .booking-meta {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          
          .meta-item {
            flex-direction: row;
            justify-content: space-between;
            text-align: left;
          }
          
          .card-actions {
            flex-direction: column;
            align-items: stretch;
          }
          
          .action-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

// Main Dashboard Component
export default function GuestDashboard() {
  const [guest, setGuest] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [selectedDetailsBooking, setSelectedDetailsBooking] = useState(null);
  const [selectedRescheduleBooking, setSelectedRescheduleBooking] = useState(null);
  const [rescheduleRequests, setRescheduleRequests] = useState({});
  const [filters, setFilters] = useState({
    roomName: '',
    paymentStatus: '',
    dateFrom: '',
    dateTo: ''
  });
  const router = useRouter();

  // Logout Navigation Guard - prevents accidental logout via back button
  const navigationGuard = useNavigationGuard({
    shouldPreventNavigation: () => true,
    onNavigationAttempt: () => {
      console.log('Guest Dashboard: Navigation attempt detected, showing logout confirmation');
    },
    customAction: () => signOut({ callbackUrl: '/login' }),
    context: 'logout',
    message: 'Are you sure you want to log out? You will need to sign in again to access your account.'
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/guest/me', {
          method: 'GET',
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(`Failed to fetch guest info: ${res.status} ${JSON.stringify(errorData)}`);
        }

        const data = await res.json();
        console.log('Guest data fetched:', data);

        setGuest(data.guest);
        setBookings(data.bookings);
        setFilteredBookings(data.bookings);
        
        // Fetch reschedule requests for all bookings in batch
        if (data.bookings && data.bookings.length > 0) {
          await fetchRescheduleRequests(data.bookings);
        }
      } catch (err) {
        console.error('Error fetching guest info:', err);
        router.push('/login');
      }
    }

    async function fetchRescheduleRequests(bookingsList) {
      try {
        const bookingIds = bookingsList.map(booking => booking.id).join(',');
        const res = await fetch(`/api/reschedule-requests/batch?bookingIds=${bookingIds}`);
        
        if (res.ok) {
          const data = await res.json();
          setRescheduleRequests(data.rescheduleRequests || {});
        }
      } catch (err) {
        console.error('Error fetching reschedule requests:', err);
      }
    }

    async function fetchNotifications() {
      try {
        const res = await fetch('/api/notifications?role=CUSTOMER', {
          method: 'GET',
        });

        if (res.ok) {
          const data = await res.json();
          setNotifications(data || []);
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    }

    async function fetchPromotions() {
      try {
        const res = await fetch('/api/promotions', {
          method: 'GET',
        });

        if (res.ok) {
          const data = await res.json();
          setPromotions(data || []);
        }
      } catch (err) {
        console.error('Error fetching promotions:', err);
      }
    }

    fetchData();
    fetchNotifications();
    fetchPromotions();
  }, [router]);

  // Filter bookings based on current filter state
  useEffect(() => {
    let filtered = [...bookings];

    if (filters.roomName) {
      filtered = filtered.filter(booking => 
        booking.rooms?.[0]?.room?.name?.toLowerCase().includes(filters.roomName.toLowerCase())
      );
    }

    if (filters.paymentStatus) {
      filtered = filtered.filter(booking => 
        booking.paymentStatus.toLowerCase() === filters.paymentStatus.toLowerCase()
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(booking => 
        new Date(booking.checkIn) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(booking => 
        new Date(booking.checkOut) <= new Date(filters.dateTo)
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      roomName: '',
      paymentStatus: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  if (!guest) return (
    <div className="loading-container">
      <p>Loading dashboard...</p>
      <style jsx>{`
        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          font-size: 1.5rem;
          color: #555;
        }
      `}</style>
    </div>
  );

  return (
    <div className="dashboard-container">
      <main className="main-content">
        {/* Header Section */}
        <div className="dashboard-header">
          <h1>Your Booking History</h1>
          <p>Manage your bookings and view payment details</p>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <div className="filters-container">
            <div className="filter-group">
              <label htmlFor="roomName">Room Name</label>
              <input
                id="roomName"
                type="text"
                placeholder="Search by room name..."
                value={filters.roomName}
                onChange={(e) => handleFilterChange('roomName', e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label htmlFor="paymentStatus">Payment Status</label>
              <select
                id="paymentStatus"
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
              >
                <option value="">All Payments</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label htmlFor="dateFrom">Check-in From</label>
              <input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label htmlFor="dateTo">Check-out To</label>
              <input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
            
            <button className="clear-filters-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        {/* History Section */}
        <section className="section-history">
          <div className="section-header">
            <h2>Booking & Payment History</h2>
            <span className="results-count">
              {filteredBookings.length} {filteredBookings.length === 1 ? 'booking' : 'bookings'} found
            </span>
          </div>
          
          <div className="history-grid">
            {filteredBookings.length > 0 ? (
              filteredBookings.map(booking => (
                <HistoryCard
                  key={booking.id}
                  booking={booking}
                  guest={guest}
                  onViewDetails={setSelectedDetailsBooking}
                  onReschedule={setSelectedRescheduleBooking}
                  rescheduleRequests={rescheduleRequests}
                />
              ))
            ) : (
              <div className="no-data">
                <div className="no-data-icon">📋</div>
                <h3>No bookings found</h3>
                <p>{bookings.length === 0 ? 'You haven\'t made any bookings yet.' : 'Try adjusting your filters to see more results.'}</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Unified Details Modal */}
      <PortalModal show={!!selectedDetailsBooking} onClose={() => setSelectedDetailsBooking(null)}>
        {selectedDetailsBooking && (
          <UnifiedDetailsModal booking={selectedDetailsBooking} guest={guest} />
        )}
      </PortalModal>

      <PortalModal show={!!selectedRescheduleBooking} onClose={() => setSelectedRescheduleBooking(null)}>
        {selectedRescheduleBooking && <RescheduleModalContent booking={selectedRescheduleBooking} guest={guest} />}
      </PortalModal>

      <PromotionPopup promotions={promotions} />

      <style jsx>{`
        .dashboard-container {
          background: linear-gradient(135deg, #FFF8DC 0%, #F5F5DC 50%, #F0F8E8 100%);
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
          position: relative;
        }
        
        .main-content {
          padding: 2rem;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .dashboard-header {
          text-align: center;
          margin-bottom: 3rem;
          padding: 2rem 0;
        }
        
        .dashboard-header h1 {
          font-size: 3rem;
          font-weight: 800;
          background: linear-gradient(135deg, #8B4513, #D4AF37, #FEBE52);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 4px rgba(139, 69, 19, 0.1);
        }
        
        .dashboard-header p {
          font-size: 1.2rem;
          color: #A0826D;
          margin: 0;
          font-weight: 500;
        }
        
        .filters-section {
          background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%);
          border: 1px solid #E5D5A3;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 3rem;
          box-shadow: 0 8px 32px rgba(254, 190, 82, 0.15);
        }
        
        .filters-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          align-items: end;
        }
        
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .filter-group label {
          font-size: 0.9rem;
          font-weight: 600;
          color: #8B4513;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .filter-group input,
        .filter-group select {
          padding: 0.8rem 1rem;
          border: 2px solid #E5D5A3;
          border-radius: 8px;
          font-size: 1rem;
          background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%);
          color: #654321;
          transition: all 0.3s ease;
        }
        
        .filter-group input:focus,
        .filter-group select:focus {
          outline: none;
          border-color: #FEBE52;
          box-shadow: 0 0 0 3px rgba(254, 190, 82, 0.2);
        }
        
        .clear-filters-btn {
          background: linear-gradient(135deg, #F4E4BC, #E5D5A3);
          color: #8B4513;
          border: 2px solid #E5D5A3;
          border-radius: 8px;
          padding: 0.8rem 1.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .clear-filters-btn:hover {
          background: linear-gradient(135deg, #E5D5A3, #D4AF37);
          border-color: #D4AF37;
          transform: translateY(-1px);
        }
        
        .section-history {
          margin-bottom: 2rem;
        }
        
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .section-header h2 {
          font-size: 2.2rem;
          font-weight: 700;
          color: #8B4513;
          margin: 0;
          position: relative;
        }
        
        .section-header h2::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 0;
          width: 60px;
          height: 4px;
          background: linear-gradient(90deg, #FEBE52, #D4AF37);
          border-radius: 2px;
        }
        
        .results-count {
          background: linear-gradient(135deg, #FEBE52, #F4E4BC);
          color: #8B4513;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          border: 1px solid #E5D5A3;
        }
        
        .history-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 2rem;
          align-items: start;
        }
        
        .no-data {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
          background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%);
          border: 2px dashed #E5D5A3;
          border-radius: 16px;
          color: #A0826D;
        }
        
        .no-data-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }
        
        .no-data h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #8B4513;
          margin: 0 0 0.5rem 0;
        }
        
        .no-data p {
          font-size: 1rem;
          margin: 0;
          line-height: 1.5;
        }
        
        @media (max-width: 1200px) {
          .history-grid {
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          }
        }
        
        @media (max-width: 768px) {
          .main-content {
            padding: 1rem;
          }
          
          .dashboard-header h1 {
            font-size: 2.2rem;
          }
          
          .dashboard-header p {
            font-size: 1rem;
          }
          
          .filters-section {
            padding: 1.5rem;
          }
          
          .filters-container {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .section-header {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .section-header h2 {
            font-size: 1.8rem;
          }
          
          .history-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          
          .no-data {
            padding: 2rem 1rem;
          }
        }
        
        @media (max-width: 480px) {
          .dashboard-header h1 {
            font-size: 1.8rem;
          }
          
          .filters-section {
            padding: 1rem;
            margin-bottom: 2rem;
          }
          
          .section-header h2 {
            font-size: 1.5rem;
          }
        }
      `}</style>

      {/* Logout Confirmation Modal */}
      <NavigationConfirmationModal 
        show={navigationGuard.showModal}
        onStay={navigationGuard.handleStay}
        onLeave={navigationGuard.handleLeave}
        context="logout"
        message={navigationGuard.message}
      />
    </div>
  );
}