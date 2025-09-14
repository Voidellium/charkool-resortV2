'use client';
import { useEffect, useState } from 'react';

export default function ReceptionistDashboard() {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  async function fetchAllData() {
    try {
      const [bookingsRes, roomsRes] = await Promise.all([
        fetch('http://localhost:3000/api/bookings'),
        fetch('http://localhost:3000/api/rooms'),
      ]);

      const [bookingsData, roomsData] = await Promise.all([
        bookingsRes.json(),
        roomsRes.json(),
      ]);

      setBookings(bookingsData || []);
      setRooms(roomsData || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  // === Metrics ===
  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  const occupiedRooms = bookings.filter((b) => b.status.toLowerCase() === 'confirmed').length;
  const totalRooms = rooms.length;
  const occupancyRate = totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0;

  if (loading) return <p>Loading dashboard...</p>;

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        Receptionist Dashboard
      </h1>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={cardStyle}>
          <h3>Total Bookings</h3>
          <p style={metricStyle}>{totalBookings}</p>
        </div>
        <div style={cardStyle}>
          <h3>Total Revenue</h3>
          <p style={metricStyle}>₱{totalRevenue.toLocaleString()}</p>
        </div>
        <div style={cardStyle}>
          <h3>Occupancy Rate</h3>
          <p style={metricStyle}>{occupancyRate}%</p>
        </div>
      </div>

      {/* Recent Bookings Table */}
      <h2 style={{ marginBottom: '0.5rem' }}>Recent Bookings</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Guest</th>
            <th>Room</th>
            <th>Check-in</th>
            <th>Check-out</th>
            <th>Status</th>
            <th>Total Price</th>
          </tr>
        </thead>
        <tbody>
          {bookings.slice(0, 5).map((b) => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>{b.guestName}</td>
              <td>{b.room?.name}</td>
              <td>{new Date(b.checkIn).toLocaleDateString()}</td>
              <td>{new Date(b.checkOut).toLocaleDateString()}</td>
              <td>{b.status}</td>
              <td>₱{(b.totalPrice || 0).toLocaleString()}</td>
            </tr>
          ))}
          {bookings.length === 0 && (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center' }}>No bookings found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// === Styles ===
const cardStyle = {
  background: '#f3f4f6',
  padding: '1rem',
  borderRadius: '10px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const metricStyle = {
  fontSize: '1.5rem',
  fontWeight: 'bold',
  marginTop: '0.5rem',
};
