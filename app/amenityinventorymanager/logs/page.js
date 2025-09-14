'use client';
import { useEffect, useState } from 'react';

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/amenityinventory/logs', {
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

  // Manual refresh handler
  const handleRefresh = () => {
    fetchLogs();
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '20px' }}>
        Usage Logs
      </h1>

      <button onClick={handleRefresh} style={{ marginBottom: '20px' }}>🔄 Refresh</button>

      {loading ? (
        <p>Loading logs...</p>
      ) : logs.length === 0 ? (
        <p>No logs found.</p>
      ) : (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
          }}
        >
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
                <td style={tdStyle}>
                  {new Date(log.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px',
  textAlign: 'left',
  borderBottom: '1px solid #ccc',
};

const tdStyle = {
  padding: '10px',
  borderBottom: '1px solid #eee',
};
