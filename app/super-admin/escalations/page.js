'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useStaffNotifications } from '@/hooks/usePusher';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { AlertCircle } from 'lucide-react';
import styles from './styles.module.css';

export default function EscalationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const Toast = useToast();
  // Subscribe to staff notifications for real-time updates
  useStaffNotifications('SUPERADMIN', (data) => {
    if (data?.event === 'CHAT_ESCALATION_REQUEST') {
      Toast.info(`New escalation: ${data.guestName || data.guestEmail} needs help`);
      fetchEscalations(); // Refresh list
    }
  });
  
  const [escalations, setEscalations] = useState([]);
  const [selectedEscalation, setSelectedEscalation] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // pending | contacted | resolved
  const [submitting, setSubmitting] = useState(false);
  const searchParams = useSearchParams();

  // Auth check
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    if (session?.user?.role !== 'SUPERADMIN') {
      router.push('/unauthorized');
    }
  }, [session, status, router]);

  // Fetch escalations
  useEffect(() => {
    fetchEscalations();
  }, [filter]);

  // If URL contains ?highlight=<id>, select and scroll to that escalation after fetch
  useEffect(() => {
    const highlight = searchParams.get('highlight');
    if (!highlight) return;

    // Wait for escalations to be fetched
    if (escalations.length === 0) return;

    const id = parseInt(highlight, 10);
    const found = escalations.find(e => e.id === id);
    if (found) {
      setSelectedEscalation(found);
      // scroll into view in the list
      setTimeout(() => {
        const el = document.getElementById(`esc-${id}`);
        if (el && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
    }
  }, [searchParams, escalations]);

  // (real-time subscription handled by `useStaffNotifications` above)

  const fetchEscalations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/chat/escalate?status=${filter}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEscalations(data);
    } catch (error) {
      console.error('Failed to fetch escalations:', error);
      Toast.error('Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkContacted = async () => {
    if (!selectedEscalation) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/chat/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalationId: selectedEscalation.id,
          notes: notes.trim(),
          status: 'contacted'
        })
      });

      if (!res.ok) throw new Error('Failed to update');

      Toast.success('Marked as contacted');
      setNotes('');
      setSelectedEscalation(null);
      fetchEscalations();
    } catch (error) {
      console.error('Failed to mark contacted:', error);
      Toast.error('Failed to update escalation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!selectedEscalation) return;

    try {
      setSubmitting(true);
      const res = await fetch('/api/chat/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escalationId: selectedEscalation.id,
          notes: notes.trim(),
          status: 'resolved'
        })
      });

      if (!res.ok) throw new Error('Failed to update');

      Toast.success('Marked as resolved');
      setNotes('');
      setSelectedEscalation(null);
      fetchEscalations();
    } catch (error) {
      console.error('Failed to mark resolved:', error);
      Toast.error('Failed to update escalation');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.detailPanel} style={{textAlign: 'center', padding: '32px 24px'}}>
            <div style={{
              width: 44,
              height: 44,
              margin: '0 auto 12px auto',
              borderRadius: '50%',
              border: '4px solid #f3f4f6',
              borderTopColor: '#d79a2b',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: '#6b7280', margin: 0 }}>Loading chat escalations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SuperAdminLayout activePage="escalations">
      <div className={styles.container}>
        <div className={styles.inner}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>
                <AlertCircle size={28} />
                Chat Escalations
              </h1>
              <p className={styles.subtitle}>Manage direct chat contact requests from guests</p>
            </div>
          </div>

        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          {['pending', 'contacted', 'resolved'].map(tab => (
            <button
              key={tab}
              onClick={() => {
                setFilter(tab);
                setSelectedEscalation(null);
              }}
              className={filter === tab ? `${styles.tab} ${styles.tabActive}` : styles.tab}
            >
              {tab === 'pending' ? '🔔 Pending' : tab === 'contacted' ? '✓ Contacted' : '✓✓ Resolved'}
            </button>
          ))}
        </div>

        {/* Two-Column Layout */}
        <div className={styles.layoutGrid}>
          {/* Escalations List */}
          <div className={styles.listPanel}>
            <div className={styles.listHeader}>
              <div>Chat Escalations <span className={styles.smallMuted}>({escalations.length})</span></div>
              <button onClick={() => fetchEscalations()} className={styles.refreshButton}>Refresh</button>
            </div>
            <div className={styles.list}>
              {escalations.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No chat escalations</p>
                </div>
              ) : (
                escalations.map((esc) => (
                  <div
                    id={`esc-${esc.id}`}
                    key={esc.id}
                    className={`${styles.item} ${selectedEscalation?.id === esc.id ? styles.itemSelected : ''}`}
                  >
                    <button className={styles.itemButton} onClick={() => setSelectedEscalation(esc)}>
                      <div className={styles.itemTitle}>
                        {esc.user?.name || esc.guestEmail}
                      </div>
                      <div className={styles.itemMeta} style={{marginTop: 4}}>
                        {new Date(esc.createdAt).toLocaleString()}
                      </div>
                      <div className={styles.itemMeta} style={{marginTop: 8, color: '#102a43'}}>
                        {esc.reason}
                      </div>
                      <div style={{ marginTop: 10 }}>
                      {esc.status === 'pending' && (
                        <span className={`${styles.badge} ${styles.badgePending}`}>
                          Pending
                        </span>
                      )}
                      {esc.status === 'contacted' && (
                        <span className={`${styles.badge} ${styles.badgeContacted}`}>
                          Contacted
                        </span>
                      )}
                      {esc.status === 'resolved' && (
                        <span className={`${styles.badge} ${styles.badgeResolved}`}>
                          Resolved
                        </span>
                      )}
                      </div>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail & Action Panel */}
          <div className={styles.detailPanel}>
            {selectedEscalation ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Guest Info */}
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Guest Information</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div className={styles.smallMuted}>Name</div>
                      <div style={{ fontWeight: 700, marginTop: 6 }}>{selectedEscalation.user?.name || 'N/A'}</div>
                    </div>
                    <div>
                      <div className={styles.smallMuted}>Email</div>
                      <div style={{ fontWeight: 700, marginTop: 6 }}>{selectedEscalation.guestEmail}</div>
                    </div>
                    <div>
                      <div className={styles.smallMuted}>Phone</div>
                      <div style={{ fontWeight: 700, marginTop: 6 }}>{selectedEscalation.user?.contactNumber || 'N/A'}</div>
                    </div>
                    <div>
                      <div className={styles.smallMuted}>Status</div>
                      <div style={{ fontWeight: 700, marginTop: 6, textTransform: 'capitalize' }}>{selectedEscalation.status}</div>
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Request Reason</h3>
                  <div className={styles.reasonBox}>
                    <p style={{ margin: 0 }}>{selectedEscalation.reason}</p>
                  </div>
                </div>

                {/* Timeline */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Timeline</h3>
                  <div className={styles.smallMuted} style={{ display: 'grid', gap: 8 }}>
                    <div>
                      📅 Requested: {new Date(selectedEscalation.createdAt).toLocaleString()}
                    </div>
                    {selectedEscalation.contactedAt && (
                      <div>
                        ✓ Contacted: {new Date(selectedEscalation.contactedAt).toLocaleString()}
                      </div>
                    )}
                    {selectedEscalation.contactedByUser && (
                      <div>
                        👤 By: {selectedEscalation.contactedByUser.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Notes */}
                {selectedEscalation.notes && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Previous Notes</h3>
                    <div className={styles.reasonBox}>
                      <p style={{ margin: 0 }}>{selectedEscalation.notes}</p>
                    </div>
                  </div>
                )}

                {/* Action */}
                <div>
                  <h3 className={styles.sectionTitle}>Action</h3>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this escalation..."
                      className={styles.textarea}
                    />
                    <div className={styles.actions}>
                      {selectedEscalation.status === 'pending' && (
                        <button
                          onClick={handleMarkContacted}
                          disabled={submitting}
                          className={styles.btnPrimary}
                        >
                          {submitting ? '...' : 'Mark as Contacted'}
                        </button>
                      )}
                      <button
                        onClick={handleMarkResolved}
                        disabled={submitting || selectedEscalation.status === 'resolved'}
                        className={`${styles.btnPrimary} ${styles.btnSuccess}`}
                      >
                        {submitting ? '...' : 'Mark as Resolved'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p>Select a chat escalation to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </SuperAdminLayout>
  );
}
