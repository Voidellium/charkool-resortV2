 'use client';
 import { useState, useEffect } from 'react';
 import { createPortal } from 'react-dom';
 import { X, Save, FileText, Hash, ToggleLeft, ToggleRight, Eye, EyeOff } from 'lucide-react';

 export default function PolicyModal({ policy, onSave, onClose, wrapperClass }) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    order: 0,
    isActive: true,
  });
  const [pulse, setPulse] = useState(false);
  const pulseRef = { current: null };

  const MAX_CONTENT = 1200;

  useEffect(() => {
    if (policy) {
      setFormData({
        title: policy.title || '',
        content: policy.content || '',
        order: policy.order || 0,
        isActive: policy.isActive ?? true,
      });
    }
  }, [policy]);

  // cleanup pulse timeout on unmount
  useEffect(() => {
    return () => {
      if (pulseRef.current) clearTimeout(pulseRef.current);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'order') {
      setFormData({ ...formData, [name]: parseInt(value) || 0 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Render via portal so modal is not affected by parent transforms/overflow
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0, 0, 0, 0.6)',
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.3s ease-out'
    }} role="dialog" aria-modal="true" aria-label={policy ? 'Edit Policy' : 'Add Policy'} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
        borderRadius: '16px',
        padding: 0,
        width: '90%',
        maxWidth: '700px',
        maxHeight: '90vh',
        overflow: 'hidden',
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
          <FileText size={24} />
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            fontWeight: '600',
            flex: 1
          }}>
            {policy ? 'Edit Policy' : 'Create New Policy'}
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
        <form onSubmit={handleSubmit} style={{ 
          padding: '2rem', 
          maxHeight: 'calc(90vh - 120px)', 
          overflowY: 'auto' 
        }}>
          {/* Title Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Policy Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              maxLength={120}
              placeholder="Enter policy title..."
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
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Keep it short and descriptive</span>
              <span>{formData.title.length}/120</span>
            </div>
          </div>

          {/* Content Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              Policy Content *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              maxLength={MAX_CONTENT}
              rows="8"
              placeholder="Enter the full policy text. Markdown formatting is supported..."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                fontSize: '1rem',
                transition: 'all 0.2s ease',
                background: 'white',
                resize: 'vertical',
                minHeight: '150px',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
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
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.5rem',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>Provide detailed policy text. Markdown is supported.</span>
              <span style={{
                color: formData.content.length > MAX_CONTENT * 0.9 ? '#ef4444' : '#6b7280'
              }}>
                {formData.content.length}/{MAX_CONTENT}
              </span>
            </div>
          </div>

          {/* Order Field */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              <Hash size={16} />
              Display Order
            </label>
            <input
              type="number"
              name="order"
              value={formData.order}
              onChange={handleChange}
              placeholder="1"
              min="0"
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
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.5rem'
            }}>
              Lower numbers appear first in the list
            </div>
          </div>

          {/* Active Toggle */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.75rem'
            }}>
              Visibility Status
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1rem',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                background: formData.isActive ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => {
                setFormData({ ...formData, isActive: !formData.isActive });
                setPulse(true);
                if (pulseRef.current) clearTimeout(pulseRef.current);
                pulseRef.current = setTimeout(() => setPulse(false), 300);
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                borderRadius: '50%',
                background: formData.isActive ? '#22c55e' : '#ef4444',
                color: 'white',
                transform: pulse ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease'
              }}>
                {formData.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
              </div>
              <div>
                <div style={{
                  fontWeight: '600',
                  color: formData.isActive ? '#059669' : '#dc2626',
                  marginBottom: '0.25rem'
                }}>
                  {formData.isActive ? 'Active Policy' : 'Inactive Policy'}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#6b7280'
                }}>
                  {formData.isActive 
                    ? 'This policy is visible to all guests' 
                    : 'This policy is hidden from guests'
                  }
                </div>
              </div>
              <div style={{ marginLeft: 'auto', color: '#6b7280' }}>
                {formData.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </div>
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
              {policy ? 'Update Policy' : 'Create Policy'}
            </button>
          </div>
        </form>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
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
            div[style*="padding: 2rem"] {
              padding: 1.5rem !important;
            }
            
            div[style*="maxWidth: 700px"] {
              width: 95% !important;
            }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
}
