'use client';
import { useState, useEffect } from 'react';

export default function AmenityInventoryDashboard() {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchAmenities = async () => {
    try {
      setError('');
      const [optRes, rentRes] = await Promise.all([
        fetch('/api/amenities/optional'),
        fetch('/api/amenities/rental'),
      ]);
      if (!optRes.ok || !rentRes.ok) throw new Error('Failed to fetch amenities');
      const [optional, rental] = await Promise.all([optRes.json(), rentRes.json()]);
      const opt = (optional || []).map(a => ({ ...a, category: 'Optional' }));
      const rent = (rental || []).map(a => ({ ...a, category: 'Rental' }));
      const merged = [...opt, ...rent];
      // dedupe by category-id
      const seen = new Set();
      const unique = [];
      for (const a of merged) {
        const k = `${a.category}-${a.id ?? a.name?.toLowerCase()}`;
        if (!seen.has(k)) { seen.add(k); unique.push(a); }
      }
      setAmenities(unique);
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

  // KPIs
  const totalOptional = amenities.filter(a => a.category === 'Optional').length;
  const totalRental = amenities.filter(a => a.category === 'Rental').length;
  const totalStock = amenities.reduce((s, a) => s + (a.quantity || 0), 0);
  const lowStock = amenities.filter(a => (a.quantity ?? 0) < 5);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Amenity Inventory Dashboard</h1>
        <button onClick={handleRefresh} style={styles.refreshButton}>🔄 Refresh</button>
      </div>

      {/* KPIs */}
      <div style={styles.kpiRow}>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Optional Amenities</div>
          <div style={styles.kpiValue}>{totalOptional}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Rental Amenities</div>
          <div style={styles.kpiValue}>{totalRental}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Total Stock</div>
          <div style={styles.kpiValue}>{totalStock}</div>
        </div>
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>Low Stock</div>
          <div style={styles.kpiValue}>{lowStock.length}</div>
        </div>
      </div>

      {/* Low stock list */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>Low Stock (less than 5)</div>
        {lowStock.length === 0 ? (
          <div style={styles.empty}>All good! No items are low.</div>
        ) : (
          <div style={styles.grid}> 
            {lowStock.map(a => (
              <div key={`${a.category}-${a.id}`} style={styles.card}>
                <div style={styles.cardTitle}>{a.name}</div>
                <div style={styles.cardMeta}><span style={styles.badge}>{a.category}</span></div>
                <div style={styles.cardQty}>Qty: {a.quantity}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Grouped lists */}
      <div style={styles.panel}>
        <div style={styles.panelHeader}>All Amenities</div>
        {['Optional','Rental'].map(cat => {
          const list = amenities.filter(a => a.category === cat);
          return (
            <details key={cat} open style={{ marginBottom: 8 }}>
              <summary style={styles.summary}><span style={{ ...styles.badge, background: cat==='Optional' ? '#f3f4f6' : '#d1fae5' }}>{cat}</span> <span style={{ color: '#6b7280' }}>({list.length})</span></summary>
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.length > 0 ? (
                      list.map(a => (
                        <tr key={`${a.category}-${a.id}`} style={styles.tr}>
                          <td style={styles.td}>{a.name}</td>
                          <td style={styles.td}>{a.quantity}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" style={{ textAlign: 'center', padding: '16px' }}>No items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
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
    background: 'linear-gradient(135deg, #FEBE52 0%, #FFE6B3 100%)',
    gap: '20px',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
  },
  kpiCard: {
    background: '#fff',
    borderRadius: '10px',
    padding: '16px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  kpiLabel: { color: '#6b7280', fontWeight: 600 },
  kpiValue: { fontSize: '1.8rem', fontWeight: 800 },
  panel: {
    background: '#fff',
    borderRadius: '10px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
    padding: '12px',
  },
  panelHeader: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' },
  summary: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' },
  card: { border: '1px solid #eee', borderRadius: '10px', padding: '12px' },
  cardTitle: { fontWeight: 700 },
  cardMeta: { marginTop: 4 },
  badge: { background: '#f3f4f6', borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700 },
  cardQty: { fontWeight: 700, marginTop: 8 },
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
