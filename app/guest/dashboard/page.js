'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BookingCalendar from '../../../components/BookingCalendar'; // Import calendar



// Move the modal to a higher level in the DOM
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

  if (!show) {
    return null;
  }

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
          backdrop-filter: blur(5px);
          padding: 20px;
          box-sizing: border-box;
        }
        .modal-content {
          background-color: #fff;
          padding: 2rem;
          border-radius: 12px;
          position: relative;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          width: 800px;
          max-width: 100%;
          height: auto;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          transform: translateZ(0);
          will-change: transform;
          animation: modalEnter 0.3s ease-out;
        }
        .modal-scroll-content {
          overflow-y: auto;
          padding: 0 20px;
          margin: 0 -20px;
          flex: 1;
          -webkit-overflow-scrolling: touch;
        }
        .modal-scroll-content::-webkit-scrollbar {
          width: 8px;
        }
        .modal-scroll-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .modal-scroll-content::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        .close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(0, 0, 0, 0.1);
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #333;
          z-index: 1;
          padding: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .close-btn:hover {
          background-color: rgba(0, 0, 0, 0.2);
          transform: scale(1.1);
        }
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 0;
          }
          .modal-content {
            width: 100%;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
            padding: 1.5rem;
          }
          .close-btn {
            top: 10px;
            right: 10px;
          }
        }
      `}</style>
    </div>
  );
};

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

  if (!show) {
    return null;
  }

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
          backdrop-filter: blur(5px);
          padding: 20px;
          box-sizing: border-box;
        }
        .modal-content {
          background-color: #fff;
          padding: 2rem;
          border-radius: 12px;
          position: relative;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          width: 800px;
          max-width: 100%;
          height: auto;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          transform: translateZ(0);
          will-change: transform;
          animation: modalEnter 0.3s ease-out;
        }
        .modal-scroll-content {
          overflow-y: auto;
          padding: 0 20px;
          margin: 0 -20px;
          flex: 1;
          -webkit-overflow-scrolling: touch;
        }
        .modal-scroll-content::-webkit-scrollbar {
          width: 8px;
        }
        .modal-scroll-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .modal-scroll-content::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 4px;
        }
        .close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: rgba(0, 0, 0, 0.1);
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #333;
          z-index: 1;
          padding: 0;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.2s;
        }
        .close-btn:hover {
          background-color: rgba(0, 0, 0, 0.2);
          transform: scale(1.1);
        }
        @keyframes modalEnter {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @media (max-width: 768px) {
          .modal-overlay {
            padding: 0;
          }
          .modal-content {
            width: 100%;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
            padding: 1.5rem;
          }
          .close-btn {
            top: 10px;
            right: 10px;
          }
        }
      `}</style>
    </div>
  );
};

