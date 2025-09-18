'use client';
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
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <main style={{ padding: '20px' }}>{children}</main>
    </div>
  );
}