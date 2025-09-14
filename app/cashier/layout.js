'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

export default function CashierLayout({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  // ✅ Role-based route protection
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role.toLowerCase() !== 'cashier') {
      router.push('/login');
    }
  }, [session, status, router]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f9fafb' }}>
      {/* Sidebar */}
      <aside style={{
        width: '220px',
        background: '#1E293B',
        color: '#fff',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '20px' }}>Cashier</h2>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link href="/cashier" style={linkStyle(router.pathname === '/cashier')}>
            💵 Dashboard
          </Link>
          <Link href="/cashier/payments" style={linkStyle(router.pathname === '/cashier/payments')}>
            📑 Payments
          </Link>
          <Link href="/cashier/reports" style={linkStyle(router.pathname === '/cashier/reports')}>
            📊 Reports
          </Link>
        </nav>

        <button
          onClick={() => router.push('/api/auth/signout')}
          style={{
            marginTop: 'auto',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            padding: '10px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Logout
        </button>
      </aside>

      {/* Main Content */}
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
