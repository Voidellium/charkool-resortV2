'use client';
import { useState, useEffect } from 'react';
import SuperAdminLayout from '@/components/SuperAdminLayout';
import PromotionModal from '@/components/PromotionModal';

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/promotions');
      if (res.ok) {
        const data = await res.json();
        setPromotions(data);
      }
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
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

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this promotion?')) return;
    try {
      const res = await fetch(`/api/promotions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setPromotions(promotions.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete promotion:', error);
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
        } else {
          setPromotions([...promotions, savedPromotion]);
        }
        setModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to save promotion:', error);
    }
  };

  if (loading) return <SuperAdminLayout activePage="config"><div>Loading...</div></SuperAdminLayout>;

  return (
    <SuperAdminLayout activePage="config">
      <div style={{ padding: '20px' }}>
        <h1>Promotions Management</h1>
        <button onClick={handleAdd} style={{ marginBottom: '20px', padding: '10px 20px', background: '#FEBE52', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Add Promotion
        </button>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Title</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Discount</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Target</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Active</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Start Date</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>End Date</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map(p => (
              <tr key={p.id}>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.title}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  {p.discountType === 'percentage' ? `${p.discountValue / 100}%` : `₱${p.discountValue / 100}`}
                </td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.targetType}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{p.isActive ? 'Yes' : 'No'}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{new Date(p.startDate).toLocaleDateString()}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{new Date(p.endDate).toLocaleDateString()}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  <button onClick={() => handleEdit(p)} style={{ marginRight: '10px', padding: '5px 10px' }}>Edit</button>
                  <button onClick={() => handleDelete(p.id)} style={{ padding: '5px 10px', background: 'red', color: 'white', border: 'none' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modalOpen && (
        <PromotionModal
          promotion={editingPromotion}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </SuperAdminLayout>
  );
}
