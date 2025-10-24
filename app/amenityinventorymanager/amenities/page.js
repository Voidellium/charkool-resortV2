'use client';
import { useEffect, useState } from 'react';
import { RefreshCw, Edit, Trash2, Plus, X } from 'lucide-react';

// Add spinner animation styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default function AmenityInventoryPage() {
  const [amenities, setAmenities] = useState([]);
  const [newAmenity, setNewAmenity] = useState({ name: '', quantity: '' });
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');

  // Fetch amenities strictly from optional and rental tables
  const fetchAmenities = async () => {
    try {
      setError('');
      // Fetch optional amenities
      const optRes = await fetch('/api/amenities/optional');
      const optional = await optRes.json();
      // Fetch rental amenities
      const rentRes = await fetch('/api/amenities/rental');
      const rental = await rentRes.json();

      // Add category field for UI
      const optWithCat = (optional || []).map(a => ({ ...a, category: 'optional' }));
      const rentWithCat = (rental || []).map(a => ({ ...a, category: 'rental' }));
      const merged = [...optWithCat, ...rentWithCat];
      setAmenities(merged);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Could not load amenities. Please try again.');
    }
  };

  useEffect(() => {
    fetchAmenities();
  }, []);

  const handleRefresh = () => {
    fetchAmenities();
  };

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
        const endpoint = editingAmenity.category === 'rental' 
          ? `/api/amenities/rental/${editingAmenity.id}`
          : `/api/amenities/optional/${editingAmenity.id}`;
        await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newAmenity.name.trim(),
            quantity: quantityNumber,
          }),
        });
        setEditingAmenity(null);
      } else {
        // Default to optional when creating here; creation likely not used in this view, but handle both if category is provided later
        await fetch('/api/amenities/optional', {
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
      <h1 style={styles.header}>Amenity Inventory</h1>
      <p style={styles.description}>
        Manage available amenities efficiently. Deletion privileges are limited to Super Admins.
      </p>

      {/* Button for refresh */}
      <div style={styles.headerActions}>
        <button
          onClick={handleRefresh}
          style={styles.refreshButton}
          aria-label="Refresh amenities"
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseEnter={e => e.currentTarget.style.background = '#FFD88A'}
          onMouseOut={e => e.currentTarget.style.background = '#FEBE52'}
        >
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          Refresh
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {loading ? (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p style={styles.loadingText}>Loading amenities...</p>
        </div>
      ) : (
        <>
          {/* Form for add/update */}
          <form onSubmit={handleSubmit} style={{ ...styles.form, flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'flex-end', gap: '16px' }} aria-label="Add or update amenity">
        <div style={{ display: 'flex', flexDirection: 'column', flex: 2, minWidth: 180 }}>
          <label htmlFor="amenityName" style={styles.label}>Amenity Name</label>
          <input
            id="amenityName"
            style={styles.input}
            type="text"
            placeholder="e.g., Pool Table"
            value={newAmenity.name}
            onChange={(e) => setNewAmenity({ ...newAmenity, name: e.target.value })}
            required
            aria-required="true"
            disabled
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 60, maxWidth: 100 }}>
          <label htmlFor="quantity" style={styles.label}>Quantity</label>
          <input
            id="quantity"
            style={{ ...styles.input, width: '100%', maxWidth: 80, textAlign: 'center' }}
            type="number"
            placeholder="0"
            value={newAmenity.quantity}
            onChange={(e) =>
              setNewAmenity({ ...newAmenity, quantity: e.target.value })
            }
            required
            aria-required="true"
            min="0"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minWidth: 110 }}>
          <label style={{ visibility: 'hidden', height: 0 }}>Add</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="submit"
              style={{ ...styles.primaryButton, width: 90, height: 44 }}
              disabled={loading}
              aria-busy={loading}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              onMouseEnter={e => e.currentTarget.style.background = '#FFD88A'}
              onMouseOut={e => e.currentTarget.style.background = '#FEBE52'}
            >
              {loading ? 'Saving...' : editingAmenity ? 'Update' : 'Add'}
            </button>
            {editingAmenity && (
              <button
                type="button"
                style={{ ...styles.secondaryButton, width: 90, height: 44 }}
                onClick={() => {
                  setEditingAmenity(null);
                  setNewAmenity({ name: '', quantity: '' });
                }}
                aria-label="Cancel editing"
                onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                onMouseEnter={e => e.currentTarget.style.background = '#8B857A'}
                onMouseOut={e => e.currentTarget.style.background = '#7D7464'}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Filter search input */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
        <input
          type="text"
          placeholder="Search amenities..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ ...styles.input, maxWidth: 300 }}
          aria-label="Filter amenities by name"
        />
      </div>

      {/* Amenities list with scrollable container */}
      <div style={styles.cardsContainer}>
        {amenities.filter(a => a.name.toLowerCase().includes(filter.toLowerCase())).length === 0 && <p style={styles.noData}>No amenities available.</p>}
            {amenities.filter(a => a.name.toLowerCase().includes(filter.toLowerCase())).map((amenity, index) => (
              <div
                key={`${amenity.category}-${amenity.id ?? index}`}
                style={styles.card}
                tabIndex={0}
                aria-label={`Amenity: ${amenity.name}`}
              >
                <h3 style={styles.cardTitle}>{amenity.name}</h3>
                <p style={styles.cardText}>Quantity: {amenity.quantity}</p>
                <p style={styles.cardText}>Last Updated: {formatTime(amenity.updatedAt)}</p>
                <div style={styles.cardActions}>
                  <button
                    onClick={() => handleEdit(amenity)}
                    style={styles.editButton}
                    aria-label={`Edit ${amenity.name}`}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseEnter={e => e.currentTarget.style.background = '#FFD88A'}
                    onMouseOut={e => e.currentTarget.style.background = '#FCCE7E'}
                  >
                    <Edit size={16} style={{ marginRight: '8px' }} />
                    Edit
                  </button>
                </div>
              </div>
            ))}
      </div>
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: `'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
    minHeight: '100%',
    overflow: 'visible',
  },
  header: {
    fontSize: '2.5rem',
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: '10px',
    background: 'linear-gradient(135deg, #febe52 0%, #f59e0b 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  description: {
    fontSize: '1.1rem',
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: '700px',
    margin: '0 auto 40px',
    fontWeight: '500',
  },
  headerActions: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '40px',
  },
  refreshButton: {
    backgroundColor: '#febe52',
    color: '#fff',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(254, 190, 82, 0.3)',
    transition: 'all 0.3s ease',
    outline: 'none',
    display: 'flex',
    alignItems: 'center',
  },
  error: {
    color: '#D9534F',
    textAlign: 'center',
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '50px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1 1 200px',
    minWidth: '200px',
  },
  label: {
    marginBottom: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#42351F',
  },
  input: {
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #D0CFCF',
    fontSize: '1rem',
    transition: 'border-color 0.2s',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  primaryButton: {
    backgroundColor: '#FEBE52',
    color: '#fff',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'background 0.2s, transform 0.1s',
    outline: 'none',
  },
  secondaryButton: {
    backgroundColor: '#7D7464',
    color: '#fff',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'background 0.2s, transform 0.1s',
    outline: 'none',
  },
  cardsContainer: {
    display: 'grid',
    gap: '20px',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    border: '1px solid #E0E0E0',
    display: 'flex',
    flexDirection: 'column',
  },
  cardTitle: {
    margin: '0 0 10px',
    fontSize: '1.4rem',
    fontWeight: '600',
    color: '#FEBE52',
  },
  cardText: {
    margin: '6px 0',
    fontSize: '0.95rem',
    color: '#42351F',
  },
  cardActions: {
    marginTop: 'auto',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  editButton: {
    backgroundColor: '#FCCE7E',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'background 0.2s, transform 0.1s',
    outline: 'none',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f4f6',
    borderTop: '4px solid #febe52',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '16px',
    fontWeight: '500',
    margin: '0',
  },
};