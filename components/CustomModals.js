import React, { useState } from 'react';

// Hook for Early Check-In Modal (Receptionist)
export function useEarlyCheckInModal() {
  const [earlyCheckInModal, setEarlyCheckInModal] = useState({ show: false, date: null });
  return [earlyCheckInModal, setEarlyCheckInModal];
}

export function EarlyCheckInModal({ modal, setModal }) {
  if (!modal?.show) return null;
  return (
    <div
      className="modal-overlay fade-in"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      <div
        className="modal-content"
        style={{
          background: 'linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%)',
          padding: '20px',
          borderRadius: '8px',
          width: '400px',
          maxWidth: '90%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1.15rem', color: '#3d2c00' }}>Early Check-In Not Allowed</h3>
          <button
            className="modal-close-button"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontSize: '1.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#92400E',
              padding: '2px 8px',
              lineHeight: 1,
              zIndex: 2
            }}
            onClick={() => setModal({ show: false, date: null })}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div style={{ marginBottom: '20px', color: '#3d2c00' }}>
          The booking starts at: <b>{modal.date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setModal({ show: false, date: null })}
            style={{
              minWidth: '100px',
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for Override Modal (Super Admin)
export function useOverrideModal() {
  const [overrideModal, setOverrideModal] = useState({ show: false, type: '', date: null, bookingId: null });
  return [overrideModal, setOverrideModal];
}

export function OverrideModal({ modal, setModal, onConfirm }) {
  if (!modal?.show) return null;
  return (
    <div
      className="modal-overlay fade-in"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
      }}
    >
      <div
        className="modal-content"
        style={{
          background: 'linear-gradient(135deg, #fcd34d 0%, #e6f4f8 100%)',
          padding: '20px',
          borderRadius: '8px',
          width: '400px',
          maxWidth: '90%',
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          position: 'relative',
        }}
      >
        <div style={{ position: 'relative', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontWeight: 600, fontSize: '1.15rem', color: '#3d2c00' }}>
            {modal.type === 'checkin' ? 'Confirm to manually override check in?' : 'Confirm to manually override check out?'}
          </h3>
          <button
            className="modal-close-button"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              fontSize: '1.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#92400E',
              padding: '2px 8px',
              lineHeight: 1,
              zIndex: 2
            }}
            onClick={() => setModal({ show: false, type: '', date: null, bookingId: null })}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div style={{ marginBottom: '20px', color: '#3d2c00' }}>
          {modal.type === 'checkin' ? (
            <>This booking starts at: <b>{modal.date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b></>
          ) : (
            <>This booking ends at: <b>{modal.date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b></>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => {
              if (onConfirm) onConfirm();
              setModal({ show: false, type: '', date: null, bookingId: null });
            }}
            style={{
              minWidth: '100px',
              padding: '8px 16px',
              backgroundColor: '#56A86B',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Confirm
          </button>
          <button
            onClick={() => setModal({ show: false, type: '', date: null, bookingId: null })}
            style={{
              minWidth: '100px',
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
