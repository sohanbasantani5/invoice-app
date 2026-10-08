import { NextResponse, type NextRequest } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit, requestIp } from "@/lib/security/rate-limit";
import { safeErrorInfo } from "@/lib/security/logging";
import { encryptToken } from "@/lib/gmail/crypto";
import { exchangeCode, gmailAddress, GMAIL_SCOPE } from "@/lib/gmail/google";

/** Google sends the user back here. The refresh token is encrypted before it touches the database. */
export async function GET(request: NextRequest) {
  const { origin, searchParams } = request.nextUrl;
  const limit = rateLimit(`gmail-callback:ip:${requestIp(request)}`, 20, 10 * 60 * 1000);
  if (!limit.ok) return new NextResponse("Too many OAuth callback attempts. Try again later.", { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  const back = (result: string) => {
    const res = NextResponse.redirect(new URL(`/settings?tab=email&gmail=${result}`, origin));
    res.cookies.delete({ name: "gmail_oauth_state", path: "/api/gmail" });
    return res;
  };

  const { user } = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));
  if (searchParams.get("error")) return back("denied");

  const state = searchParams.get("state");
  const code = searchParams.get("code");
  if (!code || !state || state !== request.cookies.get("gmail_oauth_state")?.value) return back("error");

  try {
    const t = await exchangeCode(origin, code);
    if (!t.refresh_token) return back("error");
    if (!(t.scope ?? "").split(" ").includes(GMAIL_SCOPE)) return back("error");
    const email = await gmailAddress(t.access_token!);
    const { error } = await createAdminClient()
      .from("gmail_connections")
      .upsert({ user_id: user.id, email, refresh_token_enc: encryptToken(t.refresh_token) }, { onConflict: "user_id" });
    return back(error ? "error" : "connected");
  } catch (e) {
    console.error("gmail connect failed", safeErrorInfo(e));
    return back("error");
  }
}
