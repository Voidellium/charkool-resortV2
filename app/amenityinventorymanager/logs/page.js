'use client';
import { useEffect, useState } from 'react';

export default function LogsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showOptional, setShowOptional] = useState(true);
  const [showRental, setShowRental] = useState(true);

  async function fetchLogs() {
    try {
      const res = await fetch('/api/amenities/usage-logs');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setRows(data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLogs(); }, []);

  const handleRefresh = () => { setLoading(true); fetchLogs(); };

  const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  // Filters
  const filtered = rows.filter(r => {
    // category filter: include row only if selected categories have any usage
    const optOK = showOptional && r.counts.optional > 0;
    const rentOK = showRental && r.counts.rental > 0;
    if (!optOK && !rentOK) return false;
    // date filter (check-in based)
    const d = new Date(r.bookingDate);
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0,0,0,0);
      if (d < s) return false;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23,59,59,999);
      if (d > e) return false;
    }
    return true;
  });

  const onExportCSV = () => {
    const header = ['Booking Date','Optional Count','Rental Count'];
    const lines = [header.join(',')];
    filtered.forEach(r => {
      const row = [fmtDate(r.bookingDate), r.counts.optional, r.counts.rental];
      lines.push(row.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'amenity-usage-logs.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Usage Logs</h1>
        <button onClick={handleRefresh} style={styles.refreshButton}>🔄 Refresh</button>
      </div>

      {/* Filters */}
      {!loading && (
        <div style={styles.filtersRow}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>From</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.filterGroup}>
            <label style={styles.label}>To</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.input} />
          </div>
          <div style={styles.chips}>
            <button type="button" onClick={() => setShowOptional(v => !v)} style={{ ...styles.chip, background: showOptional ? '#3b82f6' : '#e5e7eb', color: showOptional ? '#fff' : '#111827' }}>Optional</button>
            <button type="button" onClick={() => setShowRental(v => !v)} style={{ ...styles.chip, background: showRental ? '#10b981' : '#e5e7eb', color: showRental ? '#fff' : '#111827' }}>Rental</button>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={onExportCSV} style={styles.exportBtn}>⬇️ Export CSV</button>
        </div>
      )}

      {loading ? (
        <p style={styles.message}>Loading logs...</p>
      ) : filtered.length === 0 ? (
        <p style={styles.message}>No logs found.</p>
      ) : (
        <div style={styles.panel}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={thStyle}>Booking Date</th>
                <th style={thStyle}>Amenities Used</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.bookingId}>
                  <td style={tdStyle}>{fmtDate(r.bookingDate)}</td>
                  <td style={tdStyle}>
                    {showOptional && <span style={styles.badge}>Optional: {r.counts.optional}</span>}{' '}
                    {showRental && <span style={styles.badge}>Rental: {r.counts.rental}</span>}
                  </td>
                  <td style={tdStyle}>
                    <button style={styles.viewBtn} onClick={() => setDetail(r)}>View details</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div style={styles.modalOverlay} onClick={() => setDetail(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalCloseBtn} aria-label="Close" onClick={() => setDetail(null)}>&times;</button>
            <div style={styles.modalScroll}>
              <div style={styles.modalHeaderRow}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Check-in</div>
                  <div style={{ fontWeight: 800, color: '#111827' }}>{fmtDate(detail.bookingDate)}</div>
                  <div style={{ height: 8 }} />
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Check-out</div>
                  <div style={{ fontWeight: 800, color: '#111827' }}>{detail.checkoutDate ? fmtDate(detail.checkoutDate) : '—'}</div>
                </div>
              </div>
              {(detail.guestFirstName || detail.guestLastName) && (
                <div style={{
                  marginBottom: 14,
                  padding: '10px 12px',
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #FFF7E6 0%, #FFE5B3 100%)',
                  color: '#6b4700',
                  border: '1px solid #FDE68A'
                }}>
                  <strong style={{ color: '#6b4700' }}>Guest:</strong> {`${detail.guestFirstName ?? ''} ${detail.guestLastName ?? ''}`.trim()}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={styles.sectionCard}>
                  <div style={styles.subHeader}>Optional Amenities</div>
                  {detail.optionalItems.length === 0 ? (
                    <div style={styles.empty}>None</div>
                  ) : (
                    <ul style={styles.list}>
                      {detail.optionalItems.map((i, idx) => (
                        <li key={`o-${idx}`} style={styles.listItem}><span style={styles.bullet}>•</span><strong>{i.name}</strong><span style={styles.x}>× {i.quantity}</span></li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={styles.sectionCard}>
                  <div style={styles.subHeader}>Rental Amenities</div>
                  {detail.rentalItems.length === 0 ? (
                    <div style={styles.empty}>None</div>
                  ) : (
                    <ul style={styles.list}>
                      {detail.rentalItems.map((i, idx) => (
                        <li key={`r-${idx}`} style={styles.listItem}><span style={styles.bullet}>•</span><strong>{i.name}</strong><span style={styles.x}>× {i.quantity}</span>{i.hoursUsed ? <em style={styles.hours}>{` (${i.hoursUsed}h)`}</em> : ''}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', marginTop: 12 }}>
                <button style={styles.closeBtn} onClick={() => setDetail(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { minHeight: '100%', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, background: 'linear-gradient(135deg, #FEBE52 0%, #FFE6B3 100%)' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 800 },
  refreshButton: { padding: '10px 14px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
  message: { fontSize: '1.2rem', marginTop: 20 },
  panel: { background: '#fff', borderRadius: 12, boxShadow: '0 2px 6px rgba(0,0,0,0.1)', padding: 12 },
  table: { width: '100%', borderCollapse: 'collapse' },
  badge: { background: '#f3f4f6', borderRadius: 999, padding: '2px 8px', fontSize: 12, fontWeight: 700 },
  viewBtn: { background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' },
  // Guest dashboard-like modal shell with Amenity Manager accent
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { position: 'relative', background: 'linear-gradient(135deg, #FFF7E6 0%, #FFE5B3 55%, #FEBE52 120%)', border: '1px solid #FDE68A', borderRadius: 12, padding: 24, width: 'min(640px, 92vw)', maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 20px 48px rgba(0,0,0,0.35)' },
  modalScroll: { overflowY: 'auto', maxHeight: 'calc(80vh - 16px)' },
  modalCloseBtn: { position: 'absolute', top: 12, right: 14, background: 'rgba(255,255,255,0.6)', width: 36, height: 36, lineHeight: '28px', borderRadius: '50%', border: '2px solid #FDE68A', fontSize: '1.5rem', cursor: 'pointer', color: '#6b4700' },
  modalHeaderRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 14, borderBottom: '2px solid rgba(253, 230, 138, 0.8)', paddingBottom: 10, paddingRight: 52 },
  subHeader: { fontSize: 14, fontWeight: 900, marginBottom: 8, color: '#6b4700', background: 'linear-gradient(135deg, #FFF8E1, #FDE68A)', display: 'inline-block', padding: '6px 10px', borderRadius: 999, border: '1px solid rgba(253, 230, 138, 0.7)' },
  list: { margin: 0, padding: 0, listStyle: 'none' },
  listItem: { padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.6)', display: 'flex', alignItems: 'baseline', gap: 6, color: '#1f2937' },
  bullet: { color: '#6b4700', fontWeight: 900 },
  x: { marginLeft: 'auto', color: '#6b4700', fontWeight: 700 },
  hours: { marginLeft: 6, color: '#6b4700' },
  closeBtn: { padding: '10px 16px', background: 'linear-gradient(135deg, #E8A23C 0%, #FEBE52 100%)', color: '#fff', border: 'none', borderRadius: 999, cursor: 'pointer', boxShadow: '0 6px 16px rgba(232,162,60,0.45)', fontWeight: 700 },
  sectionCard: { background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(253,230,138,0.8)', borderRadius: 12, padding: 12, boxShadow: '0 6px 20px rgba(253,230,138,0.35)' },
  empty: { color: '#6b4700', opacity: 0.9 },
  filtersRow: { display: 'flex', gap: 12, alignItems: 'end' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: { fontSize: 12, fontWeight: 700, color: '#374151' },
  input: { padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff' },
  chips: { display: 'flex', gap: 8 },
  chip: { padding: '6px 10px', borderRadius: 999, border: 'none', cursor: 'pointer', fontWeight: 700 },
  exportBtn: { padding: '10px 14px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' },
};

const thStyle = { padding: 10, textAlign: 'left', borderBottom: '1px solid #ccc', fontWeight: 600 };
const tdStyle = { padding: 10, borderBottom: '1px solid #eee' };