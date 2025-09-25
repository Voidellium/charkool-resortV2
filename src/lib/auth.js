import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Enhanced Prisma client with error handling
const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty',
});

// Global error handler for database operations
async function safeDbOperation(operation, errorMessage = 'Database operation failed') {
  try {
    return await operation();
  } catch (error) {
    console.error(`${errorMessage}:`, error);
    // Return a proper error response instead of throwing
    throw new Error(`${errorMessage}: ${error.message}`);
  }
}

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.error('Missing credentials');
          return null;
        }

        try {
          const user = await safeDbOperation(
            () => prisma.user.findUnique({
              where: {
                email: credentials.email.toLowerCase(),
              },
            }),
            'Failed to find user during authentication'
          );

          if (!user) {
            console.error('User not found:', credentials.email);
            return null;
          }

          if (!user.password) {
            console.error('User has no password set:', user.email);
            return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            console.error('Invalid password for user:', user.email);
            return null;
          }

          console.log('Successful authentication for user:', user.email);
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
          console.error('Authentication error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      console.log('Sign in attempt:', { user: user?.email, provider: account?.provider });
      return true;
    },
    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user.id = token.id;
          session.user.role = token.role;
        }
        session.accessToken = token.accessToken;
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    },
    async jwt({ token, user, account }) {
      try {
        if (account) {
          token.accessToken = account.access_token;
        }
        if (user) {
          token.id = user.id;
          token.role = user.role;
        }
        return token;
      } catch (error) {
        console.error('JWT callback error:', error);
        return token;
      }
    },
  },
  events: {
    async signIn(message) {
      console.log('User signed in:', message.user?.email);
    },
    async signOut(message) {
      console.log('User signed out:', message.token?.email);
    },
    async createUser(message) {
      console.log('User created:', message.user?.email);
    },
    async linkAccount(message) {
      console.log('Account linked:', message.user?.email);
    },
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };