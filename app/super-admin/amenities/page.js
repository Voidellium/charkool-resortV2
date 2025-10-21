'use client';
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useToast, ConfirmModal } from '@/components/Toast';
import { useNavigationGuard } from '../../../hooks/useNavigationGuard.simple';
import { useNavigationContext } from '../../../context/NavigationContext';
import { NavigationConfirmationModal } from '../../../components/CustomModals';
import { Package, Plus, Edit2, Trash2, Search, Filter, RefreshCw, Clock, AlertCircle } from 'lucide-react';

export default function SuperAdminAmenityInventoryPage() {
  const [amenities, setAmenities] = useState([]);
  const [filteredAmenities, setFilteredAmenities] = useState([]);
  const [newAmenity, setNewAmenity] = useState({ name: '', quantity: '', category: 'optional', pricePerUnit: '', pricePerHour: '', unitType: '', unitNote: '' });
  const [editingAmenity, setEditingAmenity] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ 
    isOpen: false, 
    amenityId: null, 
    amenityName: '', 
    amenityQuantity: 0, 
    amenityCategory: '' 
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const { success, error } = useToast();

  // Navigation Guard Setup for admin forms
  const navigationContext = useNavigationContext();
  const navigationGuard = useNavigationGuard({
    trackForms: true,
    formId: 'super-admin-amenities',
    customMessage: 'Unsaved inventory changes will be lost. Please save your work before navigating away.'
  });

  // Add responsive styles
  useEffect(() => {
    const styleId = 'amenities-responsive-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @media (max-width: 768px) {
          .controls-section {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 1rem !important;
            padding: 1rem !important;
          }
          
          .search-container {
            width: 100% !important;
            max-width: 100% !important;
          }
          
          .add-form {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.75rem !important;
          }
          
          .form-input {
            width: 100% !important;
            min-width: 100% !important;
            margin: 0 !important;
          }
          
          .form-input-small {
            width: 100% !important;
            text-align: left !important;
          }
          
          .submit-button, .cancel-button {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Fetch amenities from API
  // Fetch optional and rental amenities from their respective tables
  const fetchAmenities = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      if (!showRefresh) setLoading(true);

      // Fetch optional amenities
  const optRes = await fetch('/api/amenities/optional');
      const optional = await optRes.json();
      // Fetch rental amenities
  const rentRes = await fetch('/api/amenities/rental');
      const rental = await rentRes.json();

      // Add category field for UI
      const optWithCat = (optional || []).map(a => ({ ...a, category: 'optional' }));
      const rentWithCat = (rental || []).map(a => ({ ...a, category: 'rental' }));
      const all = [...optWithCat, ...rentWithCat];
      // Dedupe by category + id (fallback to name)
      const seen = new Set();
      const unique = [];
      for (const a of all) {
        const key = `${a.category}-${a.id ?? (a.name ? a.name.toLowerCase() : '')}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(a);
        }
      }
      setAmenities(unique);
      setFilteredAmenities(unique);
    } catch (err) {
      console.error('Failed to fetch amenities:', err);
      error('Failed to fetch amenities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter amenities based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredAmenities(amenities);
    } else {
      const filtered = amenities.filter(amenity =>
        amenity.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAmenities(filtered);
    }
  }, [amenities, searchTerm]);

  useEffect(() => {
    fetchAmenities();
    const interval = setInterval(() => fetchAmenities(), 30000); // 30s polling
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!newAmenity.name.trim()) {
      error('Amenity name is required and cannot be empty.');
      return;
    }
    
    if (newAmenity.name.trim().length < 2) {
      error('Amenity name must be at least 2 characters long.');
      return;
    }
    
    const quantityNumber = parseInt(newAmenity.quantity, 10);
    if (isNaN(quantityNumber)) {
      error('Please enter a valid number for quantity.');
      return;
    }
    
    if (quantityNumber < 0) {
      error('Quantity cannot be negative.');
      return;
    }
    
    if (quantityNumber > 1000) {
      error('Quantity seems unusually high. Please verify the amount.');
      return;
    }
    
    try {
      const category = newAmenity.category;
      if (editingAmenity) {
        if (!editingAmenity.id) {
          error('Invalid amenity selected for editing');
          return;
        }
        const endpoint = category === 'rental' 
          ? `/api/amenities/rental/${editingAmenity.id}`
          : `/api/amenities/optional/${editingAmenity.id}`;
        const payload = category === 'rental'
          ? {
              name: newAmenity.name.trim(),
              quantity: quantityNumber,
              pricePerUnit: newAmenity.pricePerUnit ? parseInt(newAmenity.pricePerUnit) : undefined,
              pricePerHour: newAmenity.pricePerHour ? parseInt(newAmenity.pricePerHour) : undefined,
              unitType: newAmenity.unitType || undefined,
              unitNote: newAmenity.unitNote || undefined,
            }
          : {
              name: newAmenity.name.trim(),
              quantity: quantityNumber,
              maxQuantity: quantityNumber, // keep max in sync for optional
            };
        const res = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          success('Amenity updated successfully');
          setEditingAmenity(null);
          setNewAmenity({ name: '', quantity: '', category: 'optional', pricePerUnit: '', pricePerHour: '', unitType: '', unitNote: '' });
          navigationGuard.markFormClean('super-admin-amenities');
          fetchAmenities();
        } else {
          const errorData = await res.json();
          throw new Error(errorData.error || `Update failed (${res.status})`);
        }
      } else {
        const endpoint = category === 'rental' 
          ? '/api/amenities/rental'
          : '/api/amenities/optional';
        const payload = category === 'rental'
          ? {
              name: newAmenity.name.trim(),
              quantity: quantityNumber,
              pricePerUnit: newAmenity.pricePerUnit ? parseInt(newAmenity.pricePerUnit) : undefined,
              pricePerHour: newAmenity.pricePerHour ? parseInt(newAmenity.pricePerHour) : undefined,
              unitType: newAmenity.unitType || undefined,
              unitNote: newAmenity.unitNote || undefined,
            }
          : {
              name: newAmenity.name.trim(),
              quantity: quantityNumber,
              maxQuantity: quantityNumber,
            };
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          success('Amenity created successfully');
          setNewAmenity({ name: '', quantity: '', category: 'optional', pricePerUnit: '', pricePerHour: '', unitType: '', unitNote: '' });
          navigationGuard.markFormClean('super-admin-amenities');
          fetchAmenities();
        } else {
          const errorData = await res.json();
          throw new Error(errorData.error || `Creation failed (${res.status})`);
        }
      }
    } catch (err) {
      console.error('Failed to submit amenity:', err);
      error(`Failed to save amenity: ${err.message}`);
    }
  };

  const handleDelete = (amenity) => {
    setConfirmModal({ 
      isOpen: true, 
      amenityId: amenity.id,
      amenityName: amenity.name,
      amenityQuantity: amenity.quantity,
      amenityCategory: amenity.category
    });
  };

  const confirmDelete = async () => {
    const { amenityId, amenityName, amenityCategory } = confirmModal;
    try {
      const endpoint = amenityCategory === 'rental' 
        ? `/api/amenities/rental/${amenityId}`
        : `/api/amenities/optional/${amenityId}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        fetchAmenities();
        success(`"${amenityName}" has been permanently deleted from inventory`);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete amenity');
      }
    } catch (err) {
      console.error('Failed to delete amenity:', err);
      error(`Failed to delete "${amenityName}": ${err.message}`);
    } finally {
      setConfirmModal({ isOpen: false, amenityId: null, amenityName: '', amenityQuantity: 0, amenityCategory: '' });
    }
  };

  const handleResetInventory = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to reset the amenity inventory?\n\n' +
      'This will:\n' +
      '• Delete ALL existing amenities\n' +
      '• Create only the 6 required amenities:\n' +
      '  - Broom & Dustpan (48)\n' +
      '  - Extra Bed (48)\n' +
      '  - Extra Blanket (48)\n' +
      '  - Extra Pillow (50)\n' +
      '  - Toiletries Kit (47)\n' +
      '  - Towels Set (49)\n\n' +
      'This action cannot be undone!'
    );
    
    if (!confirmed) return;
    
    try {
      setLoading(true);
      const res = await fetch('/api/amenities/inventory/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (res.ok) {
        const result = await res.json();
        success(`Inventory reset successfully! Deleted ${result.deleted} items and created ${result.created} required amenities.`);
        fetchAmenities();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reset inventory');
      }
    } catch (err) {
      console.error('Failed to reset inventory:', err);
      error(`Failed to reset inventory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (amenity) => {
    setEditingAmenity(amenity);
    // Populate fields based on category
    if (amenity.category === 'rental') {
      setNewAmenity({ 
        name: amenity.name, 
        quantity: String(amenity.quantity),
        category: 'rental',
        pricePerUnit: amenity.pricePerUnit ?? '',
        pricePerHour: amenity.pricePerHour ?? '',
        unitType: amenity.unitType ?? '',
        unitNote: amenity.unitNote ?? '',
      });
    } else {
      setNewAmenity({ name: amenity.name, quantity: String(amenity.quantity), category: 'optional' });
    }
  };

  // Helper function to get category color
  const getCategoryColor = (category) => {
    const colors = {
      'optional': '#3b82f6',       // Blue for optional
      'rental': '#10b981',         // Green for rental
      'Cleaning Supplies': '#10b981', // Green
      'Furniture': '#8b5cf6',         // Purple  
      'Bedding': '#3b82f6',           // Blue
      'Bathroom Essentials': '#06b6d4', // Cyan
      'Electronics': '#f59e0b',       // Orange
      'Kitchen': '#ef4444',           // Red
      'General': '#6b7280'            // Gray
    };
    return colors[category] || colors['General'];
  };

  // Helper function to format dates
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <SuperAdminLayout activePage="amenities">
      <div style={styles.container}>
        {/* Header Section */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.titleSection}>
              <div style={styles.iconContainer}>
                <Package size={32} style={{ color: 'white' }} />
              </div>
              <div>
                <h1 style={styles.title}>Amenity Inventory</h1>
                <p style={styles.subtitle}>Manage hotel amenities and track inventory levels</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => fetchAmenities(true)}
                disabled={refreshing}
                style={{
                  ...styles.refreshButton,
                  opacity: refreshing ? 0.7 : 1,
                  cursor: refreshing ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={16} style={{ 
                  animation: refreshing ? 'spin 1s linear infinite' : 'none' 
                }} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleResetInventory}
                style={{
                  ...styles.resetButton,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
                disabled={loading}
              >
                <Package size={16} />
                Reset to Required Items
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <Package size={24} style={{ color: '#febe52' }} />
            </div>
            <div>
              <div style={styles.statValue}>{amenities.length}</div>
              <div style={styles.statLabel}>Total Amenities</div>
            </div>
          </div>
          
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <AlertCircle size={24} style={{ color: '#f59e0b' }} />
            </div>
            <div>
              <div style={styles.statValue}>
                {amenities.filter(a => a && typeof a.quantity === 'number' && a.quantity < 5).length}
              </div>
              <div style={styles.statLabel}>Low Stock</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <Clock size={24} style={{ color: '#10b981' }} />
            </div>
            <div>
              <div style={styles.statValue}>
                {amenities.filter(a => {
                  if (!a || !a.updatedAt) return false;
                  const hoursSinceUpdate = (new Date() - new Date(a.updatedAt)) / (1000 * 60 * 60);
                  return hoursSinceUpdate < 24;
                }).length}
              </div>
              <div style={styles.statLabel}>Updated Today</div>
            </div>
          </div>
        </div>

        {/* Controls Section */}
        <div style={styles.controlsSection} className="controls-section">
          {/* Search Bar */}
          <div style={styles.searchContainer} className="search-container">
            <Search size={20} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search amenities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Add Amenity Form */}
          <form onSubmit={handleSubmit} style={styles.addForm} className="add-form">
            <input
              style={styles.formInput}
              className="form-input"
              type="text"
              placeholder={editingAmenity ? "Update amenity name" : "Amenity Name"}
              value={newAmenity.name}
              onChange={(e) => {
                setNewAmenity({ ...newAmenity, name: e.target.value });
                navigationGuard.markFormDirty('super-admin-amenities');
              }}
              required
            />
            <input
              style={styles.formInputSmall}
              className="form-input-small"
              type="number"
              placeholder={editingAmenity ? "Stock quantity" : "Stock Qty"}
              value={newAmenity.quantity}
              onChange={(e) => {
                setNewAmenity({ ...newAmenity, quantity: e.target.value });
                navigationGuard.markFormDirty('super-admin-amenities');
              }}
              required
              min="0"
            />
            <select
              style={styles.formInputSmall}
              className="form-input-small"
              value={newAmenity.category}
              onChange={e => {
                setNewAmenity({ ...newAmenity, category: e.target.value });
                navigationGuard.markFormDirty('super-admin-amenities');
              }}
              required
            >
              <option value="optional">Optional</option>
              <option value="rental">Rental</option>
            </select>
            {newAmenity.category === 'rental' && (
              <>
                <input
                  style={styles.formInputSmall}
                  className="form-input-small"
                  type="number"
                  placeholder="Price per unit"
                  value={newAmenity.pricePerUnit}
                  onChange={(e) => setNewAmenity({ ...newAmenity, pricePerUnit: e.target.value })}
                  min="0"
                />
                <input
                  style={styles.formInputSmall}
                  className="form-input-small"
                  type="number"
                  placeholder="Price per hour (optional)"
                  value={newAmenity.pricePerHour}
                  onChange={(e) => setNewAmenity({ ...newAmenity, pricePerHour: e.target.value })}
                  min="0"
                />
                <input
                  style={styles.formInputSmall}
                  className="form-input-small"
                  type="text"
                  placeholder="Unit type (e.g., set, hour)"
                  value={newAmenity.unitType}
                  onChange={(e) => setNewAmenity({ ...newAmenity, unitType: e.target.value })}
                />
                <input
                  style={styles.formInputSmall}
                  className="form-input-small"
                  type="text"
                  placeholder="Unit note (optional)"
                  value={newAmenity.unitNote}
                  onChange={(e) => setNewAmenity({ ...newAmenity, unitNote: e.target.value })}
                />
              </>
            )}
            <button type="submit" style={styles.submitButton} className="submit-button" disabled={loading}>
              <Plus size={16} />
              {editingAmenity ? 'Update' : 'Add'}
            </button>
            {editingAmenity && (
              <button
                type="button"
                style={styles.cancelButton}
                className="cancel-button"
                onClick={() => {
                  setEditingAmenity(null);
                  setNewAmenity({ name: '', quantity: '', category: 'optional' });
                }}
              >
                Cancel
              </button>
            )}
          </form>
        </div>

        {/* Amenities Grid */}
        <div style={styles.gridContainer}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading amenities...</p>
            </div>
          ) : filteredAmenities.length === 0 ? (
            <div style={styles.emptyState}>
              <Package size={64} style={{ color: '#9ca3af', marginBottom: '1rem' }} />
              <h3 style={styles.emptyTitle}>
                {searchTerm ? 'No amenities found' : 'No amenities yet'}
              </h3>
              <p style={styles.emptyText}>
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Start by adding your first amenity to the inventory'
                }
              </p>
            </div>
          ) : (
            filteredAmenities.map((amenity, i) => {
              // Safety check for required fields
              if (!amenity || !amenity.name) {
                return null;
              }
              
              const isLowStock = amenity.quantity < 10;
              const isCriticalStock = amenity.quantity === 0;
              const categoryColor = getCategoryColor(amenity.category);
              const hoursSinceUpdate = amenity.updatedAt 
                ? (new Date() - new Date(amenity.updatedAt)) / (1000 * 60 * 60)
                : Infinity;
              const isRecentlyUpdated = hoursSinceUpdate < 24;

              return (
                <div
                  key={`${amenity.category}-${amenity?.id ?? `amenity-${i}-${(amenity && amenity.name) || ''}`}`}
                  style={{
                    ...styles.amenityCard,
                    borderLeft: `4px solid ${categoryColor}`,
                    ...(isCriticalStock && styles.criticalStockCard),
                    ...(isLowStock && !isCriticalStock && styles.lowStockCard)
                  }}
                >
                  <div style={styles.cardHeader}>
                    <div style={styles.cardIconContainer}>
                      <Package size={20} style={{ 
                        color: isCriticalStock ? '#ef4444' : isLowStock ? '#f59e0b' : categoryColor 
                      }} />
                    </div>
                    <div style={styles.cardBadges}>
                      <span style={{
                        ...styles.categoryBadge, 
                        backgroundColor: categoryColor,
                        color: 'white'
                      }}>
                        {amenity.category ? amenity.category.charAt(0).toUpperCase() + amenity.category.slice(1) : 'General'}
                      </span>
                      {isRecentlyUpdated && (
                        <span style={styles.recentBadge}>Recent</span>
                      )}
                      {isCriticalStock && (
                        <span style={styles.criticalStockBadge}>Out of Stock</span>
                      )}
                      {isLowStock && !isCriticalStock && (
                        <span style={styles.lowStockBadge}>Low Stock</span>
                      )}
                    </div>
                  </div>
                  
                  <h3 style={styles.cardTitle}>{amenity.name}</h3>
                  
                  <div style={styles.cardStats}>
                    <div style={styles.quantityDisplay}>
                      <span style={{
                        ...styles.quantityNumber,
                        color: isCriticalStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981'
                      }}>
                        {amenity.quantity}
                      </span>
                      <span style={styles.quantityLabel}>in stock</span>
                    </div>
                    <div style={styles.stockProgressContainer}>
                      <div style={styles.stockProgressBar}>
                        <div 
                          style={{
                            ...styles.stockProgressFill,
                            width: `${Math.min(100, (amenity.quantity / 50) * 100)}%`,
                            backgroundColor: isCriticalStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981'
                          }}
                        />
                      </div>
                      <span style={styles.stockProgressText}>
                        {Math.round((amenity.quantity / 50) * 100)}% capacity
                      </span>
                    </div>
                  </div>

                  <div style={styles.cardMeta}>
                    <Clock size={12} style={{ color: '#9ca3af' }} />
                    <span style={styles.lastUpdated}>
                      Updated {formatDate(amenity.updatedAt)}
                    </span>
                  </div>

                  <div style={styles.cardActions}>
                    <button
                      onClick={() => handleEdit(amenity)}
                      style={styles.editButton}
                    >
                      <Edit2 size={14} />
                      Edit Stock
                    </button>
                    <button
                      onClick={() => handleDelete(amenity)}
                      style={styles.deleteButton}
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ 
          isOpen: false, 
          amenityId: null, 
          amenityName: '', 
          amenityQuantity: 0, 
          amenityCategory: '' 
        })}
        onConfirm={confirmDelete}
        title="Delete Amenity Permanently"
        message={
          <>
            <p>Are you sure you want to permanently delete <strong>"{confirmModal.amenityName}"</strong>?</p>
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px',
              margin: '12px 0',
              fontSize: '14px'
            }}>
              <p style={{margin: '0 0 6px 0', fontWeight: 'bold', color: '#dc2626'}}>
                ⚠️ This will permanently remove:
              </p>
              <ul style={{margin: '0', paddingLeft: '20px', color: '#7f1d1d'}}>
                <li>{confirmModal.amenityQuantity} items currently in stock</li>
                <li>Category: {confirmModal.amenityCategory || 'General'}</li>
                <li>All associated inventory records</li>
              </ul>
            </div>
            <p><strong>This action cannot be undone.</strong></p>
          </>
        }
        confirmText="Yes, Delete Permanently"
        cancelText="Cancel"
        variant="danger"
      />

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @media (max-width: 768px) {
          .grid-responsive {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          
          .controls-responsive {
            flex-direction: column !important;
            gap: 1rem !important;
          }
          
          .form-responsive {
            flex-wrap: wrap !important;
          }
        }
      `}</style>

      {/* Navigation Confirmation Modal */}
      <NavigationConfirmationModal 
        show={navigationGuard.showModal}
        onStay={navigationGuard.handleStay}
        onLeave={navigationGuard.handleLeave}
        context={navigationGuard.context}
        message={navigationGuard.message}
      />
    </SuperAdminLayout>
  );
}

