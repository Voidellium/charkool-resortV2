'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react'; // Import the signOut function

export default function AmenityManagerLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  // Sidebar navigation items
  const navItems = [
    { name: 'Amenities', href: '/amenityinventorymanager/amenities' },
    { name: 'Categorization', href: '/amenityinventorymanager/categorization' },
    { name: 'Usage Logs', href: '/amenityinventorymanager/logs' },
    { name: 'History', href: '/amenityinventorymanager/history' },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '220px',
          background: '#1e293b', // slate-800
          color: 'white',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '20px',
          }}
        >
          Amenity Manager
        </h2>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  background: isActive ? '#334155' : 'transparent', // slate-700 active
                  color: isActive ? '#93c5fd' : 'white', // light blue for active
                  fontWeight: isActive ? 'bold' : 'normal',
                  textDecoration: 'none',
                  transition: 'background 0.2s ease',
                }}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout button */}
        <button
          onClick={() => signOut()} // Use the NextAuth signOut function
          style={{
            marginTop: 'auto',
            padding: '10px',
            border: 'none',
            borderRadius: '6px',
            background: '#ef4444', // red
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main
        style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto',
          background: '#f8fafc', // slate-50
        }}
      >
        {/* Back to Dashboard button */}
        <button
          onClick={() => router.push('/amenityinventorymanager')}
          style={{
            marginBottom: '20px',
            padding: '10px 14px',
            backgroundColor: '#3b82f6', // blue
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          ← Back to Dashboard
        </button>

        {children}
      </main>
    </div>
  );
}