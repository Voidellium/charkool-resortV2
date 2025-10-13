'use client';
import { useEffect, useState } from 'react';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/amenities/usage-logs', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    fetchLogs();
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Usage Logs</h1>
      <button onClick={handleRefresh} style={styles.refreshButton}>🔄 Refresh</button>

      {loading ? (
        <p style={styles.message}>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p style={styles.message}>No logs found.</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={{ background: '#e2e8f0' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Action</th>
                <th style={thStyle}>Amenity</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={tdStyle}>{log.id}</td>
                  <td style={tdStyle}>{log.action}</td>
                  <td style={tdStyle}>{log.amenityName}</td>
                  <td style={tdStyle}>{log.user || 'System'}</td>
                  <td style={tdStyle}>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100%',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    backgroundColor: '#FFF8E1',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  refreshButton: {
    marginBottom: '20px',
    padding: '10px 14px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  message: {
    fontSize: '1.2rem',
    marginTop: '20px',
  },
  tableWrapper: {
    width: '100%',
    maxHeight: '60vh', // limit height para mag-scroll lang dito
    overflowY: 'auto',
    borderRadius: '8px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    backgroundColor: '#fff',
    padding: '10px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  thStyle: {
    padding: '10px',
    background: '#f3f4f6',
    borderBottom: '1px solid #ccc',
    fontWeight: '600',
  },
  tdStyle: {
    padding: '10px',
    borderBottom: '1px solid #eee',
  },
};

const thStyle = {
  padding: '10px',
  textAlign: 'left',
  borderBottom: '1px solid #ccc',
  fontWeight: '600',
};
const tdStyle = {
  padding: '10px',
  borderBottom: '1px solid #eee',
};