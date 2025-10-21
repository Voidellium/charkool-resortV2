'use client';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Navbar from './Navbar';
import GuestHeader from './GuestHeader';

export default function ClientNavbarWrapper() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Show navbar only on specific public pages
  const showNavbarPaths = ['/', '/booking', '/virtual-tour', '/login', '/register'];
  
  const shouldShowNavbar = showNavbarPaths.includes(pathname);

  if (!shouldShowNavbar) return null;

  // For booking page, show GuestHeader if user is authenticated, otherwise show regular Navbar
  if (pathname === '/booking') {
    if (status === 'loading') {
      // Show nothing while loading to prevent flickering
      return null;
    }
    
    // If user is authenticated, show GuestHeader with session data; otherwise show regular Navbar
    return session ? <GuestHeader sessionUser={session.user} /> : <Navbar />;
  }

  // For all other pages, show regular Navbar
  return <Navbar />;
}
