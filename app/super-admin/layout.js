import ClientNavbarWrapper from '../../components/ClientNavbarWrapper';
import BrowserFingerprintProvider from '../../components/BrowserFingerprintProvider';
import { Poppins } from 'next/font/google';
import { getServerSession } from 'next-auth';
import SessionWrapper from '../../SessionWrapper';
import { authOptions } from '../auth';
import Chatbot from '../../components/Chatbot';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: 'Super Admin | Charkool Resort',
  description: 'Super Admin dashboard',
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={poppins.className}>
        <SessionWrapper
          session={session}
          refetchInterval={0}
          basePath="/api/auth"
        >
          <BrowserFingerprintProvider>
            <ClientNavbarWrapper />
            <main
              style={{
                maxWidth: '1100px',
                margin: '0 auto',
                padding: '1rem',
                boxSizing: 'border-box',
                minHeight: '80vh',
                fontSize: '0.85rem', // Further reduce base font size
                lineHeight: '1',
              }}
            >
              <div style={{ fontSize: 'inherit' }}>{children}</div>
            </main>
            <Chatbot />
          </BrowserFingerprintProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
