// @ts-nocheck
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useNavigationGuard } from '../../../hooks/useNavigationGuard.simple';
import {
  NavigationConfirmationModal,
  CancelConfirmModal,
  useCancelConfirmModal,
  CancelRequestModal,
  useCancelRequestModal
} from '../../../components/CustomModals';
import BookingCalendar from '../../../components/BookingCalendar';
import PromotionPopup from '../../../components/PromotionPopup';
import { useUserUpdates } from '../../../hooks/usePusher';
import { useToast } from '@/components/Toast';
import { calculateRentalAmenityTotalCents } from '@/src/lib/rentalPricing';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Hotel,
  MessageCircleQuestion,
  Printer,
  Smartphone,
  Trash2,
  User,
  ClipboardList,
  Building2,
  NotebookPen
} from 'lucide-react';

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
  const [validationModal, setValidationModal] = useState({ show: false, message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDates.checkInDate || !selectedDates.checkOutDate) {
      setValidationModal({ show: true, message: 'Please select both check-in and check-out dates.' });
      return;
    }
    if (!reason.trim()) {
      setValidationModal({ show: true, message: 'Please provide a reason for rescheduling.' });
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
        } catch { }
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
        <span>Policy: Reschedule is allowed 1 week (7 days) prior of the check-in date. No-shows are considered forfeited.</span>
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
      {validationModal.show && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1300,
          padding: '1rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #febe52 0%, #ebd591 100%)',
            borderRadius: '14px',
            padding: '24px',
            width: '360px',
            maxWidth: '100%',
            boxShadow: '0 12px 30px rgba(0,0,0,0.2)',
            position: 'relative'
          }}>
            <button
              onClick={() => setValidationModal({ show: false, message: '' })}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'transparent',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#6b4700'
              }}
            >
              ×
            </button>
            <h3 style={{ margin: 0, color: '#6b4700', fontWeight: 700 }}>Missing Details</h3>
            <p style={{ margin: '12px 0 20px', color: '#6b4700', lineHeight: 1.5 }}>{validationModal.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setValidationModal({ show: false, message: '' })}
                style={{
                  backgroundColor: '#56A86B',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Okay
              </button>
            </div>
          </div>
        </div>
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
  const { warning: toastWarning } = useToast();
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
      toastWarning('Receipt not available for this payment.', { title: 'Receipt Unavailable' });
    }
  };

  const handlePrintDetails = () => {
    const formatCurrency = (amount) => `PHP ${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const safeText = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));

    const nights = Math.max(1, Math.ceil((new Date(details.checkOut) - new Date(details.checkIn)) / (1000 * 60 * 60 * 24)));
    const roomLines = (details.rooms || []).map((roomBooking) => {
      const roomQty = Number(roomBooking.quantity) || 0;
      const roomRate = (Number(roomBooking.room?.price) || 0) / 100;
      const roomReservationFee = roomQty * 2000;
      const roomBase = roomRate * roomQty * nights;
      const additionalPaxFee = (roomBooking.additionalPax || 0) * 400 * nights;
      return {
        label: `${roomBooking.room?.name || 'Room'} (${roomQty} x ${nights} night${nights > 1 ? 's' : ''})`,
        amount: Math.max(0, roomBase - roomReservationFee + additionalPaxFee)
      };
    });

    const rentalLines = (details.rentalAmenities || []).map((rental) => ({
      label: `${rental.rentalAmenity?.name || 'Rental Amenity'} (${rental.quantity || 0})`,
      amount: (Number(rental.totalPrice) || 0) / 100
    }));

    const optionalLines = (details.optionalAmenities || []).map((optional) => {
      const amenityPrice = (Number(optional.optionalAmenity?.price) || 0) / 100;
      const quantity = Number(optional.quantity) || 0;
      return {
        label: `${optional.optionalAmenity?.name || 'Optional Amenity'} (${quantity})`,
        amount: amenityPrice * quantity
      };
    });

    const cottageLines = (details.cottage || []).map((cottageBooking) => ({
      label: cottageBooking.cottage?.name || 'Cottage',
      amount: (Number(cottageBooking.totalPrice) || 0) / 100
    }));

    const lineItems = [
      {
        label: `Reservation Fee (${details.rooms?.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0) || 0} room x 2,000)`,
        amount: reservationFee
      },
      ...roomLines,
      ...rentalLines,
      ...optionalLines,
      ...cottageLines
    ].filter((item) => item.amount > 0);

    const receiptHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Booking Receipt #${safeText(details.id)}</title>
          <style>
            @page { margin: 18mm; }
            body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; }
            .receipt { max-width: 760px; margin: 0 auto; }
            .header { border-bottom: 2px solid #d1d5db; padding-bottom: 14px; margin-bottom: 18px; }
            .brand { font-size: 24px; font-weight: 800; letter-spacing: 1px; color: #92400e; }
            .sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
            .title { font-size: 20px; margin: 16px 0 6px; font-weight: 700; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; margin-bottom: 18px; }
            .meta p { margin: 0; font-size: 13px; line-height: 1.45; }
            .label { color: #6b7280; font-weight: 600; }
            .value { color: #111827; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            th { text-align: left; color: #6b7280; font-weight: 700; }
            td:last-child, th:last-child { text-align: right; }
            .totals { margin-top: 14px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
            .totals-row { display: flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            .totals-row:last-child { border-bottom: 0; }
            .totals-row strong { font-size: 14px; }
            .total-main { background: #fef3c7; }
            .paid { background: #ecfdf3; }
            .balance { background: #fff1f2; }
            .footer { margin-top: 18px; color: #6b7280; font-size: 12px; line-height: 1.45; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="brand">CHARKOOL BEACH RESORT</div>
              <div class="sub">Booking Receipt</div>
              <div class="title">Booking #${safeText(details.id)}</div>
            </div>

            <div class="meta">
              <p><span class="label">Guest:</span> <span class="value">${safeText(guest ? `${guest.firstName} ${guest.lastName}` : 'N/A')}</span></p>
              <p><span class="label">Issued On:</span> <span class="value">${safeText(new Date().toLocaleString('en-PH'))}</span></p>
              <p><span class="label">Email:</span> <span class="value">${safeText(guest?.email || 'N/A')}</span></p>
              <p><span class="label">Booking Status:</span> <span class="value">${safeText(details.status)}</span></p>
              <p><span class="label">Check-in:</span> <span class="value">${safeText(new Date(details.checkIn).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }))}</span></p>
              <p><span class="label">Check-out:</span> <span class="value">${safeText(new Date(details.checkOut).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }))}</span></p>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lineItems.map((item) => `<tr><td>${safeText(item.label)}</td><td>${safeText(formatCurrency(item.amount))}</td></tr>`).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="totals-row total-main"><strong>Total Amount</strong><strong>${safeText(formatCurrency(calculatedTotal))}</strong></div>
              <div class="totals-row paid"><span>Amount Paid</span><strong>${safeText(formatCurrency(totalAmount / 100))}</strong></div>
              <div class="totals-row balance"><span>Remaining Balance</span><strong>${safeText(formatCurrency(Math.max(0, remainingBalance)))}</strong></div>
              <div class="totals-row"><span>Payment Status</span><strong>${safeText(details.paymentStatus || 'N/A')}</strong></div>
            </div>

            <div class="footer">
              This receipt was generated from your booking details view. Keep this copy for your records.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 400);
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      toastWarning('Popup blocked. Please allow popups to print the receipt.', { title: 'Print Blocked' });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
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
  const rentalTotal = (details.rentalAmenities || []).reduce((sum, rental) => sum + (calculateRentalAmenityTotalCents(rental) / 100), 0);
  const optionalTotal = (details.optionalAmenities || []).reduce((sum, optional) => {
    const amenityPrice = (Number(optional.optionalAmenity?.price) || 0) / 100;
    return sum + (amenityPrice * (Number(optional.quantity) || 0));
  }, 0);
  const cottageTotal = (details.cottage || []).reduce((sum, cottageBooking) => sum + ((Number(cottageBooking.totalPrice) || 0) / 100), 0);
  const computedTotal = reservationFee + roomCharges + rentalTotal + optionalTotal + cottageTotal;
  const baseTotal = details.totalBeforeDiscount ? (Number(details.totalBeforeDiscount) / 100) : computedTotal;
  const finalTotal = details.totalAfterDiscount
    ? (Number(details.totalAfterDiscount) / 100)
    : (details.totalPrice ? (Number(details.totalPrice) / 100) : computedTotal);
  const appliedDiscount = details.discountAmount
    ? (Number(details.discountAmount) / 100)
    : Math.max(0, baseTotal - finalTotal);
  const totalPrice = finalTotal;
  const remainingBalance = finalTotal - (totalAmount / 100);

  const room = details.rooms?.[0]?.room;
  const isCancelled = String(details.status).toLowerCase() === 'cancelled';

  return (
    <div className="unified-modal">
      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <div className="cancellation-banner">
          <div className="banner-icon"><AlertTriangle size={34} /></div>
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
            <Printer size={16} style={{ marginRight: 6 }} />
            Print
          </button>
        </div>
      </div>

      {error && (
        <div className="error-notice">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            {error}
          </span>
        </div>
      )}

      <div className="details-container">
        {/* Reschedule Policy */}
        {!isCancelled && (
          <div className="details-section">
            <h3 className="section-title"><ClipboardList size={18} /> Reschedule Policy</h3>
            <div className="policy-note">
              <p>
                <strong>Reschedule Policy:</strong> Bookings can only be rescheduled up to 1 week (7 days) before the check-in date.
              </p>
            </div>
          </div>
        )}

        {/* Guest Information */}
        {!isCancelled && (
          <div className="details-section">
            <h3 className="section-title"><User size={18} /> Guest Information</h3>
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
          <h3 className="section-title"><Building2 size={18} /> Accommodation Details</h3>
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
            <h3 className="section-title"><NotebookPen size={18} /> Cancellation Information</h3>
            <div className="cancellation-remarks">
              <div className="remarks-label">Reason for Cancellation:</div>
              <div className="remarks-text">{details.cancellationRemarks}</div>
            </div>
          </div>
        )}

        {/* Payment Information with Breakdown */}
        <div className="details-section">
          <h3 className="section-title"><CreditCard size={18} /> {isCancelled ? 'Payment Summary' : 'Payment Details'}</h3>

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
                      const additionalPaxFee = (roomBooking.additionalPax || 0) * 400 * nights;

                      return (roomBalance > 0 || additionalPaxFee > 0) ? (
                        <div key={idx} className="breakdown-item">
                          <span className="breakdown-label">
                            {roomBooking.room?.name} ({roomBooking.quantity} room{roomBooking.quantity > 1 ? 's' : ''} × {nights} night{nights > 1 ? 's' : ''} × ₱{roomPricePerNight.toLocaleString()})
                            {additionalPaxFee > 0 && (
                              <div style={{ fontSize: '0.85em', color: '#6b7280', marginTop: '0.25rem' }}>
                                + {roomBooking.additionalPax} additional pax × {nights} night{nights > 1 ? 's' : ''} × ₱400
                              </div>
                            )}
                          </span>
                          <span className="breakdown-value">
                            ₱{(roomBalance + additionalPaxFee).toLocaleString()}
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

                {appliedDiscount > 0 && (
                  <div className="breakdown-item">
                    <span className="breakdown-label">Promotion Discount</span>
                    <span className="breakdown-value" style={{ color: '#b45309' }}>-₱{appliedDiscount.toLocaleString()}</span>
                  </div>
                )}

                {/* Total */}
                <div className="breakdown-item breakdown-total">
                  <span className="breakdown-label"><strong>{appliedDiscount > 0 ? 'Final Total' : 'Total Amount'}</strong></span>
                  <span className="breakdown-value"><strong>₱{totalPrice.toLocaleString()}</strong></span>
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
                      <strong>₱{remainingBalance.toLocaleString()}</strong>
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
            <h3 className="section-title"><FileText size={18} /> Payment Transactions</h3>
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
                      <FileText size={14} style={{ marginRight: 6 }} />
                      Download Receipt
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
          max-width: 860px;
          margin: 0 auto;
        }
        
        .cancellation-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: #fff5f5;
          border: 1px solid #efb8bf;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 8px 20px rgba(16, 24, 40, 0.08);
        }
        
        .banner-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          color: #dc2626;
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
          border-bottom: 1px solid #e6dfd1;
        }
        
        .modal-header h2 {
          color: #7a4f19;
          margin: 0;
          font-size: 1.65rem;
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
          background: #ffffff;
          border: 1px solid #e8e0d1;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 8px 18px rgba(16, 24, 40, 0.06);
        }
        
        .details-section h3 {
          color: #7a4f19;
          margin: 0 0 1.25rem 0;
          font-size: 1.3rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .section-title :global(svg) {
          color: #9a6522;
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
          background: #fff8f8;
          border: 1px solid #f3d2d8;
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
          background: #f8f6ef;
          border: 1px solid #e6dbc8;
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
          background: #f8fafc;
          border: 1px solid #dfe7ef;
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
          background: #f7f5ef;
          border: 1px solid #e3d7be;
          padding: 1rem 1.25rem;
        }

        .breakdown-total .breakdown-label,
        .breakdown-total .breakdown-value {
          font-size: 1.1rem;
          color: #78350f;
        }

        .breakdown-paid {
          background: #ecfdf3;
          border: 1px solid #a7e4c4;
        }

        .breakdown-paid .breakdown-value.paid {
          color: #065f46;
        }

        .breakdown-remaining {
          background: #fff5f5;
          border: 1px solid #f0bcc4;
          padding: 1rem 1.25rem;
        }

        .breakdown-remaining .breakdown-label,
        .breakdown-remaining .breakdown-value.remaining {
          color: #991b1b;
          font-size: 1.1rem;
        }

        .breakdown-status {
          background: #f1f5f9;
          border: 1px solid #d4deea;
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
          background: #1f7a4f;
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
          background: #16613f;
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
          background: #f6ebcf;
          color: #6f4718;
          border: 1px solid #dfcc98;
        }
        
        .action-btn.secondary:hover {
          background: #edd9aa;
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

          .unified-modal {
            max-width: 100%;
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
    // Updated: Allow if booking is confirmed (not completed), no request or last was denied, and not cancelled, and at least 7 days before check-in
    return (
      booking.status === 'Confirmed' &&
      booking.status !== 'Cancelled' &&
      booking.status !== 'Completed' &&
      now <= checkOutDate &&
      (checkInDate - now) / (1000 * 60 * 60 * 24) >= 7 &&
      (!rescheduleStatus || rescheduleStatus === 'DENIED')
    );
  };

  const isWithinOneWeek = () => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    return (checkInDate - now) / (1000 * 60 * 60 * 24) < 7;
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
  const rentalTotal = (booking.rentalAmenities || []).reduce((sum, rental) => sum + (calculateRentalAmenityTotalCents(rental) / 100), 0);
  const optionalTotal = (booking.optionalAmenities || []).reduce((sum, optional) => {
    const amenityPrice = (Number(optional.optionalAmenity?.price) || 0) / 100;
    return sum + (amenityPrice * (Number(optional.quantity) || 0));
  }, 0);
  const cottageTotal = (booking.cottage || []).reduce((sum, cottageBooking) => sum + ((Number(cottageBooking.totalPrice) || 0) / 100), 0);
  const calculatedTotal = reservationFee + roomCharges + rentalTotal + optionalTotal + cottageTotal;
  const finalTotal = Number(booking.totalAfterDiscount || booking.totalCostWithAddons || booking.totalPrice || calculatedTotal * 100) / 100;
  const remainingBalance = finalTotal - (totalPaid / 100);

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
            <p style={{ color: '#28a745', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} />
              <strong>Refund Status:</strong> Refunded ₱{(totalRefunded / 100).toFixed(0)}
            </p>
          ) : totalPaid > 0 ? (
            <p style={{ color: '#b45309', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock3 size={16} />
              <strong>Refund Status:</strong> Processing Refund
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
              ) : isWithinOneDay() ? (
                <button
                  className="reschedule-btn"
                  disabled
                  style={{
                    backgroundColor: '#e0e0e0',
                    color: '#888',
                    cursor: 'not-allowed',
                    position: 'relative'
                  }}
                  title="Reschedule not available - must be done at least 1 day before check-in date"
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
const HistoryCard = ({
  booking,
  guest,
  onViewDetails,
  onReschedule,
  onCancel,
  onDismiss,
  rescheduleRequests = {},
  cancellationRequests = {},
  unitAssignments = [],
  dismissing = false
}) => {
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
  const rentalTotal = (booking.rentalAmenities || []).reduce((sum, rental) => sum + (calculateRentalAmenityTotalCents(rental) / 100), 0);
  const optionalTotal = (booking.optionalAmenities || []).reduce((sum, optional) => {
    const amenityPrice = (Number(optional.optionalAmenity?.price) || 0) / 100;
    return sum + (amenityPrice * (Number(optional.quantity) || 0));
  }, 0);
  const cottageTotal = (booking.cottage || []).reduce((sum, cottageBooking) => sum + ((Number(cottageBooking.totalPrice) || 0) / 100), 0);
  const calculatedTotal = reservationFee + roomCharges + rentalTotal + optionalTotal + cottageTotal;
  const finalTotal = Number(booking.totalAfterDiscount || booking.totalCostWithAddons || booking.totalPrice || calculatedTotal * 100) / 100;
  const remainingBalance = finalTotal - (totalPaid / 100);

  const isRescheduleAllowed = () => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);
    // Updated: Allow if booking is confirmed (not completed), no request or last was denied, and not cancelled, and at least 1 day before check-in
    return (
      booking.status === 'Confirmed' &&
      booking.status !== 'Cancelled' &&
      booking.status !== 'Completed' &&
      now <= checkOutDate &&
      (checkInDate - now) / (1000 * 60 * 60 * 24) >= 1 &&
      (!rescheduleStatus || rescheduleStatus === 'DENIED')
    );
  };

  const isWithinOneDay = () => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    return (checkInDate - now) / (1000 * 60 * 60 * 24) < 1;
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

  // NEW: Get unit assignment for first room
  const firstRoom = booking.rooms && booking.rooms[0];
  const unitAssignment = firstRoom && unitAssignments.find(
    u => u.roomId === firstRoom.roomId && u.unitNumber
  );

  return (
    <div className="history-card">
      <div className="card-header">
        <div className="room-info">
          <div className="rooms-list">
            {booking.rooms && booking.rooms.length > 0 ? (
              (() => {
                // Group rooms by room name
                const groupedRooms = booking.rooms.reduce((acc, roomBooking) => {
                  const roomName = roomBooking.room.name;
                  if (!acc[roomName]) {
                    acc[roomName] = [];
                  }

                  // Find unit assignments for this room
                  const roomUnits = unitAssignments.filter(
                    u => u.roomId === roomBooking.roomId
                  );

                  if (roomUnits.length > 0) {
                    roomUnits.forEach(unit => {
                      if (unit.unitNumber) {
                        acc[roomName].push(unit.unitNumber);
                      }
                    });
                  } else if (roomBooking.quantity > 1) {
                    // If no unit assignments but quantity > 1, show count
                    acc[roomName].push(`${roomBooking.quantity}x`);
                  }

                  return acc;
                }, {});

                return Object.entries(groupedRooms).map(([roomName, units], index) => (
                  <div key={index} className="room-item">
                    {roomName}
                    {units.length > 0 && (
                      units[0].includes('x')
                        ? ` (${units[0]})`
                        : ` #${units.join(',')}`
                    )}
                  </div>
                ));
              })()
            ) : (
              <div className="room-item">N/A</div>
            )}
          </div>
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
          <div className="date-separator"><ArrowRight size={18} /></div>
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
          <span className="reschedule-success"><CheckCircle2 size={15} style={{ marginRight: 6 }} />Approved</span>
        )}
        {rescheduleStatus === 'DENIED' && (
          <div className="reschedule-denied-container">
            <span className="reschedule-denied"><AlertTriangle size={15} style={{ marginRight: 6 }} />Denied</span>
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
          ) : isWithinOneDay() ? (
            <button
              className="action-btn disabled"
              disabled
              title="Reschedule not available - must be done at least 1 day before check-in date"
            >
              Reschedule
            </button>
          ) : null
        )}

        {/* Cancel Logic */}
        {(() => {
          const now = new Date();
          const checkInDate = new Date(booking.checkIn);
          const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));
          const cancellationData = cancellationRequests[booking.id];
          const cancellationStatus = cancellationData?.status || null;

          // Check if cancel button should be shown
          const canShowCancelButton = ['Created', 'Pending', 'Confirmed'].includes(booking.status) &&
            booking.status !== 'Cancelled' &&
            booking.status !== 'Completed';

          // If cancellation is pending
          if (booking.status === 'CancellationPending' || cancellationStatus === 'PENDING') {
            return (
              <button className="action-btn disabled" disabled title="Cancellation request is pending admin approval">
                Cancellation Pending
              </button>
            );
          }

          // If not eligible for cancel
          if (!canShowCancelButton) return null;

          // Show cancel button
          const isCancelDisabled = daysUntilCheckIn < 1;

          return (
            <button
              className={`action-btn ${isCancelDisabled ? 'disabled' : 'danger'}`}
              onClick={() => onCancel(booking)}
              disabled={isCancelDisabled}
              title={isCancelDisabled ? 'Cancellation not available within 24 hours of check-in' : 'Cancel this booking'}
              style={{
                background: isCancelDisabled ? '#f8f9fa' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
                color: isCancelDisabled ? '#6c757d' : 'white',
                cursor: isCancelDisabled ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel Booking
            </button>
          );
        })()}

        {/* Dismiss button for expired bookings */}
        {booking.status === 'Expired' && onDismiss && (
          <button
            className="action-btn dismiss"
            onClick={() => onDismiss(booking.id)}
            disabled={dismissing}
            title="Remove this expired booking from your history"
          >
            {dismissing ? 'Dismissing...' : <><Trash2 size={14} style={{ marginRight: 6 }} />Dismiss</>}
          </button>
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
          background: #ffffff;
          border: 1px solid #e7e2d8;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 6px 18px rgba(20, 28, 38, 0.08);
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
          background: linear-gradient(90deg, #d9a441, #edd29a, #d9a441);
        }
        
        .history-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 28px rgba(20, 28, 38, 0.12);
          border-color: #d6c4a3;
        }
        
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.2rem;
        }
        
        .room-info {
          flex: 1;
        }
        
        .rooms-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, max-content));
          gap: 0.75rem 1rem;
          row-gap: 0.25rem;
        }
        
        .room-item {
          font-size: 1.05rem;
          color: #8B4513;
          font-weight: 600;
          padding: 0.15rem 0;
          display: flex;
          align-items: flex-start;
          white-space: nowrap;
        }
        
        .room-item::before {
          content: '•';
          margin-right: 0.5rem;
          color: #D4AF37;
          font-weight: bold;
        }
        
        .room-type {
          font-size: 0.9rem;
          color: #A0826D;
          font-weight: 500;
        }
        
        .unit-details {
          display: block;
          font-size: 0.85rem;
          color: #6b7280;
          margin-top: 0.25rem;
          font-weight: 400;
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
          background: #f9f6ef;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          border: 1px solid #ece4d3;
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
          color: #FEBE52;
          font-weight: bold;
          display: inline-flex;
          align-items: center;
          justify-content: center;
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
          background: #b47a22;
          color: white;
          border: 2px solid transparent;
        }
        
        .action-btn.primary:hover {
          background: #9b6517;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(70, 45, 13, 0.25);
        }
        
        .action-btn.secondary {
          background: #f8f4ea;
          color: #7a5220;
          border: 2px solid #e1d5bf;
        }
        
        .action-btn.secondary:hover {
          background: rgba(255, 255, 255, 0.62);
          border-color: #d2bf9e;
          backdrop-filter: blur(9px);
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
          display: inline-flex;
          align-items: center;
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
          display: inline-flex;
          align-items: center;
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
  const { success: toastSuccess, error: toastError, warning: toastWarning, info: toastInfo } = useToast();
  const [guest, setGuest] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [selectedDetailsBooking, setSelectedDetailsBooking] = useState(null);
  const [selectedRescheduleBooking, setSelectedRescheduleBooking] = useState(null);
  const [rescheduleRequests, setRescheduleRequests] = useState({});
  const [cancellationRequests, setCancellationRequests] = useState({});
  const [cancelConfirmModal, setCancelConfirmModal] = useCancelConfirmModal();
  const [cancelRequestModal, setCancelRequestModal] = useCancelRequestModal();
  const [cancelLoading, setCancelLoading] = useState(false); // NEW: Loading state for cancel button
  const [unitAssignments, setUnitAssignments] = useState({}); // NEW: Store unit assignments by bookingId
  const [filters, setFilters] = useState({
    roomName: '',
    paymentStatus: '',
    dateFrom: '',
    dateTo: ''
  });
  const [activeTab, setActiveTab] = useState('all');// NEW: Tab state
  const [dismissing, setDismissing] = useState(false); // NEW: Loading state for dismissal
  const router = useRouter();

  // NEW: Helper function to categorize bookings
 const categorizeBookings = (bookingsList) => {
  const now = new Date();

  return {
    all: bookingsList.filter(b => !b.isDeleted),

    upcoming: bookingsList.filter(b =>
      (b.status === 'Confirmed' || b.status === 'Pending') &&
      new Date(b.checkIn) > now &&
      !b.isDeleted
    ),

    expiredPending: bookingsList.filter(b =>
      b.status === 'Expired' &&
      !b.isDeleted
    ),

    past: bookingsList.filter(b =>
      (b.status === 'Completed' ||
        (new Date(b.checkOut) < now && b.status === 'Confirmed')) &&
      !b.isDeleted
    ),

    cancelled: bookingsList.filter(b =>
      b.status === 'Cancelled' &&
      !b.isDeleted
    ),
  };
};

  // NEW: Calculate dashboard statistics
  const calculateStats = (bookingsList) => {
    const now = new Date();
    const categorized = categorizeBookings(bookingsList);

    const confirmedCount = bookingsList.filter(b =>
      b.status === 'Confirmed' && new Date(b.checkIn) > now
    ).length;

    const totalBalance = bookingsList.reduce((sum, booking) => {
      if (booking.status === 'Cancelled' || booking.status === 'Expired') return sum;

      const totalPaid = (booking.payments || []).reduce((pSum, p) => {
        const status = (p.status || '').toLowerCase();
        return (status === 'paid' || status === 'partial' || status === 'reservation')
          ? pSum + Number(p.amount || 0)
          : pSum;
      }, 0);

      // Calculate total price from booking components
      const basePrice = Number(booking.totalBeforeDiscount || booking.totalPrice || 0);
      const rentalTotal = (booking.rentalAmenities || []).reduce((sum, ra) =>
        sum + calculateRentalAmenityTotalCents(ra), 0
      );
      const cottageTotal = (booking.cottage || []).reduce((sum, c) =>
        sum + Number(c.totalPrice || 0), 0
      );
      const computedTotal = basePrice + rentalTotal + cottageTotal;
      const total = Number(booking.totalAfterDiscount || booking.totalCostWithAddons || booking.totalPrice || computedTotal);

      return sum + Math.max(0, total - totalPaid);
    }, 0);

    const totalStays = bookingsList.filter(b =>
      b.status === 'Completed'
    ).length;

    return {
      upcomingCount: categorized.upcoming.length,
      confirmedCount,
      totalBalance: totalBalance / 100, // Convert from cents
      totalStays,
      expiredCount: categorized.expiredPending.length,
    };
  };

  // NEW: Get next upcoming booking
  const getNextBooking = (bookingsList) => {
    const now = new Date();
    const upcoming = bookingsList
      .filter(b =>
        (b.status === 'Confirmed' || b.status === 'Pending') &&
        new Date(b.checkIn) > now &&
        !b.isDeleted
      )
      .sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

    return upcoming[0] || null;
  };

  // NEW: Calculate days until check-in
  const getDaysUntilCheckIn = (checkInDate) => {
    const now = new Date();
    const checkIn = new Date(checkInDate);
    const diff = checkIn - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // NEW: Handle dismiss expired booking
  const handleDismissExpired = async (bookingId) => {
    setDismissing(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/dismiss`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        // Refresh bookings
        const refreshRes = await fetch('/api/guest/me');
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setBookings(refreshData.bookings);
          applyFilters(refreshData.bookings);
        }
      } else {
        const error = await res.json();
        toastError(error.error || 'Failed to dismiss booking', { title: 'Dismiss Failed' });
      }
    } catch (err) {
      console.error('Dismiss error:', err);
      toastError('Failed to dismiss booking', { title: 'Dismiss Failed' });
    } finally {
      setDismissing(false);
    }
  };

  // NEW: Dismiss all expired bookings
  const handleDismissAllExpired = async () => {
    const categorized = categorizeBookings(bookings);
    const expiredIds = categorized.expiredPending.map(b => b.id);

    if (expiredIds.length === 0) return;

    if (!confirm(`Are you sure you want to dismiss ${expiredIds.length} expired booking(s)?`)) {
      return;
    }

    setDismissing(true);
    try {
      await Promise.all(
        expiredIds.map(id =>
          fetch(`/api/bookings/${id}/dismiss`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      // Refresh bookings
      const refreshRes = await fetch('/api/guest/me');
      if (refreshRes.ok) {
        const refreshData = await refreshRes.json();
        setBookings(refreshData.bookings);
        applyFilters(refreshData.bookings);
      }
    } catch (err) {
      console.error('Dismiss all error:', err);
      toastError('Failed to dismiss some bookings', { title: 'Bulk Dismiss Failed' });
    } finally {
      setDismissing(false);
    }
  };

  // NEW: Fetch cancellation requests for all bookings (moved outside useEffect)
  const fetchCancellationRequests = async (bookingsList) => {
    try {
      const bookingIds = bookingsList.map(booking => booking.id).join(',');
      const res = await fetch(`/api/cancellation-requests/batch?bookingIds=${bookingIds}`);

      if (res.ok) {
        const data = await res.json();
        setCancellationRequests(data.cancellationRequests || {});
      }
    } catch (err) {
      console.error('Error fetching cancellation requests:', err);
    }
  };

  // Memoized callbacks for navigation guard to prevent re-render spam
  const shouldPreventNav = useCallback(() => true, []);
  const onNavAttempt = useCallback(() => {
    console.log('Guest Dashboard: Navigation attempt detected, showing logout confirmation');
  }, []);
  const customLogout = useCallback(() => signOut({ callbackUrl: '/login' }), []);

  // Logout Navigation Guard - prevents accidental logout via back button
  const navigationGuard = useNavigationGuard({
    shouldPreventNavigation: shouldPreventNav,
    onNavigationAttempt: onNavAttempt,
    customAction: customLogout,
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
          await fetchUnitAssignments(data.bookings); // NEW: Fetch unit assignments
          await fetchCancellationRequests(data.bookings); // NEW: Fetch cancellation requests
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

    // NEW: Fetch unit assignments for all bookings
    async function fetchUnitAssignments(bookingsList) {
      try {
        const assignments = {};
        await Promise.all(
          bookingsList.map(async (booking) => {
            try {
              const res = await fetch(`/api/bookings/${booking.id}/units`);
              if (res.ok) {
                const data = await res.json();
                assignments[booking.id] = data.assignments || [];
              }
            } catch (err) {
              console.log(`No unit assignments for booking ${booking.id}`);
            }
          })
        );
        setUnitAssignments(assignments);
      } catch (err) {
        console.error('Error fetching unit assignments:', err);
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

  // 🔔 PUSHER: Real-time updates for guest bookings
  // Callback to refresh guest data
  const refetchGuestData = useCallback(async () => {
    console.log('[Pusher] Received booking update, refreshing guest data...');
    try {
      const res = await fetch('/api/guest/me');
      if (res.ok) {
        const data = await res.json();
        setGuest(data.guest);
        setBookings(data.bookings);
        applyFilters(data.bookings);
      }
    } catch (err) {
      console.error('[Pusher] Refresh error:', err);
    }
  }, []);

  // Subscribe to user-specific updates (uses guest?.id)
  useUserUpdates(guest?.id, {
    onBookingStatusChanged: (data) => {
      console.log('[Pusher] Booking status changed:', data.status);
      if (data.message) {
        const status = String(data.status || '').toLowerCase();
        if (status.includes('cancel') || status.includes('denied')) {
          toastWarning(data.message, { title: 'Booking Update' });
        } else if (status.includes('confirm') || status.includes('completed') || status.includes('approved')) {
          toastSuccess(data.message, { title: 'Booking Update' });
        } else {
          toastInfo(data.message, { title: 'Booking Update' });
        }
      }
      refetchGuestData();
    },
    onNotification: (notification) => {
      console.log('[Pusher] New notification:', notification.message);
      const nType = String(notification?.type || '').toLowerCase();
      const nMessage = notification?.message || 'New notification received';
      if (nType.includes('denied') || nType.includes('cancel')) {
        toastWarning(nMessage, { title: 'Notification' });
      } else if (nType.includes('approved') || nType.includes('confirmed') || nType.includes('reschedule')) {
        toastSuccess(nMessage, { title: 'Notification' });
      } else {
        toastInfo(nMessage, { title: 'Notification' });
      }
      // Refresh notifications
      fetch('/api/notifications?role=CUSTOMER')
        .then(res => res.ok ? res.json() : [])
        .then(data => setNotifications(data || []))
        .catch(err => console.error('Error refreshing notifications:', err));
    },
  });

  // Handle direct cancellation (>= 7 days)
  const handleDirectCancel = async (booking) => {
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const data = await res.json();
        toastSuccess(`Booking cancelled successfully! Refund: ₱${data.refundAmount.toLocaleString()}`, { title: 'Cancellation Approved' });
        // Refresh bookings
        const refreshRes = await fetch('/api/guest/me');
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setBookings(refreshData.bookings);
          applyFilters(refreshData.bookings);
          if (refreshData.bookings && refreshData.bookings.length > 0) {
            await fetchCancellationRequests(refreshData.bookings);
          }
        }
      } else {
        const error = await res.json();
        toastError(error.error || 'Failed to cancel booking', { title: 'Cancellation Failed' });
      }
    } catch (err) {
      console.error('Cancel error:', err);
      toastError('Failed to cancel booking', { title: 'Cancellation Failed' });
    } finally {
      setCancelLoading(false);
      setCancelConfirmModal({ show: false, booking: null });
    }
  };

  // NEW: Apply filters with tab consideration
  const applyFilters = (bookingsList = bookings) => {
    const categorized = categorizeBookings(bookingsList);

    // Get bookings for active tab
    let tabFilteredBookings = [];
    switch (activeTab) {
      case 'all':
        tabFilteredBookings = categorized.all;
        break;

      case 'upcoming':
        tabFilteredBookings = categorized.upcoming;
        break;

      case 'past':
        tabFilteredBookings = categorized.past;
        break;

      case 'cancelled':
        tabFilteredBookings = categorized.cancelled;
        break;

      case 'expired':
        tabFilteredBookings = categorized.expiredPending;
        break;

      default:
        tabFilteredBookings = categorized.all;
    }

    // Apply additional filters
    let filtered = tabFilteredBookings.filter(booking => {
      const roomMatch = !filters.roomName ||
        booking.rooms?.some(r =>
          r.room?.name?.toLowerCase().includes(filters.roomName.toLowerCase())
        );

      const paymentMatch = !filters.paymentStatus ||
        booking.paymentStatus === filters.paymentStatus;

      const dateFromMatch = !filters.dateFrom ||
        new Date(booking.checkIn) >= new Date(filters.dateFrom);

      const dateToMatch = !filters.dateTo ||
        new Date(booking.checkOut) <= new Date(filters.dateTo);

      return roomMatch && paymentMatch && dateFromMatch && dateToMatch;
    });

    setFilteredBookings(filtered);
  };

  // Update filtered bookings when filters or active tab changes
  useEffect(() => {
    applyFilters();
  }, [filters, activeTab, bookings]);

  // Handle cancellation request (< 7 days)
  const handleCancelRequest = async (booking, reason) => {
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/cancel-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        toastSuccess('Cancellation request submitted successfully! Awaiting admin approval.', { title: 'Request Submitted' });
        // Refresh bookings
        const refreshRes = await fetch('/api/guest/me');
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          setBookings(refreshData.bookings);
          setFilteredBookings(refreshData.bookings);
          if (refreshData.bookings && refreshData.bookings.length > 0) {
            await fetchCancellationRequests(refreshData.bookings);
          }
        }
      } else {
        const error = await res.json();
        toastError(error.error || 'Failed to submit cancellation request', { title: 'Request Failed' });
      }
    } catch (err) {
      console.error('Cancel request error:', err);
      toastError('Failed to submit cancellation request', { title: 'Request Failed' });
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle cancel button click - all cancellations now require admin approval
  const handleCancelClick = (booking) => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const daysUntilCheckIn = Math.ceil((checkInDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilCheckIn >= 1) {
      // All cancellations require admin approval
      setCancelRequestModal({ show: true, booking });
    } else {
      toastWarning('Cancellation not available within 24 hours of check-in', { title: 'Cancellation Restricted' });
    }
  };

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
          <h1>Welcome Back, {guest?.firstName || 'Guest'}!</h1>
          <p>Manage your stays at Charkool Resort</p>
        </div>

        {/* Dashboard Summary Statistics */}
        {(() => {
          const stats = calculateStats(bookings);
          return (
            <div className="dashboard-summary">
              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-value">{stats.upcomingCount}</div>
                  <div className="stat-label">Upcoming Stays</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-value">{stats.confirmedCount}</div>
                  <div className="stat-label">Confirmed</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-value">{stats.totalStays}</div>
                  <div className="stat-label">Completed Stays</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Next Booking Highlight */}
        {(() => {
          const nextBooking = getNextBooking(bookings);
          if (!nextBooking) return null;

          const daysUntil = getDaysUntilCheckIn(nextBooking.checkIn);
          const remainingBalance = (() => {
            const totalPaid = (nextBooking.payments || []).reduce((sum, p) => {
              const status = (p.status || '').toLowerCase();
              return (status === 'paid' || status === 'partial' || status === 'reservation')
                ? sum + Number(p.amount || 0)
                : sum;
            }, 0);
            const basePrice = Number(nextBooking.totalCostWithAddons || nextBooking.totalPrice || 0);
            const rentalTotal = (nextBooking.rentalAmenities || []).reduce((sum, ra) =>
              sum + calculateRentalAmenityTotalCents(ra), 0
            );
            const cottageTotal = (nextBooking.cottage || []).reduce((sum, c) =>
              sum + Number(c.totalPrice || 0), 0
            );
            const total = basePrice + rentalTotal + cottageTotal;
            return Math.max(0, (total - totalPaid) / 100);
          })();

          return (
            <div className="next-booking-highlight">
              <h3>Your Next Stay</h3>
              <div className="highlight-content">
                <div className="countdown">
                  <span className="days-until">{daysUntil}</span>
                  <span className="countdown-label">day{daysUntil !== 1 ? 's' : ''} until check-in</span>
                </div>
                <div className="booking-quick-info">
                  <p className="room-name"><strong>{nextBooking.rooms?.[0]?.room?.name || 'Room'}</strong></p>
                  <p className="dates">
                    {new Date(nextBooking.checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(nextBooking.checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <span className={`status-badge status-${nextBooking.status.toLowerCase()}`}>
                    {nextBooking.status}
                  </span>
                </div>
                <div className="highlight-actions">
                  <button className="next-stay-view-details-btn" onClick={() => setSelectedDetailsBooking(nextBooking)}>
                    <span className="btn-text">View Details</span>
                    <span className="btn-arrow"><ArrowRight size={18} /></span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Quick Actions Grid */}
        <div className="quick-actions-section">
          <h3>Quick Actions</h3>
          <div className="quick-actions-grid">
            <button className="quick-action-btn" onClick={() => router.push('/booking')}>
              <span className="action-icon"><Hotel size={34} /></span>
              <span className="action-label">New Booking</span>
            </button>

            <button className="quick-action-btn" onClick={() => {
              // Trigger the floating chatbot to open
              window.dispatchEvent(new Event('openChatbot'));
            }}>
              <span className="action-icon"><MessageCircleQuestion size={34} /></span>
              <span className="action-label">Ask Questions</span>
            </button>

            <button className="quick-action-btn" onClick={() => router.push('/guest/3dview')}>
              <span className="action-icon"><Smartphone size={34} /></span>
              <span className="action-label">Virtual Tour</span>
            </button>
          </div>
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
                onChange={(e) => setFilters({ ...filters, roomName: e.target.value })}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="paymentStatus">Payment Status</label>
              <select
                id="paymentStatus"
                value={filters.paymentStatus}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
              >
                <option value="">All Payments</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Reservation">Reservation</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="dateFrom">Check-in From</label>
              <input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="dateTo">Check-out To</label>
              <input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>

            <button
              className="clear-filters-btn"
              onClick={() => setFilters({ roomName: '', paymentStatus: '', dateFrom: '', dateTo: '' })}
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Booking Tabs */}
        {(() => {
          const categorized = categorizeBookings(bookings);
          return (
            <div className="booking-tabs">
                <button
                  className={activeTab === 'all' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('all')}
                >
                  All Bookings ({categorized.all.length})
                </button>

                <button
                  className={activeTab === 'upcoming' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('upcoming')}
                >
                  Upcoming ({categorized.upcoming.length})
                </button>

                <button
                  className={activeTab === 'past' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('past')}
                >
                  Past Stays ({categorized.past.length})
                </button>

                <button
                  className={activeTab === 'cancelled' ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab('cancelled')}
                >
                  Cancelled ({categorized.cancelled.length})
                </button>

                {categorized.expiredPending.length > 0 && (
                  <button
                    className={activeTab === 'expired'
                      ? 'tab active expired-tab'
                      : 'tab expired-tab'}
                    onClick={() => setActiveTab('expired')}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      Expired ({categorized.expiredPending.length})
                      <AlertTriangle size={14} />
                    </span>
                  </button>
                )}
              </div>
          );
        })()}

        {/* History Section */}
        <section className="section-history">
          <div className="section-header">
            <h2>
            {activeTab === 'all' && 'All Bookings'}
            {activeTab === 'upcoming' && 'Upcoming Bookings'}
            {activeTab === 'past' && 'Past Stays'}
            {activeTab === 'cancelled' && 'Cancelled Bookings'}
            {activeTab === 'expired' && 'Expired Bookings'}
          </h2>
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
                  onCancel={handleCancelClick}
                  onDismiss={handleDismissExpired}
                  rescheduleRequests={rescheduleRequests}
                  cancellationRequests={cancellationRequests}
                  unitAssignments={unitAssignments[booking.id] || []}
                  dismissing={dismissing}
                />
              ))
            ) : (
              <div className="no-data">
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
          background: linear-gradient(180deg, #f7f4ef 0%, #f3f6f8 100%);
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
          padding: 1.25rem 1.5rem;
          border: 1px solid #e6dfd1;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: 0 8px 22px rgba(16, 24, 40, 0.06);
        }
        
        .dashboard-header h1 {
          font-size: 3rem;
          font-weight: 800;
          color: #243446;
          margin: 0 0 0.5rem 0;
          text-shadow: none;
        }
        
        .dashboard-header p {
          font-size: 1.2rem;
          color: #5f6d7d;
          margin: 0;
          font-weight: 500;
        }
        
        /* Dashboard Summary Stats */
        .dashboard-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        
        .stat-card {
          background: #ffffff;
          border: 1px solid #e7e2d8;
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          box-shadow: 0 6px 16px rgba(16, 24, 40, 0.08);
          transition: all 0.3s ease;
        }
        
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 28px rgba(16, 24, 40, 0.14);
          border-color: #d7c8ab;
          background: rgba(255, 255, 255, 0.62);
          backdrop-filter: blur(10px);
        }
        
        .stat-icon {
          font-size: 3rem;
          min-width: 60px;
          text-align: center;
        }
        
        .stat-content {
          flex: 1;
        }
        
        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2d3d;
          margin: 0 0 0.25rem 0;
        }
        
        .stat-label {
          font-size: 0.9rem;
          color: #667487;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }
        
        /* Next Booking Highlight */
        .next-booking-highlight {
          background: #ffffff;
          border: 1px solid #e7e0d1;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 8px 20px rgba(16, 24, 40, 0.08);
          transition: all 0.25s ease;
        }

        .next-booking-highlight:hover {
          box-shadow: 0 14px 30px rgba(16, 24, 40, 0.14);
          background: rgba(255, 255, 255, 0.64);
          backdrop-filter: blur(10px);
        }
        
        .next-booking-highlight h3 {
          margin: 0 0 1.5rem 0;
          font-size: 1.5rem;
          color: #1f2d3d;
          font-weight: 700;
        }
        
        .highlight-content {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 2rem;
          align-items: center;
        }
        
        .countdown {
          text-align: center;
          background: #f8f6f1;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          border: 1px solid #e6dece;
        }
        
        .days-until {
          display: block;
          font-size: 3rem;
          font-weight: 800;
          color: #1f2d3d;
          line-height: 1;
        }
        
        .countdown-label {
          display: block;
          font-size: 0.9rem;
          color: #667487;
          margin-top: 0.5rem;
          font-weight: 600;
        }
        
        .booking-quick-info {
          flex: 1;
        }
        
        .booking-quick-info .room-name {
          font-size: 1.3rem;
          margin: 0 0 0.5rem 0;
          color: #1f2d3d;
        }
        
        .booking-quick-info .dates {
          color: #4b5c70;
          margin: 0 0 0.5rem 0;
        }
        
        .booking-quick-info .balance-due {
          color: #dc2626;
          font-weight: 600;
          margin: 0.5rem 0;
        }
        
        .booking-quick-info .status-badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
          margin-top: 0.5rem;
        }
        
        .status-badge.status-confirmed {
          background: #dcfce7;
          color: #166534;
        }
        
        .status-badge.status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        
        .status-badge.status-expired {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .highlight-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        /* Enhanced Next Stay View Details Button */
        .next-stay-view-details-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          background: #243446;
          border: 2px solid #243446;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 700;
          color: #ffffff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(36, 52, 70, 0.2);
          overflow: hidden;
        }

        .next-stay-view-details-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transition: left 0.5s ease;
        }

        .next-stay-view-details-btn:hover::before {
          left: 100%;
        }

        .next-stay-view-details-btn:hover {
          background: rgba(36, 52, 70, 0.75);
          color: #FFFFFF;
          border-color: rgba(36, 52, 70, 0.75);
          backdrop-filter: blur(10px);
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 10px 26px rgba(36, 52, 70, 0.3);
        }

        .next-stay-view-details-btn:active {
          transform: translateY(0) scale(0.98);
          box-shadow: 0 2px 8px rgba(139, 69, 19, 0.2);
        }

        .next-stay-view-details-btn .btn-icon {
          font-size: 1.25rem;
          transition: transform 0.3s ease;
        }

        .next-stay-view-details-btn:hover .btn-icon {
          transform: scale(1.1) rotate(5deg);
        }

        .next-stay-view-details-btn .btn-text {
          font-size: 1rem;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .next-stay-view-details-btn .btn-arrow {
          font-size: 1.25rem;
          transition: transform 0.3s ease;
          font-weight: bold;
        }

        .next-stay-view-details-btn:hover .btn-arrow {
          transform: translateX(4px);
        }
        
        /* Pending Actions Section */
        .pending-actions-section {
          background: linear-gradient(135deg, #ffffff 0%, #fefefe 100%);
          border: 2px solid #fbbf24;
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.15);
        }
        
        .pending-actions-section h3 {
          margin: 0 0 1rem 0;
          font-size: 1.3rem;
          color: #92400e;
          font-weight: 700;
        }
        
        .alerts-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .alert-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          transition: all 0.3s ease;
        }
        
        .alert-item.warning {
          background: #fef3c7;
          border: 2px solid #fbbf24;
        }
        
        .alert-item.error {
          background: #fee2e2;
          border: 2px solid #ef4444;
        }
        
        .alert-item.info {
          background: #dbeafe;
          border: 2px solid #3b82f6;
        }
        
        .alert-icon {
          font-size: 1.5rem;
          min-width: 30px;
        }
        
        .alert-text {
          flex: 1;
          color: #4b5563;
          font-weight: 500;
        }
        
        .alert-btn {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }
        
        .alert-item.warning .alert-btn {
          background: #fbbf24;
          color: #92400e;
        }
        
        .alert-item.error .alert-btn {
          background: #ef4444;
          color: white;
        }
        
        .alert-item.info .alert-btn {
          background: #3b82f6;
          color: white;
        }
        
        .alert-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        
        .alert-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Quick Actions Section */
        .quick-actions-section {
          margin-bottom: 2rem;
        }
        
        .quick-actions-section h3 {
          margin: 0 0 1rem 0;
          font-size: 1.3rem;
          color: #8B4513;
          font-weight: 700;
        }
        
        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        
        .quick-action-btn {
          background: #ffffff;
          border: 1px solid #e7e2d8;
          border-radius: 12px;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 16px rgba(16, 24, 40, 0.08);
        }
        
        .quick-action-btn:hover {
          transform: translateY(-4px);
          box-shadow: 0 14px 28px rgba(16, 24, 40, 0.14);
          border-color: #d7c8ab;
          background: rgba(255, 255, 255, 0.62);
          backdrop-filter: blur(10px);
        }
        
        .quick-action-btn .action-icon {
          color: #243446;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        .quick-action-btn .action-label {
          font-size: 1rem;
          font-weight: 600;
          color: #243446;
        }
        
        /* Booking Tabs */
        .booking-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        
        .booking-tabs .tab {
          padding: 0.75rem 1.5rem;
          border: 1px solid #e1d8c7;
          background: #ffffff;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          color: #324355;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .booking-tabs .tab:hover {
          border-color: #cdbb99;
          background: #faf7f1;
        }
        
        .booking-tabs .tab.active {
          background: #f3ebdc;
          border-color: #c7b08c;
          color: #243446;
        }
        
        .booking-tabs .tab.expired-tab {
          border-color: #fbbf24;
        }
        
        .booking-tabs .tab.expired-tab.active {
          background: linear-gradient(135deg, #fbbf24 0%, #fef3c7 100%);
          border-color: #f59e0b;
        }
        
        /* Dismiss Button Style */
        .action-btn.dismiss {
          background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
          color: white;
          border: none;
        }
        
        .action-btn.dismiss:hover {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
        }
        
        .action-btn.dismiss:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .filters-section {
          background: #ffffff;
          border: 1px solid #e7e2d8;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 3rem;
          box-shadow: 0 10px 24px rgba(16, 24, 40, 0.08);
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
          color: #3f4f63;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .filter-group input,
        .filter-group select {
          padding: 0.8rem 1rem;
          border: 1px solid #d9dfe6;
          border-radius: 8px;
          font-size: 1rem;
          background: #ffffff;
          color: #243446;
          transition: all 0.3s ease;
        }
        
        .filter-group input:focus,
        .filter-group select:focus {
          outline: none;
          border-color: #8aa4c4;
          box-shadow: 0 0 0 3px rgba(138, 164, 196, 0.2);
        }
        
        .clear-filters-btn {
          background: #f5f7fa;
          color: #3f4f63;
          border: 1px solid #d9dfe6;
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
          background: rgba(255, 255, 255, 0.62);
          border-color: #c4d1de;
          backdrop-filter: blur(8px);
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
          color: #243446;
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
          background: #edf2f7;
          color: #324355;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 600;
          border: 1px solid #dbe3ec;
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
          background: #ffffff;
          border: 2px dashed #d9d2c4;
          border-radius: 16px;
          color: #647588;
        }
        
        .no-data-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.6;
        }
        
        .no-data h3 {
          font-size: 1.5rem;
          font-weight: 600;
          color: #243446;
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

      {/* Cancellation Modals */}
      <CancelConfirmModal
        modal={cancelConfirmModal}
        setModal={setCancelConfirmModal}
        onConfirm={handleDirectCancel}
        loading={cancelLoading}
      />

      <CancelRequestModal
        modal={cancelRequestModal}
        setModal={setCancelRequestModal}
        onSubmit={handleCancelRequest}
      />
    </div>
  );
}