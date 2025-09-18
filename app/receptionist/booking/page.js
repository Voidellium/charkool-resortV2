'use client';
import { useEffect, useState } from 'react';
import './receptionist-styles.css';

// === Temporary Mock Data ===
// This data simulates what would come from your API.
const MOCK_DATA = {
  totalRooms: 50,
  occupiedRooms: 1,
  upcomingReservations: [
    { id: '1', guestId: '123', guestName: 'Guest #2', checkIn: '2025-09-18' },
    { id: '2', guestId: '124', guestName: 'Guest #1', checkIn: '2025-09-17' },
  ],
  currentGuests: [
    { id: '3', guestId: '89', guestName: 'Guest #89', checkIn: '2025-09-17' },
  ],
};

// === Styles ===
const styles = {
  dashboardContainer: {
    padding: '2rem',
    fontFamily: 'sans-serif',
  },
  headerContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
  },
  headerTitle: {
    fontSize: '1.875rem',
    fontWeight: '600',
    color: '#4B5563',
  },
  userId: {
    fontSize: '0.875rem',
    color: '#6B7280',
    marginTop: '0.25rem',
  },
  kpiCardContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  kpiCard: {
    backgroundColor: '#FFCC7A',
    borderRadius: '1rem',
    padding: '1.5rem',
    color: '#4B5563',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '12rem',
    textAlign: 'center',
  },
  kpiCardTitle: {
    fontSize: '1.25rem',
    fontWeight: '500',
  },
  kpiCardMetric: {
    fontSize: '3rem',
    fontWeight: '700',
    marginTop: '0.5rem',
  },
  guestCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    backgroundColor: '#F3F4F6',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
  },
  guestName: {
    fontWeight: '500',
    color: '#4B5563',
  },
  guestDetails: {
    fontSize: '0.875rem',
    color: '#6B7280',
  },
  checkInButtonGreen: {
    backgroundColor: '#56A86B',
    color: '#fff',
    padding: '0.25rem 1rem',
    borderRadius: '9999px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
  },
  checkOutButtonRed: {
    backgroundColor: '#E74C3C',
    color: '#fff',
    padding: '0.25rem 1rem',
    borderRadius: '9999px',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: '1rem',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '1.5rem',
    height: '25rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: '#4B5563',
  },
};

export default function ReceptionistDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  const { totalRooms, occupiedRooms, upcomingReservations, currentGuests } = MOCK_DATA;
  const availableRooms = totalRooms - occupiedRooms;

  return (
    <div style={styles.dashboardContainer}>
      <div style={styles.headerContainer}>
        <div>
          <h1 style={styles.headerTitle}>Receptionist Dashboard</h1>
          <p style={styles.userId}>User ID: 1234113340746626333</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiCardContainer}>
        <div style={styles.kpiCard}>
          <p style={styles.kpiCardTitle}>Rooms Occupied</p>
          <p style={styles.kpiCardMetric}>{occupiedRooms}</p>
          <p style={{ marginTop: '0.25rem' }}>/{totalRooms}</p>
        </div>
        <div style={styles.kpiCard}>
          <p style={styles.kpiCardTitle}>Rooms Available</p>
          <p style={styles.kpiCardMetric}>{availableRooms}</p>
        </div>
      </div>

      {/* Reservations & Current Guests Sections */}
      <div className="section-container">
        {/* Upcoming Reservations */}
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>
            Upcoming Reservations ({upcomingReservations.length})
          </h2>
          <div className="guest-list-container">
            {upcomingReservations.map((guest) => (
              <div key={guest.id} style={styles.guestCard}>
                <div>
                  <p style={styles.guestName}>{guest.guestName}</p>
                  <p style={styles.guestDetails}>Check-in: {guest.checkIn}</p>
                </div>
                <button style={styles.checkInButtonGreen}>Check In</button>
              </div>
            ))}
          </div>
        </div>

        {/* Current Guests */}
        <div style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>
            Current Guests ({currentGuests.length})
          </h2>
          <div className="guest-list-container">
            {currentGuests.map((guest) => (
              <div key={guest.id} style={styles.guestCard}>
                <div>
                  <p style={styles.guestName}>{guest.guestName}</p>
                  <p style={styles.guestDetails}>Check-in: {guest.checkIn}</p>
                </div>
                <button style={styles.checkOutButtonRed}>Check Out</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}