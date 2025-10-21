'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Image from 'next/image';

function ConfirmationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  const [booking, setBooking] = useState(null);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data);
          // Clear localStorage for completed bookings to allow new bookings
          if (data.status === 'Confirmed' || data.paymentStatus === 'Paid') {
            localStorage.removeItem('bookingId');
            localStorage.removeItem('bookingAmount');
          }
        }
      } catch (error) {
        console.error('Failed to fetch booking:', error);
      }
    }
    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const goToDashboard = () => {
    router.push('/guest/dashboard');
  };

  return (
    <>
      <div className="confirmation-wrapper">
        <div className="confirmation-card">
          <div className="confirmation-left">
            <Image src="/images/logo.png" alt="Charkool Logo" width={140} height={140} className="logo-img"/>
            <p className="tagline">Thank You for Choosing<br/>Charkool Leisure Beach Resort</p>
          </div>
          <div className="confirmation-right">
            <h2 className="confirmation-title">Booking Confirmed!</h2>
            
            {booking ? (
              <div className="booking-details">
                <div className="detail-section guest-info">
                  <div className="section-header">
                    <h3>Guest Information</h3>
                  </div>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Guest Name</span>
                      <span className="info-value">{booking.guestName || booking.user?.name || 'Guest'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email Address</span>
                      <span className="info-value">{booking.user?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section booking-info">
                  <div className="section-header">
                    <h3>Booking Details</h3>
                  </div>
                  <div className="info-grid">
                    <div className="info-item full-width">
                      <span className="info-label">Room Type</span>
                      <span className="info-value">
                        {Array.isArray(booking.rooms) && booking.rooms.length > 0
                          ? booking.rooms.map((r, idx) => (
                              <span key={idx} className="room-detail">
                                {r.room?.name || r.roomType?.name || 'Room'} × {r.quantity}
                                {idx < booking.rooms.length - 1 ? ', ' : ''}
                              </span>
                            ))
                          : booking.room?.name || booking.room || 'N/A'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Check-in Date</span>
                      <span className="info-value">{new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Check-out Date</span>
                      <span className="info-value">{new Date(booking.checkOut).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Duration</span>
                      <span className="info-value">{Math.ceil((new Date(booking.checkOut) - new Date(booking.checkIn)) / (1000 * 60 * 60 * 24))} night(s)</span>
                    </div>
                  </div>
                </div>

                <div className="status-section">
                  <div className={`status-badge payment-status ${booking.paymentStatus.toLowerCase()}`}>
                    <div className="badge-header">
                      <span className="badge-title">Payment Status</span>
                    </div>
                    <div className="badge-content">
                      {booking.paymentStatus === 'Paid' ? (
                        <>
                          <span className="status-main">Fully Paid</span>
                          <span className="amount-paid">₱{(booking.payments?.reduce((sum, p) => sum + p.amount, 0) / 100).toLocaleString()}</span>
                        </>
                      ) : booking.paymentStatus === 'Reservation' ? (
                        <>
                          <span className="status-main">Reservation Paid</span>
                          <span className="amount-paid">Paid: ₱{(booking.payments?.reduce((sum, p) => sum + p.amount, 0) / 100).toLocaleString()}</span>
                          <span className="amount-remaining">Balance: ₱{((booking.totalPrice - (booking.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)) / 100).toLocaleString()}</span>
                        </>
                      ) : (
                        <span className="status-main">Pending</span>
                      )}
                    </div>
                  </div>
                  
                  <div className={`status-badge booking-status ${booking.status.toLowerCase()}`}>
                    <div className="badge-header">
                      <span className="badge-title">Booking Status</span>
                    </div>
                    <div className="badge-content">
                      <span className="status-main">{booking.status}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section amenities-info">
                  <div className="section-header">
                    <h3>Amenities</h3>
                  </div>
                  <div className="amenities-list">
                    {booking.paymentStatus === 'Pending' ? (
                      <span className="amenity-pending">Amenities reserved (payment pending)</span>
                    ) : (
                      <>
                        {[
                          ...(booking.optionalAmenities?.map(a => ({ name: a.optionalAmenity.name, qty: a.quantity })) || []),
                          ...(booking.rentalAmenities?.map(a => ({ name: a.rentalAmenity.name, qty: a.quantity })) || [])
                        ].length > 0 ? (
                          [
                            ...(booking.optionalAmenities?.map(a => ({ name: a.optionalAmenity.name, qty: a.quantity })) || []),
                            ...(booking.rentalAmenities?.map(a => ({ name: a.rentalAmenity.name, qty: a.quantity })) || [])
                          ].map((amenity, idx) => (
                            <div key={idx} className="amenity-item">
                              <span className="amenity-name">{amenity.name}</span>
                              <span className="amenity-qty">×{amenity.qty}</span>
                            </div>
                          ))
                        ) : (
                          <span className="no-amenities">No additional amenities selected</span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {booking.paymentStatus === 'Pending' && (
                  <div className="notice-box">
                    <div className="notice-content">
                      <strong>Important Notice</strong>
                      <p>Your reservation is confirmed, but amenities will be activated once payment is completed.</p>
                    </div>
                  </div>
                )}

                <button className="primary-btn" onClick={goToDashboard}>
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="loading">
                <div className="spinner"></div>
                <p>Loading booking details...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        :root, html, body, #__next {
          height: 100%;
          margin: 0;
          padding: 0;
        }
        * { box-sizing: border-box; }
        body {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          height: 100vh;
          width: 100vw;
          overflow: auto;
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        #__next > div { height: 100%; }
      `}</style>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .confirmation-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fcd34d 100%);
          padding: 2rem 1rem;
          font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .confirmation-wrapper::before {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(254, 190, 82, 0.3) 0%, transparent 70%);
          border-radius: 50%;
          top: -250px;
          right: -250px;
          animation: float 6s ease-in-out infinite;
        }

        .confirmation-wrapper::after {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(252, 211, 77, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          bottom: -200px;
          left: -200px;
          animation: float 8s ease-in-out infinite reverse;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        .confirmation-card {
          background: white;
          border-radius: 24px;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.12),
            0 10px 20px rgba(0, 0, 0, 0.08);
          overflow: hidden;
          display: flex;
          width: 950px;
          max-width: 95%;
          position: relative;
          z-index: 1;
          animation: slideUp 0.6s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .confirmation-left {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          padding: 3rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #7c2d12;
          width: 38%;
          position: relative;
          overflow: hidden;
        }

        .confirmation-left::before {
          content: '';
          position: absolute;
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          top: -100px;
          left: -100px;
        }

        .confirmation-left::after {
          content: '';
          position: absolute;
          width: 150px;
          height: 150px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 50%;
          bottom: -75px;
          right: -75px;
        }

        .logo-img {
          margin-bottom: 1.5rem;
          border-radius: 20px;
          background: white;
          padding: 1rem;
          box-shadow: 
            0 10px 25px rgba(0, 0, 0, 0.15),
            0 4px 10px rgba(0, 0, 0, 0.1);
          transition: transform 0.3s ease;
          z-index: 2;
          position: relative;
        }

        .logo-img:hover {
          transform: scale(1.05);
        }

        .tagline {
          text-align: center;
          font-size: 1.1rem;
          line-height: 1.7;
          margin: 0;
          font-weight: 600;
          color: #78350f;
          text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
          z-index: 2;
          position: relative;
        }

        .confirmation-right {
          padding: 3rem 2.5rem;
          flex: 1;
          background: #ffffff;
          animation: fadeIn 0.5s ease-out 0.3s both;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .confirmation-title {
          color: #1f2937;
          margin: 0 0 2rem;
          font-size: 2rem;
          font-weight: 700;
          text-align: center;
          letter-spacing: -0.5px;
          animation: bounceIn 0.6s ease-out 0.5s both;
        }

        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }

        .booking-details {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .detail-section {
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          padding: 1.5rem;
          border-radius: 16px;
          border: 2px solid #fde68a;
          box-shadow: 0 4px 15px rgba(251, 191, 36, 0.1);
          transition: all 0.3s ease;
          animation: slideInUp 0.5s ease-out both;
        }

        .detail-section:nth-child(1) { animation-delay: 0.1s; }
        .detail-section:nth-child(2) { animation-delay: 0.2s; }
        .detail-section:nth-child(3) { animation-delay: 0.3s; }
        .detail-section:nth-child(4) { animation-delay: 0.4s; }

        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .detail-section:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(251, 191, 36, 0.15);
        }

        .section-header {
          display: flex;
          align-items: center;
          margin-bottom: 1.25rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #fbbf24;
        }

        .section-header h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #78350f;
          letter-spacing: 0.3px;
        }

        .info-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .info-item.full-width {
          grid-column: 1 / -1;
        }

        .room-detail {
          display: inline;
        }

        .info-label {
          font-size: 0.85rem;
          color: #92400e;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          font-size: 1rem;
          color: #1f2937;
          font-weight: 600;
        }

        .status-section {
          display: grid;
          gap: 1rem;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          animation: slideInUp 0.5s ease-out 0.3s both;
        }

        .status-badge {
          background: white;
          padding: 1.5rem;
          border-radius: 16px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
          transition: all 0.3s ease;
          border: 2px solid transparent;
        }

        .status-badge:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
        }

        .status-badge.paid,
        .status-badge.reservation {
          border-color: #10b981;
          background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
        }

        .status-badge.pending {
          border-color: #f59e0b;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
        }

        .status-badge.confirmed {
          border-color: #3b82f6;
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        }

        .badge-header {
          display: flex;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .badge-title {
          font-size: 0.85rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #6b7280;
        }

        .badge-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .status-main {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }

        .amount-paid {
          font-size: 1rem;
          font-weight: 600;
          color: #059669;
        }

        .amount-remaining {
          font-size: 0.9rem;
          font-weight: 600;
          color: #dc2626;
        }

        .amenities-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .amenity-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border-radius: 10px;
          border: 1px solid #fde68a;
          transition: all 0.2s ease;
        }

        .amenity-item:hover {
          background: #fffbeb;
          transform: translateX(5px);
        }

        .amenity-name {
          flex: 1;
          color: #1f2937;
          font-weight: 600;
        }

        .amenity-qty {
          background: #fbbf24;
          color: #78350f;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .amenity-pending,
        .no-amenities {
          color: #6b7280;
          font-style: italic;
          text-align: center;
          padding: 1rem;
        }

        .notice-box {
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
          border: 2px solid #fb923c;
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          align-items: flex-start;
        }

        .notice-content {
          flex: 1;
        }

        .notice-content strong {
          display: block;
          color: #9a3412;
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        .notice-content p {
          margin: 0;
          color: #9a3412;
          font-size: 0.95rem;
          line-height: 1.5;
        }

        .primary-btn {
          width: 100%;
          padding: 1.1rem 1.5rem;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          color: #7c2d12;
          border: none;
          border-radius: 12px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(251, 191, 36, 0.3);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-top: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }

        .primary-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .primary-btn:hover::before {
          left: 100%;
        }

        .primary-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(251, 191, 36, 0.4);
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .primary-btn:active {
          transform: translateY(-1px);
        }

        .loading {
          text-align: center;
          padding: 3rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #fde68a;
          border-top-color: #f59e0b;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading p {
          color: #6b7280;
          font-size: 1rem;
          font-weight: 600;
          margin: 0;
        }

        @media (max-width: 968px) {
          .confirmation-card {
            flex-direction: column;
            width: 90%;
          }

          .confirmation-left {
            width: 100%;
            padding: 2rem 1.5rem;
          }

          .confirmation-right {
            padding: 2rem 1.5rem;
          }
        }

        @media (max-width: 768px) {
          .confirmation-wrapper {
            padding: 1rem;
          }

          .confirmation-card {
            width: 100%;
          }

          .confirmation-title {
            font-size: 1.6rem;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .status-section {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .confirmation-wrapper {
            padding: 0.5rem;
          }

          .confirmation-right {
            padding: 1.5rem 1rem;
          }

          .confirmation-title {
            font-size: 1.4rem;
          }

          .detail-section {
            padding: 1rem;
          }

          .section-header h3 {
            font-size: 1rem;
          }

          .primary-btn {
            padding: 1rem;
            font-size: 1rem;
          }
        }
      `}</style>
    </>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="loading">Loading booking details...</div>}>
      <ConfirmationPageInner />
    </Suspense>
  );
}