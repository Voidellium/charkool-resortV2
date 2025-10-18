'use client';
import { useEffect, useState } from 'react';

export default function CategorizationPage() {
  const [optional, setOptional] = useState([]);
  const [rental, setRental] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // read-only lists displayed side by side

  const fetchData = async () => {
    try {
      const [optRes, rentRes] = await Promise.all([
        fetch('/api/amenities/optional'),
        fetch('/api/amenities/rental'),
      ]);
      if (!optRes.ok || !rentRes.ok) throw new Error('Failed to load amenities');
      const [opt, rent] = await Promise.all([optRes.json(), rentRes.json()]);
      setOptional(opt || []);
      setRental(rent || []);
    } catch (e) {
      console.error(e);
      setError('Could not load amenities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Categorization</h1>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      <div style={styles.row}>
        <div style={styles.categoryCard}>
          <div style={styles.categoryHeader}>
            <span style={styles.badge}>Optional</span>
            <span style={styles.count}>{optional.length}</span>
          </div>
          <select style={styles.select} disabled>
            {optional.length === 0 ? (
              <option>No amenities</option>
            ) : (
              optional.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
            )}
          </select>
        </div>
        <div style={styles.categoryCard}>
          <div style={styles.categoryHeader}>
            <span style={{ ...styles.badge, background: '#10b981' }}>Rental</span>
            <span style={styles.count}>{rental.length}</span>
          </div>
          <select style={styles.select} disabled>
            {rental.length === 0 ? (
              <option>No amenities</option>
            ) : (
              rental.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
            )}
          </select>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '800px', margin: '0 auto', background: 'linear-gradient(135deg, #FEBE52 0%, #FFE6B3 100%)', borderRadius: '8px' },
  title: { textAlign: 'center', marginBottom: '20px', color: '#333' },
  row: { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' },
  categoryCard: { background: '#fff', borderRadius: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', padding: '16px' },
  categoryHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  badge: { background: '#3b82f6', color: '#fff', borderRadius: 999, padding: '4px 12px', fontWeight: 700 },
  count: { fontWeight: 800 },
  select: { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', marginTop: 8 },
};
