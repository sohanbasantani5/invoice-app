import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Magic link, sign-up confirmation, password recovery and OAuth all land here.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const nextParam = searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let error: string | null = searchParams.get("error_description");
  if (!error && code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code).then((r) => ({ error: r.error?.message ?? null })));
  } else if (!error && tokenHash && type) {
    ({ error } = await supabase.auth
      .verifyOtp({ token_hash: tokenHash, type })
      .then((r) => ({ error: r.error?.message ?? null })));
  } else if (!error) {
    error = "This link is missing its code.";
  }

  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "That link has expired or was already used. Please request a new one.");
    return NextResponse.redirect(url);
  }
  return NextResponse.redirect(new URL(type === "recovery" ? "/auth/reset" : next, origin));
}
