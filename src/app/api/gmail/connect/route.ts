import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { authUrl, gmailConfigured } from "@/lib/gmail/google";
import { rateLimit, requestIp } from "@/lib/security/rate-limit";

/** Sends the signed-in user to Google's consent screen (gmail.compose only). */
export async function GET(request: NextRequest) {
  const { origin } = request.nextUrl;
  const limit = rateLimit(`gmail-connect:ip:${requestIp(request)}`, 10, 10 * 60 * 1000);
  if (!limit.ok) return new NextResponse("Too many Gmail connection attempts. Try again later.", { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const { user } = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));
  if (!gmailConfigured()) return NextResponse.redirect(new URL("/settings?tab=email&gmail=not_configured", origin));

  const state = randomBytes(24).toString("hex");
  const res = NextResponse.redirect(authUrl(origin, state, user.email));
  res.cookies.set("gmail_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/gmail", maxAge: 600 });
  return res;
}
