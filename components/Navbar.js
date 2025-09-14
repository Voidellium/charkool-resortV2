'use client';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link href="/">
            <Image src="/images/logo.png" alt="Charkool Beach Logo" width={100} height={70} />
          </Link>
        </div>
        <ul>
          <li><Link href="/">Home</Link></li>
          <li><Link href="/booking">Booking</Link></li>
          <li><Link href="/virtual-tour">Virtual Tour</Link></li>
          <li><Link href="/login">Login</Link></li>
        </ul>
      </div>
      <style jsx>{`
        .navbar {
          background: #fff;
          padding: 1rem 0;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
          position: sticky;
          top: 0;
          z-index: 1000;
        }

        .navbar-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        ul {
          list-style: none;
          display: flex;
          gap: 2rem;
          margin: 0;
          padding: 0;
        }

        /* Style the auto-generated anchor tags */
        ul li :global(a) {
          color: #333;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 500;
          position: relative;
          transition: color 0.3s ease, transform 0.3s ease;
        }

        ul li :global(a)::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 100%;
          height: 2px;
          background-color: #0070f3;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        ul li :global(a):hover {
          color: #0070f3;
          transform: translateY(-2px);
        }

        ul li :global(a):hover::after {
          transform: scaleX(1);
        }

        @media (max-width: 768px) {
          ul {
            gap: 1rem;
          }
        }
      `}</style>
    </nav>
  );
}
