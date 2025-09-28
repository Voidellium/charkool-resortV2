import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
const MAINTENANCE_MODE = process.env.APP_MAINTENANCE === "true";

async function checkBrowserTrust(req: NextRequest, token: any) {
  try {
    // --- DEV ONLY: Bypass OTP for specific origins for easier debugging ---
    const trustedOrigins = [
      'http://localhost:3000',
      'https://charkool-resort.vercel.app'
    ];
    if (trustedOrigins.includes(req.nextUrl.origin)) {
      // This log helps confirm the bypass is active during development.
      console.log(`DEV_MODE: Bypassing OTP check for trusted origin: ${req.nextUrl.origin}`);
      return false; // `false` means OTP is NOT needed, effectively trusting the browser.
    }
    // --- END DEV ONLY ---

    // Get browser fingerprint from headers (will be set by client-side code)
    const browserFingerprint = req.headers.get('x-browser-fingerprint');
    const isIncognito = req.headers.get('x-is-incognito') === 'true';

    // Always require OTP for incognito mode
    if (isIncognito) {
      return true;
    }

    if (!browserFingerprint) {
      // If no fingerprint, assume it needs verification (new browser)
      return true;
    }

    // Check if this browser is trusted for this user
    const response = await fetch(`${req.nextUrl.origin}/api/check-trusted-browser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token.accessToken || 'none'}`,
      },
      body: JSON.stringify({ browserFingerprint }),
    });

    const data = await response.json();
    return !data.isTrusted;
  } catch (error) {
    console.error('Browser trust check error:', error);
    // If there's an error checking, err on the side of caution and require OTP
    return true;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Enhanced logging for debugging
  console.log(`[MIDDLEWARE] ${req.method} ${pathname} - User Agent: ${req.headers.get('user-agent')?.substring(0, 100)}`);

  // Allow public GET access to the chatbot API
  if (pathname.startsWith('/api/chatbot') && req.method === 'GET') {
    console.log(`[MIDDLEWARE] Allowing public access to chatbot API`);
    return NextResponse.next();
  }

  // Skip middleware for NextAuth internal requests and password reset routes
  if (pathname.startsWith('/api/auth/') || 
      pathname === '/api/auth/forgot-password' || 
      pathname === '/api/auth/verify-reset-otp' || 
      pathname === '/api/auth/reset-password') {
    console.log(`[MIDDLEWARE] Skipping auth route: ${pathname}`);
    return NextResponse.next();
  }

  // --- 0. Global Maintenance Mode ---
  if (MAINTENANCE_MODE) {
    // Allow access to login for you or devs only
    if (!pathname.startsWith("/api") && pathname !== "/login") {
      return new NextResponse(
        `<html><body style="font-family:sans-serif;text-align:center;padding-top:50px;">
           <h1>🔧 Under Maintenance</h1>
           <p>Our system is currently undergoing maintenance. Please check back later.</p>
         </body></html>`,
        { status: 503, headers: { "content-type": "text/html" } }
      );
    }
  }

  // These are the only paths a logged-in user should be redirected FROM
  const loginAndRegisterPaths = ["/login", "/register", "/login/forgot-password"];
  const isLoginOrRegister = loginAndRegisterPaths.includes(pathname);

  // These are the paths that don't require authentication (e.g., home)
  const publicPaths = ["/", "/login", "/register", "/login/forgot-password", "/api/public", "/virtual-tour", "/room", "/about-us", "/booking"];
  const isPublicPath = publicPaths.includes(pathname);

  const token = await getToken({ req, secret: JWT_SECRET });

  // --- 1. Handle authenticated users trying to access login/register pages ---
  if (token && isLoginOrRegister) {
    // Check if there's a redirect parameter and honor it for safe redirects
    const redirectParam = req.nextUrl.searchParams.get("redirect");
    if (redirectParam && typeof token.role === "string") {
      // Define safe redirects based on user role
      const role = token.role.toLowerCase();
      const safeRedirects: Record<string, string[]> = {
        "customer": ["/booking", "/guest"],
        "superadmin": ["/super-admin", "/booking"],
        "admin": ["/admin", "/booking"],
        "receptionist": ["/receptionist", "/booking"],
        "cashier": ["/cashier", "/booking"],
        "amenityinventorymanager": ["/amenityinventorymanager", "/booking"],
      };

      const allowedRedirects = safeRedirects[role] || [];
      const isSafeRedirect = allowedRedirects.some(path => redirectParam.startsWith(path));

      if (isSafeRedirect) {
        return NextResponse.redirect(new URL(redirectParam, req.url));
      }
    }

    // Default role-based redirect if no safe redirect parameter
    if (typeof token.role === "string") {
      const role = token.role.toLowerCase();
      switch (role) {
        case "superadmin": return NextResponse.redirect(new URL("/super-admin/dashboard", req.url));
        case "admin": return NextResponse.redirect(new URL("/admin/dashboard", req.url));
        case "receptionist": return NextResponse.redirect(new URL("/receptionist", req.url));
        case "cashier": return NextResponse.redirect(new URL("/cashier", req.url));
        case "amenityinventorymanager": return NextResponse.redirect(new URL("/amenityinventorymanager", req.url));
        case "customer": return NextResponse.redirect(new URL("/guest/dashboard", req.url));
        default: return NextResponse.redirect(new URL("/", req.url));
      }
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  // --- 2. Handle unauthenticated users trying to access protected pages ---
  if (!token && !isPublicPath) {
    const loginUrl = new URL("/login", req.url);    
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // --- 2.5 Handle unauthenticated users trying to access /booking ---
  if (!token && pathname.startsWith('/booking')) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', '/booking');
    return NextResponse.redirect(loginUrl);
  }

  // --- 3. Role-based protection for specific routes ---
  const roleProtectedRoutes: Record<string, string> = {
    "/super-admin": "superadmin",
    "/receptionist": "receptionist",
    "/cashier": "cashier",
    "/amenityinventorymanager": "amenityinventorymanager",
    "/customer": "customer",
  };

  for (const route in roleProtectedRoutes) {
    if (pathname.startsWith(route)) {
      const requiredRole = roleProtectedRoutes[route];

      // Check if user has the required role
      if (typeof token?.role !== "string" || token.role.toLowerCase() !== requiredRole) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }

      // Check if user needs OTP verification for this session
      // Apply to ALL authenticated users (including guests) for new browsers or incognito
      const needsOtpVerification = await checkBrowserTrust(req, token);

      if (needsOtpVerification) {
        const otpUrl = new URL("/verify-otp", req.url);
        otpUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(otpUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - CRITICAL for NextAuth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (image folder)
     * - public (public assets)
     * - models (3D model files)
     */
    '/((?!api/|_next/static|_next/image|favicon.ico|images|public/|models/).*)'
  ],
};
