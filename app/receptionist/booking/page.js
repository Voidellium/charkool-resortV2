'use client';

export default function BookingPage() {
  return (
    <div className="booking-redirect">
      <div className="redirect-card">
        <div className="redirect-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19ZM7 10H9V12H7V10ZM11 10H13V12H11V10ZM15 10H17V12H15V10Z" fill="#059669"/>
          </svg>
        </div>
        <h2>Booking Management</h2>
        <p>All booking functionality is integrated in the main receptionist dashboard. Please use the main dashboard for:</p>
        <ul>
          <li>📅 Viewing and managing bookings</li>
          <li>🏠 Checking room availability</li>
          <li>👥 Guest check-in/check-out</li>
          <li>📊 Booking statistics and reports</li>
          <li>🔔 Real-time notifications</li>
        </ul>
        <button onClick={() => window.location.href = '/receptionist'} className="back-button">
          Go to Main Dashboard
        </button>
      </div>

      <style jsx>{`
        .booking-redirect {
          min-height: 80vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .redirect-card {
          background: white;
          padding: 3rem;
          border-radius: 1rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 500px;
          width: 100%;
        }

        .redirect-icon {
          margin-bottom: 1.5rem;
        }

        .redirect-card h2 {
          color: #1f2937;
          font-size: 1.8rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .redirect-card p {
          color: #6b7280;
          font-size: 1rem;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .redirect-card ul {
          text-align: left;
          margin: 1.5rem 0;
          padding-left: 0;
          list-style: none;
        }

        .redirect-card li {
          color: #374151;
          margin: 0.8rem 0;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f3f4f6;
          font-weight: 500;
        }

        .back-button {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: white;
          border: none;
          padding: 0.8rem 2rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 1rem;
        }

        .back-button:hover {
          background: linear-gradient(135deg, #047857 0%, #065f46 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
        }

        @media (max-width: 768px) {
          .redirect-card {
            padding: 2rem;
            margin: 1rem;
          }

          .redirect-card h2 {
            font-size: 1.5rem;
          }

          .back-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}