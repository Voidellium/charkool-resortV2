'use client';
import React, { useState, useEffect } from 'react';
import Loading, { TableLoading, ButtonLoading } from '@/components/Loading';
import { 
  Search,
  Edit,
  Trash2,
  X,
  Plus
} from 'lucide-react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useToast, ConfirmModal } from '@/components/Toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, userId: null });
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 5;
  
  const { success, error } = useToast();

  // Responsive detection
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
      setIsTablet(window.innerWidth > 768 && window.innerWidth <= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user', { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, userId: id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.userId;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        success('User deleted successfully');
      } else {
        throw new Error('Delete failed');
      }
    } catch (err) {
      console.error(err);
      error('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (user) => {
    setLoading(true);
    try {
      if (editingUser) {
        const res = await fetch(`/api/user/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        const updatedUser = await res.json();
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
        success('User updated successfully');
      } else {
        const res = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        const newUser = await res.json();
        setUsers([...users, newUser]);
        success('User created successfully');
      }
      setShowForm(false);
    } catch (err) {
      console.error(err);
      error('Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users
    .filter(u => filterRole ? u.role === filterRole : true)
    .filter(u => {
      const name = u.name || '';
      const email = u.email || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase()) || email.toLowerCase().includes(searchQuery.toLowerCase());
    });

  // Pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const startIndex = (currentPage - 1) * USERS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterRole, searchQuery]);

  return (
    <SuperAdminLayout activePage="users">
      <div style={{ 
        padding: isMobile ? '0.75rem' : isTablet ? '1rem 1.25rem' : '1.5rem 2rem', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        {/* Header Section */}
        <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'flex-start' : 'center', 
          gap: isMobile ? '1rem' : '0',
          marginBottom: isMobile ? '1rem' : '2rem',
          background: 'rgba(255,255,255,0.9)',
          padding: isMobile ? '1.25rem' : isTablet ? '1.5rem' : '2rem',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div>
            <h1 style={{ 
              fontSize: isMobile ? '1.75rem' : isTablet ? '2rem' : '2.5rem', 
              fontWeight: '700', 
              margin: 0, 
              background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              User Management
            </h1>
            <p style={{ 
              fontSize: isMobile ? '0.9rem' : '1.1rem', 
              color: '#666', 
              margin: '0.5rem 0 0 0' 
            }}>
              Manage all system users and their permissions
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
              padding: '1rem',
              borderRadius: '12px',
              color: 'white',
              fontWeight: '600'
            }}>
              Total Users: {filteredUsers.length}
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div
          style={{
            display: isMobile ? 'flex' : 'grid',
            flexDirection: isMobile ? 'column' : undefined,
            gridTemplateColumns: isMobile ? undefined : isTablet ? '1fr 1fr' : 'auto 1fr auto',
            gap: isMobile ? '1rem' : '1.5rem',
            padding: isMobile ? '1rem' : '1.5rem',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.9)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            alignItems: 'center',
            marginBottom: isMobile ? '1rem' : '2rem',
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Filter Dropdown */}
          <select
            aria-label="Filter by role"
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: '2px solid #e5e7eb',
              minWidth: isMobile ? '100%' : '200px',
              fontSize: isMobile ? '0.9rem' : '1rem',
              background: 'white',
              cursor: 'pointer',
              order: isMobile ? 1 : undefined,
              transition: 'all 0.3s ease'
            }}
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = '#febe52'}
            onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
          >
            <option value="">All Roles</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="AMENITYINVENTORYMANAGER">Inventory Manager</option>
            <option value="MANAGER">Manager</option>
            <option value="SUPERADMIN">Super Admin</option>
            <option value="CASHIER">Cashier</option>
          </select>

          {/* Search Input */}
          <div style={{ 
            position: 'relative', 
            flex: 1,
            order: isMobile ? 2 : undefined,
            width: isMobile ? '100%' : undefined
          }}>
            <Search 
              size={20} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#6b7280' 
              }} 
            />
            <input
              aria-label="Search users"
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '12px 16px 12px 60px',
                borderRadius: '12px',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                background: 'white',
                transition: 'all 0.3s ease',
                width: '100%'
              }}
              onFocus={(e) => e.target.style.borderColor = '#febe52'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Add User Button */}
          <button
            onClick={handleAdd}
            style={{
              padding: isMobile ? '10px 16px' : '12px 24px',
              background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMobile ? '0.9rem' : '1rem',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
              width: isMobile ? '100%' : 'auto',
              order: isMobile ? 3 : undefined
            }}
            aria-label="Add new user"
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
            }}
          >
            <Plus size={20} style={{ marginRight: '8px' }} /> Add New User
          </button>
        </div>

        {/* User Management Table */}
        <div style={{
          background: 'rgba(255,255,255,0.9)',
          borderRadius: '16px',
          padding: isMobile ? '1rem' : '1.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: isMobile ? '1rem' : '1.5rem' 
          }}>
            <h3 style={{ 
              color: '#333', 
              fontSize: isMobile ? '1.2rem' : '1.4rem',
              fontWeight: '600',
              margin: 0
            }}>
              User Management ({filteredUsers.length} users)
            </h3>
            <span style={{ 
              color: '#666', 
              fontSize: '0.9rem' 
            }}>
              Page {currentPage} of {totalPages}
            </span>
          </div>
          
          <div style={{ 
            overflowX: 'auto',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.3)',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'separate',
              borderSpacing: '0 4px',
              minWidth: isMobile ? '600px' : '800px'
            }}>
              <thead>
                <tr>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'left',
                    background: 'linear-gradient(135deg, #febe52%, #EBD591 100%)',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: '12px 0 0 12px'
                  }}>Name</th>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'left',
                    background: 'linear-gradient(135deg, #febe52%, #EBD591 100%)',
                    color: 'white',
                    fontWeight: '600'
                  }}>Email</th>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'left',
                    background: 'linear-gradient(135deg, #febe52%, #EBD591 100%)',
                    color: 'white',
                    fontWeight: '600'
                  }}>Role</th>
                  <th style={{ 
                    padding: '1rem', 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #febe52%, #EBD591 100%)',
                    color: 'white',
                    fontWeight: '600',
                    borderRadius: '0 12px 12px 0'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
              {loading ? (
                <TableLoading colSpan={4} />
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ 
                    padding: '2rem', 
                    textAlign: 'center',
                    background: 'rgba(249, 250, 251, 0.7)',
                    borderRadius: '12px',
                    color: '#6b7280',
                    fontSize: '1rem'
                  }}>
                    No users found matching your criteria
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user, index) => (
                  <tr 
                    key={user.id} 
                    style={{ 
                      background: 'rgba(255,255,255,0.7)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      const cells = e.currentTarget.querySelectorAll('td');
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.95)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                      cells.forEach(cell => {
                        cell.style.transform = 'translateY(-1px)';
                      });
                    }}
                    onMouseLeave={(e) => {
                      const cells = e.currentTarget.querySelectorAll('td');
                      e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)';
                      e.currentTarget.style.boxShadow = 'none';
                      cells.forEach(cell => {
                        cell.style.transform = 'translateY(0)';
                      });
                    }}
                  >
                    <td style={{ 
                      padding: '1rem', 
                      borderRadius: index === 0 ? '12px 0 0 12px' : '0',
                      fontWeight: '600',
                      color: '#1f2937',
                      background: index % 2 === 0 ? 'rgba(248,250,252,0.5)' : 'transparent',
                      transition: 'all 0.2s ease',
                      verticalAlign: 'middle'
                    }}>
                      {user.name || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '1rem',
                      color: '#6b7280',
                      background: index % 2 === 0 ? 'rgba(248,250,252,0.5)' : 'transparent',
                      transition: 'all 0.2s ease',
                      verticalAlign: 'middle',
                      wordBreak: 'break-word'
                    }}>
                      {user.email || 'N/A'}
                    </td>
                    <td style={{ 
                      padding: '1rem',
                      color: '#374151',
                      background: index % 2 === 0 ? 'rgba(248,250,252,0.5)' : 'transparent',
                      transition: 'all 0.2s ease',
                      verticalAlign: 'middle'
                    }}>
                      <span style={{
                        background: user.role === 'SUPERADMIN' ? '#EB7407' :
                                  user.role === 'RECEPTIONIST' ? '#EBB307' :
                                  user.role === 'CASHIER' ? '#EBEA07' :
                                  user.role === 'AMENITYINVENTORYMANAGER' ? '#febe52' :
                                  user.role === 'MANAGER' ? '#f59e0b' : '#9f1af7ff',
                        color: 'white',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '500',
                        display: 'inline-block',
                        minWidth: '80px',
                        textAlign: 'center'
                      }}>
                        {user.role ? user.role.replace('AMENITYINVENTORYMANAGER', 'INVENTORY') : 'N/A'}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '1rem', 
                      borderRadius: index === 0 ? '0 12px 12px 0' : '0',
                      textAlign: 'center',
                      background: index % 2 === 0 ? 'rgba(248,250,252,0.5)' : 'transparent',
                      transition: 'all 0.2s ease',
                      verticalAlign: 'middle'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                        <button
                          aria-label={`Edit ${user.name}`}
                          onClick={() => handleEdit(user)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <Edit size={16} style={{ marginRight: '4px' }} /> Edit
                        </button>
                        <button
                          aria-label={`Delete ${user.name}`}
                          onClick={() => handleDelete(user.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: '#fff',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          <Trash2 size={16} style={{ marginRight: '4px' }} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1.5rem',
              gap: '1rem'
            }}>
              <span style={{
                color: '#666',
                fontSize: '0.9rem'
              }}>
                Showing {startIndex + 1}-{Math.min(startIndex + USERS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
              </span>
              
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: currentPage === 1 ? '#f9fafb' : 'white',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== 1) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  Previous
                </button>
                
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          background: currentPage === page ? 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)' : 'white',
                          color: currentPage === page ? 'white' : '#374151',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          minWidth: '40px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (currentPage !== page) {
                            e.currentTarget.style.background = '#f3f4f6';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== page) {
                            e.currentTarget.style.background = 'white';
                          }
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    background: currentPage === totalPages ? '#f9fafb' : 'white',
                    color: currentPage === totalPages ? '#9ca3af' : '#374151',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.background = '#f3f4f6';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== totalPages) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal for Add/Edit */}
        {showForm && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 999,
            animation: 'fadeIn 0.3s ease',
          }}>
            <div style={{
              background: '#fff',
              borderRadius: isMobile ? '12px' : '8px',
              padding: isMobile ? '20px' : '30px',
              maxWidth: isMobile ? '95%' : '90%',
              width: isMobile ? 'calc(100% - 2rem)' : '400px',
              maxHeight: isMobile ? '90vh' : 'auto',
              overflowY: isMobile ? 'auto' : 'visible',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              position: 'relative',
              animation: 'scaleIn 0.3s ease',
            }}>
              {/* Close button */}
              <button
                onClick={() => setShowForm(false)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '15px',
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5em',
                  cursor: 'pointer',
                  color: '#999',
                  transition: 'color 0.2s',
                }}
                aria-label="Close modal"
                onMouseEnter={(e) => (e.currentTarget.style.color = '#333')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#999')}
              >
                <X size={20} />
              </button>
              <h2 style={{ marginBottom: '20px', fontSize: '1.5rem' }}>{editingUser ? 'Edit User' : 'Add User'}</h2>
              {/* Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSave({
                    name: e.target.name.value,
                    email: e.target.email.value,
                    password: e.target.password?.value,
                    role: e.target.role.value,
                  });
                }}
              >
                {/* Inputs with focus styles */}
                <input
                  name="name"
                  placeholder="Name"
                  defaultValue={editingUser?.name || ''}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0070f3';
                    e.currentTarget.style.boxShadow = '0 0 5px rgba(0,123,255,0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ccc';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
                <input
                  name="email"
                  placeholder="Email"
                  type="email"
                  defaultValue={editingUser?.email || ''}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0070f3';
                    e.currentTarget.style.boxShadow = '0 0 5px rgba(0,123,255,0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ccc';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  required
                />
                <input
                  name="password"
                  type="password"
                  placeholder={editingUser ? 'Leave blank to keep current password' : 'Password'}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '10px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0070f3';
                    e.currentTarget.style.boxShadow = '0 0 5px rgba(0,123,255,0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ccc';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  {...(!editingUser && { required: true })}
                />
                {/* Role select */}
                <select
                  name="role"
                  defaultValue={editingUser?.role || 'RECEPTIONIST'}
                  style={{
                    width: '100%',
                    padding: '10px',
                    marginBottom: '20px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#0070f3';
                    e.currentTarget.style.boxShadow = '0 0 5px rgba(0,123,255,0.3)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#ccc';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="AMENITYINVENTORYMANAGER">Inventory/Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SUPERADMIN">Super Admin</option>
                  <option value="CASHIER">Cashier</option>
                </select>

                {/* Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#0070f3',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      opacity: loading ? 0.7 : 1,
                      transition: 'background-color 0.2s',
                    }}
                  >
                    {loading ? (
                      <ButtonLoading size="small" color="#ffffff" />
                    ) : null}
                    {editingUser ? 'Update' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#ccc',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
            {/* Animations */}
            <style jsx>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes scaleIn {
                from { transform: scale(0.9); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
              }
            `}</style>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, userId: null })}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete User"
        cancelText="Cancel"
        variant="danger"
      />
    </SuperAdminLayout>
  );
}