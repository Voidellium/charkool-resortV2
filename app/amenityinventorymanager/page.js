'use client';
import { useState, useEffect } from 'react';

export default function AmenityInventoryDashboard() {
  const API_URL = 'http://localhost:3000/api/amenities/inventory';

  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch amenities
  const fetchAmenities = async () => {
    try {
      setError('');
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to fetch amenities');
      const data = await res.json();
      setAmenities(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Could not load amenities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAmenities();
  }, []);

  // Manual refresh handler
  const handleRefresh = () => {
    fetchAmenities();
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px' }}>Loading...</p>;
  if (error) return <p style={{ color: 'red', textAlign: 'center', marginTop: '20px' }}>{error}</p>;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Amenity Inventory Dashboard</h1>
      <button onClick={handleRefresh} style={styles.refreshButton}>🔄 Refresh</button>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>ID</th>
            <th style={styles.th}>Name</th>
            <th style={styles.th}>Category</th>
            <th style={styles.th}>Quantity</th>
          </tr>
        </thead>
        <tbody>
          {amenities.length > 0 ? (
            amenities.map((a) => (
              <tr key={a.id} style={styles.tr}>
                <td style={styles.td}>{a.id}</td>
                <td style={styles.td}>{a.name}</td>
                <td style={styles.td}>{a.category}</td>
                <td style={styles.td}>{a.quantity}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" style={{ textAlign: 'center' }}>No amenities found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: { padding: '20px' },
  title: { textAlign: 'center', marginBottom: '20px', color: '#333' },
  refreshButton: {
    marginBottom: '20px',
    padding: '10px 14px',
    backgroundColor: '#3b82f6', // blue
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  th: {
    borderBottom: '2px solid #ddd',
    padding: '12px 15px',
    background: '#f3f4f6',
    textAlign: 'left',
    fontWeight: '600',
  },
  td: {
    borderBottom: '1px solid #ddd',
    padding: '12px 15px',
  },
  tr: {
    transition: 'background-color 0.2s ease',
  },
};
