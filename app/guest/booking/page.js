'use client';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import RentalAmenitiesSelector from '../../../components/RentalAmenitiesSelector';

export default function GuestBookingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    guestName: session?.user?.name || '',
    checkIn: '',
    checkOut: '',
    roomId: '',
    optional: {},
    rental: {},
  });
  const [selectedAmenities, setSelectedAmenities] = useState({});

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        if (!res.ok) throw new Error('Failed to fetch rooms');
        const data = await res.json();
        setRooms(data);
      } catch (err) {
        setError('Could not load rooms');
      } finally {
        setLoading(false);
      }
    };
    fetchRooms();
  }, []);

  const handleAmenitiesChange = (amenities) => {
    setSelectedAmenities(amenities);
    setFormData(prev => ({ ...prev, rental: amenities }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.checkIn || !formData.checkOut || !formData.roomId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create booking');
      router.push('/confirmation');
    } catch (err) {
      setError('Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Book Your Stay</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Guest Name</label>
          <input
            style={styles.input}
            value={formData.guestName}
            onChange={(e) => setFormData(prev => ({ ...prev, guestName: e.target.value }))}
            required
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Check-in Date</label>
          <input
            type="date"
            style={styles.input}
            value={formData.checkIn}
            onChange={(e) => setFormData(prev => ({ ...prev, checkIn: e.target.value }))}
            required
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Check-out Date</label>
          <input
            type="date"
            style={styles.input}
            value={formData.checkOut}
            onChange={(e) => setFormData(prev => ({ ...prev, checkOut: e.target.value }))}
            required
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Room Type</label>
          <select
            style={styles.input}
            value={formData.roomId}
            onChange={(e) => setFormData(prev => ({ ...prev, roomId: e.target.value }))}
            required
          >
            <option value="">Select a room</option>
            {rooms.map(room => (
              <option key={room.id} value={room.id}>
                {room.name} - ₱{room.price}/night
              </option>
            ))}
          </select>
        </div>
        <RentalAmenitiesSelector
          selectedAmenities={selectedAmenities}
          onAmenitiesChange={handleAmenitiesChange}
        />
        <button type="submit" style={styles.submitButton} disabled={loading}>
          {loading ? 'Booking...' : 'Book Now'}
        </button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '2rem',
    backgroundColor: '#f9f9f9',
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '0.5rem',
    fontWeight: 'bold',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  submitButton: {
    padding: '1rem',
    backgroundColor: '#FEBE52',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
};
