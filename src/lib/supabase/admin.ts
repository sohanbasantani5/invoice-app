import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { SUPABASE_URL } from "./env";

/** Server-only client for the narrowly-scoped encrypted Gmail-token operations. */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  return createClient<Database>(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
