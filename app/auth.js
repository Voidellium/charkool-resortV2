import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email.toLowerCase(),
            },
          });

          if (!user || !user.password) {
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            image: user.image,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours in seconds
    updateAge: 60 * 60, // Update session every 1 hour
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.image = user.image;
        token.name = user.name;
        // Initialize the flag and set token creation time
        token.isBrowserTrusted = false;
        token.createdAt = Date.now();
      }
      
      // Invalidate old tokens (older than 24 hours)
      if (token.createdAt && Date.now() - token.createdAt > 24 * 60 * 60 * 1000) {
        console.log('[AUTH] Token expired, forcing re-login');
        return null; // This will force a new login
      }
      
      // When the session is updated with the 'update' trigger, refresh user data from database
      if (trigger === 'update' && session?.user) {
        try {
          const updatedUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: {
              id: true,
              email: true,
              name: true,
              firstName: true,
              lastName: true,
              role: true,
              image: true,
            },
          });
          
          if (updatedUser) {
            token.image = updatedUser.image;
            token.name = updatedUser.name;
            token.role = updatedUser.role;
          }
        } catch (error) {
          console.error('Error updating token:', error);
        }
      }
      
      // When the session is updated with the 'otpVerified' trigger, set the flag
      if (trigger === "otpVerified") {
        token.isBrowserTrusted = true;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.image = token.image;
      session.user.name = token.name;
      // Expose the flag to the client-side session
      session.user.isBrowserTrusted = token.isBrowserTrusted;
      return session;
    },
  },
};