// Professional hotel dashboard styles
const styles = {
  container: {
    width: '100%',
    padding: '2rem 1.5rem',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  // Header Section
  header: {
    background: 'rgba(255,255,255,0.95)',
    padding: '2rem',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    marginBottom: '2rem',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  iconContainer: {
    background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
    borderRadius: '12px',
    padding: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    margin: 0,
    background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    lineHeight: '1.2',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '1.1rem',
    margin: '0.5rem 0 0 0',
    fontWeight: '400',
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  resetButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
  },

  // Statistics Cards
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  statCard: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  statIcon: {
    background: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '10px',
    padding: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: '1',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },

  // Controls Section
  controlsSection: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    padding: '1.5rem 2rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    marginBottom: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  searchContainer: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    background: 'white',
  },
  addForm: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
  },
  formInput: {
    padding: '0.75rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    flex: '1',
    minWidth: '200px',
    background: 'white',
  },
  formInputSmall: {
    padding: '0.75rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.875rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    width: '80px',
    textAlign: 'center',
    background: 'white',
  },
  submitButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
  },
  cancelButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },

  // Grid Container
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1.5rem',
    className: 'grid-responsive',
  },

  // Loading States
  loadingContainer: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4rem 2rem',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
  },
  spinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #febe52',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '1rem',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '4rem 2rem',
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
  },
  emptyTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 0.5rem 0',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '1rem',
    margin: 0,
  },

  // Amenity Cards
  amenityCard: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    animation: 'fadeIn 0.5s ease-out',
  },
  lowStockCard: {
    borderLeft: '4px solid #ef4444',
    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(255,255,255,0.95) 100%)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  cardIconContainer: {
    background: 'rgba(102, 126, 234, 0.1)',
    borderRadius: '8px',
    padding: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBadges: {
    display: 'flex',
    gap: '0.5rem',
  },
  recentBadge: {
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
  },
  lowStockBadge: {
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
  },
  criticalStockBadge: {
    background: 'linear-gradient(135deg, #7c2d12 0%, #991b1b 100%)',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
    animation: 'pulse 2s infinite',
  },
  criticalStockCard: {
    borderLeft: '4px solid #7c2d12',
    background: 'linear-gradient(135deg, rgba(124, 45, 18, 0.08) 0%, rgba(255,255,255,0.95) 100%)',
  },
  categoryBadge: {
    fontSize: '0.75rem',
    fontWeight: '600',
    padding: '0.25rem 0.5rem',
    borderRadius: '12px',
    textTransform: 'capitalize',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 1rem 0',
    lineHeight: '1.3',
  },
  cardStats: {
    marginBottom: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  stockProgressContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  stockProgressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  stockProgressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  stockProgressText: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: '500',
  },
  quantityDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
    flex: '1',
    textAlign: 'center',
  },
  quantityNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#667eea',
    lineHeight: '1',
  },
  quantityLabel: {
    fontSize: '0.875rem',
    color: '#6b7280',
    fontWeight: '500',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #f3f4f6',
  },
  lastUpdated: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    fontWeight: '500',
  },
  cardActions: {
    display: 'flex',
    gap: '0.75rem',
  },
  editButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #febe52 0%, #E8D391 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  deleteButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};