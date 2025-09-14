'use client';
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';

export default function SuperAdminAmenityInventoryPage() {
  const [amenities, setAmenities] = useState([]);
  const [newAmenity, setNewAmenity] = useState({ name: '', quantity: '' });
  const [editingAmenity, setEditingAmenity] = useState(null);
  

  // Fetch amenities from API
  const fetchAmenities = async () => {
    try {
      const res = await fetch('/api/amenities/inventory');
      const data = await res.json();
      setAmenities(data || []);
    } catch (err) {
      console.error('Failed to fetch amenities:', err);
    }
  };

  useEffect(() => {
    fetchAmenities();

    const interval = setInterval(fetchAmenities, 10000); // 10s polling
    return () => clearInterval(interval);
  }, []);

  // Add or update amenity
  const handleSubmit = async (e) => {
    e.preventDefault();
    const quantityNumber = parseInt(newAmenity.quantity, 10);

    if (!newAmenity.name.trim() || isNaN(quantityNumber)) {
      alert('Please enter a valid name and quantity.');
      return;
    }

    try {
      if (editingAmenity) {
        await fetch(`/api/amenities/inventory/${editingAmenity.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAmenity.name.trim(),
            quantity: quantityNumber,
          }),
        });
        setEditingAmenity(null);
      } else {
        await fetch('/api/amenities/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAmenity.name.trim(),
            quantity: quantityNumber,
          }),
        });
      }

      setNewAmenity({ name: '', quantity: '' });
      fetchAmenities(); // refresh list
    } catch (err) {
      console.error('Failed to submit amenity:', err);
    }
  };

  // Delete amenity
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this amenity?')) return;
    try {
      await fetch(`/api/amenities/inventory/${id}`, { method: 'DELETE' });
      fetchAmenities();
    } catch (err) {
      console.error('Failed to delete amenity:', err);
    }
  };

  // Edit amenity
  const handleEdit = (amenity) => {
    setEditingAmenity(amenity);
    setNewAmenity({ name: amenity.name, quantity: String(amenity.quantity) });
  };

  return (
    <SuperAdminLayout activePage="amenities">
      <div style={styles.container}>
        <h1 style={styles.title}>Super Admin - Amenity Inventory</h1>

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
            onChange={(e) => setNewAmenity({ ...newAmenity, quantity: e.target.value })}
            required
          />
          <button type="submit" style={styles.button}>
            {editingAmenity ? 'Update' : 'Add'}
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
                Last Updated: {new Date(amenity.updatedAt).toLocaleString()}
              </p>
              <div style={styles.actions}>
                <button onClick={() => handleEdit(amenity)} style={styles.editBtn}>Edit</button>
                <button onClick={() => handleDelete(amenity.id)} style={styles.deleteBtn}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}

// Inline CSS
const styles = {
  container: { padding: '20px', maxWidth: '900px', margin: '0 auto' },
  title: { textAlign: 'center', marginBottom: '20px', color: '#333' },
  form: { display: 'flex', gap: '10px', marginBottom: '30px', flexWrap: 'wrap' },
  input: { flex: '1', padding: '10px', borderRadius: '5px', border: '1px solid #ccc' },
  button: { padding: '10px 20px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  cardsContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '15px' },
  card: { border: '1px solid #ddd', borderRadius: '8px', padding: '15px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' },
  cardTitle: { margin: '0 0 5px 0', color: '#0070f3' },
  cardDesc: { margin: '0 0 10px 0', color: '#555' },
  actions: { display: 'flex', gap: '10px' },
  editBtn: { flex: 1, padding: '5px', backgroundColor: '#ffc107', border: 'none', borderRadius: '5px', cursor: 'pointer' },
  deleteBtn: { flex: 1, padding: '5px', backgroundColor: '#dc3545', border: 'none', borderRadius: '5px', color: 'white', cursor: 'pointer' },
};
