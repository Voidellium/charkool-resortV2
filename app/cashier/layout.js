'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ToastProvider } from '@/components/Toast';

export default function CashierLayout({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Role-based route protection
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role?.toLowerCase() !== 'cashier') {
      router.push('/login');
    }
  }, [session, status, router]);

  return (
    <ToastProvider>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f5f7fb' }}>
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </ToastProvider>
  );
}