// Booking History Section
const BookingHistoryCard = ({ booking, guest }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [availabilityData, setAvailabilityData] = useState({});
  const [newDates, setNewDates] = useState({ checkIn: null, checkOut: null });

  const handleOpenDetailsModal = () => setShowDetailsModal(true);
  const handleCloseDetailsModal = () => setShowDetailsModal(false);

  const handleOpenRescheduleModal = async () => {
    // Fetch availability for the calendar
    try {
      const res = await fetch('/api/availability');
      if (res.ok) {
        const data = await res.json();
        setAvailabilityData(data.availability || {});
      }
    } catch (err) {
      console.error('Failed to load availability for rescheduling:', err);
    }
    setShowRescheduleModal(true);
  };

  const handleCloseRescheduleModal = () => setShowRescheduleModal(false);

  const handleDateChange = ({ checkInDate, checkOutDate }) => {
    setNewDates({ checkIn: checkInDate, checkOut: checkOutDate });
  };

  const handleRescheduleSubmit = async () => {
    if (!newDates.checkIn || !newDates.checkOut) {
      alert('Please select new check-in and check-out dates.');
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${booking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkIn: newDates.checkIn, checkOut: newDates.checkOut }),
      });

      if (res.ok) {
        alert('Your reschedule request has been submitted successfully!');
      } else {
        throw new Error('Failed to submit request.');
      }
    } catch (err) {
      console.error('Reschedule submission error:', err);
      alert('An error occurred. Please try again.');
    }
    handleCloseRescheduleModal();
  };

  // Safely get the guest's full name with a more robust approach
  const guestFirstName = guest?.firstName || '';
  const guestLastName = guest?.lastName || '';
  const guestName = (guestFirstName || guestLastName) ? `${guestFirstName} ${guestLastName}`.trim() : 'N/A';

  const isRescheduleAllowed = () => {
    const now = new Date();
    const checkInDate = new Date(booking.checkIn);
    const checkOutDate = new Date(booking.checkOut);

    return booking.status !== 'Cancelled' && now <= checkOutDate;
  };

  return (
    <div className="booking-history-card">
      <div className="card-header">
        <h3>{booking.room.name} - {booking.room.type}</h3>
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
        <p><strong>Booked on:</strong> {new Date(booking.createdAt).toLocaleDateString('en-US', { 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric',
        })} at {new Date(booking.createdAt).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}</p>
        <p><strong>Guests:</strong> {booking.guests}</p>
        <p><strong>Payment Status:</strong> {booking.payments && booking.payments.length > 0 ? 'Paid' : 'Pending'}</p>
        <p><strong>Total Paid:</strong> ₱{(booking.payments.reduce((sum, p) => sum + p.amount, 0) / 100).toFixed(0)}</p>
      </div>
      <div className="card-actions">
        <button className="view-details-btn" onClick={handleOpenDetailsModal}>
          View Details
        </button>
        {isRescheduleAllowed() && (
          <button className="reschedule-btn" onClick={handleOpenRescheduleModal}>Reschedule</button>
        )}
      </div>

      <PortalModal show={showDetailsModal} onClose={handleCloseDetailsModal}>
        <h2>Booking Details</h2>
        <div className="modal-details-content">
          <p><strong>Room:</strong> {booking.room.name} - {booking.room.type}</p>
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
          <p><strong>Booked on:</strong> {new Date(booking.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })} at {new Date(booking.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}</p>
          <p><strong>Guest Name:</strong> {guestName}</p>
          <p><strong>Number of Guests:</strong> {booking.guests}</p>
          <p><strong>Booking Status:</strong> {booking.status}</p>
        </div>
      </PortalModal>

      <PortalModal show={showRescheduleModal} onClose={handleCloseRescheduleModal}>
        <h2>Request Reschedule</h2>
        <p>Booking ID: {booking.id} ({booking.room.name})</p>
        <p>Original Dates: {booking.checkIn} to {booking.checkOut}</p>
        <div className="calendar-wrapper">
          <BookingCalendar availabilityData={availabilityData} onDateChange={handleDateChange} />
        </div>
        <button 
          className="submit-request-btn" 
          onClick={handleRescheduleSubmit}
          disabled={!newDates.checkIn || !newDates.checkOut}>
          Submit Request
        </button>
      </PortalModal>

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
          gap: 10px;
          margin-top: 1rem;
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
        .submit-request-btn {
          margin-top: 1rem;
          width: 100%;
          padding: 0.8rem;
          background-color: #28a745;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          cursor: pointer;
        }
        .view-details-btn:hover {
          background-color: #DBA90F;
        }
      `}</style>
    </div>
  );
};

// Payment History Section
const PaymentHistoryCard = ({ payment }) => {
  const [showModal, setShowModal] = useState(false);

  const handleOpenModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  return (
    <div className="payment-history-card">
      <div className="card-header">
        <h3>Payment for {payment.room?.name || 'N/A'}</h3>
        <span className="status-badge">
          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
        </span>
      </div>
      <div className="card-details">
        <p><strong>Amount:</strong> ₱{payment.amount}</p>
        <p><strong>Method:</strong> {payment.method || 'N/A'}</p>
        <p><strong>Date:</strong> {new Date(payment.date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })} at {new Date(payment.date).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}</p>
      </div>
      <div className="card-actions">
        <button className="view-details-btn" onClick={() => handleOpenModal(payment)}>
          View Details
        </button>
      </div>

      <Modal show={showModal} onClose={handleCloseModal}>
        <h2>Payment Details</h2>
        <div className="modal-details-content">
          <p><strong>Amount:</strong> ₱{payment.amount}</p>
          <p><strong>Method:</strong> {payment.method}</p>
          <p><strong>Payment Date:</strong> {new Date(payment.date).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          })} at {new Date(payment.date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}</p>
          <p><strong>Payment Status:</strong> {payment.status}</p>
        </div>
      </Modal>

      <style jsx>{`
        .payment-history-card {
          background-color: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          transition: transform 0.2s ease-in-out;
        }
        .payment-history-card:hover {
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
        .view-details-btn {
          background-color: #FEBE54;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          transition: background-color 0.3s ease;
          margin-top: 1rem;
        }
        .view-details-btn:hover {
          background-color: #FEBE54;
        }
      `}</style>
    </div>
  );
};

// Notification Item Component
const NotificationItem = ({ notification }) => {
  return (
    <div className="notification-item">
      <p className="notification-message">{notification.message}</p>
      <small className="notification-date">
        {new Date(notification.createdAt).toLocaleDateString()}
      </small>
      <button className="dismiss-btn">×</button>
      <style jsx>{`
        .notification-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #f0f0f0;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border: 1px solid #e0e0e0;
        }
        .notification-message {
          margin: 0;
          font-size: 1rem;
          color: #333;
        }
        .notification-date {
          color: #777;
          font-size: 0.85rem;
          margin-left: 1rem;
        }
        .dismiss-btn {
          background: transparent;
          border: none;
          color: #999;
          font-size: 1.5rem;
          cursor: pointer;
          transition: color 0.2s ease-in-out;
        }
        .dismiss-btn:hover {
          color: #333;
        }
      `}</style>
    </div>
  );
};

// Main Dashboard Component
export default function GuestDashboard() {
  const [guest, setGuest] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const router = useRouter();

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
      } catch (err) {
        console.error('Error fetching guest info:', err);
        router.push('/login'); // redirect if not logged in
      }
    }

    async function fetchPayments() {
      try {
        const res = await fetch('/api/guest/payment', {
          method: 'GET',
        });

        if (res.ok) {
          const data = await res.json();
          setPayments(data || []);
        }
      } catch (err) {
        console.error('Error fetching payments:', err);
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

    fetchData();
    fetchPayments();
    fetchNotifications();
  }, [router]);

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
        <section className="section-history">
          <h2>Booking History</h2>
          <div className="history-list">
            {bookings.length > 0 ? (
              bookings.map(b => <BookingHistoryCard key={b.id} booking={b} guest={guest} />)
            ) : (
              <p className="no-data">No booking history.</p>
            )}
          </div>
        </section>

        <hr className="divider" />

        <section className="section-payments">
          <h2>Payment History</h2>
          <div className="payment-list">
            {payments.length > 0 ? (
              payments.map(p => <PaymentHistoryCard key={p.id} payment={p} />)
            ) : (
              <p className="no-data">No payment history.</p>
            )}
          </div>
        </section>
      </main>

      <style jsx>{`
        .dashboard-container {
          background-color: #f0f2f5;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }
        .main-content {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .section-history, .section-payments {
          margin-bottom: 2rem;
        }
        h2 {
          font-size: 2rem;
          font-weight: 600;
          color: #333;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid #ffc107;
          padding-bottom: 0.5rem;
        }
        .history-list, .payment-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .divider {
          border: none;
          border-top: 1px solid #e0e0e0;
          margin: 2rem 0;
        }
        .no-data {
          color: #777;
          font-style: italic;
          text-align: center;
          padding: 2rem;
        }
        @media (max-width: 768px) {
          .main-content {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}