'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';

const Header = () => {
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

const BookingCard = ({ booking }) => {
    return (
        <div className="booking-card">
            <div className="card-header">
                <h3>{booking.room.name}</h3>
                <span className={`status-badge ${booking.status.toLowerCase()}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
            </div>
            <div className="card-details">
                <p><strong>Check-in:</strong> {booking.checkIn}</p>
                <p><strong>Check-out:</strong> {booking.checkOut}</p>
                <p><strong>Total:</strong> ${booking.totalAmount}</p>
            </div>
            <style jsx>{`
                .booking-card {
                    background-color: #ffffff;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 1.5rem;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                    transition: transform 0.2s ease-in-out;
                }
                .booking-card:hover {
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
                    padding: 0.3rem 0.8rem;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: bold;
                    color: white;
                }
                .status-badge.confirmed {
                    background-color: #28a745;
                }
                .status-badge.pending {
                    background-color: #FEBE52;
                }
                .status-badge.cancelled {
                    background-color: #dc3545;
                }
                .card-details p {
                    margin: 0.5rem 0;
                    font-size: 0.95rem;
                    color: #666;
                }
            `}</style>
        </div>
    );
};

export default function History() {
    const [bookings, setBookings] = useState([]);
    const router = useRouter();

    useEffect(() => {
        async function fetchBookings() {
            try {
                const res = await fetch('/api/bookings');
                if (!res.ok) throw new Error('Failed to fetch bookings');
                const data = await res.json();
                setBookings(data.bookings || []);
            } catch (err) {
                console.error(err);
                router.push('/login');
            }
        }
        fetchBookings();
    }, [router]);

    if (bookings.length === 0) {
        return (
            <div className="history-container">
                <Header />
                <main className="main-content">
                    <h1>Booking History</h1>
                    <p className="no-data">No booking history available.</p>
                </main>
                <style jsx>{`
                    .history-container {
                        background-color: #f0f2f5;
                        min-height: 100vh;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    }
                    .main-content {
                        padding: 2rem;
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    h1 {
                        font-size: 2rem;
                        font-weight: 600;
                        color: #333;
                        margin-bottom: 1.5rem;
                        border-bottom: 2px solid #ffc107;
                        padding-bottom: 0.5rem;
                    }
                    .no-data {
                        color: #777;
                        font-style: italic;
                        text-align: center;
                        padding: 2rem;
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="history-container">
            <Header />
            <main className="main-content">
                <h1>Booking History</h1>
                <div className="booking-list">
                    {bookings.map((booking) => (
                        <BookingCard key={booking.id} booking={booking} />
                    ))}
                </div>
            </main>

            <style jsx>{`
                .history-container {
                    background-color: #f0f2f5;
                    min-height: 100vh;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                }
                .main-content {
                    padding: 2rem;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                h1 {
                    font-size: 2rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 1.5rem;
                    border-bottom: 2px solid #ffc107;
                    padding-bottom: 0.5rem;
                }
                .booking-list {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
            `}</style>
        </div>
    );
}