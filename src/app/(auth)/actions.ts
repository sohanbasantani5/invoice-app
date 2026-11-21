"use server";

import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

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

function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid") || m.includes("wrong") || m.includes("credentials")) {
    return "That email and password don't match. Try again or use a magic link.";
  }
  if (m.includes("not confirmed") || m.includes("verify")) {
    return "Please confirm your email first — check your inbox for the link.";
  }
  if (m.includes("already") || m.includes("exists")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (m.includes("weak") || m.includes("strong")) {
    return "Please choose a stronger password (8+ characters, mix letters and numbers).";
  }
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
  try {
    await auth.api.signInEmail({ body: { email: email.data, password }, asResponse: true, headers: await headers() });
  } catch (err: unknown) {
    return { error: friendly(err instanceof Error ? err.message : "Sign in failed"), email: email.data };
  }
  redirect(safeNext(form.get("next")));
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  const { email } = read(form);
  if (!email.success) return { error: email.error.issues[0].message };
  const password = passwordSchema.safeParse(String(form.get("password") ?? ""));
  if (!password.success) return { error: password.error.issues[0].message, email: email.data };
  try {
    await auth.api.signUpEmail({ body: { email: email.data, password: password.data, name: email.data.split("@")[0], callbackURL: `${await siteUrl()}/onboarding` }, asResponse: true, headers: await headers() });
  } catch (err: unknown) {
    return { error: friendly(err instanceof Error ? err.message : "Sign up failed"), email: email.data };
  }
  redirect("/onboarding");
}

export async function sendMagicLink(_: AuthState, form: FormData): Promise<AuthState> {
  const { email } = read(form);
  if (!email.success) return { error: email.error.issues[0].message };
  try {
    await auth.api.signInMagicLink({ body: { email: email.data, callbackURL: `${await siteUrl()}/dashboard` }, asResponse: true, headers: await headers() });
    return { message: `If an account exists for ${email.data}, a sign-in link is on its way.`, email: email.data };
  } catch (err: unknown) {
    return { error: friendly(err instanceof Error ? err.message : "Failed to send magic link"), email: email.data };
  }
}

export async function sendPasswordReset(_: AuthState, form: FormData): Promise<AuthState> {
  const { email } = read(form);
  if (!email.success) return { error: email.error.issues[0].message };
  try {
    await auth.api.requestPasswordReset({ body: { email: email.data, redirectTo: `${await siteUrl()}/auth/reset` }, asResponse: true, headers: await headers() });
    return { message: `If an account exists for ${email.data}, a reset link is on its way.`, email: email.data };
  } catch (err: unknown) {
    return { error: friendly(err instanceof Error ? err.message : "Failed to send reset link"), email: email.data };
  }
}

export async function updatePassword(_: AuthState, form: FormData): Promise<AuthState> {
  const password = passwordSchema.safeParse(String(form.get("password") ?? ""));
  if (!password.success) return { error: password.error.issues[0].message };
  try {
    await auth.api.changePassword({ body: { newPassword: password.data, currentPassword: String(form.get("currentPassword") ?? "") }, asResponse: true, headers: await headers() });
  } catch (err: unknown) {
    return { error: friendly(err instanceof Error ? err.message : "Failed to update password") };
  }
  redirect("/dashboard");
}

export async function signOut() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // ignore
  }
  redirect("/login");
}
