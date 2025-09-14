'use client';
import '../styles/global.css';
import ClientNavbarWrapper from '../components/ClientNavbarWrapper';
import { Poppins } from 'next/font/google';
import { SessionProvider } from 'next-auth/react';

// Load the Poppins font
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export default function RootLayout({ children, session }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <SessionProvider
          session={session}
          refetchInterval={0} // Disable auto refetch
          basePath="/api/auth" // Use internal API routes in merged app
          options={{
            clientMaxAge: 0, // Keep session always fresh
            keepAlive: 0,
            fetchOptions: {
              credentials: 'include', // Important for cookies
            },
          }}
        >
          {/* Navbar wrapper (renders navbar and handles client auth state) */}
          <ClientNavbarWrapper />

          {/* Page content */}
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
