// src/app/guest/dashboard/page.js
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

const Header = ({ guestName }) => {
    const router = useRouter();

    return (
        <header className="header">
            <div className="logo">
                <img src="/logo.png" alt="Logo" />
                <span>Resort Name</span>
            </div>
            <nav className="nav">
                <span onClick={() => router.push('/guest/dashboard')}>Dashboard</span>
                <span onClick={() => router.push('/guest/history')}>History</span>
                <span onClick={() => router.push('/guest/payment')}>Payment</span>
                <span onClick={() => router.push('/guest/chat')}>Chat</span>
            </nav>
            <div className="user-info">
                <button onClick={() => router.push('/guest/profile')} className="profile-button">Profile</button>
                <button onClick={() => signOut({ callbackUrl: '/login' })} className="signout-button">Sign Out</button>
            </div>
            <style jsx>{`
                .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background-color: #f7f7f7;
                    padding: 1rem 2rem;
                    border-bottom: 1px solid #e0e0e0;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                    color: #333;
                }
                .logo {
                    display: flex;
                    align-items: center;
                    font-weight: bold;
                    font-size: 1.5rem;
                }
                .logo img {
                    height: 40px;
                    margin-right: 10px;
                }
                .nav {
                    display: flex;
                    gap: 2rem;
                }
                .nav span {
                    cursor: pointer;
                    font-size: 1rem;
                    color: #555;
                    transition: color 0.2s ease-in-out;
                }
                .nav span:hover {
                    color: #000;
                }
                .user-info {
                    display: flex;
                    gap: 1rem;
                }
                .profile-button, .signout-button {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 500;
                    transition: background-color 0.2s ease-in-out;
                }
                .profile-button {
                    background-color: #ffc107;
                    color: #333;
                }
                .profile-button:hover {
                    background-color: #e0a800;
                }
                .signout-button {
                    background-color: #dc3545;
                    color: white;
                }
                .signout-button:hover {
                    background-color: #c82333;
                }
            `}</style>
        </header>
    );
};

const ReservationCard = ({ booking }) => {
    return (
        <div className="reservation-card">
            <div className="card-header">
                <h3>{booking.room.name}</h3>
                <span className="status-badge">
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
            </div>
            <div className="card-details">
                <p><strong>Check-in:</strong> {booking.checkIn}</p>
                <p><strong>Check-out:</strong> {booking.checkOut}</p>
                <p><strong>Guests:</strong> {booking.guests}</p>
            </div>
            <button className="view-details-btn">View Details</button>
            <style jsx>{`
                .reservation-card {
                    background-color: #ffffff;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                    transition: transform 0.2s ease-in-out;
                }
                .reservation-card:hover {
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
                    background-color: #007bff;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 500;
                    transition: background-color 0.2s ease-in-out;
                    margin-top: 1rem;
                }
                .view-details-btn:hover {
                    background-color: #0056b3;
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

export default function GuestDashboard() {
    const [guest, setGuest] = useState(null);
    const [bookings, setBookings] = useState([]);
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

    const activeBookings = bookings.filter(b => b.status === 'active');

    return (
        <div className="dashboard-container">
            <Header guestName={guest.name} />

            <main className="main-content">
                <section className="section-reservations">
                    <h2>Reservations</h2>
                    <div className="reservation-list">
                        {activeBookings.length > 0 ? (
                            activeBookings.map(b => <ReservationCard key={b.id} booking={b} />)
                        ) : (
                            <p className="no-data">No active reservations.</p>
                        )}
                    </div>
                </section>

                <hr className="divider" />

                <section className="section-notifications">
                    <h2>Notifications</h2>
                    <div className="notification-list">
                        {notifications.length > 0 ? (
                            notifications.map(n => <NotificationItem key={n.id} notification={n} />)
                        ) : (
                            <p className="no-data">No new notifications.</p>
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
                .section-reservations, .section-notifications {
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
                .reservation-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                .notification-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
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
                    .header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    .nav {
                        width: 100%;
                        justify-content: space-around;
                    }
                    .user-info {
                        width: 100%;
                        justify-content: space-around;
                    }
                    .main-content {
                        padding: 1rem;
                    }
                }
            `}</style>
        </div>
    );
}