import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.NEXTAUTH_SECRET;
const MAINTENANCE_MODE = process.env.APP_MAINTENANCE === "true";

async function checkBrowserTrust(req: NextRequest, token: any) {
  try {
    // Get browser fingerprint from headers (will be set by client-side code)
    const browserFingerprint = req.headers.get('x-browser-fingerprint');

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

  // Allow public GET access to the chatbot API
  if (pathname.startsWith('/api/chatbot') && req.method === 'GET') {
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
  const loginAndRegisterPaths = ["/login", "/register"];
  const isLoginOrRegister = loginAndRegisterPaths.includes(pathname);

  // These are the paths that don't require authentication (e.g., home)
  const publicPaths = ["/", "/login", "/register", "/api/public", "/virtual-tour", "/room", "/about-us"];
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
    // Always redirect to /booking if the requested path is /booking or starts with /booking
    if (pathname === "/booking" || pathname.startsWith("/booking/")) {
      loginUrl.searchParams.set("redirect", "/booking");
    } else {
      loginUrl.searchParams.set("redirect", pathname);
    }
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
      // Only check for role-based accounts (not guest)
      if (token.role.toLowerCase() !== 'guest') {
        const needsOtpVerification = await checkBrowserTrust(req, token);

        if (needsOtpVerification) {
          const otpUrl = new URL("/verify-otp", req.url);
          otpUrl.searchParams.set("redirect", pathname);
          return NextResponse.redirect(otpUrl);
        }
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
     */
    '/((?!api/auth/|_next/static|_next/image|favicon.ico|images/).*)'
  ],
};