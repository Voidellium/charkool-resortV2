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
};

export default async function RootLayout({ children }) {
  // Get server session for initial SSR
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={poppins.className} style={{ margin: 0, padding: 0 }}>
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
              <main>{children}</main>
              <Chatbot /> {/* Add the new Chatbot component here */}
            </BrowserFingerprintProvider>
          </NavigationProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
