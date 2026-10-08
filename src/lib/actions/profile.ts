"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession, getUser } from "@/lib/supabase/server";
import { profileSections, type ProfileSection } from "@/lib/validation/profile";
import { checkGstin } from "@/lib/validation/india";
import type { ProfileRow } from "@/types/database";
import { DEFAULT_BODY, DEFAULT_BODY_FALLBACK, DEFAULT_SUBJECT } from "@/lib/invoice/email";
import { validateSafeImage, SAFE_IMAGE_MAX_BYTES } from "@/lib/invoice/upload-security";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const sectionName = z.enum(["business", "address", "payments", "defaults", "branding", "email"]);

/** Save one section of the business profile. Used by onboarding steps and Settings tabs. */
export async function saveProfileSection(
  section: ProfileSection,
  input: unknown,
  opts: { completeOnboarding?: boolean } = {},
): Promise<ActionResult> {
  const { supabase, user, profile } = await getSession();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const name = sectionName.safeParse(section);
  if (!name.success) return { ok: false, error: "Unknown section." };
  const parsed = profileSections[name.data].safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }

  const values: Partial<ProfileRow> = { ...parsed.data };

  // GSTIN → fill state and PAN if they're empty (04 §6).
  if (name.data === "address" && values.gstin) {
    const g = checkGstin(values.gstin);
    if (g.ok) {
      values.state_code ??= g.stateCode;
      values.pan ??= g.pan;
    }
  }
  // Saving the default wording stores "nothing", so future improvements to the default reach you.
  if (name.data === "email") {
    const same = (a: string | null | undefined, b: string) => (a ?? "").replace(/\r\n?/g, "\n").trim() === b.trim();
    if (same(values.email_subject_template, DEFAULT_SUBJECT)) values.email_subject_template = null;
    if (same(values.email_body_template, DEFAULT_BODY)) values.email_body_template = null;
    if (same(values.email_body_fallback_template, DEFAULT_BODY_FALLBACK)) values.email_body_fallback_template = null;
  }
  if (opts.completeOnboarding) values.onboarding_completed = true;
  if (!profile && !values.email && user.email) values.email = user.email;

  const { error } = await supabase
    .from("profiles")
    .upsert({ ...values, user_id: user.id }, { onConflict: "user_id" });
  if (error) return { ok: false, error: "Couldn't save. " + error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export type BrandingUploadKind = "logo" | "signature";
export type BrandingUploadResult = { ok: true; path: string; url: string | null } | { ok: false; error: string };

/** Authoritative server-side PNG/JPEG upload; the browser never chooses the storage path. */
export async function uploadBrandingImage(kind: BrandingUploadKind, file: File, previousPath: string | null): Promise<BrandingUploadResult> {
  if (kind !== "logo" && kind !== "signature") return { ok: false, error: "Invalid image type." };
  if (!(file instanceof File) || file.size > SAFE_IMAGE_MAX_BYTES) return { ok: false, error: "Image must be 1 MB or smaller." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const checked = validateSafeImage(file, bytes);
  if (!checked.ok) return checked;
  const { supabase, user } = await getUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const ext = checked.type === "image/png" ? "png" : "jpg";
  const path = `${user.id}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("branding").upload(path, bytes, { upsert: true, contentType: checked.type });
  if (error) return { ok: false, error: "Upload failed." };
  const saved = await saveProfileSection("branding", { [`${kind}_path`]: path });
  if (!saved.ok) {
    await supabase.storage.from("branding").remove([path]);
    return saved;
  }
  if (previousPath) await supabase.storage.from("branding").remove([previousPath]);
  const signed = await supabase.storage.from("branding").createSignedUrl(path, 3600);
  return { ok: true, path, url: signed.data?.signedUrl ?? null };
}
