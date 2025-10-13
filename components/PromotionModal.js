'use client';
import { useState, useEffect } from 'react';
import { X, Save, Calendar, Image as ImageIcon, Tag, Percent, DollarSign } from 'lucide-react';

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
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      width: '100%', 
      height: '100%', 
      background: 'rgba(0, 0, 0, 0.6)', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <div style={{ 
        background: 'linear-gradient(145deg, #ffffff, #f8fafc)', 
        padding: '0',
        borderRadius: '16px', 
        width: '90%',
        maxWidth: '600px', 
        maxHeight: '90vh', 
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
          color: 'white',
          padding: '1.5rem 2rem',
          borderRadius: '16px 16px 0 0',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <Tag size={24} />
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            fontWeight: '600',
            flex: 1
          }}>
            {promotion ? 'Edit Promotion' : 'Create New Promotion'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: 'pointer',
              padding: '0.5rem',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
          {/* Form Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Title Field */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Promotion Title *
              </label>
              <input 
                type="text" 
                name="title" 
                value={formData.title} 
                onChange={handleChange} 
                required 
                placeholder="Enter promotion title..."
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Description Field */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Description
              </label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange}
                rows="3"
                placeholder="Describe your promotion..."
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  background: 'white',
                  resize: 'vertical',
                  minHeight: '80px',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Discount Type */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                {formData.discountType === 'percentage' ? <Percent size={16} /> : <DollarSign size={16} />}
                Discount Type *
              </label>
              <select 
                name="discountType" 
                value={formData.discountType} 
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  background: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₱)</option>
              </select>
            </div>

            {/* Discount Value */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Discount Value ({formData.discountType === 'percentage' ? '%' : '₱'}) *
              </label>
              <input 
                type="number" 
                name="discountValue" 
                value={formData.discountValue} 
                onChange={handleChange} 
                required
                placeholder={formData.discountType === 'percentage' ? '10' : '500'}
                min="0"
                step={formData.discountType === 'percentage' ? '0.1' : '1'}
                max={formData.discountType === 'percentage' ? '100' : undefined}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Target Type */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Apply To
              </label>
              <select 
                name="targetType" 
                value={formData.targetType} 
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  background: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="booking">Booking</option>
                <option value="room">Room</option>
                <option value="amenity">Amenity</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                <Calendar size={16} />
                Start Date *
              </label>
              <input 
                type="date" 
                name="startDate" 
                value={formData.startDate} 
                onChange={handleChange} 
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                <Calendar size={16} />
                End Date *
              </label>
              <input 
                type="date" 
                name="endDate" 
                value={formData.endDate} 
                onChange={handleChange} 
                required
                min={formData.startDate}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  background: 'white',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Image Upload */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                <ImageIcon size={16} />
                Promotion Image
              </label>
              <input 
                type="file" 
                name="image" 
                accept="image/*" 
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '2px dashed #e5e7eb',
                  fontSize: '1rem',
                  transition: 'all 0.2s ease',
                  background: 'white',
                  cursor: 'pointer',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.backgroundColor = '#f8faff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.backgroundColor = 'white';
                }}
              />
            </div>

            {/* Active Toggle */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                fontSize: '1rem',
                fontWeight: '500',
                color: '#374151',
                cursor: 'pointer',
                padding: '1rem',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                background: formData.isActive ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                transition: 'all 0.2s ease'
              }}>
                <input 
                  type="checkbox" 
                  name="isActive" 
                  checked={formData.isActive} 
                  onChange={handleChange}
                  style={{
                    width: '1.25rem',
                    height: '1.25rem',
                    accentColor: '#667eea'
                  }}
                />
                <span style={{
                  color: formData.isActive ? '#059669' : '#dc2626',
                  fontWeight: '600'
                }}>
                  {formData.isActive ? 'Active Promotion' : 'Inactive Promotion'}
                </span>
              </label>
            </div>
          </div>
          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            justifyContent: 'flex-end',
            paddingTop: '1.5rem',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '0.75rem 2rem',
                background: 'white',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#6b7280',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#d1d5db';
                e.target.style.color = '#374151';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.color = '#6b7280';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              Cancel
            </button>
            <button 
              type="submit"
              style={{
                padding: '0.75rem 2rem',
                background: 'linear-gradient(135deg, #febe52 0%, #EBD591 100%)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                color: 'white',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }}
            >
              <Save size={18} />
              {promotion ? 'Update Promotion' : 'Create Promotion'}
            </button>
          </div>
        </form>
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
