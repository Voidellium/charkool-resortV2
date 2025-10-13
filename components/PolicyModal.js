 'use client';
 import { useState, useEffect } from 'react';
 import { createPortal } from 'react-dom';
 import modalStyles from './PolicyModal.module.css';

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
    <div className={modalStyles.overlay} role="dialog" aria-modal="true" aria-label={policy ? 'Edit Policy' : 'Add Policy'} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${modalStyles.modal} ${wrapperClass || ''}`.trim()}>
        <h2 className={modalStyles.heading}>{policy ? 'Edit Policy' : 'Add Policy'}</h2>
        <form onSubmit={handleSubmit}>
          <div className={modalStyles.field}>
            <label className={modalStyles.label}>Title</label>
            <input className={modalStyles.input} type="text" name="title" value={formData.title} onChange={handleChange} required maxLength={120} />
            <div className={modalStyles.helper}>Keep it short and descriptive (max 120 chars).</div>
          </div>

          <div className={modalStyles.field}>
            <label className={modalStyles.label}>Content</label>
            <textarea className={`${modalStyles.input} ${modalStyles.textarea}`} name="content" value={formData.content} onChange={handleChange} required maxLength={MAX_CONTENT} />
            <div className={modalStyles.row}>
              <div className={modalStyles.helper}>Provide the full policy text. Markdown is supported.</div>
              <div className={modalStyles.counter}>{formData.content.length}/{MAX_CONTENT}</div>
            </div>
          </div>

          <div className={modalStyles.field}>
            <label className={modalStyles.label}>Order</label>
            <input className={modalStyles.input} type="number" name="order" value={formData.order} onChange={handleChange} />
            <div className={modalStyles.helper}>Lower numbers appear first. Use integers.</div>
          </div>

          <div className={modalStyles.field}>
            <label className={modalStyles.label}>Active</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                className={`${modalStyles.switch} ${formData.isActive ? modalStyles.on : ''} ${pulse ? modalStyles.pulse : ''}`}
                onClick={() => {
                  setFormData({ ...formData, isActive: !formData.isActive });
                  // trigger pulse
                  setPulse(true);
                  if (pulseRef.current) clearTimeout(pulseRef.current);
                  pulseRef.current = setTimeout(() => setPulse(false), 300);
                }}
              >
                <div className={modalStyles.knob} />
              </div>
              <div className={modalStyles.helper}>{formData.isActive ? 'This policy is visible to guests.' : 'This policy is hidden from guests.'}</div>
            </div>
          </div>

          <div className={modalStyles.actions}>
            <button type="submit" className={modalStyles.btnPrimary}>Save</button>
            <button type="button" onClick={onClose} className={modalStyles.btnSecondary}>Cancel</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
