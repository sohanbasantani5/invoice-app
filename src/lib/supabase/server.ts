import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "@/types/database";
import { timed } from "@/lib/perf";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/**
 * Signed-in user, read from the session cookie. The token's signature is checked locally against
 * the project's cached public keys (getClaims) — no network round trip, unlike getUser().
 * Row Level Security still checks the same token on every query.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await timed("auth.getClaims", () => supabase.auth.getClaims());
  const c = data?.claims;
  const user = c?.sub ? { id: c.sub, email: (c.email as string | undefined) ?? null } : null;
  return { supabase, user };
});

/** The signed-in user's profile row. Start it together with a page's own queries (Promise.all). */
export const getProfile = cache(async () => {
  const { supabase, user } = await getUser();
  if (!user) return { profile: null, profileError: null };
  const { data: profile, error } = await timed("query.profile", async () =>
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
  );
  return { profile, profileError: error ? `${error.code}: ${error.message}` : null };
});

/** User + profile, deduped per request. Pages that don't need the profile should use getUser(). */
export const getSession = cache(async () => {
  const { supabase, user } = await getUser();
  if (!user) return { supabase, user: null, profile: null, profileError: null };
  const { profile, profileError } = await getProfile();
  return { supabase, user, profile, profileError };
});
