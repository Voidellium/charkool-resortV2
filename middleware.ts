import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://checkout.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' data: blob: https://api.stripe.com https://api.sendgrid.com https://api.resend.com wss:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
};

// Apply security headers to response
function applySecurityHeaders(response: NextResponse, isLocalhost: boolean = false) {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    // Skip HTTPS enforcement on localhost
    if (key === 'Strict-Transport-Security' && isLocalhost) {
      return;
    }
    response.headers.set(key, value);
  });
  
  // Add HTTPS enforcement for production
  if (!isLocalhost) {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
const MAINTENANCE_MODE = process.env.APP_MAINTENANCE === "true";

async function checkBrowserTrust(req: NextRequest, token: any) {
  // If the session token already confirms the browser is trusted, skip the check.
  if (token?.isBrowserTrusted || req.cookies.get('isBrowserTrusted')?.value === 'true') {
    console.log(`[MIDDLEWARE] Browser already trusted for user ${token?.email}`);
    return false; // `false` means OTP is NOT needed.
  }

  try {
    // --- DEV ONLY: Bypass OTP for specific origins for easier debugging ---
    const trustedOrigins = [
      'http://localhost:3000',
      'https://charkool-resort.vercel.app',
       'https://charkoolresort.com'
    ];
    if (trustedOrigins.includes(req.nextUrl.origin)) {
      // This log helps confirm the bypass is active during development.
      console.log(`[MIDDLEWARE] DEV_MODE: Bypassing OTP check for trusted origin: ${req.nextUrl.origin}`);
      return false; // `false` means OTP is NOT needed, effectively trusting the browser.
    }
    // --- END DEV ONLY ---

    // Get browser fingerprint from cookies (set by client-side code)
    const browserFingerprint = req.cookies.get('browserFingerprint')?.value;
    const isIncognito = req.cookies.get('isIncognito')?.value === 'true';

    // Always require OTP for incognito mode
    if (isIncognito) {
      console.log(`[MIDDLEWARE] Incognito mode detected, requiring OTP`);
      return true;
    }

    if (!browserFingerprint) {
      // If no fingerprint, assume it needs verification (new browser)
      console.log(`[MIDDLEWARE] No browser fingerprint, requiring OTP`);
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
    console.log(`[MIDDLEWARE] Trusted browser check result: ${data.isTrusted}`);
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
    const response = NextResponse.next();
    const isLocalhost = req.url.includes('localhost') || req.url.includes('127.0.0.1');
    return applySecurityHeaders(response, isLocalhost);
  }

  // Skip middleware for NextAuth internal requests and password reset routes
  if (pathname.startsWith('/api/auth/') || 
      pathname === '/api/auth/forgot-password' || 
      pathname === '/api/auth/verify-reset-otp' || 
      pathname === '/api/auth/reset-password') {
    console.log(`[MIDDLEWARE] Skipping auth route: ${pathname}`);
    const response = NextResponse.next();
    const isLocalhost = req.url.includes('localhost') || req.url.includes('127.0.0.1');
    return applySecurityHeaders(response, isLocalhost);
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
  const publicPaths = ["/", "/login", "/register", "/login/forgot-password", "/api/public", "/virtual-tour", "/room", "/about-us"];
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
        "developer": ["/developer", "/booking"],
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
        case "developer": return NextResponse.redirect(new URL("/developer/dashboard", req.url));
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

  // --- 2.6 Handle booking route - CUSTOMER role only ---
  if (pathname.startsWith('/booking') && token) {
    if (typeof token.role !== "string" || token.role.toUpperCase() !== "CUSTOMER") {
      // Redirect non-customers to their appropriate dashboard
      const role = typeof token.role === "string" ? token.role.toLowerCase() : "";
      switch (role) {
        case "superadmin": return NextResponse.redirect(new URL("/super-admin/dashboard", req.url));
        case "admin": return NextResponse.redirect(new URL("/admin/dashboard", req.url));
        case "receptionist": return NextResponse.redirect(new URL("/receptionist", req.url));
        case "cashier": return NextResponse.redirect(new URL("/cashier", req.url));
        case "amenityinventorymanager": return NextResponse.redirect(new URL("/amenityinventorymanager", req.url));
        case "developer": return NextResponse.redirect(new URL("/developer/dashboard", req.url));
        default: return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }
  }

  // --- 3. Role-based protection for specific routes ---
  const roleProtectedRoutes: Record<string, string> = {
    "/super-admin": "superadmin",
    "/receptionist": "receptionist",
    "/cashier": "cashier",
    "/amenityinventorymanager": "amenityinventorymanager",
    "/developer": "developer",
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
      console.log(`[MIDDLEWARE] OTP required for ${pathname}: ${needsOtpVerification}`);

      if (needsOtpVerification) {
        const otpUrl = new URL("/verify-otp", req.url);
        otpUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(otpUrl);
      }
    }
  }

  // Apply security headers to all responses
  const response = NextResponse.next();
  const isLocalhost = req.url.includes('localhost') || req.url.includes('127.0.0.1');
  return applySecurityHeaders(response, isLocalhost);
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
