'use client';
import { useState, useEffect } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import PolicyModal from '@/components/PolicyModal';
import { useToast, ConfirmModal } from '@/components/Toast';
import { Plus, Shield, Edit2, Trash2, FileText, CheckCircle, XCircle, ArrowUp, ArrowDown, Hash, Clock } from 'lucide-react';
import styles from './page.module.css';

export default function PoliciesPage() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, policyId: null });
  
  const { success, error, warning } = useToast();

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      const res = await fetch('/api/policies');
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      } else {
        throw new Error('Failed to fetch policies');
      }
    } catch (err) {
      console.error('Failed to fetch policies:', err);
      error('Failed to load policies. Please try again.');
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

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, policyId: id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.policyId;
    try {
      const res = await fetch(`/api/policies/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPolicies(policies.filter(p => p.id !== id));
        success('Policy deleted successfully');
      } else {
        throw new Error('Failed to delete policy');
      }
    } catch (err) {
      console.error('Failed to delete policy:', err);
      error('Failed to delete policy. Please try again.');
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
          success('Policy updated successfully');
        } else {
          setPolicies([...policies, savedPolicy]);
          success('Policy created successfully');
        }
        setModalOpen(false);
      } else {
        throw new Error('Failed to save policy');
      }
    } catch (err) {
      console.error('Failed to save policy:', err);
      error('Failed to save policy. Please try again.');
    }
  };

  const handleReorder = async (reorderedPolicies) => {
    try {
      const res = await fetch('/api/policies/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ policies: reorderedPolicies }) });
      if (res.ok) {
        setPolicies(reorderedPolicies);
        success('Policies reordered successfully');
      } else {
        throw new Error('Failed to reorder policies');
      }
    } catch (err) {
      console.error('Failed to reorder policies:', err);
      error('Failed to reorder policies. Please try again.');
    }
  };

  const movePolicy = (policyId, direction) => {
    const currentIndex = policies.findIndex(p => p.id === policyId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === policies.length - 1)
    ) {
      return;
    }

    const newPolicies = [...policies];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Swap policies
    [newPolicies[currentIndex], newPolicies[targetIndex]] = [newPolicies[targetIndex], newPolicies[currentIndex]];
    
    // Update order numbers
    newPolicies.forEach((policy, index) => {
      policy.order = index + 1;
    });

    setPolicies(newPolicies);
    handleReorder(newPolicies);
  };

  // Filter policies based on status
  const filteredPolicies = policies.filter(policy => {
    if (filterStatus === 'active') return policy.isActive;
    if (filterStatus === 'inactive') return !policy.isActive;
    return true;
  });

  // Stats calculations
  const stats = {
    total: policies.length,
    active: policies.filter(p => p.isActive).length,
    inactive: policies.filter(p => !p.isActive).length,
    recentlyUpdated: policies.filter(p => {
      const updatedAt = new Date(p.updatedAt || p.createdAt);
      const now = new Date();
      const daysDiff = Math.ceil((now - updatedAt) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7;
    }).length
  };

  if (loading) {
    return (
      <SuperAdminLayout activePage="config">
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading policies...</p>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout activePage="config">
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerText}>
              <h1 className={styles.title}>
                <Shield className={styles.titleIcon} />
                Policies Management
              </h1>
              <p className={styles.subtitle}>Define and manage resort policies and terms of service</p>
            </div>
            <button onClick={handleAdd} className={styles.addButton}>
              <Plus size={20} />
              Add Policy
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FileText size={24} />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.total}</h3>
              <p className={styles.statLabel}>Total Policies</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
              <CheckCircle size={24} />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.active}</h3>
              <p className={styles.statLabel}>Active Policies</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconDanger}`}>
              <XCircle size={24} />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.inactive}</h3>
              <p className={styles.statLabel}>Inactive Policies</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconInfo}`}>
              <Clock size={24} />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.recentlyUpdated}</h3>
              <p className={styles.statLabel}>Recently Updated</p>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className={styles.controlsBar}>
          <div className={styles.filterControls}>
            <label className={styles.filterLabel}>Filter by status:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Policies</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <div className={styles.infoText}>
            <Hash size={16} />
            Policies are displayed in order of priority
          </div>
        </div>

        {/* Policies Grid */}
        <div className={styles.policiesGrid}>
          {filteredPolicies.map((policy, index) => (
            <div key={policy.id} className={styles.policyCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  <div className={styles.orderBadge}>
                    <Hash size={14} />
                    {policy.order}
                  </div>
                  <h3 className={styles.cardTitle}>{policy.title}</h3>
                </div>
                <div className={styles.cardHeaderRight}>
                  <div className={`${styles.statusBadge} ${policy.isActive ? styles.statusActive : styles.statusInactive}`}>
                    {policy.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    {policy.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
              
              <div className={styles.cardContent}>
                <p className={styles.policyContent}>{policy.content}</p>
              </div>
              
              <div className={styles.cardActions}>
                <div className={styles.orderControls}>
                  <button 
                    onClick={() => movePolicy(policy.id, 'up')} 
                    disabled={index === 0}
                    className={styles.orderButton}
                    title="Move up"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button 
                    onClick={() => movePolicy(policy.id, 'down')} 
                    disabled={index === filteredPolicies.length - 1}
                    className={styles.orderButton}
                    title="Move down"
                  >
                    <ArrowDown size={16} />
                  </button>
                </div>
                <div className={styles.actionButtons}>
                  <button onClick={() => handleEdit(policy)} className={styles.editButton}>
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(policy.id)} className={styles.deleteButton}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPolicies.length === 0 && (
          <div className={styles.emptyState}>
            <FileText size={48} className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>No policies found</h3>
            <p className={styles.emptyText}>
              {filterStatus === 'all' 
                ? 'Create your first policy to establish resort guidelines'
                : `No ${filterStatus} policies available`}
            </p>
            {filterStatus === 'all' && (
              <button onClick={handleAdd} className={styles.emptyButton}>
                <Plus size={20} />
                Create Policy
              </button>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <PolicyModal
          policy={editingPolicy}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          wrapperClass={styles.modalWrapper}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, policyId: null })}
        onConfirm={confirmDelete}
        title="Delete Policy"
        message="Are you sure you want to delete this policy? This action cannot be undone."
        confirmText="Delete Policy"
        cancelText="Cancel"
        variant="danger"
      />
    </SuperAdminLayout>
  );
}
