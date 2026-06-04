'use client';
import React, { useState, useEffect } from 'react';
import Loading, { TableLoading, ButtonLoading } from '@/components/Loading';
import { 
  Search,
  Edit,
  Trash2,
  X,
  Plus,
  UserCog
} from 'lucide-react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useToast, ConfirmModal } from '@/components/Toast';

// Role configuration
const STAFF_ROLES = [
  { value: 'CASHIER', label: 'Cashier', color: '#16a34a' },
  { value: 'AMENITYINVENTORYMANAGER', label: 'Inventory Manager', color: '#9333ea' },
  { value: 'SUPERADMIN', label: 'Super Admin', color: '#dc2626' },
];

const getRoleBadgeColor = (role) => {
  const roleConfig = STAFF_ROLES.find(r => r.value === role);
  if (roleConfig) return roleConfig.color;
  if (role === 'CUSTOMER') return '#6b7280';
  return '#6b7280';
};

const getRoleLabel = (role) => {
  const roleConfig = STAFF_ROLES.find(r => r.value === role);
  if (roleConfig) return roleConfig.label;
  if (role === 'CUSTOMER') return 'Customer';
  return role;
};

export default function UsersPage() {
  // Data state
  const [staff, setStaff] = useState([]);
  
  // UI state
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null });
  const [promotionModal, setPromotionModal] = useState({
    isOpen: false,
    staffMember: null,
    pendingFormData: null,
    justification: '',
    acknowledged: false,
    adminPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  
  const { success, error } = useToast();

  // Responsive detection
  useEffect(() => {
    const checkScreenSize = () => setIsMobile(window.innerWidth <= 768);
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch data
  const fetchStaff = async () => {
    try {
      const res = await fetch('/api/staff');
      if (res.ok) {
        const data = await res.json();
        setStaff(data);
      }
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchStaff().finally(() => setLoading(false));
  }, []);

  // Reset page when changing filters
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole, searchQuery]);

  // Filter logic
  const filteredStaff = staff
    .filter(s => filterRole ? s.role === filterRole : true)
    .filter(s => {
      const name = s.name || '';
      const email = s.email || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             email.toLowerCase().includes(searchQuery.toLowerCase());
    });



  // Pagination
  const currentItems = filteredStaff;
  const totalPages = Math.ceil(currentItems.length / ITEMS_PER_PAGE);
  const paginatedItems = currentItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handlers
  const handleAddStaff = () => {
    setEditingStaff(null);
    setShowStaffForm(true);
  };

  const handleEditStaff = (staffMember) => {
    setEditingStaff(staffMember);
    setShowStaffForm(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, userId: id });
  };

  const confirmDelete = async () => {
    const { userId } = confirmModal;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/user/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setStaff(staff.filter(s => s.id !== userId));
        success('Staff deleted successfully');
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
      error(err.message || 'Failed to delete');
    } finally {
      setFormLoading(false);
      setConfirmModal({ isOpen: false, userId: null });
    }
  };

  const handleSaveStaff = async (formData) => {
    setFormLoading(true);
    try {
      if (editingStaff) {
        // Update existing staff
        const res = await fetch(`/api/user/${editingStaff.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Update failed');
        }
        const updatedStaff = await res.json();
        setStaff(staff.map(s => s.id === updatedStaff.id ? updatedStaff : s));
        success('Staff updated successfully');
      } else {
        // Create new staff
        const res = await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Creation failed');
        }
        const newStaff = await res.json();
        setStaff([newStaff, ...staff]);
        success('Staff created successfully');
      }
      setShowStaffForm(false);
    } catch (err) {
      console.error(err);
      error(err.message || 'Failed to save staff');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRequestPromotion = (staffMember, formData) => {
    setPromotionModal({
      isOpen: true,
      staffMember,
      pendingFormData: formData,
      justification: '',
      acknowledged: false,
      adminPassword: '',
    });
  };

  const confirmPromotion = async () => {
    if (!promotionModal.pendingFormData) return;

    if (!promotionModal.justification.trim()) {
      error('Please provide a short justification for this promotion');
      return;
    }

    if (!promotionModal.acknowledged) {
      error('Please acknowledge the family-business promotion warning');
      return;
    }

    if (!promotionModal.adminPassword.trim()) {
      error('Please enter your current password to confirm this promotion');
      return;
    }

    const submitData = {
      ...promotionModal.pendingFormData,
      promotionJustification: promotionModal.justification.trim(),
      promotionAcknowledged: true,
      adminPassword: promotionModal.adminPassword,
    };

    setPromotionModal(prev => ({ ...prev, isOpen: false }));
    await handleSaveStaff(submitData);
  };

  // Styles
  const tabStyle = (isActive) => ({
    padding: '12px 24px',
    background: isActive ? 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)' : 'transparent',
    color: isActive ? 'white' : '#666',
    border: isActive ? 'none' : '2px solid #e5e7eb',
    borderRadius: '12px 12px 0 0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.3s ease',
  });

  const cardStyle = {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    padding: isMobile ? '1rem' : '1.5rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
  };

  return (
    <SuperAdminLayout activePage="users">
      <div style={{ 
        padding: isMobile ? '0.75rem' : '1.5rem 2rem', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        {/* Header */}
        <div style={{ 
          ...cardStyle,
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{ 
              fontSize: isMobile ? '1.75rem' : '2.5rem', 
              fontWeight: '700', 
              margin: 0, 
              background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              User Management
            </h1>
            <p style={{ fontSize: '1rem', color: '#666', margin: '0.5rem 0 0 0' }}>
              Manage staff accounts
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ 
              background: '#2563eb',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              <UserCog size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Staff: {staff.length}
            </div>
          </div>
        </div>



        {/* Main Content Card */}
        <div style={cardStyle}>
          {/* Controls */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
            alignItems: isMobile ? 'stretch' : 'center'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 360px', minWidth: isMobile ? '100%' : '280px' }}>
              <Search size={20} style={{ 
                position: 'absolute', left: '12px', top: '50%', 
                transform: 'translateY(-50%)', color: '#6b7280' 
              }} />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 12px 12px 44px',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                }}
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              style={{
                flex: '0 0 180px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                minWidth: '180px',
                boxSizing: 'border-box',
              }}
            >
              <option value="">All Roles</option>
              {STAFF_ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>

            <button
              onClick={handleAddStaff}
              style={{
                flex: '0 0 auto',
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={20} /> Add Staff
            </button>
          </div>



          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)' }}>
                  <th style={{ padding: '14px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '14px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Email</th>
                  <th style={{ padding: '14px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Role</th>
                  <th style={{ padding: '14px', textAlign: 'center', color: 'white', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableLoading colSpan={4} />
                ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ 
                        padding: '2rem', textAlign: 'center', color: '#6b7280' 
                      }}>
                        <div style={{ display: 'grid', gap: '0.35rem', justifyItems: 'center' }}>
                          <div style={{ fontWeight: 600, color: '#374151' }}>No staff found</div>
                          <div style={{ maxWidth: '520px', lineHeight: 1.5 }}>
                            This table shows staff-role accounts only, including example accounts such as Super Admin, Receptionist, Cashier, and Inventory Manager when they exist in the database.
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#9a3412' }}>
                            If you expected names here, refresh the page or verify that the sample accounts were seeded.
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, idx) => (
                      <tr key={item.id} style={{ 
                        background: idx % 2 === 0 ? '#f9fafb' : 'white',
                        borderBottom: '1px solid #e5e7eb'
                      }}>
                        <td style={{ padding: '14px', fontWeight: '500' }}>
                          {item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A'}
                        </td>
                        <td style={{ padding: '14px', color: '#6b7280' }}>{item.email}</td>
                        <td style={{ padding: '14px' }}>
                          <span style={{
                            background: getRoleBadgeColor(item.role),
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '500'
                          }}>
                            {getRoleLabel(item.role)}
                          </span>
                        </td>
                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button
                              onClick={() => handleEditStaff(item)}
                              style={{
                                padding: '8px 12px',
                                background: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.85rem'
                              }}
                            >
                              <Edit size={14} /> Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              style={{
                                padding: '8px 12px',
                                background: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.85rem'
                              }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, currentItems.length)} of {currentItems.length}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: currentPage === 1 ? '#f3f4f6' : 'white',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  Previous
                </button>
                <span style={{ 
                  padding: '8px 16px', 
                  background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
                  color: 'white',
                  borderRadius: '6px',
                  fontWeight: '600'
                }}>
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    background: currentPage === totalPages ? '#f3f4f6' : 'white',
                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Staff Form Modal */}
        {showStaffForm && (
          <StaffFormModal
            staff={editingStaff}
            onSave={handleSaveStaff}
            onRequestPromotion={handleRequestPromotion}
            onClose={() => setShowStaffForm(false)}
            loading={formLoading}
            isMobile={isMobile}
          />
        )}

        {/* Confirm Delete Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, userId: null })}
          onConfirm={confirmDelete}
          title="Delete Staff"
          message="Are you sure you want to delete this staff member? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />

        {promotionModal.isOpen && promotionModal.staffMember && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            alignItems: 'flex-start',
            zIndex: 1100,
            padding: isMobile ? '0.5rem' : '1rem',
            overflowY: 'auto'
          }}>
            <div style={{
              width: '100%',
              maxWidth: isMobile ? '100%' : '560px',
              maxHeight: isMobile ? 'calc(100vh - 1rem)' : 'calc(100vh - 2rem)',
              background: 'white',
              borderRadius: isMobile ? '14px' : '18px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              marginTop: isMobile ? '0.5rem' : '0'
            }}>
              <div style={{
                padding: isMobile ? '1rem 1rem' : '1.25rem 1.5rem',
                background: 'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)',
                color: 'white'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.35rem' }}>
                  {promotionModal.staffMember ? 'Confirm Super Admin Promotion' : 'Confirm Super Admin Creation'}
                </h2>
                <p style={{ margin: '0.35rem 0 0 0', opacity: 0.95 }}>
                  This action is reserved for owners or direct family managers only.
                </p>
              </div>
              <div style={{
                padding: isMobile ? '1rem' : '1.5rem',
                overflowY: 'auto'
              }}>
                <div style={{
                  background: '#fff7ed',
                  border: '1px solid #fdba74',
                  borderRadius: '12px',
                  padding: isMobile ? '0.85rem' : '1rem',
                  marginBottom: '1rem',
                  color: '#9a3412',
                  lineHeight: 1.55
                }}>
                  Superadmin promotion is reserved for owners or direct family managers only, so it supports succession, emergency access, and daily continuity without depending on one person. This is not meant for ordinary staff; it is a trust-based admin transfer within the family governance structure of the business.
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: '#374151' }}>
                    {promotionModal.staffMember ? 'Promoting' : 'Creating'}
                  </div>
                  <div style={{ color: '#111827' }}>
                    {promotionModal.staffMember
                      ? (promotionModal.staffMember.name || promotionModal.staffMember.email || `Staff #${promotionModal.staffMember.id}`)
                      : (promotionModal.pendingFormData?.name || promotionModal.pendingFormData?.email || 'New Super Admin account')}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                    Short justification
                  </label>
                  <textarea
                    value={promotionModal.justification}
                    onChange={(e) => setPromotionModal(prev => ({ ...prev, justification: e.target.value }))}
                    rows={3}
                    placeholder="Explain why this staff member should be promoted to Super Admin..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid #e5e7eb',
                      fontSize: '0.98rem',
                      resize: 'vertical',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  marginBottom: '1rem',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={promotionModal.acknowledged}
                    onChange={(e) => setPromotionModal(prev => ({ ...prev, acknowledged: e.target.checked }))}
                    style={{ marginTop: '4px' }}
                  />
                  <span style={{ color: '#374151', lineHeight: 1.5 }}>
                    I understand this promotion is for family ownership, succession, or emergency continuity only.
                  </span>
                </label>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                    Current superadmin password
                  </label>
                  <input
                    type="password"
                    value={promotionModal.adminPassword}
                    onChange={(e) => setPromotionModal(prev => ({ ...prev, adminPassword: e.target.value }))}
                    placeholder="Enter your password to confirm"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '2px solid #e5e7eb',
                      fontSize: '0.98rem',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                  flexDirection: isMobile ? 'column-reverse' : 'row'
                }}>
                  <button
                    type="button"
                    onClick={() => setPromotionModal({
                      isOpen: false,
                      staffMember: null,
                      pendingFormData: null,
                      justification: '',
                      acknowledged: false,
                      adminPassword: '',
                    })}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      cursor: 'pointer',
                      fontWeight: 600,
                      color: '#374151'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmPromotion}
                    disabled={formLoading}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #dc2626 0%, #f59e0b 100%)',
                      color: '#fff',
                      cursor: formLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      opacity: formLoading ? 0.7 : 1
                    }}
                  >
                    {formLoading ? 'Confirming...' : 'Confirm Promotion'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}

