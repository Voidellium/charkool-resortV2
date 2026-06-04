'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ToastProvider } from '@/components/Toast';
import CashierStaffLayout from '@/components/CashierStaffLayout';

export default function CashierLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const activePage = pathname?.startsWith('/cashier/reception') ? 'bookings' : 'payments';

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || session.user.role?.toLowerCase() !== 'cashier') {
      router.push('/login');
    }
  }, [session, status, router]);

  return (
    <ToastProvider>
      <CashierStaffLayout activePage={activePage}>{children}</CashierStaffLayout>
    </ToastProvider>
  );
}
