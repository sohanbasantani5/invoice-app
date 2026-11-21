import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/invoices", "/clients", "/items", "/settings", "/onboarding"];
const authPaths = ["/login", "/auth/callback", "/auth/reset"];

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  const isAuth = authPaths.some((p) => pathname.startsWith(p));

  // Cron authentication is handled by its Bearer secret, independently of browser sessions.
  if (pathname === "/api/cron/overdue-reminders") return NextResponse.next();

  const session = await auth.api.getSession({ headers: request.headers });

  const supabaseSession = request.cookies.get("sb-auth-token")?.value;
  if (supabaseSession && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("migrated", "1");
    return NextResponse.redirect(url);
  }

  if (isProtected && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuth && session && pathname !== "/auth/callback" && pathname !== "/auth/reset") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ttf|woff2?)$).*)"],
};