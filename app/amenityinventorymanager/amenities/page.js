'use client';
import { useEffect, useState } from 'react';

export default function AmenityInventoryPage() {
  const API_URL = 'http://localhost:3000/api/amenities/inventory'; // Use relative path
  const [amenities, setAmenities] = useState([]);
  const [newAmenity, setNewAmenity] = useState({ name: '', quantity: '' });
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch amenities
  const fetchAmenities = async () => {
    try {
      setError('');
      const res = await fetch(API_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to fetch amenities');
      const data = await res.json();
      setAmenities(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Could not load amenities. Please try again.');
    }
  };

  useEffect(() => {
    fetchAmenities();
  }, []);

  // Manual refresh handler
  const handleRefresh = () => {
    fetchAmenities();
  };

  // Add or update amenity
  const handleSubmit = async (e) => {
    e.preventDefault();
    const quantityNumber = parseInt(newAmenity.quantity, 10);

    if (!newAmenity.name.trim() || isNaN(quantityNumber)) {
      alert('Please enter a valid name and quantity.');
      return;
    }

    try {
      setLoading(true);
      if (editingAmenity) {
        await fetch(`${API_URL}/${editingAmenity.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAmenity.name.trim(),
            quantity: quantityNumber,
          }),
        });
        setEditingAmenity(null);
      } else {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAmenity.name.trim(),
            quantity: quantityNumber,
          }),
        });
      }
      setNewAmenity({ name: '', quantity: '' });
      fetchAmenities();
    } catch (err) {
      console.error('Submit error:', err);
      setError('Failed to save amenity. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (amenity) => {
    setEditingAmenity(amenity);
    setNewAmenity({ name: amenity.name, quantity: String(amenity.quantity) });
  };

  const formatTime = (timestamp) => {
    const diff = Math.floor((Date.now() - new Date(timestamp)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Amenity Inventory</h1>
      <p style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
        Manage available amenities. Deletion is reserved for Super Admins.
      </p>

      <button onClick={handleRefresh} style={{ marginBottom: '20px' }}>🔄 Refresh</button>

      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="Amenity Name"
          value={newAmenity.name}
          onChange={(e) => setNewAmenity({ ...newAmenity, name: e.target.value })}
          required
        />
        <input
          style={{ ...styles.input, flex: '0 0 80px', textAlign: 'center' }}
          type="number"
          placeholder="Quantity"
          value={newAmenity.quantity}
          onChange={(e) =>
            setNewAmenity({ ...newAmenity, quantity: e.target.value })
          }
          required
        />
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Saving...' : editingAmenity ? 'Update' : 'Add'}
        </button>
        {editingAmenity && (
          <button
            type="button"
            style={{ ...styles.button, backgroundColor: '#6c757d' }}
            onClick={() => {
              setEditingAmenity(null);
              setNewAmenity({ name: '', quantity: '' });
            }}
          >
            Cancel
          </button>
        )}
      </form>

      <div style={styles.cardsContainer}>
        {amenities.length === 0 && <p>No amenities yet.</p>}
        {amenities.map((amenity) => (
          <div key={amenity.id} style={styles.card}>
            <h3 style={styles.cardTitle}>{amenity.name}</h3>
            <p style={styles.cardDesc}>Quantity: {amenity.quantity}</p>
            <p style={styles.cardDesc}>
              Last Updated: {formatTime(amenity.updatedAt)}
            </p>
            <div style={styles.actions}>
              <button onClick={() => handleEdit(amenity)} style={styles.editBtn}>
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '900px', margin: '0 auto' },
  title: { textAlign: 'center', marginBottom: '10px', color: '#333' },
  form: { display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' },
  input: {
    flex: '1',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ccc',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#0070f3',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))',
    gap: '15px',
  },
  card: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
  },
  cardTitle: { margin: '0 0 5px 0', color: '#0070f3' },
  cardDesc: { margin: '0 0 10px 0', color: '#555' },
  actions: { display: 'flex', gap: '10px' },
  editBtn: {
    flex: 1,
    padding: '5px',
    backgroundColor: '#ffc107',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
};
