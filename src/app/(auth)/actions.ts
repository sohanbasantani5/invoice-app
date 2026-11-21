"use server";

import { auth } from "@/lib/auth/auth";
import { getPool } from "@/lib/db/pool";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

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

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "");
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "");

/**
 * First-login bridge for legacy Supabase users. If the Better Auth user exists
 * but has no `credential` account yet (migrated from Supabase), verify the
 * password against Supabase and store a bcrypt hash in Better Auth's account
 * table so subsequent logins are local. Returns { ensured: true } once a
 * credential account is present, or { error } if credentials are invalid.
 *
 * Security: a credential account is ONLY created when Supabase successfully
 * verifies the password. If verification fails (wrong password, an OAuth-only
 * user who has no Supabase password, or a network error), the login fails
 * closed — we never mint a password account with a password we did not verify.
 */
export async function prepareCredentialLogin(email: string, password: string): Promise<{ ensured: boolean; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) return { ensured: false, error: "Enter your email and password." };
  const pool = getPool();

  const userRes = await pool.query(`select id from public."user" where lower("email") = lower($1) limit 1`, [cleanEmail]);
  const user = userRes.rows[0];
  if (!user) return { ensured: false }; // not a migrated user; let Better Auth handle it

  const accRes = await pool.query(
    `select id from public."account" where "userId" = $1 and "providerId" = 'credential' limit 1`,
    [user.id]
  );
  if (accRes.rows[0]) return { ensured: true };
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return { ensured: false };

  let verified = false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    verified = res.ok;
  } catch (err) {
    console.error("Supabase password bridge error:", err);
    // Network/transient failure: cannot verify — fail closed, do not mint an account.
    return { ensured: false };
  }
  if (!verified) return { ensured: false }; // wrong password or OAuth-only user: no account created

  const hash = await bcrypt.hash(password, 12);
  await pool.query(
    `insert into public."account" ("id", "userId", "accountId", "providerId", "password", "createdAt", "updatedAt")
       values ($1, $2, $3, 'credential', $4, now(), now())
       on conflict ("providerId", "userId") do update set "password" = excluded."password", "updatedAt" = now()`,
    [randomUUID(), user.id, cleanEmail, hash]
  );
  return { ensured: true };
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
