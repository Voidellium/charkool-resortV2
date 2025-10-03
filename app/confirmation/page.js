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
            <Image src="/images/logo.png" alt="Charkool Logo" width={150} height={150} className="logo-img"/>
            <p className="tagline">Thank You for Choosing<br/>Charkool Leisure Beach Resort</p>
          </div>
          <div className="confirmation-right">
            <h2 className="confirmation-title">Booking Confirmed!</h2>
            
            {booking ? (
              <div className="booking-details">
                <div className="detail-section">
                  <h3>Guest Information</h3>
                  <p><strong>Guest:</strong> {booking.guestName || booking.user?.name || 'Guest'}</p>
                  <p><strong>Email:</strong> {booking.user?.email || 'N/A'}</p>
                </div>

                <div className="detail-section">
                  <h3>Booking Details</h3>
                  <p><strong>Room:</strong> {booking.room?.name || booking.room}</p>
                  <p><strong>Check-in:</strong> {new Date(booking.checkIn).toLocaleDateString()}</p>
                  <p><strong>Check-out:</strong> {new Date(booking.checkOut).toLocaleDateString()}</p>
                </div>

                <div className="status-section">
                <div className={`status-badge ${booking.paymentStatus.toLowerCase()}`}>
                  Payment Status: {
                    booking.paymentStatus === 'Paid' ? 
                      `Paid (Full Payment) - ₱${(booking.payments?.reduce((sum, p) => sum + p.amount, 0) / 100).toFixed(0)}` :
                    booking.paymentStatus === 'Partial' ?
                      `Paid (Partial Payment) - ₱${(booking.payments?.reduce((sum, p) => sum + p.amount, 0) / 100).toFixed(0)} | To be paid: ₱${((booking.totalPrice - (booking.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)) / 100).toFixed(0)}` :
                    'Pending'
                  }
                </div>
                  <div className={`status-badge ${booking.status.toLowerCase()}`}>
                    Booking Status: {booking.status}
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Amenities</h3>
                  <p>{
                    booking.paymentStatus === 'Pending' ?
                      'Amenities reserved (payment pending)' :
                      [
                        ...(booking.optionalAmenities?.map(a => `${a.optionalAmenity.name} (x${a.quantity})`) || []),
                        ...(booking.rentalAmenities?.map(a => `${a.rentalAmenity.name} (x${a.quantity})`) || [])
                      ].join(', ') || 'None'
                  }</p>
                </div>

                {booking.paymentStatus === 'Pending' && (
                  <div className="notice-box">
                    <p>
                      <strong>Note:</strong> Your reservation is confirmed, but amenities will be activated once payment is completed.
                    </p>
                  </div>
                )}

                <button className="primary-btn" onClick={goToDashboard}>
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="loading">Loading booking details...</div>
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
          background: linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          height: 100vh;
          width: 100vw;
          overflow: auto;
        }
        #__next > div { height: 100%; }
      `}</style>

      <style jsx>{`
        .confirmation-wrapper {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px 0;
        }
        .confirmation-card {
          width: min(860px, 94%);
          display: flex;
          flex-direction: column;
          background: rgba(255,255,255,0.96);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 14px 36px rgba(15,23,42,0.15);
        }
        .confirmation-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, rgba(255,246,230,1), rgba(255,242,213,1));
          padding: 24px;
          text-align: center;
        }
        .logo-img { width: 150px; height: auto; margin-bottom: 12px; }
        .tagline { font-size: 1rem; color: #374151; line-height: 1.4; margin: 0; }
        .confirmation-right {
          flex: 1;
          padding: 20px;
          background: #fff;
        }
        @media (min-width: 768px) {
          .confirmation-card { flex-direction: row; }
          .confirmation-left { padding: 36px; }
          .confirmation-right { padding: 36px; }
        }
        .confirmation-title {
          font-size: 1.8rem;
          font-weight: 700;
          text-align: center;
          color: #0f172a;
          margin: 0 0 24px 0;
        }
        .booking-details {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .detail-section {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
        }
        .detail-section h3 {
          margin: 0 0 12px 0;
          font-size: 1.1rem;
          color: #0f172a;
        }
        .detail-section p {
          margin: 8px 0;
          color: #334155;
          font-size: 0.95rem;
        }
        .status-section {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .status-badge {
          flex: 1;
          min-width: 200px;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .status-badge.paid {
          background-color: #d1fae5;
          color: #065f46;
        }
        .status-badge.pending {
          background-color: #fff7ed;
          color: #9a3412;
        }
        .status-badge.confirmed {
          background-color: #dbeafe;
          color: #1e40af;
        }
        .notice-box {
          background-color: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 8px;
          padding: 16px;
        }
        .notice-box p {
          margin: 0;
          color: #9a3412;
          font-size: 0.95rem;
        }
        .primary-btn {
          width: 100%;
          padding: 12px;
          background-color: #f59e0b;
          color: white;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.15s, transform 0.06s;
        }
        .primary-btn:hover {
          background-color: #d97706;
          transform: translateY(-1px);
        }
        .loading {
          text-align: center;
          color: #6b7280;
          font-size: 0.95rem;
          padding: 24px;
        }
        @media (max-width: 420px) {
          .confirmation-card {
            border-radius: 0;
            box-shadow: none;
            min-height: 100vh;
          }
          .confirmation-right { padding: 14px; }
          .confirmation-title { font-size: 1.4rem; margin-bottom: 16px; }
          .logo-img { width: 120px; }
          .status-badge { min-width: 100%; }
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