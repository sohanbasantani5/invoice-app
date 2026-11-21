import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { getPool } from "@/lib/db/pool";
import { sendMail } from "./mail";
import bcrypt from "bcryptjs";

const pool = getPool();

function getBaseUrl(): string {
  const raw = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  const cleaned = raw.split("#")[0].trim().replace(/^[\"']|[\"']$/g, "").trim();
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
  const cleaned = raw.split("#")[0].trim().replace(/^[\"']|[\"']$/g, "").trim();
  return cleaned || "sohan_invoice_master_secure_key_2026_xYz98";
}

const baseUrl = getBaseUrl();

export const auth = betterAuth({
  database: pool,
  secret: getSecret(),
  baseURL: baseUrl,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    password: {
      hash: (password: string) => bcrypt.hash(password, 12),
      verify: async ({ hash, password }: { hash: string; password: string }) => bcrypt.compare(password, hash),
    },
    async sendResetPassword({ user, url }) {
      await sendMail({
        to: user.email,
        subject: "Reset your Invoices password",
        text: `Hi ${user.name},\n\nSomeone requested a password reset for your Invoices account. If that was you, click the link below to set a new password:\n\n${url}\n\nIf you didn't request this, you can ignore this email.\n\n— The Invoices team`,
        html: `<div style="font-family:Arial,sans-serif;color:#26332E"><p>Hi ${user.name},</p><p>Someone requested a password reset for your <strong>Invoices</strong> account. If that was you, click the button below to set a new password:</p><p style="text-align:center"><a href="${url}" style="display:inline-block;background:#1D5B47;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px">Reset password</a></p><p>If you didn't request this, you can safely ignore this email.</p><p>— The Invoices team</p></div>`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: (process.env.GOOGLE_CLIENT_ID || "").trim(),
      clientSecret: (process.env.GOOGLE_CLIENT_SECRET || "").trim(),
    },
  },
  plugins: [
    magicLink({
      async sendMagicLink({ email, url }) {
        await sendMail({
          to: email,
          subject: "Your Invoices sign-in link",
          text: `Hi there,\n\nHere is your secure sign-in link for Invoices:\n\n${url}\n\nThis link expires in a few minutes.\n\n— The Invoices team`,
          html: `<div style="font-family:Arial,sans-serif;color:#26332E"><p>Hi there,</p><p>Here is your secure sign-in link for <strong>Invoices</strong>:</p><p style="text-align:center"><a href="${url}" style="display:inline-block;background:#1D5B47;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px">Sign in</a></p><p>This link expires in a few minutes.</p><p>— The Invoices team</p></div>`,
        });
      },
    }),
  ],
  trustedOrigins: [baseUrl, "http://localhost:3000"],
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