// Staff Form Modal Component
function StaffFormModal({ staff, onSave, onRequestPromotion, onClose, loading, isMobile }) {
  const [formData, setFormData] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    password: '',
    role: staff?.role || 'CASHIER',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!staff && !formData.password) newErrors.password = 'Password is required';
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      const submitData = { ...formData };
      if (!submitData.password) delete submitData.password;

      const isPromotionToSuperAdmin = submitData.role === 'SUPERADMIN' && (!staff || staff.role !== 'SUPERADMIN');
      if (isPromotionToSuperAdmin) {
        onRequestPromotion(staff, submitData);
        return;
      }

      onSave(submitData);
    }
  };

  const inputStyle = (hasError) => ({
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: `2px solid ${hasError ? '#dc2626' : '#e5e7eb'}`,
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        width: isMobile ? '95%' : '450px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1f2937' }}>
            {staff ? 'Edit Staff' : 'Create Staff Account'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="#6b7280" />
          </button>
        </div>

        {!staff && (
          <div style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            fontSize: '0.9rem',
            color: '#92400e'
          }}>
            <strong>Staff accounts</strong> are created with direct password access. 
            Share the credentials securely with the new staff member.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={inputStyle(errors.name)}
              placeholder="Enter full name"
            />
            {errors.name && <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>{errors.name}</span>}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={inputStyle(errors.email)}
              placeholder="staff@example.com"
            />
            {errors.email && <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>{errors.email}</span>}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
              Password {staff ? '(leave blank to keep current)' : '*'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={inputStyle(errors.password)}
              placeholder={staff ? '••••••••' : 'Minimum 8 characters'}
            />
            {errors.password && <span style={{ color: '#dc2626', fontSize: '0.85rem' }}>{errors.password}</span>}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', color: '#374151' }}>
              Role *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              style={inputStyle(false)}
            >
              {STAFF_ROLES.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </div>

          {formData.role === 'SUPERADMIN' && (!staff || staff.role !== 'SUPERADMIN') && (
            <div style={{
              background: '#fff7ed',
              border: '1px solid #fdba74',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '20px',
              fontSize: '0.9rem',
              color: '#9a3412',
              lineHeight: 1.5
            }}>
              Assigning Super Admin access will require a warning confirmation, a short justification, an acknowledgment, and your current password.
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                background: '#e5e7eb',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: loading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {loading && <ButtonLoading size="small" color="#ffffff" />}
              {staff ? 'Update Staff' : 'Create Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


