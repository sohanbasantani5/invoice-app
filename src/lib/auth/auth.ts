import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { getPool } from "@/lib/db/pool";
import bcrypt from "bcryptjs";

const pool = getPool();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    async verifyPassword({ password, user }: { password: string; user: { id: string; email: string } }) {
      const account = await pool.query(
        "select password_hash from auth.accounts where user_id = $1 and provider_id = 'email' limit 1",
        [user.id]
      );
      if (account.rows[0]?.password_hash) {
        return bcrypt.compare(password, account.rows[0].password_hash);
      }
      return false;
    },
    async onPasswordVerification({ password, user }: { password: string; user: { id: string; email: string } }) {
      const account = await pool.query(
        "select password_hash from auth.accounts where user_id = $1 and provider_id = 'email' limit 1",
        [user.id]
      );
      if (account.rows[0]?.password_hash) return;

      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email, password }),
      });
      if (!res.ok) return;

      const hash = await bcrypt.hash(password, 12);
      await pool.query(
        "update auth.accounts set password_hash = $1 where user_id = $2 and provider_id = 'email'",
        [hash, user.id]
      );
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    cookieCache: { enabled: true, maxAge: 60 },
  },
  advanced: {
    crossSubDomainCookies: { enabled: true },
    defaultCookieAttributes: { sameSite: "lax", secure: true },
  },
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;