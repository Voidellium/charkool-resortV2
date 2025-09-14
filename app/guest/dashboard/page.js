// src/app/guest/dashboard/page.js
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

  if (!guest) return <p>Loading dashboard...</p>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Welcome, {guest.name}</h1>
      <p>Email: {guest.email}</p>

      <hr />

      {/* Notifications */}
      <h2>Notifications</h2>
      {notifications.length > 0 ? (
        notifications.map(n => (
          <div key={n.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
            <p>{n.message}</p>
            <small>{new Date(n.createdAt).toLocaleDateString()}</small>
          </div>
        ))
      ) : (
        <p>No new notifications</p>
      )}

      <hr />

      {/* Quick Access Links */}
      <h2>Quick Access</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <button onClick={() => router.push('/guest/3dview')} style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>3D Viewing</button>
        <button onClick={() => router.push('/booking')} style={{ padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>Book Now</button>
        <button onClick={() => router.push('/guest/profile')} style={{ padding: '10px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '5px' }}>Profile</button>
        <button onClick={() => router.push('/guest/history')} style={{ padding: '10px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px' }}>Booking History</button>
        <button onClick={() => router.push('/guest/payment')} style={{ padding: '10px', backgroundColor: '#6f42c1', color: 'white', border: 'none', borderRadius: '5px' }}>Payments</button>
        <button onClick={() => router.push('/guest/chat')} style={{ padding: '10px', backgroundColor: '#e83e8c', color: 'white', border: 'none', borderRadius: '5px' }}>Support Chat</button>
      </div>

      <hr />

      <h2>Current Bookings</h2>
      {bookings.filter(b => b.status === 'active').length > 0 ? (
        bookings.filter(b => b.status === 'active').map(b => (
          <div key={b.id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <p><strong>Room:</strong> {b.room.name}</p>
            <p><strong>Check-in:</strong> {b.checkIn}</p>
            <p><strong>Check-out:</strong> {b.checkOut}</p>
            <p><strong>Status:</strong> {b.status}</p>
          </div>
        ))
      ) : (
        <p>No active bookings</p>
      )}

      <hr />

      <h2>Booking History</h2>
      {bookings.filter(b => b.status !== 'active').length > 0 ? (
        bookings.filter(b => b.status !== 'active').map(b => (
          <div key={b.id} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}>
            <p><strong>Room:</strong> {b.room.name}</p>
            <p><strong>Stayed:</strong> {b.checkIn} to {b.checkOut}</p>
            <p><strong>Status:</strong> {b.status}</p>
          </div>
        ))
      ) : (
        <p>No past bookings yet</p>
      )}
    </div>
  );
}
