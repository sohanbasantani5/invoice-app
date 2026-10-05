"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string; email?: string } | null;

const emailSchema = z.email("Enter a valid email address.");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.").max(72);

async function siteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Only allow relative in-app redirects. */
function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "That email and password don't match. Try again or use a magic link.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("already registered")) return "An account with this email already exists. Sign in instead.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts. Please wait a minute and try again.";
  if (m.includes("weak") || m.includes("password should")) return "Please choose a stronger password (8+ characters, mix letters and numbers).";
  return message;
}

function read(form: FormData) {
  const email = emailSchema.safeParse(String(form.get("email") ?? "").trim().toLowerCase());
  return { email };
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  const { email } = read(form);
  if (!email.success) return { error: email.error.issues[0].message };
  const password = String(form.get("password") ?? "");
  if (!password) return { error: "Enter your password.", email: email.data };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) return { error: friendly(error.message), email: email.data };
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const { email } = read(form);
  if (!email.success) return { error: email.error.issues[0].message };
  const password = passwordSchema.safeParse(String(form.get("password") ?? ""));
  if (!password.success) return { error: password.error.issues[0].message, email: email.data };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: friendly(error.message), email: email.data };
  if (data.session) redirect("/onboarding");
  return { message: `Check ${email.data} for a confirmation link to finish signing up.`, email: email.data };
}

export async function sendMagicLink(_: AuthState, form: FormData): Promise<AuthState> {
  const { email } = read(form);
  if (!email.success) return { error: email.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(safeNext(form.get("next")))}` },
  });
  if (error) return { error: friendly(error.message), email: email.data };
  return { message: `We sent a sign-in link to ${email.data}. Open it on this device.`, email: email.data };
}

export async function sendPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const { email } = read(form);
  if (!email.success) return { error: email.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/auth/reset`,
  });
  if (error) return { error: friendly(error.message), email: email.data };
  return { message: `If an account exists for ${email.data}, a reset link is on its way.`, email: email.data };
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = passwordSchema.safeParse(String(form.get("password") ?? ""));
  if (!password.success) return { error: password.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: friendly(error.message) };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
