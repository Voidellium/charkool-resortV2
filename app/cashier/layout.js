'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function CashierLayout({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [showDropdown, setShowDropdown] = useState(false);

  // ✅ Role-based route protection
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role.toLowerCase() !== 'cashier') {
      router.push('/login');
    }
  }, [session, status, router]);

  function toggleDropdown() {
    setShowDropdown(!showDropdown);
  }

  function handleSignOut() {
    router.push('/api/auth/signout');
  }

  function cancelSignOut() {
    setShowDropdown(false);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header with user icon */}
      <header style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '10px 20px',
        background: '#FEBE52',
        color: '#fff',
        position: 'relative',
      }}>
        <button
          onClick={toggleDropdown}
          aria-label="User menu"
          title="User menu"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            userSelect: 'none',
          }}
        >
          👤
        </button>
        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '20px',
            backgroundColor: '#fff',
            color: '#000',
            borderRadius: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            padding: '10px',
            zIndex: 1000,
            width: '180px',
          }}>
            <p>Are you sure you want to sign out? {'('+session.user.name+')'} </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <button
                onClick={handleSignOut}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Yes
              </button>
              <button
                onClick={cancelSignOut}
                style={{
                  backgroundColor: '#ccc',
                  color: '#333',
                  border: 'none',
                  padding: '5px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                No
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '20px' }}>
        {children}
      </main>
    </div>
  );
}