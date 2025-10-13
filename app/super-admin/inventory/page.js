'use client';
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import { useToast, ConfirmModal } from '@/components/Toast';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState({ name: '', quantity: '' });
  const [editingId, setEditingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, itemId: null });
  
  const { success, error } = useToast();

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch('/api/amenities/inventory', { cache: 'no-store' });
      const data = await res.json();
      setInventory(data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const name = form.name.trim();
    const quantity = parseInt(form.quantity);

    if (!name || isNaN(quantity)) {
      error('Please enter a valid name and quantity.');
      return;
    }

    const endpoint = editingId
  ? `/api/amenities/inventory/${editingId}`
  : `/api/amenities/inventory`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`${method} failed:`, errorText);
        throw new Error(`Failed to ${editingId ? 'update' : 'create'} amenity`);
      }

      const result = await res.json();
      console.log(`${method} success:`, result);
      
      if (editingId) {
        success('Amenity updated successfully');
      } else {
        success('Amenity created successfully');
      }

      setForm({ name: '', quantity: '' });
      setEditingId(null);
      fetchInventory();
    } catch (err) {
      console.error(`${method} request error:`, err.message || err);
      error(`Failed to ${editingId ? 'update' : 'create'} amenity`);
    }
  };

  const handleDelete = (id) => {
    setConfirmModal({ isOpen: true, itemId: id });
  };

  const confirmDelete = async () => {
    const id = confirmModal.itemId;
    try {
      const res = await fetch(`/api/amenities/inventory/${id}`, { method: 'DELETE' });

      if (res.ok) {
        setInventory((prev) => prev.filter((item) => item.id !== id));
        success('Amenity deleted successfully');
      } else if (res.status === 404) {
        setInventory((prev) => prev.filter((item) => item.id !== id));
        success('Amenity not found. Removed from list');
      } else {
        const errorText = await res.text();
        console.error('DELETE failed:', errorText);
        error('Failed to delete amenity');
      }
    } catch (err) {
      console.error('Delete error:', err);
      error('Failed to delete amenity');
    }
  };

  const handleEdit = (item) => {
    setForm({ name: item.name, quantity: item.quantity });
    setEditingId(item.id);
  };

  return (
    <SuperAdminLayout activePage="amenities">
      <div style={{ padding: '1rem' }}>
        <h1>Amenity Inventory</h1>

        <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Amenity name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
          <button type="submit">
            {editingId ? 'Update Amenity' : 'Add Amenity'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setForm({ name: '', quantity: '' });
                setEditingId(null);
              }}
            >
              Cancel Edit
            </button>
          )}
        </form>

        <ul>
          {inventory.length > 0 ? (
            inventory.map((item) => (
              <li key={item.id}>
                {item.name} — {item.quantity}{' '}
                <button onClick={() => handleEdit(item)}>Edit</button>{' '}
                <button onClick={() => handleDelete(item.id)}>Delete</button>
              </li>
            ))
          ) : (
            <p>No amenities found.</p>
          )}
        </ul>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, itemId: null })}
        onConfirm={confirmDelete}
        title="Delete Amenity"
        message="Are you sure you want to delete this amenity? This action cannot be undone."
        confirmText="Delete Amenity"
        cancelText="Cancel"
        variant="danger"
      />
    </SuperAdminLayout>
  );
}
