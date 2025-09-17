import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

// Create a named handler for NextAuth
const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) {
    console.log('❌ Missing credentials:', { hasEmail: !!credentials?.email, hasPassword: !!credentials?.password });
    throw new Error("Missing email or password");
  }

  const email = credentials.email.toLowerCase();
  console.log('🔍 Looking up user for email:', email);

  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });

  if (!user) {
    console.log('❌ No user found for email:', email);
    throw new Error("Invalid email or password");
  }

  if (!user.password) {
    console.log('❌ User exists but no password:', { userId: user.id, email: user.email });
    throw new Error("Invalid email or password");
  }

  console.log('✅ User found:', { userId: user.id, email: user.email, hasPassword: !!user.password });

  // Trim whitespace from the submitted password
  const submittedPassword = credentials.password.trim();
  console.log('🔑 Submitted password length (trimmed):', submittedPassword.length);

  const isValid = await bcrypt.compare(submittedPassword, user.password);
  console.log('🔐 bcrypt.compare result:', isValid);

  if (!isValid) {
    console.log('❌ Password mismatch for user:', user.id);
    throw new Error("Invalid email or password");
  }

  console.log('✅ Auth successful for user:', user.id);

  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role?.toUpperCase() ?? "CUSTOMER",
    image: user.image ?? null,
  };
},
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider && user.email) {
        const existingUser = await prisma.user.findFirst({
          where: { email: { equals: user.email, mode: 'insensitive' } },
        });
        if (existingUser) {
          // Link OAuth account to existing user
          const accountExists = await prisma.account.findFirst({
            where: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          });
          if (!accountExists) {
            await prisma.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                access_token: account.access_token,
                refresh_token: account.refresh_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                session_state: account.session_state,
              },
            });
          }
          user.id = existingUser.id;
          user.role = existingUser.role.toUpperCase();
          // Add redirectUrl property for customer role
          if (user.role.toLowerCase() === 'customer') {
            user.redirectUrl = '/guest/dashboard';
          }
        } else {
          // New user creation handled by PrismaAdapter
          user.role = user.role?.toUpperCase() ?? "CUSTOMER";
          if (user.role.toLowerCase() === 'customer') {
            user.redirectUrl = '/guest/dashboard';
          }
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) token.role = user.role?.toUpperCase() ?? "CUSTOMER";
      else if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { role: true },
        });
        token.role = dbUser?.role?.toUpperCase() ?? token.role ?? "CUSTOMER";
        console.log('🔄 JWT callback - fetched role from DB:', dbUser?.role, 'set token.role to:', token.role);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role?.toUpperCase() ?? "CUSTOMER";
        session.user.id = token.sub; // Add user id to session.user
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: { signIn: "/login", error: "/login" },
});

// Use named exports as required by the App Router
export { handler as GET, handler as POST };