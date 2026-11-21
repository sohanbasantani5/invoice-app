import { betterAuth } from "better-auth";
import { getPool } from "@/lib/db/pool";
import bcrypt from "bcryptjs";

const pool = getPool();

function getBaseUrl(): string {
  const raw = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  const cleaned = raw.split("#")[0].trim().replace(/^["']|["']$/g, "").trim();
  if (cleaned) {
    try {
      new URL(cleaned);
      return cleaned;
    } catch {
      // invalid URL fallback
    }
  }
  return "https://invoice-app-sohan.vercel.app";
}

function getSecret(): string {
  const raw = process.env.BETTER_AUTH_SECRET || "";
  const cleaned = raw.split("#")[0].trim().replace(/^["']|["']$/g, "").trim();
  return cleaned || "sohan_invoice_master_secure_key_2026_xYz98";
}

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/^["']|["']$/g, "");
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim().replace(/^["']|["']$/g, "");

export const auth = betterAuth({
  database: pool,
  secret: getSecret(),
  baseURL: getBaseUrl(),
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

      if (!supabaseUrl || !supabaseAnonKey) return;

      try {
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
      } catch (err) {
        console.error("Supabase password bridge error:", err);
      }
    },
  },
  socialProviders: {
    google: {
      clientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
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
