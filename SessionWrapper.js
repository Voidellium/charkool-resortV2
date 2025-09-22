'use client';

import { SessionProvider } from 'next-auth/react';

export default function SessionWrapper({ children, session, ...rest }) {
  return (
    <SessionProvider session={session} {...rest}>
      {children}
    </SessionProvider>
  );
}