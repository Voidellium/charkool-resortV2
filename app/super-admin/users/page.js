'use client';
import React, { useState, useEffect } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user', { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setMessage({ type: 'error', text: 'Failed to load users' });
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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== id));
        setMessage({ type: 'success', text: 'User deleted successfully.' });
      } else {
        throw new Error('Delete failed');
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to delete user' });
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
        setMessage({ type: 'success', text: 'User updated successfully' });
      } else {
        const res = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        const newUser = await res.json();
        setUsers([...users, newUser]);
        setMessage({ type: 'success', text: 'User added successfully' });
      }
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save user' });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users
    .filter(u => filterRole ? u.role === filterRole : true)
    .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SuperAdminLayout activePage="users">
      <div style={{ maxWidth: 1000, margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '2rem', fontWeight: 'bold' }}>User Management</h1>

        {/* Feedback Message */}
        {message && (
          <div
            role="alert"
            style={{
              padding: '12px 20px',
              marginBottom: '20px',
              borderRadius: '8px',
              backgroundColor: message.type === 'error' ? '#f8d7da' : '#d4edda',
              color: message.type === 'error' ? '#721c24' : '#155724',
              transition: 'all 0.3s ease',
            }}
          >
            {message.text}
          </div>
        )}

        {/* Controls */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '15px',
            borderRadius: '8px',
            background: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          {/* Filter Dropdown */}
          <select
            aria-label="Filter by role"
            style={{
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              minWidth: '150px',
            }}
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="AMENITYINVENTORYMANAGER">Inventory/Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="SUPERADMIN">Super Admin</option>
            <option value="CASHIER">Cashier</option>
          </select>

          {/* Search Input */}
          <input
            aria-label="Search users"
            type="text"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />

          {/* Add User Button */}
          <button
            onClick={handleAdd}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0070f3',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'background-color 0.2s',
            }}
            aria-label="Add new user"
          >
            <span style={{ fontSize: '1.2em', marginRight: '8px' }}>＋</span> Add User
          </button>
        </div>

        {/* User Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Name</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Email</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9' }}>Role</th>
                <th style={{ padding: '12px', border: '1px solid #ccc', position: 'sticky', top: 0, backgroundColor: '#f9f9f9', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '12px', textAlign: 'center' }}>No users found</td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} style={{ transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f1f1')} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td style={{ padding: '12px', border: '1px solid #ccc' }}>{user.name}</td>
                    <td style={{ padding: '12px', border: '1px solid #ccc' }}>{user.email}</td>
                    <td style={{ padding: '12px', border: '1px solid #ccc' }}>{user.role}</td>
                    {/* Action buttons */}
                    <td style={{ padding: '12px', border: '1px solid #ccc', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                      {/* Edit Button */}
                      <button
                        aria-label={`Edit ${user.name}`}
                        onClick={() => handleEdit(user)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: '#f0ad4e',
                          color: '#fff',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ec971f')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0ad4e')}
                      >
                        ✎
                      </button>
                      {/* Delete Button */}
                      <button
                        aria-label={`Delete ${user.name}`}
                        onClick={() => handleDelete(user.id)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: 'none',
                          backgroundColor: '#d9534f',
                          color: '#fff',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c9302c')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#d9534f')}
                      >
                        ✖
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '90%',
              width: '400px',
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
                ✕
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
    </SuperAdminLayout>
  );
}