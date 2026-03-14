'use client';
import React, { useState, useEffect } from 'react';
import Loading, { TableLoading, ButtonLoading } from '@/components/Loading';
import { 
  Search,
  Edit,
  Trash2,
  X,
  Plus,
  Users,
  UserCog,
  Eye,
  Shield,
  Calendar,
  Mail,
  Phone,
  CheckCircle,
  XCircle
} from 'lucide-react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useToast, ConfirmModal } from '@/components/Toast';

// Role configuration
const STAFF_ROLES = [
  { value: 'RECEPTIONIST', label: 'Receptionist', color: '#2563eb' },
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
  // Tab state
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' or 'customers'
  
  // Data state
  const [staff, setStaff] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // UI state
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null, userType: null });
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
      error('Failed to load staff');
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      error('Failed to load customers');
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStaff(), fetchCustomers()]).finally(() => setLoading(false));
  }, []);

  // Reset page when changing tabs or filters
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterRole, searchQuery]);

  // Filter logic
  const filteredStaff = staff
    .filter(s => filterRole ? s.role === filterRole : true)
    .filter(s => {
      const name = s.name || '';
      const email = s.email || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             email.toLowerCase().includes(searchQuery.toLowerCase());
    });

  const filteredCustomers = customers
    .filter(c => {
      const name = c.name || `${c.firstName || ''} ${c.lastName || ''}`;
      const email = c.email || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             email.toLowerCase().includes(searchQuery.toLowerCase());
    });

  // Pagination
  const currentItems = activeTab === 'staff' ? filteredStaff : filteredCustomers;
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

  const handleViewCustomer = (customer) => {
    setViewingCustomer(customer);
  };

  const handleDelete = (id, userType) => {
    setConfirmModal({ isOpen: true, userId: id, userType });
  };

  const confirmDelete = async () => {
    const { userId, userType } = confirmModal;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/user/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        if (userType === 'staff') {
          setStaff(staff.filter(s => s.id !== userId));
        } else {
          setCustomers(customers.filter(c => c.id !== userId));
        }
        success(`${userType === 'staff' ? 'Staff' : 'Customer'} deleted successfully`);
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
      error(err.message || 'Failed to delete');
    } finally {
      setFormLoading(false);
      setConfirmModal({ isOpen: false, userId: null, userType: null });
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
              Manage staff accounts and view customer information
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
            <div style={{ 
              background: '#6b7280',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.9rem'
            }}>
              <Users size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Customers: {customers.length}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '-2px', position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => setActiveTab('staff')}
            style={tabStyle(activeTab === 'staff')}
          >
            <UserCog size={20} />
            Staff Accounts
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            style={tabStyle(activeTab === 'customers')}
          >
            <Users size={20} />
            Customers
          </button>
        </div>

        {/* Main Content Card */}
        <div style={cardStyle}>
          {/* Controls */}
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '1rem',
            marginBottom: '1.5rem',
            alignItems: isMobile ? 'stretch' : 'center'
          }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={20} style={{ 
                position: 'absolute', left: '12px', top: '50%', 
                transform: 'translateY(-50%)', color: '#6b7280' 
              }} />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 44px',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                }}
              />
            </div>

            {/* Filter (staff only) */}
            {activeTab === 'staff' && (
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                  minWidth: '180px',
                }}
              >
                <option value="">All Roles</option>
                {STAFF_ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            )}

            {/* Add Staff Button (staff tab only) */}
            {activeTab === 'staff' && (
              <button
                onClick={handleAddStaff}
                style={{
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
            )}
          </div>

          {/* Info Banner for Customers */}
          {activeTab === 'customers' && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#0369a1'
            }}>
              <Shield size={20} />
              <span>
                <strong>Customer accounts are created through registration.</strong> You can view their information and booking history here.
              </span>
            </div>
          )}

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)' }}>
                  <th style={{ padding: '14px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Name</th>
                  <th style={{ padding: '14px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Email</th>
                  {activeTab === 'staff' ? (
                    <th style={{ padding: '14px', textAlign: 'left', color: 'white', fontWeight: '600' }}>Role</th>
                  ) : (
                    <>
                      <th style={{ padding: '14px', textAlign: 'center', color: 'white', fontWeight: '600' }}>Verified</th>
                      <th style={{ padding: '14px', textAlign: 'center', color: 'white', fontWeight: '600' }}>Bookings</th>
                    </>
                  )}
                  <th style={{ padding: '14px', textAlign: 'center', color: 'white', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableLoading colSpan={activeTab === 'staff' ? 4 : 5} />
                ) : paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={activeTab === 'staff' ? 4 : 5} style={{ 
                        padding: '2rem', textAlign: 'center', color: '#6b7280' 
                      }}>
                        No {activeTab} found
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
                        {activeTab === 'staff' ? (
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
                        ) : (
                          <>
                            <td style={{ padding: '14px', textAlign: 'center' }}>
                              {item.isVerified ? (
                                <CheckCircle size={20} color="#16a34a" />
                              ) : (
                                <XCircle size={20} color="#dc2626" />
                              )}
                            </td>
                            <td style={{ padding: '14px', textAlign: 'center', fontWeight: '600' }}>
                              {item.bookingCount || 0}
                            </td>
                          </>
                        )}
                        <td style={{ padding: '14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            {activeTab === 'staff' ? (
                              <>
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
                                  onClick={() => handleDelete(item.id, 'staff')}
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
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleViewCustomer(item)}
                                  style={{
                                    padding: '8px 12px',
                                    background: '#6b7280',
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
                                  <Eye size={14} /> View
                                </button>
                                <button
                                  onClick={() => handleDelete(item.id, 'customer')}
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
                              </>
                            )}
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
            onClose={() => setShowStaffForm(false)}
            loading={formLoading}
            isMobile={isMobile}
          />
        )}

        {/* Customer View Modal */}
        {viewingCustomer && (
          <CustomerViewModal
            customer={viewingCustomer}
            onClose={() => setViewingCustomer(null)}
            isMobile={isMobile}
          />
        )}

        {/* Confirm Delete Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, userId: null, userType: null })}
          onConfirm={confirmDelete}
          title={`Delete ${confirmModal.userType === 'staff' ? 'Staff' : 'Customer'}`}
          message={`Are you sure you want to delete this ${confirmModal.userType}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      </div>
    </SuperAdminLayout>
  );
}

// Staff Form Modal Component
function StaffFormModal({ staff, onSave, onClose, loading, isMobile }) {
  const [formData, setFormData] = useState({
    name: staff?.name || '',
    email: staff?.email || '',
    password: '',
    role: staff?.role || 'RECEPTIONIST',
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

// Customer View Modal Component
function CustomerViewModal({ customer, onClose, isMobile }) {
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
        width: isMobile ? '95%' : '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#1f2937' }}>
            Customer Details
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <X size={24} color="#6b7280" />
          </button>
        </div>

        <div style={{ 
          background: '#f9fafb', 
          borderRadius: '12px', 
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'white',
            fontSize: '2rem',
            fontWeight: '600'
          }}>
            {(customer.name?.[0] || customer.firstName?.[0] || '?').toUpperCase()}
          </div>
          <h3 style={{ textAlign: 'center', margin: '0 0 8px', color: '#1f2937' }}>
            {customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'N/A'}
          </h3>
          <div style={{ textAlign: 'center' }}>
            <span style={{
              background: customer.isVerified ? '#dcfce7' : '#fee2e2',
              color: customer.isVerified ? '#16a34a' : '#dc2626',
              padding: '4px 12px',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}>
              {customer.isVerified ? '✓ Verified' : '✗ Not Verified'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Mail size={20} color="#6b7280" />
            <div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Email</div>
              <div style={{ fontWeight: '500' }}>{customer.email}</div>
            </div>
          </div>

          {customer.contactNumber && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Phone size={20} color="#6b7280" />
              <div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Contact Number</div>
                <div style={{ fontWeight: '500' }}>{customer.contactNumber}</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={20} color="#6b7280" />
            <div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Member Since</div>
              <div style={{ fontWeight: '500' }}>{formatDate(customer.createdAt)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Calendar size={20} color="#6b7280" />
            <div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Last Login</div>
              <div style={{ fontWeight: '500' }}>{formatDate(customer.lastLogin)}</div>
            </div>
          </div>

          <div style={{ 
            background: '#eff6ff', 
            padding: '16px', 
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ color: '#1e40af', fontWeight: '500' }}>Total Bookings</span>
            <span style={{ 
              background: '#2563eb', 
              color: 'white', 
              padding: '4px 16px', 
              borderRadius: '20px',
              fontWeight: '600',
              fontSize: '1.1rem'
            }}>
              {customer.bookingCount || 0}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '24px',
            padding: '12px',
            background: '#e5e7eb',
            color: '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '1rem'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
