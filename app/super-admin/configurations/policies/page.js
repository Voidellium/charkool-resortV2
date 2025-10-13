 'use client';
 import { useState, useEffect } from 'react';
 import SuperAdminLayout from '@/components/SuperAdminLayout';
 import PolicyModal from '@/components/PolicyModal';
 import styles from './page.module.css';

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/policies');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (error) {
      console.error('Failed to fetch policies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPolicy(null);
    setModalOpen(true);
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      const res = await fetch(`/api/policies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPolicies(policies.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete policy:', error);
    }
  };

  const handleSave = async (policyData) => {
    try {
      const method = editingPolicy ? 'PATCH' : 'POST';
      const url = editingPolicy ? `/api/policies/${editingPolicy.id}` : '/api/policies';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(policyData) });
      if (res.ok) {
        const savedPolicy = await res.json();
        if (editingPolicy) {
          setPolicies(policies.map(p => p.id === savedPolicy.id ? savedPolicy : p));
        } else {
          setPolicies([...policies, savedPolicy]);
        }
        setModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to save policy:', error);
    }
  };

  const handleReorder = async (reorderedPolicies) => {
    try {
      const res = await fetch('/api/policies/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ policies: reorderedPolicies }) });
      if (res.ok) {
        setPolicies(reorderedPolicies);
      }
    } catch (error) {
      console.error('Failed to reorder policies:', error);
    }
  };

  if (loading) return <SuperAdminLayout activePage="config"><div>Loading...</div></SuperAdminLayout>;

  return (
    <SuperAdminLayout activePage="config">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Policies Management</h1>
          <button onClick={handleAdd} className={styles.addButton}>Add Policy</button>
        </div>
        <div>
          {policies.map(p => (
            <div key={p.id} className={styles.card}>
              <h3 className={styles.cardTitle}>{p.title}</h3>
              <p className={styles.cardContent}>{p.content}</p>
              <p className={styles.meta}>
                <span className={styles.badge}>Order {p.order}</span>
                <span className={`${styles.pill} ${p.isActive ? styles.pillActive : styles.pillInactive}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
              </p>
              <div className={styles.actions}>
                <button onClick={() => handleEdit(p)} className={`${styles.btn} ${styles.btnPrimary}`}>Edit</button>
                <button onClick={() => handleDelete(p.id)} className={`${styles.btn} ${styles.btnDanger}`}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {modalOpen && (
        <PolicyModal
          policy={editingPolicy}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          wrapperClass={styles.modalWrapper}
        />
      )}
    </SuperAdminLayout>
  );
}
