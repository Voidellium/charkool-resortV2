'use client';
import { useState, useEffect } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import PromotionModal from '@/components/PromotionModal';
import { useToast, ConfirmModal } from '@/components/Toast';
import { Plus, Calendar, Target, Percent, DollarSign, Edit2, Trash2, TrendingUp, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import styles from './page.module.css';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, promotionId: null });
  
  const { success, error, warning } = useToast();

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/promotions');
      if (res.ok) {
        const data = await res.json();
        setPromotions(data);
      } else {
        throw new Error('Failed to fetch promotions');
      }
    } catch (err) {
      console.error('Failed to fetch promotions:', err);
      error('Failed to load promotions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPromotion(null);
    setModalOpen(true);
  };

  const handleEdit = (promotion) => {
    setEditingPromotion(promotion);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, promotionId: id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.promotionId;
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPromotions(promotions.filter(p => p.id !== id));
        success('Promotion deleted successfully');
      } else {
        throw new Error('Failed to delete promotion');
      }
    } catch (err) {
      console.error('Failed to delete promotion:', err);
      error('Failed to delete promotion. Please try again.');
    }
  };

  const handleSave = async (formData) => {
    try {
      const method = editingPromotion ? 'PATCH' : 'POST';
      const url = editingPromotion ? `/api/promotions/${editingPromotion.id}` : '/api/promotions';
      const res = await fetch(url, { method, body: formData });
      
      if (res.ok) {
        const savedPromotion = await res.json();
        if (editingPromotion) {
          setPromotions(promotions.map(p => p.id === savedPromotion.id ? savedPromotion : p));
          success('Promotion updated successfully');
        } else {
          setPromotions([...promotions, savedPromotion]);
          success('Promotion created successfully');
        }
        setModalOpen(false);
      } else {
        throw new Error('Failed to save promotion');
      }
    } catch (err) {
      console.error('Failed to save promotion:', err);
      error('Failed to save promotion. Please try again.');
    }
  };

  // Filter promotions based on status
  const filteredPromotions = promotions.filter(promotion => {
    if (filterStatus === 'active') return promotion.isActive;
    if (filterStatus === 'inactive') return !promotion.isActive;
    return true;
  });

  // Stats calculations
  const stats = {
    total: promotions.length,
    active: promotions.filter(p => p.isActive).length,
    inactive: promotions.filter(p => !p.isActive).length,
    expiringSoon: promotions.filter(p => {
      const endDate = new Date(p.endDate);
      const now = new Date();
      const daysDiff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      return p.isActive && daysDiff <= 7 && daysDiff >= 0;
    }).length
  };

  if (loading) {
    return (
      <SuperAdminLayout activePage="config">
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Loading promotions...</p>
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
                <TrendingUp className={styles.titleIcon} />
                Promotions Management
              </h1>
              <p className={styles.subtitle}>Create and manage promotional campaigns to boost bookings</p>
            </div>
            <button onClick={handleAdd} className={styles.addButton}>
              <Plus size={20} />
              Add Promotion
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <TrendingUp size={24} />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.total}</h3>
              <p className={styles.statLabel}>Total Promotions</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconSuccess}`}>
              <CheckCircle size={24} />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.active}</h3>
              <p className={styles.statLabel}>Active Promotions</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconDanger}`}>
              <XCircle size={24} />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.inactive}</h3>
              <p className={styles.statLabel}>Inactive Promotions</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIconWarning}`}>
              <Clock size={24} />
            </div>
            <div className={styles.statContent}>
              <h3 className={styles.statValue}>{stats.expiringSoon}</h3>
              <p className={styles.statLabel}>Expiring Soon</p>
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
              <option value="all">All Promotions</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
          <div className={styles.viewToggle}>
            <button 
              onClick={() => setViewMode('cards')} 
              className={`${styles.viewButton} ${viewMode === 'cards' ? styles.viewButtonActive : ''}`}
            >
              Cards
            </button>
            <button 
              onClick={() => setViewMode('table')} 
              className={`${styles.viewButton} ${viewMode === 'table' ? styles.viewButtonActive : ''}`}
            >
              Table
            </button>
          </div>
        </div>

        {/* Content Area */}
        {viewMode === 'cards' ? (
          <div className={styles.cardsGrid}>
            {filteredPromotions.map(promotion => (
              <div key={promotion.id} className={styles.promotionCard}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>{promotion.title}</h3>
                  <div className={`${styles.statusBadge} ${promotion.isActive ? styles.statusActive : styles.statusInactive}`}>
                    {promotion.isActive ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {promotion.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                
                <div className={styles.cardContent}>
                  <div className={styles.discountDisplay}>
                    <div className={styles.discountIcon}>
                      {promotion.discountType === 'percentage' ? <Percent size={20} /> : <DollarSign size={20} />}
                    </div>
                    <div className={styles.discountText}>
                      <span className={styles.discountValue}>
                        {promotion.discountType === 'percentage' 
                          ? `${promotion.discountValue / 100}%` 
                          : `₱${promotion.discountValue / 100}`}
                      </span>
                      <span className={styles.discountLabel}>Discount</span>
                    </div>
                  </div>
                  
                  <div className={styles.cardMeta}>
                    <div className={styles.metaItem}>
                      <Target size={16} />
                      <span>{promotion.targetType}</span>
                    </div>
                    <div className={styles.metaItem}>
                      <Calendar size={16} />
                      <span>{new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className={styles.cardActions}>
                  <button onClick={() => handleEdit(promotion)} className={styles.editButton}>
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button onClick={() => handleDelete(promotion.id)} className={styles.deleteButton}>
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead className={styles.tableHeader}>
                <tr>
                  <th>Title</th>
                  <th>Discount</th>
                  <th>Target</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromotions.map(promotion => (
                  <tr key={promotion.id} className={styles.tableRow}>
                    <td className={styles.tableCell}>
                      <div className={styles.titleCell}>
                        <TrendingUp size={16} className={styles.tableCellIcon} />
                        {promotion.title}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.discountCell}>
                        {promotion.discountType === 'percentage' ? <Percent size={14} /> : <DollarSign size={14} />}
                        {promotion.discountType === 'percentage' 
                          ? `${promotion.discountValue / 100}%` 
                          : `₱${promotion.discountValue / 100}`}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.targetCell}>
                        <Target size={14} />
                        {promotion.targetType}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={`${styles.statusBadge} ${promotion.isActive ? styles.statusActive : styles.statusInactive}`}>
                        {promotion.isActive ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        {promotion.isActive ? 'Active' : 'Inactive'}
                      </div>
                    </td>
                    <td className={styles.tableCell}>{new Date(promotion.startDate).toLocaleDateString()}</td>
                    <td className={styles.tableCell}>{new Date(promotion.endDate).toLocaleDateString()}</td>
                    <td className={styles.tableCell}>
                      <div className={styles.tableActions}>
                        <button onClick={() => handleEdit(promotion)} className={styles.tableEditButton}>
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(promotion.id)} className={styles.tableDeleteButton}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State */}
        {filteredPromotions.length === 0 && (
          <div className={styles.emptyState}>
            <TrendingUp size={48} className={styles.emptyIcon} />
            <h3 className={styles.emptyTitle}>No promotions found</h3>
            <p className={styles.emptyText}>
              {filterStatus === 'all' 
                ? 'Create your first promotion to start attracting more bookings'
                : `No ${filterStatus} promotions available`}
            </p>
            {filterStatus === 'all' && (
              <button onClick={handleAdd} className={styles.emptyButton}>
                <Plus size={20} />
                Create Promotion
              </button>
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <PromotionModal
          promotion={editingPromotion}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, promotionId: null })}
        onConfirm={confirmDelete}
        title="Delete Promotion"
        message="Are you sure you want to delete this promotion? This action cannot be undone."
        confirmText="Delete Promotion"
        cancelText="Cancel"
        variant="danger"
      />
    </SuperAdminLayout>
  );
}
