'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function Navbar() {
  const router = useRouter();
  const { data: session, status } = useSession();



  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link href="/">
            <Image src="/images/logo.png" alt="Charkool Beach Logo" width={100} height={70} />
          </Link>
        </div>
        <ul>
          <li>
            <button onClick={() => {
              if (!session) {
                const isConfirmed = window.confirm("You must be logged in to book. Click OK to go to the login page.");
                if (isConfirmed) {
                  router.push('/login?redirect=/booking');
                }
              } else {
                router.push('/booking');
              }
            }} className="book-now-btn">
              Book Now!
            </button>
          </li>
          <li><Link href="/">Home</Link></li>
          <li><Link href="/virtual-tour">Virtual Tour</Link></li>
          <li>
            <Link href="/room">
              Rooms
            </Link>
          </li>
          <li>
            {status === 'loading' ? (
              <Link href="/login">
                Login
              </Link>
            ) : session?.user?.role === 'CUSTOMER' ? (
              <Link href="/guest/dashboard">
                ← Dashboard
              </Link>
            ) : (
              <Link href="/login">
                Login
              </Link>
            )}
          </li>
        </ul>
      </div>
      <style jsx>{`
        .navbar {
          background: #FEBE54;
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
          background-color: #fff;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s ease;
        }

        ul li :global(a):hover {
          color: #fff;
          transform: translateY(-2px);
        }

        ul li :global(a):hover::after {
          transform: scaleX(1);
        }

        .book-now-btn {
          background: none;
          border: none;
          color: #333;
          text-decoration: none;
          font-size: 1rem;
          font-weight: 500;
          position: relative;
          transition: color 0.3s ease, transform 0.3s ease;
          cursor: pointer;
        }

        .book-now-btn::after {
          content: "";
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

        .book-now-btn:hover {
          color: #fff;
          transform: translateY(-2px);
        }

        .book-now-btn:hover::after {
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