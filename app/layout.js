import ClientNavbarWrapper from '../components/ClientNavbarWrapper';
import BrowserFingerprintProvider from '../components/BrowserFingerprintProvider';
import { NavigationProvider } from '../context/NavigationContext';
import { Poppins } from 'next/font/google';
import { getServerSession } from 'next-auth';
import SessionWrapper from '../SessionWrapper';
import { authOptions } from './auth'; // Import from the new shared file
import Chatbot from '../components/Chatbot'; // Import the new Chatbot component

// Load the Poppins font
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'Charkool Resort',
  description: 'A resort for all your needs',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover'
  },
  themeColor: '#FBD669',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Charkool Resort'
  }
};

export default async function RootLayout({ children }) {
  // Get server session for initial SSR
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        <meta name="format-detection" content="telephone=yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={poppins.className} style={{ margin: 0, padding: 0, overflowX: 'hidden' }}>
        <SessionWrapper
          session={session}
          refetchInterval={5 * 60} // Refetch session every 5 minutes to check validity
          refetchOnWindowFocus={true} // Refetch when window regains focus
          basePath="/api/auth" // Use internal API routes in merged app
        >
          <NavigationProvider>
            <BrowserFingerprintProvider>
              {/* Navbar wrapper (renders navbar and handles client auth state) */}
              <ClientNavbarWrapper />

              {/* Page content */}
              <main style={{ overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>{children}</main>
              <Chatbot /> {/* Add the new Chatbot component here */}
            </BrowserFingerprintProvider>
          </NavigationProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
