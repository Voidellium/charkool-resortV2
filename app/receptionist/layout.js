'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function ReceptionistLayout({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role.toLowerCase() !== 'receptionist') {
      router.push('/login');
    }
  }, [session, status, router]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      <aside style={{
        width: '220px',
        background: '#1E293B',
        color: '#fff',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '20px' }}>Receptionist</h2>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link href="/receptionist" style={linkStyle(router.pathname === '/receptionist')}>
            🏠 Dashboard
          </Link>
          <Link href="/receptionist/booking" style={linkStyle(router.pathname === '/receptionist/booking')}>
            📑 Booking
          </Link>
        </nav>

        <button onClick={() => { router.push('/api/auth/signout'); }}
          style={{
            marginTop: 'auto',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '10px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}>
          Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: '20px' }}>{children}</main>
    </div>
  );
}

const linkStyle = (isActive) => ({
  padding: '10px',
  borderRadius: '6px',
  background: isActive ? '#334155' : 'transparent',
  color: isActive ? '#93c5fd' : '#fff',
  textDecoration: 'none',
  fontWeight: 'bold',
});
