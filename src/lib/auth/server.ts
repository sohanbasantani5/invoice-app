import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "./auth";
import { getPool } from "@/lib/db/pool";
import { createDbClient, type DbClient } from "@/lib/db/client";
import type { ProfileRow } from "@/types/database";

export type SessionResult = {
  session: typeof auth.$Infer.Session.session | null;
  user: typeof auth.$Infer.Session.user | null;
  profile: ProfileRow | null;
  profileError: string | null;
  db: DbClient;
  supabase: DbClient;
};

export const getSession = cache(async (): Promise<SessionResult> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    const db = createDbClient();
    return { session: null, user: null, profile: null, profileError: null, db, supabase: db };
  }
  const user = session.user;
  const db = createDbClient(user.id);
  const { profile, profileError } = await getProfileForUser(user.id);
  return { session: session.session, user, profile, profileError, db, supabase: db };
});

export const getUser = cache(async () => {
  const { user, db, supabase } = await getSession();
  return { user, db, supabase };
});

export async function getProfileForUser(
  userId: string
): Promise<{ profile: ProfileRow | null; profileError: string | null }> {
  try {
    const pool = getPool();
    const res = await pool.query("SELECT * FROM profiles WHERE user_id = $1", [userId]);
    return { profile: res.rows[0] ?? null, profileError: null };
  } catch (err: any) {
    return { profile: null, profileError: err?.message ?? "Failed to fetch profile" };
  }
}

export const getProfile = cache(async () => {
  const { user } = await getUser();
  if (!user) return { profile: null, profileError: null };
  return getProfileForUser(user.id);
});

export async function requireAuth() {
  const { user } = await getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
