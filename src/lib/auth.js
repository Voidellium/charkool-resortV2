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

// Custom adapter to handle the required fields
function CustomPrismaAdapter(prisma) {
  const adapter = PrismaAdapter(prisma);
  
  return {
    ...adapter,
    createUser: async (data) => {
      console.log('Creating user with data:', data);
      
      // Parse the name into firstName and lastName
      const nameParts = data.name ? data.name.split(' ') : ['', ''];
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      return prisma.user.create({
        data: {
          name: data.name,
          firstName: firstName,
          lastName: lastName,
          email: data.email,
          image: data.image,
          emailVerified: data.emailVerified,
          birthdate: new Date('1990-01-01'), // Default birthdate for OAuth users
          contactNumber: '0000000000', // Default contact number for OAuth users
        },
      });
    },
  };
}

export const authOptions = {
  adapter: CustomPrismaAdapter(prisma),
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
      
      // Handle Google OAuth account linking detection
      if (account?.provider === 'google') {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email.toLowerCase() },
            include: {
              accounts: {
                where: { provider: 'google' }
              }
            }
          });
          
          if (existingUser) {
            // Check if Google account is already linked
            const hasGoogleAccount = existingUser.accounts.length > 0;
            
            if (!hasGoogleAccount && existingUser.password) {
              // User has password-based account but no Google link
              // Store the pending link data in database
              console.log('Account linking required for:', user.email);
              
              const googleData = {
                id: profile.sub,
                name: user.name,
                email: user.email,
                image: user.image,
                timestamp: new Date().toISOString()
              };
              
              await prisma.user.update({
                where: { email: user.email.toLowerCase() },
                data: {
                  pendingGoogleLink: JSON.stringify(googleData)
                }
              });
              
              // Return false to prevent sign-in, client will check for pending link
              return false;
            }
          }
        } catch (error) {
          console.error('Error during Google sign-in check:', error);
          // Don't block sign-in for other errors
        }
      }
      
      return true;
    },
    async session({ session, token }) {
      try {
        if (token && session.user) {
          session.user.id = token.id;
          session.user.role = token.role;
          session.user.image = token.image;
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
          token.image = user.image;
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