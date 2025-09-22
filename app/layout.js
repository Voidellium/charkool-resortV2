import ClientNavbarWrapper from '../components/ClientNavbarWrapper';
import BrowserFingerprintProvider from '../components/BrowserFingerprintProvider';
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
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={poppins.className}>
        <SessionWrapper
          session={session}
          refetchInterval={0} // Disable auto refetch
          basePath="/api/auth" // Use internal API routes in merged app
        >
          <BrowserFingerprintProvider>
            {/* Navbar wrapper (renders navbar and handles client auth state) */}
            <ClientNavbarWrapper />

            {/* Page content */}
            <main>{children}</main>
            <Chatbot /> {/* Add the new Chatbot component here */}
          </BrowserFingerprintProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
