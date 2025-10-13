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
    <SessionWrapper
      session={session}
      refetchInterval={0}
      basePath="/api/auth"
    >
      <BrowserFingerprintProvider>
        <ClientNavbarWrapper />
        <main
          style={{
            width: '100%',
            maxWidth: 'none',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
            minHeight: '100vh',
            fontSize: '0.9rem',
            lineHeight: '1.4',
          }}
        >
          <div style={{ fontSize: 'inherit' }}>{children}</div>
        </main>
        <Chatbot />
      </BrowserFingerprintProvider>
    </SessionWrapper>
  );
}
