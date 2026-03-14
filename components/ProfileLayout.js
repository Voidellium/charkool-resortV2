'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function ProfileDropdown({ user }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();
  
  // Confirm modal state for logout
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  const showConfirmModal = useCallback((title, message, onConfirm) => {
    setConfirmModal({ show: true, title, message, onConfirm });
  }, []);

  // ✅ Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    showConfirmModal('Confirm Logout', 'Are you sure you want to log out?', () => {
      setConfirmModal({ show: false, title: '', message: '', onConfirm: null });
      router.push('/login');
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar button */}
      <button 
        onClick={() => setOpen(!open)} 
        className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden border hover:ring-2 hover:ring-blue-400"
      >
        <img 
          src={user?.picture || "/default-avatar.png"} 
          alt="User Avatar" 
          className="w-full h-full object-cover"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-md border z-50">
          <button 
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            onClick={() => alert("Change Picture clicked")}
          >
            Change Picture
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            onClick={() => router.push('/welcome')}
          >
            Switch Account
          </button>
          <button 
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100"
            onClick={handleLogout}
          >
            Log Out
          </button>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #febe52 0%, #fcd34d 50%, #f6e27a 100%)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: '16px' }}>
              <LogOut size={48} color="#dc2626" />
            </div>
            <h3 style={{
              margin: '0 0 12px 0',
              color: '#5a3e00',
              fontSize: '20px',
              fontWeight: 'bold',
            }}>{confirmModal.title}</h3>
            <p style={{
              margin: '0 0 20px 0',
              color: '#6b4a00',
              fontSize: '14px',
              lineHeight: '1.5',
            }}>{confirmModal.message}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })}
                style={{
                  backgroundColor: '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#6b7280'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#9ca3af'}
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
