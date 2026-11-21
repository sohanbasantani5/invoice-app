import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/invoices", "/clients", "/items", "/settings", "/onboarding"];
const authPaths = ["/login", "/auth/callback", "/auth/reset"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cron authentication is handled by its Bearer secret, independently of browser sessions.
  if (pathname.startsWith("/api/cron/")) {
    return NextResponse.next();
  }

  // Auth API routes handle their own requests and sessions on Node runtime
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuth = authPaths.some((p) => pathname.startsWith(p));

  // Pure cookie inspection — zero imports of pg, auth, or Node-only modules
  const sessionToken =
    request.cookies.get("__Secure-better-auth.session_token")?.value ||
    request.cookies.get("better-auth.session_token")?.value;

  const hasLegacySupabaseCookie = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && Boolean(c.value));

  // Cleanly redirect legacy Supabase session cookies to /login?migrated=1 and purge them
  if (hasLegacySupabaseCookie && !sessionToken && pathname !== "/login") {
    const url = new URL("/login", request.url);
    url.searchParams.set("migrated", "1");
    const response = NextResponse.redirect(url);
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        response.cookies.delete(cookie.name);
      }
    }
    return response;
  }

  // Clean up legacy cookies if the user arrives on /login
  if (hasLegacySupabaseCookie && pathname === "/login") {
    const response = NextResponse.next();
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        response.cookies.delete(cookie.name);
      }
    }
    return response;
  }

  // Redirect unauthenticated users from protected routes
  if (isProtected && !sessionToken) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (isAuth && sessionToken && pathname !== "/auth/callback" && pathname !== "/auth/reset") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff2?)$).*)",
  ],
};
