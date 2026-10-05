"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getUser } from "@/lib/supabase/server";
import { decryptToken } from "@/lib/gmail/crypto";
import { createDraft, GmailError, refreshAccessToken, revokeToken } from "@/lib/gmail/google";
import { gmailDraftUrls } from "@/lib/invoice/email";
import { buildMime, toBase64Url } from "@/lib/gmail/mime";

export type DraftResult =
  | { ok: true; draftUrl: string; draftsUrl: string }
  | { ok: false; error: string; reconnect?: boolean };

const draftSchema = z.object({
  invoiceId: z.uuid(),
  to: z.union([z.literal(""), z.email().max(320)]),
  subject: z.string().min(1).max(300),
  body: z.string().max(10_000),
  fileName: z.string().min(1).max(150),
});

/**
 * Gmail draft with the invoice PDF attached. The browser has already put the PDF in the private
 * bucket; it is read from there as the signed-in user (RLS), so no big upload goes through here.
 */
export async function createGmailDraft(input: z.input<typeof draftSchema>): Promise<DraftResult> {
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid email details." };
  const v = parsed.data;
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: conn } = await supabase.from("gmail_connections").select("email, refresh_token_enc").maybeSingle();
  if (!conn) return { ok: false, error: "Gmail isn't connected.", reconnect: true };

  try {
    const { data: file, error } = await supabase.storage.from("invoice-pdfs").download(`${user.id}/${v.invoiceId}.pdf`);
    if (error || !file) return { ok: false, error: "Couldn't read the PDF." };
    const pdf = Buffer.from(await file.arrayBuffer());

    const access = await refreshAccessToken(decryptToken(conn.refresh_token_enc));
    const raw = toBase64Url(buildMime({ to: v.to, subject: v.subject, body: v.body, fileName: v.fileName, pdf }));
    const { messageId } = await createDraft(access, raw);
    const urls = gmailDraftUrls(conn.email, messageId);
    return { ok: true, draftUrl: urls.draft, draftsUrl: urls.drafts };
  } catch (e) {
    console.error("gmail draft failed", e instanceof Error ? e.message : e);
    if (e instanceof GmailError && e.reconnect) return { ok: false, error: "Gmail needs to be connected again.", reconnect: true };
    return { ok: false, error: "Gmail didn't accept the draft." };
  }
}

/** Forget the stored token and tell Google to revoke it. */
export async function disconnectGmail(): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const { data: conn } = await supabase.from("gmail_connections").select("refresh_token_enc").maybeSingle();
  if (conn) {
    try {
      await revokeToken(decryptToken(conn.refresh_token_enc));
    } catch {
      // token unreadable or already revoked: still remove our copy
    }
  }
  const { error } = await supabase.from("gmail_connections").delete().eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true };
}
