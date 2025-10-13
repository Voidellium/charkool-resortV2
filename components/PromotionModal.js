'use client';
import { useState, useEffect } from 'react';

export default function PromotionModal({ promotion, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    targetType: 'booking',
    isActive: true,
    startDate: '',
    endDate: '',
    image: null,
  });

  useEffect(() => {
    if (promotion) {
      setFormData({
        title: promotion.title || '',
        description: promotion.description || '',
        discountType: promotion.discountType || 'percentage',
        discountValue: promotion.discountValue ? (promotion.discountValue / 100).toString() : '',
        targetType: promotion.targetType || 'booking',
        isActive: promotion.isActive ?? true,
        startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().split('T')[0] : '',
        endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().split('T')[0] : '',
        image: null,
      });
    }
  }, [promotion]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'file') {
      setFormData({ ...formData, [name]: files[0] });
    } else if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = new FormData();
    submitData.append('title', formData.title);
    submitData.append('description', formData.description);
    submitData.append('discountType', formData.discountType);
    submitData.append('discountValue', Math.round(parseFloat(formData.discountValue) * 100)); // Convert to cents
    submitData.append('targetType', formData.targetType);
    submitData.append('isActive', formData.isActive.toString());
    submitData.append('startDate', formData.startDate);
    submitData.append('endDate', formData.endDate);
    if (formData.image) {
      submitData.append('image', formData.image);
    }
    onSave(submitData);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '10px', width: '500px', maxHeight: '80%', overflowY: 'auto' }}>
        <h2>{promotion ? 'Edit Promotion' : 'Add Promotion'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '10px' }}>
            <label>Title:</label>
            <input type="text" name="title" value={formData.title} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Description:</label>
            <textarea name="description" value={formData.description} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Discount Type:</label>
            <select name="discountType" value={formData.discountType} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Discount Value ({formData.discountType === 'percentage' ? '%' : '₱'}):</label>
            <input type="number" name="discountValue" value={formData.discountValue} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Target Type:</label>
            <select name="targetType" value={formData.targetType} onChange={handleChange} style={{ width: '100%', padding: '8px' }}>
              <option value="booking">Booking</option>
              <option value="room">Room</option>
              <option value="amenity">Amenity</option>
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Start Date:</label>
            <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>End Date:</label>
            <input type="date" name="endDate" value={formData.endDate} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Image:</label>
            <input type="file" name="image" accept="image/*" onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
              Active
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button type="submit" style={{ padding: '10px 20px', background: '#FEBE52', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Save</button>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: '#ccc', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
