'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  Calendar, 
  Home, 
  Camera, 
  BedDouble, 
  User, 
  LogIn, 
  LogOut,
  ChevronDown, 
  Menu, 
  X, 
  Sparkles,
  MapPin,
  Phone,
  Mail,
  Bell,
  Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  const isActivePath = (path) => pathname === path;

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link href="/" className="logo-link">
            <Image
              src="/images/logo.png"
              alt="Charkool Beach Logo"
              width={100}
              height={70}
              className="logo-img"
            />
            <span className="brand-text">Charkool</span>
          </Link>
        </div>

        <ul>
          <li>
            <button
              onClick={() => {
                if (!session) {
                  const isConfirmed = window.confirm(
                    'You must be logged in to book. Click OK to go to the login page.'
                  );
                  if (isConfirmed) {
                    router.push('/login?redirect=/booking');
                  }
                } else {
                  router.push('/booking');
                }
              }}
              className="book-now-btn"
            >
              Book Now
            </button>
          </li>
          <li><Link href="/">Home</Link></li>
          <li><Link href="/virtual-tour">Virtual Tour</Link></li>
          <li><Link href="/room">Rooms</Link></li>
          <li><Link href="/about-us">About Us</Link></li>
          <li>
            {status === 'loading' ? (
              <span style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}>Login</span>
            ) : session?.user?.role === 'CUSTOMER' ? (
              <Link href="/guest/dashboard">Dashboard</Link>
            ) : (
              <Link href="/login">Login</Link>
            )}
          </li>
        </ul>
      </div>

      <style jsx>{`
        .navbar {
          background: #febe54;
          padding: 0.8rem 0;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
          height: 80px;
          min-height: 80px;
          max-height: 80px;
        }

        .navbar-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          height: 100%;
          flex-wrap: wrap;
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          position: relative;
        }

        .logo-link {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          text-decoration: none;
          position: relative;
        }

        .logo-img {
          display: block;
          height: 70px;
          width: auto;
        }

        .brand-text {
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 0.7rem;
          font-size: 1.8rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.5px;
          white-space: nowrap;
        }

        .logo-link:hover .brand-text {
          color: #f59e0b;
        }

        ul {
          list-style: none;
          display: flex;
          gap: 1.2rem;
          margin: 0;
          padding: 0;
          align-items: center;
          flex-wrap: wrap;
        }

        ul li :global(a) {
          color: #fff;
          text-decoration: none;
          font-size: 1.1rem;
          font-weight: 600;
          position: relative;
          transition: color 0.3s ease, transform 0.3s ease;
        }

        ul li :global(a)::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 100%;
          height: 2px;
          background-color: #fff;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        ul li :global(a):hover {
          color: #f59e0b;
          transform: translateY(-2px);
        }

        ul li :global(a):hover::after {
          transform: scaleX(1);
        }

        .book-now-btn {
          background: #fff;
          border: none;
          color: #febe52;
          font-size: 1rem;
          font-weight: 700;
          padding: 0.45em 1.2em;
          border-radius: 999px;
          box-shadow: 0 2px 8px 0 rgba(245, 158, 11, 0.13);
          cursor: pointer;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          letter-spacing: 0.01em;
          margin-right: 0.2rem;
          min-width: 110px;
          display: inline-block;
        }

        .book-now-btn:hover,
        .book-now-btn:focus {
          background: linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%);
          color: #fff;
          transform: translateY(-1px) scale(1.03);
          box-shadow: 0 4px 16px 0 rgba(245, 158, 11, 0.18);
        }

        .book-now-btn:active {
          transform: scale(0.98);
          box-shadow: 0 1px 4px 0 rgba(245, 158, 11, 0.1);
        }

        @media (max-width: 900px) {
          .navbar-container {
            flex-direction: column;
            align-items: stretch;
            padding: 0 0.5rem;
          }
          ul {
            gap: 0.7rem;
            justify-content: center;
            flex-wrap: wrap;
          }
          .navbar-brand {
            justify-content: center;
            margin-bottom: 0.5rem;
          }
        }

        @media (max-width: 600px) {
          .navbar {
            height: 70px;
            padding: 0.5rem 0;
          }
          .navbar-container {
            padding: 0 0.2rem;
          }
          ul {
            gap: 0.4rem;
          }
          .book-now-btn {
            font-size: 0.95rem;
            padding: 0.38em 0.9em;
            min-width: 90px;
          }
          .brand-text {
            font-size: 1.3rem;
          }
        }
      `}</style>
    </nav>
  );
}
