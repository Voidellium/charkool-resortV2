'use client';
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState({ name: '', quantity: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/amenities/inventory', { cache: 'no-store' });
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
      alert('Please enter a valid name and quantity.');
      return;
    }

    const endpoint = editingId
  ? `http://localhost:3000/api/amenities/inventory/${editingId}`
  : `http://localhost:3000/api/amenities/inventory`;
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
        return;
      }

      const result = await res.json();
      console.log(`${method} success:`, result);

      setForm({ name: '', quantity: '' });
      setEditingId(null);
      fetchInventory();
    } catch (err) {
      console.error(`${method} request error:`, err.message || err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this amenity?')) return;

    try {
      const res = await fetch(`http://localhost:3000/api/amenities/inventory/${id}`, { method: 'DELETE' });

      if (res.ok) {
        setInventory((prev) => prev.filter((item) => item.id !== id));
        alert('Amenity deleted.');
      } else if (res.status === 404) {
        setInventory((prev) => prev.filter((item) => item.id !== id));
        alert('Amenity not found. Removed from list.');
      } else {
        const errorText = await res.text();
        console.error('DELETE failed:', errorText);
      }
    } catch (error) {
      console.error('Delete error:', error);
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
    </SuperAdminLayout>
  );
}
