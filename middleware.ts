import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // These are the only paths a logged-in user should be redirected FROM
  const loginAndRegisterPaths = ["/login", "/register"];
  const isLoginOrRegister = loginAndRegisterPaths.includes(pathname);

  // These are the paths that don't require authentication (e.g., home, booking)
  const publicPaths = ["/", "/booking", "/login", "/register", "/api/public"];
  const isPublicPath = publicPaths.includes(pathname);

  const token = await getToken({ req, secret: JWT_SECRET });

  // --- 1. Handle authenticated users trying to access login/register pages ---
  if (token && isLoginOrRegister) {
    // Redirect based on role
    if (typeof token.role === "string") {
      const role = token.role.toLowerCase();
      switch (role) {
        case 'superadmin': return NextResponse.redirect(new URL("/super-admin/dashboard", req.url));
        case 'admin': return NextResponse.redirect(new URL("/admin/dashboard", req.url));
        case 'receptionist': return NextResponse.redirect(new URL("/receptionist", req.url));
        case 'cashier': return NextResponse.redirect(new URL("/cashier", req.url));
        case 'amenityinventorymanager': return NextResponse.redirect(new URL("/amenityinventorymanager", req.url));
        case 'customer': return NextResponse.redirect(new URL("/guest/dashboard", req.url));
        default: return NextResponse.redirect(new URL("/", req.url));
      }
    }
    // Default if no role
    return NextResponse.redirect(new URL("/", req.url));
  }

  // --- 2. Handle unauthenticated users trying to access protected pages ---
  // If there's no token and they're not on a public path, redirect to login
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", req.url));
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

      // Use the same explicit type check here as well
      if (typeof token?.role !== "string" || token.role.toLowerCase() !== requiredRole) {
        return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)",
  ],
};