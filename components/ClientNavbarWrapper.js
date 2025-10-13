'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ClientNavbarWrapper() {
  const pathname = usePathname();

  // Show navbar only on specific public pages
  const showNavbarPaths = ['/', '/booking', '/virtual-tour', '/login', '/register'];

  const shouldShowNavbar = showNavbarPaths.includes(pathname);

  return shouldShowNavbar ? <Navbar /> : null;
}
