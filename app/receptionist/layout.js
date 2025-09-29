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
    <div className="receptionist-bg">
      <header className="receptionist-header">
        <h1>Receptionist Dashboard</h1>
      </header>
      <main className="receptionist-main">{children}</main>
      <style jsx>{`
        .receptionist-bg {
          min-height: 100vh;
          background: #f9fafb;
        }
        .receptionist-header {
          width: 100%;
          background: #FCD34D;
          color: #222;
          padding: 1.2rem 0 1.2rem 2rem;
          font-size: 1.7rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          box-shadow: 0 2px 8px 0 rgba(252, 211, 77, 0.13);
        }
        .receptionist-header h1 {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
        }
        .receptionist-main {
          max-width: 1100px;
          margin: 2.5rem auto;
          background: #fff;
          border-radius: 18px;
          box-shadow: 0 4px 24px 0 rgba(252, 211, 77, 0.10);
          padding: 2.5rem 2rem;
          min-height: 70vh;
        }
        @media (max-width: 700px) {
          .receptionist-main {
            padding: 1.2rem 0.5rem;
            margin: 1rem 0.2rem;
          }
          .receptionist-header {
            padding: 1rem 0 1rem 1rem;
            font-size: 1.2rem;
          }
        }
      `}</style>
    </div>
  );
}