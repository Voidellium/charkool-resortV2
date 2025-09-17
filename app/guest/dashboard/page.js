// src/app/guest/dashboard/page.js
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUser, FaBell } from 'react-icons/fa';
import { MdCamera, MdChat } from 'react-icons/md';

// Removed the 'Header' component since it's an inline navbar.

const BookingHistoryCard = ({ booking }) => {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="booking-history-card">
            <div className="card-header">
                <h3>{booking.room.name} - {booking.room.type}</h3>
                <span className="status-badge">
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
            </div>
            <div className="card-details">
                <p><strong>Check-in:</strong> {booking.checkIn}</p>
                <p><strong>Check-out:</strong> {booking.checkOut}</p>
                <p><strong>Guests:</strong> {booking.guests}</p>
                <p><strong>Payment Status:</strong> {booking.payments && booking.payments.length > 0 ? 'Paid' : 'Pending'}</p>
                <p><strong>Total Paid:</strong> ${booking.payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</p>
            </div>
            <button className="view-details-btn" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? 'Hide Details' : 'View Details'}
            </button>
            {showDetails && (
                <div className="details-section">
                    {/* Add more detailed booking info here */}
                    <p><strong>Booking ID:</strong> {booking.id}</p>
                    <p><strong>Status:</strong> {booking.status}</p>
                    {/* Add any other relevant details */}
                </div>
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
                .view-details-btn {
                    background-color: #6200ee;
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
                    background-color: #3700b3;
                }
                .details-section {
                    margin-top: 1rem;
                    padding: 1rem;
                    background-color: #f9f9f9;
                    border-radius: 6px;
                    border: 1px solid #ddd;
                    color: #333;
                }
            `}</style>
        </div>
    );
};

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

const PaymentHistoryCard = ({ payment }) => {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="payment-history-card">
            <div className="card-header">
                <h3>Payment for {payment.booking.room.name}</h3>
                <span className="status-badge">
                    {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                </span>
            </div>
            <div className="card-details">
                <p><strong>Amount:</strong> ${payment.amount.toFixed(2)}</p>
                <p><strong>Method:</strong> {payment.method}</p>
                <p><strong>Date:</strong> {new Date(payment.createdAt).toLocaleDateString()}</p>
            </div>
            <button className="view-details-btn" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? 'Hide Details' : 'View Details'}
            </button>
            {showDetails && (
                <div className="details-section">
                    {/* Add more detailed payment info here */}
                    <p><strong>Payment ID:</strong> {payment.id}</p>
                    <p><strong>Status:</strong> {payment.status}</p>
                    {/* Add any other relevant details */}
                </div>
            )}
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
                    background-color: #6200ee;
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
                    background-color: #3700b3;
                }
                .details-section {
                    margin-top: 1rem;
                    padding: 1rem;
                    background-color: #f9f9f9;
                    border-radius: 6px;
                    border: 1px solid #ddd;
                    color: #333;
                }
            `}</style>
        </div>
    );
};

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
            {/* The header is now removed from this component and will be provided by the layout. */}
            <main className="main-content">
                <section className="section-history">
                    <h2>Booking History</h2>
                    <div className="history-list">
                        {bookings.length > 0 ? (
                            bookings.map(b => <BookingHistoryCard key={b.id} booking={b} />)
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

// Removed the 'NotificationItem' component as it's not being used in the main component.
// Removed the `FaBell` and `MdChat` imports since they are not used anymore.