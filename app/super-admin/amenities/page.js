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
      fetchAmenities();
    } catch (err) {
      console.error('Failed to submit amenity:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this amenity?')) return;
    try {
      await fetch(`/api/amenities/inventory/${id}`, { method: 'DELETE' });
      fetchAmenities();
    } catch (err) {
      console.error('Failed to delete amenity:', err);
    }
  };

  const handleEdit = (amenity) => {
    setEditingAmenity(amenity);
    setNewAmenity({ name: amenity.name, quantity: String(amenity.quantity) });
  };

  return (
    <SuperAdminLayout activePage="amenities">
      <div style={styles.container}>
        <h1 style={styles.title}>Super Admin - Amenity Inventory</h1>

        {/* Form for adding/updating amenities */}
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
          <button type="submit" style={{ ...styles.button, backgroundColor: styles.primaryColor }}>
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

        {/* Amenities list */}
        <div style={styles.cardsContainer}>
          {amenities.length === 0 && <p style={styles.noDataText}>No amenities yet.</p>}
          {amenities.map((amenity, i) => (
            <div key={amenity?.id ?? `amenity-${i}-${(amenity && amenity.name) || ''}` } style={styles.card}>
              <h3 style={styles.cardTitle}>{amenity.name}</h3>
              <p style={styles.cardDesc}>Quantity: {amenity.quantity}</p>
              <p style={styles.cardDesc}>
                Last Updated: {new Date(amenity.updatedAt).toLocaleString()}
              </p>
              <div style={styles.actions}>
                <button onClick={() => handleEdit(amenity)} style={styles.editBtn}>
                  Edit
                </button>
                <button onClick={() => handleDelete(amenity.id)} style={styles.deleteBtn}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
}

// Enhanced, professional styles
const styles = {
  primaryColor: '#FEBE52', // base color
  container: {
    padding: '40px 30px',
    maxWidth: '1100px',
    margin: '0 auto',
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    backgroundColor: '#fafafa',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
  },
  title: {
    textAlign: 'center',
    marginBottom: '30px',
    fontSize: '2.4em',
    fontWeight: '700',
    color: '#222',
    letterSpacing: '-0.02em',
  },
  form: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '40px',
  },
  input: {
    flex: '1',
    minWidth: '200px',
    padding: '14px 20px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    fontSize: '1.1em',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  button: {
    padding: '14px 25px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1em',
    fontWeight: '600',
    color: '#fff',
    transition: 'background-color 0.3s, transform 0.2s',
  },
  cardsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '25px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardTitle: {
    margin: '0 0 12px',
    color: '#F9A825', // bright accent
    fontSize: '1.5em',
    fontWeight: '700',
    letterSpacing: '-0.01em',
  },
  cardDesc: {
    margin: '8px 0',
    color: '#555',
    fontSize: '1em',
    lineHeight: '1.4',
  },
  actions: {
    marginTop: '20px',
    display: 'flex',
    gap: '12px',
  },
  editBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#FFC107',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s, transform 0.2s',
  },
  deleteBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#E53935',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s, transform 0.2s',
  },
  // Hover states for buttons
  buttonHover: {
    filter: 'brightness(85%)',
  },
  cardHover: {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: '1.3em',
    color: '#999',
    marginTop: '50px',
  },
};