
"use client";

import { useEffect } from 'react';
import GuestHeader from '../../components/GuestHeader';
import { UserProvider, useUser } from '../../context/UserContext';

// Inner component that has access to UserContext
function GuestLayoutInner({ children }) {
  const { user, setUser } = useUser();

  useEffect(() => {
    // Auto-fetch user data on mount to populate navbar
    async function fetchUserData() {
      try {
        const res = await fetch('/api/guest/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data.guest);
        } else {
          console.warn('Failed to fetch user data for navbar');
        }
      } catch (error) {
        console.warn('Error fetching user data:', error);
      }
    }

    // Only fetch if user is not already set
    if (!user) {
      fetchUserData();
    }
  }, [user, setUser]);

  return (
    <>
      <GuestHeader />
      <div className="guest-main-content">
        {children}
      </div>
      <style jsx>{`
        .guest-main-content {
          margin-top: 80px; /* Space for fixed header */
          min-height: calc(100vh - 80px);
          padding: 0;
        }
        
        @media (max-width: 768px) {
          .guest-main-content {
            margin-top: 70px;
            min-height: calc(100vh - 70px);
          }
        }
      `}</style>
    </>
  );
}

export default function GuestLayout({ children }) {
  return (
    <UserProvider initialUser={null}>
      <GuestLayoutInner>
        {children}
      </GuestLayoutInner>
    </UserProvider>
  );
}