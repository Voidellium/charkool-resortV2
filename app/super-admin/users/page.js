'use client';
import React, { useState, useEffect } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all users from backend
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/user', { headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
    try {
      const res = await fetch(`/api/user/${id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async (user) => {
    try {
      if (editingUser) {
        const res = await fetch(`/api/user/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        const updatedUser = await res.json();
        setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
      } else {
        const res = await fetch('/api/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user),
        });
        const newUser = await res.json();
        setUsers([...users, newUser]);
      }
      setShowForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = users
    .filter(u => filterRole ? u.role === filterRole : true)
    .filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <SuperAdminLayout activePage="users">
      <div style={{ maxWidth: '1000px', margin: '20px auto', fontFamily: 'Arial, sans-serif' }}>
        <h1>User Management</h1>

        {/* Filter + Search + Add */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={{ padding: '5px' }}>
            <option value="">All Roles</option>
            <option value="RECEPTIONIST">Receptionist</option>
            <option value="AMENITYINVENTORYMANAGER">Inventory/Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="SUPERADMIN">Super Admin</option>
            <option value="CASHIER">Cashier</option>
          </select>

          <input
            type="text"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '5px', flexGrow: 1, minWidth: '200px' }}
          />

          <button onClick={handleAdd} style={{ padding: '8px 15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Add User</button>
        </div>

        {/* User Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f4f4f4' }}>
              <th style={{ border: '1px solid #ccc', padding: '12px' }}>Name</th>
              <th style={{ border: '1px solid #ccc', padding: '12px' }}>Email</th>
              <th style={{ border: '1px solid #ccc', padding: '12px' }}>Role</th>
              <th style={{ border: '1px solid #ccc', padding: '12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '12px' }}>No users found.</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td style={{ border: '1px solid #ccc', padding: '12px' }}>{user.name}</td>
                  <td style={{ border: '1px solid #ccc', padding: '12px' }}>{user.email}</td>
                  <td style={{ border: '1px solid #ccc', padding: '12px' }}>{user.role}</td>
                  <td style={{ border: '1px solid #ccc', padding: '12px' }}>
                    <button onClick={() => handleEdit(user)} style={{ marginRight: '5px', padding: '5px 10px', borderRadius: '5px', border: 'none', backgroundColor: '#f0ad4e', color: 'white', cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleDelete(user.id)} style={{ padding: '5px 10px', borderRadius: '5px', border: 'none', backgroundColor: '#d9534f', color: 'white', cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Add/Edit User Modal */}
        {showForm && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '400px' }}>
              <h2>{editingUser ? 'Edit User' : 'Add User'}</h2>
              <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSave({
                    name: e.target.name.value,
                    email: e.target.email.value,
                    password: e.target.password?.value ? e.target.password.value : undefined,
                    role: e.target.role.value,
                  });
              }}>
                <input name="name" placeholder="Name" defaultValue={editingUser?.name || ''} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} required />
                <input name="email" placeholder="Email" type="email" defaultValue={editingUser?.email || ''} style={{ width: '100%', padding: '8px', marginBottom: '10px' }} required />
                <input
                  name="password"
                  type="password"
                  placeholder={editingUser ? "Leave blank to keep current password" : "Password"}
                  style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
                  {...(!editingUser && { required: true })}
                />
                <select name="role" defaultValue={editingUser?.role || 'RECEPTIONIST'} style={{ width: '100%', padding: '8px', marginBottom: '10px' }}>
                  <option value="RECEPTIONIST">Receptionist</option>
                  <option value="AMENITYINVENTORYMANAGER">Inventory/Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="SUPERADMIN">Super Admin</option>
                  <option value="CASHIER">Cashier</option>
                </select>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" style={{ padding: '8px 15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    {editingUser ? 'Update' : 'Add'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} style={{ marginLeft: '10px', padding: '8px 15px', backgroundColor: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  );
}
