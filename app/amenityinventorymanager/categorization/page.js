'use client';
import { useState, useEffect } from 'react';

export default function CategorizationPage() {
  const API_URL = '/api/categories';
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setError('');
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('Failed to fetch categories');
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Could not load categories. Please try again.');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory }),
      });
      setNewCategory('');
      fetchCategories();
    } catch (err) {
      console.error('Add error:', err);
      setError('Failed to add category.');
    }
  };

  // Delete category
  const handleDeleteCategory = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      fetchCategories();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete category.');
    }
  };

  // Save edited category
  const handleSave = async (id) => {
    try {
      await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editValue }),
      });
      setEditingId(null);
      setEditValue('');
      fetchCategories();
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update category.');
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Categorization</h1>
      {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

      {/* Add Category */}
      <div style={styles.form}>
        <input
          type="text"
          placeholder="Enter new category"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          style={styles.input}
        />
        <button onClick={handleAddCategory} style={styles.button}>
          Add
        </button>
      </div>

      {/* Category List */}
      <ul style={styles.list}>
        {categories.map((cat) => (
          <li key={cat.id} style={styles.listItem}>
            {editingId === cat.id ? (
              <>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  style={{ ...styles.input, flex: 1 }}
                />
                <button
                  onClick={() => handleSave(cat.id)}
                  style={{ ...styles.button, backgroundColor: '#16a34a' }}
                >
                  Save
                </button>
              </>
            ) : (
              <span>{cat.name}</span>
            )}
            <div style={styles.actions}>
              {editingId !== cat.id && (
                <button
                  onClick={() => {
                    setEditingId(cat.id);
                    setEditValue(cat.name);
                  }}
                  style={{ ...styles.button, backgroundColor: '#3b82f6' }}
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                style={{ ...styles.button, backgroundColor: '#dc2626' }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  container: { padding: '20px', maxWidth: '800px', margin: '0 auto', background: '#FFF8E1', borderRadius: '8px' },
  title: { textAlign: 'center', marginBottom: '20px', color: '#333' },
  form: { display: 'flex', gap: '10px', marginBottom: '20px' },
  input: {
    flex: 1,
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '6px',
  },
  button: {
    padding: '8px 14px',
    background: '#1e293b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  list: { listStyle: 'none', padding: 0 },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    marginBottom: '10px',
  },
  actions: { display: 'flex', gap: '6px' },
};
