'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  ChevronDown, 
  Menu, 
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserDropdown(false);
      setIsMobileMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Mount state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle rooms navigation
  const handleRoomsClick = (e) => {
    e.preventDefault();
    if (pathname === '/') {
      // If already on landing page, scroll to rooms section
      const roomsSection = document.getElementById('rooms');
      if (roomsSection) {
        roomsSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // If on another page, navigate to landing page and then scroll
      router.push('/?scrollTo=rooms');
    }
  };

  // Handle scroll to rooms if coming from another page
  useEffect(() => {
    if (mounted && pathname === '/' && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('scrollTo') === 'rooms') {
        setTimeout(() => {
          const roomsSection = document.getElementById('rooms');
          if (roomsSection) {
            roomsSection.scrollIntoView({ behavior: 'smooth' });
          }
          // Clean up URL
          window.history.replaceState({}, '', '/');
        }, 100);
      }
    }
  }, [pathname, mounted]);

  const isActivePath = (path) => pathname === path;

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link href="/" className="logo-link">
            <div className="brand-text-container">
              <span className="brand-title">
                Charkool
                <span className="brand-glow"></span>
              </span>
              <span className="brand-subtitle">Beach Resort</span>
            </div>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-toggle"
          onClick={(e) => {
            e.stopPropagation();
            setIsMobileMenuOpen(!isMobileMenuOpen);
            setShowUserDropdown(false);
          }}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>

        {/* Navigation Menu */}
        <ul className={`nav-menu ${isMobileMenuOpen ? 'nav-menu-open' : ''}`}>
          <li><Link href="/" onClick={() => setIsMobileMenuOpen(false)}>Home</Link></li>
          <li><Link href="/virtual-tour" onClick={() => setIsMobileMenuOpen(false)}>Virtual Tour</Link></li>
          <li>
            {!mounted ? (
              <Link href="/room" onClick={() => setIsMobileMenuOpen(false)}>Rooms</Link>
            ) : (
              <button onClick={(e) => { handleRoomsClick(e); setIsMobileMenuOpen(false); }} className="rooms-nav-btn">
                Rooms
              </button>
            )}
          </li>
          <li><Link href="/about-us" onClick={() => setIsMobileMenuOpen(false)}>About Us</Link></li>
          <li>
            {status === 'loading' ? (
              <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Login</span>
            ) : session?.user?.role === 'CUSTOMER' ? (
              <Link href="/guest/dashboard" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
            ) : (
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>Login</Link>
            )}
          </li>
          <li className="book-now-li">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                if (!session) {
                  const isConfirmed = window.confirm(
                    'You must be logged in to book. Click OK to go to the login page.'
                  );
                  if (isConfirmed) {
                    router.push('/login?redirect=/booking');
                  }
                } else if (session.user.role !== 'CUSTOMER') {
                  alert('Only customers can make bookings. Please contact the front desk if you need assistance.');
                } else {
                  router.push('/booking');
                }
              }}
              className="book-now-btn"
            >
              Book Now
            </button>
          </li>
        </ul>
      </div>

      <style jsx>{`
        .navbar *,
        .navbar *::before,
        .navbar *::after,
        .navbar a,
        .navbar a:hover,
        .navbar a:focus,
        .navbar a:active,
        .navbar a:visited,
        .navbar a:link,
        .navbar .logo-link,
        .navbar .logo-link:hover,
        .navbar .logo-link:focus,
        .navbar .logo-link:active,
        .navbar .logo-link:visited {
          text-decoration: none !important;
          text-decoration-line: none !important;
          text-decoration-style: none !important;
          text-decoration-color: transparent !important;
          border-bottom: none !important;
          border-bottom-width: 0 !important;
          border-bottom-style: none !important;
          text-underline-offset: 0 !important;
          text-decoration-thickness: 0 !important;
        }

        .navbar {
          position: sticky;
          top: 0;
          z-index: 1000;
          background: linear-gradient(135deg, rgba(240, 176, 53, 0.55), rgba(252, 211, 77, 0.12));
          backdrop-filter: blur(10px);
          /* remove thin white border that caused a visible seam */
          border-bottom: none;
          /* keep a subtle separation without a hard white line */
          box-shadow: 0 1px 0 rgba(255,255,255,0.02) inset, 0 6px 18px rgba(0,0,0,0.06);
          padding: 1rem 0;
          transition: background 0.4s ease, box-shadow 0.4s ease, padding 0.4s ease;
        }
        
        .navbar :global(*) {
          text-decoration: none !important;
          border-bottom: none !important;
        }

        .navbar::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, #febe52, #EDCA60);
          pointer-events: none;
          opacity: 0.7;
          transition: opacity 0.4s ease;
        }

        .navbar.navbar-scrolled {
          background: linear-gradient(135deg, rgba(240, 176, 53, 0.95), rgba(251, 146, 60, 0.95));
          padding: 0.8rem 0;
          box-shadow: 0 12px 35px rgba(251, 146, 60, 0.28);
        }

        .navbar.navbar-scrolled::before {
          opacity: 0.2;
        }

        .navbar-container {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
          gap: 1.5rem;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          position: relative;
          z-index: 1001;
        }

        .logo-link {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          text-decoration: none !important;
          position: relative;
          padding: 0.3rem 0;
          border-bottom: none !important;
        }

        .logo-img {
          display: block;
          height: 72px;
          width: auto;
          filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.18));
        }

        .brand-text-container {
          display: flex;
          flex-direction: column;
          margin-left: 0.4rem;
          justify-content: center;
          align-items: flex-start;
        }

        .brand-title {
          position: relative;
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          background: linear-gradient(120deg, #ffffff 10%, #fef3c7 45%, #fde68a 90%);
          -webkit-background-clip: text;
          color: transparent;
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }

        .brand-glow {
          position: absolute;
          inset: 45% -18px auto auto;
          width: 36px;
          height: 36px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.9), rgba(253, 230, 138, 0));
          filter: blur(12px);
          opacity: 0;
          transition: transform 0.5s ease, opacity 0.5s ease;
        }

        .brand-subtitle {
          margin-top: -0.1rem;
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.65rem;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.85);
          white-space: nowrap;
          text-decoration: none;
        }

        .logo-link:hover .brand-glow,
        .navbar.navbar-scrolled .brand-glow {
          opacity: 1;
          transform: scale(1.1);
        }

        /* Mobile Menu Toggle Button */
        .mobile-menu-toggle {
          display: none;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          color: white;
          transition: all 0.3s ease;
          z-index: 1001;
        }

        .mobile-menu-toggle:hover {
          background: rgba(255, 255, 255, 0.18);
          transform: scale(1.05);
        }

        .mobile-menu-toggle:active {
          transform: scale(0.95);
        }

        /* Navigation Menu */
        .nav-menu {
          list-style: none;
          display: flex;
          gap: 1.4rem;
          margin: 0;
          padding: 0;
          align-items: center;
          flex-wrap: wrap;
        }

        .nav-menu li {
          display: flex;
          align-items: center;
        }

        .nav-menu li :global(a) {
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none !important;
          font-size: 1rem;
          font-weight: 600;
          padding: 0.45rem 0.95rem;
          border-radius: 999px;
          transition: transform 0.3s ease, background 0.3s ease, color 0.3s ease;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          border-bottom: none !important;
        }

        .nav-menu li :global(a):hover {
          color: #ffffff;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.08));
          transform: translateY(-3px);
          box-shadow: 0 8px 18px rgba(255, 255, 255, 0.16);
          text-decoration: none !important;
          border-bottom: none !important;
        }

        .rooms-nav-btn {
          color: rgba(255, 255, 255, 0.9);
          text-decoration: none !important;
          font-size: 1rem;
          font-weight: 600;
          padding: 0.45rem 0.95rem;
          border-radius: 999px;
          transition: transform 0.3s ease, background 0.3s ease, color 0.3s ease;
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
          border: none !important;
          border-bottom: none !important;
          outline: none !important;
          cursor: pointer;
          font-family: inherit;
          display: inline-flex;
          align-items: center;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          box-shadow: none !important;
        }

        .rooms-nav-btn:hover {
          color: #ffffff;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.08));
          transform: translateY(-3px);
          box-shadow: 0 8px 18px rgba(255, 255, 255, 0.16) !important;
        }

        .rooms-nav-btn:focus {
          outline: none !important;
          box-shadow: none !important;
        }

        .rooms-nav-btn:active {
          outline: none !important;
          box-shadow: none !important;
        }

        /* Ensure RoomsNavButton styles match other nav links */
        ul li {
          display: flex;
          align-items: center;
        }

        .book-now-btn {
          /* Premium amber-gold gradient that blends with the navbar palette */
          background: linear-gradient(135deg, #b45309 0%, #f59e0b 52%, #fcd34d 100%);
          color: #fff;
          font-size: 1.08rem;
          font-weight: 800;
          padding: 0.65em 1.9em;
          border-radius: 999px;
          /* Subtle border for definition */
          border: 1px solid rgba(253, 230, 138, 0.6);
          /* Gentle glow for depth */
          box-shadow: 0 18px 35px -16px rgba(245, 158, 11, 0.55), 0 0 0 1px rgba(253, 230, 138, 0.18) inset;
          cursor: pointer;
          transition: transform 0.35s ease, box-shadow 0.35s ease, background 0.35s ease;
          letter-spacing: 0.14em;
          margin-right: 0.5rem;
          min-width: 150px;
          text-transform: uppercase;
          position: relative;
          overflow: hidden;
          /* Subtle outline to make it stand out without being loud */
          outline: 1px solid rgba(255, 255, 255, 0.12);
          outline-offset: 2px;
        }

        .book-now-btn::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0));
          transform: translateX(-100%);
          transition: transform 0.45s ease;
        }

        .book-now-btn:hover,
        .book-now-btn:focus {
          transform: translateY(-4px) scale(1.04);
          /* Slightly brighter glow and a gentle halo to separate from background */
          box-shadow: 0 22px 44px -14px rgba(245, 158, 11, 0.6), 0 0 0 2px rgba(253, 230, 138, 0.32);
        }

        .book-now-btn:hover::after,
        .book-now-btn:focus::after {
          transform: translateX(0);
        }

        .book-now-btn:active {
          transform: translateY(-1px) scale(1.01);
          box-shadow: 0 16px 28px -18px rgba(245, 158, 11, 0.55);
        }

        /* Stronger, accessible focus ring without being distracting */
        .book-now-btn:focus-visible {
          outline: 2px solid rgba(253, 230, 138, 0.65);
          outline-offset: 3px;
        }

        @media (max-width: 1024px) {
          .navbar-container {
            padding: 0 1.2rem;
            gap: 1rem;
          }

          .nav-menu {
            gap: 1rem;
          }

          .brand-title {
            font-size: 1.8rem;
          }

          .brand-subtitle {
            font-size: 0.8rem;
            letter-spacing: 0.5rem;
          }
        }

        /* Tablet and below - Show mobile menu */
        @media (max-width: 900px) {
          .mobile-menu-toggle {
            display: block;
          }

          .nav-menu {
            position: fixed;
            top: 0;
            right: -100%;
            height: 100vh;
            width: 280px;
            max-width: 80vw;
            background: linear-gradient(180deg, rgba(240, 176, 53, 0.98), rgba(251, 146, 60, 0.98));
            backdrop-filter: blur(20px);
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            padding: 5rem 1.5rem 6rem;
            box-shadow: -10px 0 40px rgba(0, 0, 0, 0.3);
            transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            overflow-y: auto;
            z-index: 1002;
          }

          .nav-menu-open {
            right: 0;
          }

          .nav-menu-open::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: -1;
            animation: fadeIn 0.3s ease;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .nav-menu li {
            width: 100%;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }

          .nav-menu li :global(a),
          .rooms-nav-btn {
            width: 100%;
            justify-content: flex-start;
            padding: 1rem 1.2rem;
            border-radius: 8px;
            background: transparent;
            font-size: 1.05rem;
            transform: none;
          }

          .nav-menu li :global(a):hover,
          .rooms-nav-btn:hover {
            background: rgba(255, 255, 255, 0.15);
            transform: translateX(8px);
            box-shadow: none;
          }

          .book-now-li {
            position: sticky;
            bottom: 0;
            background: linear-gradient(180deg, rgba(240, 176, 53, 0.98), rgba(251, 146, 60, 0.98));
            padding: 1rem 0;
            margin-top: auto;
            border-top: 2px solid rgba(255, 255, 255, 0.2);
            border-bottom: none;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
          }

          .book-now-btn {
            width: 100%;
            justify-content: center;
            margin-right: 0;
            font-size: 1.05rem;
            padding: 1rem 1.5rem;
          }
        }

        @media (max-width: 820px) {
          .navbar-container {
            padding: 0.8rem 1rem;
          }
        }

        @media (max-width: 600px) {
          .navbar {
            padding: 0.75rem 0;
          }

          .navbar-container {
            padding: 0.6rem 0.9rem;
            gap: 0.8rem;
          }

          .logo-img {
            height: 60px;
          }

          .brand-title {
            font-size: 1.5rem;
            letter-spacing: 0.5px;
          }

          .brand-subtitle {
            font-size: 0.7rem;
            letter-spacing: 0.35rem;
          }

          .nav-menu {
            width: 260px;
            padding: 4.5rem 1.2rem 1.5rem;
          }

          .nav-menu li :global(a),
          .rooms-nav-btn {
            font-size: 0.95rem;
            padding: 0.9rem 1rem;
          }

          .book-now-btn {
            font-size: 1rem;
            padding: 0.9rem 1.3rem;
            letter-spacing: 0.1em;
          }

          .mobile-menu-toggle {
            padding: 0.4rem;
          }
        }

        @media (max-width: 420px) {
          .brand-title {
            font-size: 1.35rem;
          }

          .brand-subtitle {
            font-size: 0.6rem;
            letter-spacing: 0.28rem;
          }

          .nav-menu {
            width: 240px;
            padding: 4rem 1rem 1rem;
          }

          .nav-menu li :global(a),
          .rooms-nav-btn {
            font-size: 0.9rem;
            padding: 0.85rem 0.9rem;
          }

          .book-now-btn {
            font-size: 0.95rem;
            padding: 0.85rem 1.2rem;
          }
        }

        /* Large screens and TVs */
        @media (min-width: 1280px) {
          .navbar-container {
            max-width: 1400px;
            padding: 0 2rem;
          }

          .brand-title {
            font-size: 2.2rem;
          }

          .nav-menu {
            gap: 1.8rem;
          }

          .nav-menu li :global(a),
          .rooms-nav-btn {
            font-size: 1.05rem;
            padding: 0.5rem 1.1rem;
          }

          .book-now-btn {
            font-size: 1.12rem;
            padding: 0.7em 2em;
            min-width: 160px;
          }
        }

        @media (min-width: 1536px) {
          .navbar-container {
            max-width: 1600px;
            padding: 0 3rem;
          }

          .brand-title {
            font-size: 2.5rem;
          }

          .brand-subtitle {
            font-size: 1rem;
            letter-spacing: 0.75rem;
          }

          .nav-menu {
            gap: 2rem;
          }

          .nav-menu li :global(a),
          .rooms-nav-btn {
            font-size: 1.1rem;
            padding: 0.55rem 1.2rem;
          }

          .book-now-btn {
            font-size: 1.2rem;
            padding: 0.75em 2.2em;
            min-width: 180px;
          }
        }

        @media (min-width: 2560px) {
          .navbar-container {
            max-width: 2000px;
            padding: 0 4rem;
          }

          .brand-title {
            font-size: 3rem;
          }

          .brand-subtitle {
            font-size: 1.2rem;
            letter-spacing: 0.9rem;
          }

          .nav-menu {
            gap: 2.5rem;
          }

          .nav-menu li :global(a),
          .rooms-nav-btn {
            font-size: 1.25rem;
            padding: 0.6rem 1.4rem;
          }

          .book-now-btn {
            font-size: 1.35rem;
            padding: 0.8em 2.5em;
            min-width: 220px;
          }
        }
      `}</style>
    </nav>
  );
}
