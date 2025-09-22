import GoogleProvider from 'next-auth/providers/google';
// Make sure to import any other providers you are using.

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    // ...add more providers here
  ],
  // ...add other NextAuth options here (e.g., session, secret, callbacks)
};