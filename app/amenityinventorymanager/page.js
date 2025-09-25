'use client';
import { useState, useEffect } from 'react';

export default function AmenityInventoryDashboard() {
  const API_URL = 'http://localhost:3000/api/amenities/inventory';

  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  const handleRefresh = () => {
    setLoading(true);
    fetchAmenities();
  };

  if (loading)
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Loading...</p>
      </div>
    );
  if (error)
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorText}>{error}</p>
      </div>
    );

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Amenity Inventory Dashboard</h1>
      <button onClick={handleRefresh} style={styles.refreshButton}>
        🔄 Refresh
      </button>
      {/* Table container with max height and scroll */}
      <div style={styles.tableContainer}>
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
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No amenities found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    boxSizing: 'border-box',
    backgroundColor: '#FFF8E1',
    gap: '20px',
  },
  title: {
    textAlign: 'center',
    marginBottom: '10px',
    color: '#333',
    fontSize: '2rem',
    fontWeight: 'bold',
  },
  refreshButton: {
    alignSelf: 'center',
    padding: '10px 14px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  tableContainer: {
    width: '100%',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 15px',
    background: '#f3f4f6',
    borderBottom: '2px solid #ddd',
    textAlign: 'left',
    fontWeight: '600',
  },
  td: {
    padding: '12px 15px',
    borderBottom: '1px solid #ddd',
  },
  tr: {
    transition: 'background-color 0.2s ease',
  },
  loadingContainer: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: '1.5rem',
    color: '#555',
  },
  errorContainer: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: '1.2rem',
  },
};