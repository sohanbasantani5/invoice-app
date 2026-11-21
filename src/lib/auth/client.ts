"use client";

import { createAuthClient } from "better-auth/react";

function getClientBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const raw = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "";
  const cleaned = raw.split("#")[0].trim().replace(/^["']|["']$/g, "").trim();
  if (cleaned) {
    try {
      new URL(cleaned);
      return cleaned;
    } catch {
      // ignore
    }
  }
  return "https://invoice-app-sohan.vercel.app";
}

export const authClient = createAuthClient({
  baseURL: getClientBaseUrl(),
});

export const { signIn, signUp, signOut, useSession } = authClient;
