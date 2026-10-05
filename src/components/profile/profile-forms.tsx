"use client";

import { useTransition } from "react";
import { useForm, type FieldValues, type Path, type Resolver, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { saveProfileSection } from "@/lib/actions/profile";
import {
  addressTaxSchema,
  businessSchema,
  defaultsSchema,
  emailTemplateSchema,
  paymentsSchema,
  type ProfileSection,
} from "@/lib/validation/profile";
import { gstinWarning, ifscWarning, panWarning, pincodeWarning, upiWarning } from "@/lib/validation/india";
import { DEFAULT_STATE_CODE, STATES } from "@/lib/india/states";
import { financialYear, formatInvoiceNumber } from "@/lib/invoice/numbering";
import { todayISO } from "@/lib/format";
import { DEFAULT_BODY, DEFAULT_BODY_FALLBACK, DEFAULT_SUBJECT, isLegacyTemplate, PLACEHOLDERS } from "@/lib/invoice/email";
import type { ProfileRow, TemplateAccent } from "@/types/database";
import { ACCENTS } from "@/lib/invoice/template-tokens";
import { cn } from "@/lib/utils";

export type FormActions = {
  submitLabel?: string;
  /** Finishes onboarding when this section is saved. */
  completeOnboarding?: boolean;
  onSaved?: () => void;
  extra?: React.ReactNode;
};

function useSectionForm<S extends z.ZodType<FieldValues, FieldValues>>(
  section: ProfileSection,
  schema: S,
  defaults: z.input<S>,
  actions: FormActions,
) {
  const [pending, start] = useTransition();
  const form = useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as unknown as Resolver<z.input<S>, unknown, z.output<S>>,
    defaultValues: defaults as never,
    mode: "onTouched",
  });
  const onSubmit = form.handleSubmit((values) =>
    start(async () => {
      const res = await saveProfileSection(section, values, { completeOnboarding: actions.completeOnboarding });
      if (!res.ok) {
        for (const [k, msg] of Object.entries(res.fieldErrors ?? {}))
          form.setError(k as Path<z.input<S>>, { message: msg });
        toast.error(res.error);
        return;
      }
      if (!actions.onSaved) toast.success("Saved");
      form.reset(values as never, { keepValues: true });
      actions.onSaved?.();
    }),
  );
  return { form, onSubmit, pending };
}

function err<T extends FieldValues>(form: UseFormReturn<T, unknown, unknown>, name: string) {
  const e = (form.formState.errors as Record<string, { message?: string } | undefined>)[name];
  return e?.message ?? null;
}

/** Soft warning shown only once the user has left the field (04 §6 — on blur, never while typing). */
function warn<T extends FieldValues>(
  form: UseFormReturn<T, unknown, unknown>,
  name: string,
  check: (v: string | null | undefined) => string | null,
) {
  const touched = (form.formState.touchedFields as Record<string, boolean | undefined>)[name];
  if (!touched) return null;
  return check(form.getValues(name as Path<T>) as string | null | undefined);
}

function Actions({ pending, actions, dirty }: { pending: boolean; actions: FormActions; dirty: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
      {actions.extra}
      <Button type="submit" disabled={pending || (!actions.completeOnboarding && !actions.onSaved && !dirty)}>
        {pending ? "Saving…" : (actions.submitLabel ?? "Save changes")}
      </Button>
    </div>
  );
}

const grid = "grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2";

// ─── Business ────────────────────────────────────────────────────────────────
export function BusinessForm({ profile, ...actions }: { profile: Partial<ProfileRow> | null } & FormActions) {
  const { form, onSubmit, pending } = useSectionForm("business", businessSchema, {
    business_name: profile?.business_name ?? "",
    legal_name: profile?.legal_name ?? "",
    email: profile?.email ?? "",
    phone: profile?.phone ?? "",
  }, actions);
  const r = form.register;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className={grid}>
        <Field label="Business / trade name" htmlFor="business_name" badge="required" helper="Shown at the top of every invoice." error={err(form, "business_name")} className="sm:col-span-2">
          <Input id="business_name" placeholder="Sample Business" autoComplete="organization" {...r("business_name")} />
        </Field>
        <Field label="Legal name" htmlFor="legal_name" badge="optional" helper="If different from the business name." error={err(form, "legal_name")} className="sm:col-span-2">
          <Input id="legal_name" placeholder="Sample Owner" autoComplete="name" {...r("legal_name")} />
        </Field>
        <Field label="Email" htmlFor="email" badge="optional" error={err(form, "email")}>
          <Input id="email" type="email" placeholder="you@email.com" autoComplete="email" {...r("email")} />
        </Field>
        <Field label="Phone" htmlFor="phone" badge="optional" error={err(form, "phone")}>
          <Input id="phone" type="tel" placeholder="+91 98765 43210" autoComplete="tel" {...r("phone")} />
        </Field>
      </div>
      <Actions pending={pending} actions={actions} dirty={form.formState.isDirty} />
    </form>
  );
}

// ─── Address & tax ───────────────────────────────────────────────────────────
export function AddressTaxForm({ profile, ...actions }: { profile: Partial<ProfileRow> | null } & FormActions) {
  const { form, onSubmit, pending } = useSectionForm("address", addressTaxSchema, {
    address_line1: profile?.address_line1 ?? "",
    address_line2: profile?.address_line2 ?? "",
    city: profile?.city ?? "",
    state_code: profile?.state_code ?? DEFAULT_STATE_CODE,
    pincode: profile?.pincode ?? "",
    gst_status: profile?.gst_status ?? "unregistered",
    gstin: profile?.gstin ?? "",
    pan: profile?.pan ?? "",
  }, actions);
  const r = form.register;
  const status = form.watch("gst_status");
  const options = [
    { value: "unregistered", label: "Not registered", hint: "Invoices say INVOICE, no GST" },
    { value: "regular", label: "Regular", hint: "TAX INVOICE with CGST/SGST or IGST" },
    { value: "composition", label: "Composition", hint: "BILL OF SUPPLY, no tax charged" },
  ] as const;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className={grid}>
        <Field label="Address line 1" htmlFor="address_line1" badge="required" error={err(form, "address_line1")} className="sm:col-span-2">
          <Input id="address_line1" placeholder="Flat 4, Sample Apartments" autoComplete="address-line1" {...r("address_line1")} />
        </Field>
        <Field label="Address line 2" htmlFor="address_line2" badge="optional" error={err(form, "address_line2")} className="sm:col-span-2">
          <Input id="address_line2" placeholder="Station Road" autoComplete="address-line2" {...r("address_line2")} />
        </Field>
        <Field label="City" htmlFor="city" badge="required" error={err(form, "city")}>
          <Input id="city" placeholder="Mumbai" autoComplete="address-level2" {...r("city")} />
        </Field>
        <Field label="PIN code" htmlFor="pincode" badge="optional" warning={warn(form, "pincode", pincodeWarning)} error={err(form, "pincode")}>
          <Input id="pincode" inputMode="numeric" placeholder="421503" autoComplete="postal-code" {...r("pincode")} />
        </Field>
        <Field label="State" htmlFor="state_code" badge="required" helper="Sets your GST state code." error={err(form, "state_code")} className="sm:col-span-2">
          <Select id="state_code" {...r("state_code")}>
            <option value="">Select state</option>
            {STATES.filter((s) => s.code !== "96").map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 flex w-full items-baseline justify-between text-label text-ink-2">
          GST status <span className="text-[11px] font-normal text-ink-3">Required</span>
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {options.map((o) => (
            <label
              key={o.value}
              className={cn(
                "flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 transition-colors",
                status === o.value ? "border-accent bg-accent-soft" : "border-border bg-surface hover:bg-surface-2",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <input type="radio" value={o.value} className="accent-[var(--accent)]" {...r("gst_status")} />
                {o.label}
              </span>
              <span className="text-caption">{o.hint}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={grid}>
        {status !== "unregistered" && (
          <Field
            label="GSTIN"
            htmlFor="gstin"
            badge="gst"
            badgeHighlight={!form.watch("gstin")}
            helper="Your state and PAN are filled in from it."
            warning={warn(form, "gstin", gstinWarning)}
            error={err(form, "gstin")}
          >
            <Input id="gstin" className="font-mono uppercase" placeholder="27ABCDE1234F1Z0" maxLength={15} {...r("gstin")} />
          </Field>
        )}
        <Field label="PAN" htmlFor="pan" badge="optional" helper="Clients often need it to deduct TDS." warning={warn(form, "pan", panWarning)} error={err(form, "pan")}>
          <Input id="pan" className="font-mono uppercase" placeholder="ABCDE1234F" maxLength={10} {...r("pan")} />
        </Field>
      </div>
      <Actions pending={pending} actions={actions} dirty={form.formState.isDirty} />
    </form>
  );
}

// ─── Payments ────────────────────────────────────────────────────────────────
export function PaymentsForm({ profile, ...actions }: { profile: Partial<ProfileRow> | null } & FormActions) {
  const { form, onSubmit, pending } = useSectionForm("payments", paymentsSchema, {
    bank_name: profile?.bank_name ?? "",
    bank_account_name: profile?.bank_account_name ?? "",
    bank_account_number: profile?.bank_account_number ?? "",
    bank_ifsc: profile?.bank_ifsc ?? "",
    upi_id: profile?.upi_id ?? "",
  }, actions);
  const r = form.register;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className={grid}>
        <Field label="UPI ID" htmlFor="upi_id" badge="optional" helper="Adds a scan-to-pay QR to your invoices." warning={warn(form, "upi_id", upiWarning)} error={err(form, "upi_id")} className="sm:col-span-2">
          <Input id="upi_id" placeholder="name@okhdfcbank" autoCapitalize="none" {...r("upi_id")} />
        </Field>
        <Field label="Bank name" htmlFor="bank_name" badge="optional" error={err(form, "bank_name")}>
          <Input id="bank_name" placeholder="HDFC Bank" {...r("bank_name")} />
        </Field>
        <Field label="Account holder name" htmlFor="bank_account_name" badge="optional" error={err(form, "bank_account_name")}>
          <Input id="bank_account_name" placeholder="Sample Owner" {...r("bank_account_name")} />
        </Field>
        <Field label="Account number" htmlFor="bank_account_number" badge="optional" error={err(form, "bank_account_number")}>
          <Input id="bank_account_number" className="font-mono" inputMode="numeric" placeholder="50100XXXXXXXX" {...r("bank_account_number")} />
        </Field>
        <Field label="IFSC" htmlFor="bank_ifsc" badge="optional" warning={warn(form, "bank_ifsc", ifscWarning)} error={err(form, "bank_ifsc")}>
          <Input id="bank_ifsc" className="font-mono uppercase" placeholder="HDFC0001234" maxLength={11} {...r("bank_ifsc")} />
        </Field>
      </div>
      <Actions pending={pending} actions={actions} dirty={form.formState.isDirty} />
    </form>
  );
}

// ─── Invoice defaults ────────────────────────────────────────────────────────
export function DefaultsForm({
  profile,
  showTemplate = true,
  ...actions
}: { profile: Partial<ProfileRow> | null; showTemplate?: boolean } & FormActions) {
  const { form, onSubmit, pending } = useSectionForm("defaults", defaultsSchema, {
    invoice_prefix: profile?.invoice_prefix ?? "INV",
    default_due_days: profile?.default_due_days ?? 7,
    default_notes: profile?.default_notes ?? "Thank you for your business.",
    default_terms: profile?.default_terms ?? "",
    round_off_default: profile?.round_off_default ?? true,
    template_accent: profile?.template_accent ?? "pine",
    show_logo: profile?.show_logo ?? true,
  }, actions);
  const r = form.register;
  const prefix = String(form.watch("invoice_prefix") || "INV").toUpperCase();
  const accent = form.watch("template_accent");
  const accents = (Object.keys(ACCENTS) as TemplateAccent[]).map((value) => ({ value, ...ACCENTS[value] }));
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <div className={grid}>
        <Field
          label="Invoice prefix"
          htmlFor="invoice_prefix"
          badge="optional"
          helper={<>Numbers look like <span className="font-mono">{formatInvoiceNumber(prefix, financialYear(todayISO()), 1)}</span></>}
          error={err(form, "invoice_prefix")}
        >
          <Input id="invoice_prefix" className="font-mono uppercase" placeholder="SB" maxLength={8} {...r("invoice_prefix")} />
        </Field>
        <Field label="Default due days" htmlFor="default_due_days" badge="optional" error={err(form, "default_due_days")}>
          <Input id="default_due_days" type="number" min={0} max={365} inputMode="numeric" placeholder="7" {...r("default_due_days")} />
        </Field>
        <Field label="Default notes" htmlFor="default_notes" badge="optional" error={err(form, "default_notes")} className="sm:col-span-2">
          <Textarea id="default_notes" rows={2} placeholder="Thank you for your business." {...r("default_notes")} />
        </Field>
        <Field label="Default terms" htmlFor="default_terms" badge="optional" error={err(form, "default_terms")} className="sm:col-span-2">
          <Textarea id="default_terms" rows={2} placeholder="Payment due within 7 days." {...r("default_terms")} />
        </Field>
      </div>
      <Switch label="Round off totals" description="Rounds the total to the nearest rupee." {...r("round_off_default")} />
      {showTemplate && (
        <>
          <Switch label="Show logo on invoices" {...r("show_logo")} />
          <fieldset>
            <legend className="mb-2 text-label text-ink-2">Invoice accent colour</legend>
            <div className="flex flex-wrap gap-2">
              {accents.map((a) => (
                <label
                  key={a.value}
                  className={cn(
                    "flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm",
                    accent === a.value ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2",
                  )}
                >
                  <input type="radio" value={a.value} className="sr-only" {...r("template_accent")} />
                  <span className="size-3.5 rounded-full" style={{ background: a.hex }} aria-hidden />
                  {a.label}
                </label>
              ))}
            </div>
          </fieldset>
        </>
      )}
      <Actions pending={pending} actions={actions} dirty={form.formState.isDirty} />
    </form>
  );
}

// ─── Email template ──────────────────────────────────────────────────────────
export function EmailTemplateForm({ profile, ...actions }: { profile: Partial<ProfileRow> | null } & FormActions) {
  // A template saved with the earlier default wording shows (and sends) the new default.
  const shown = (stored: string | null | undefined, def: string) => (stored && stored.trim() && !isLegacyTemplate(stored) ? stored : def);
  const { form, onSubmit, pending } = useSectionForm("email", emailTemplateSchema, {
    email_subject_template: shown(profile?.email_subject_template, DEFAULT_SUBJECT),
    email_body_template: shown(profile?.email_body_template, DEFAULT_BODY),
    email_body_fallback_template: shown(profile?.email_body_fallback_template, DEFAULT_BODY_FALLBACK),
  }, actions);
  const r = form.register;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <Field label="Subject" htmlFor="email_subject_template" error={err(form, "email_subject_template")}>
        <Input id="email_subject_template" {...r("email_subject_template")} />
      </Field>
      <Field
        label="Message with the PDF attached"
        htmlFor="email_body_template"
        helper="Used when Gmail is connected. The PDF is attached, so there is no link."
        error={err(form, "email_body_template")}
      >
        <Textarea id="email_body_template" rows={10} className="font-mono text-[0.8125rem]" {...r("email_body_template")} />
      </Field>
      <Field
        label="Message when Gmail is not connected"
        htmlFor="email_body_fallback_template"
        helper="You attach the PDF yourself, so this one carries a secure link to it."
        error={err(form, "email_body_fallback_template")}
      >
        <Textarea id="email_body_fallback_template" rows={11} className="font-mono text-[0.8125rem]" {...r("email_body_fallback_template")} />
      </Field>
      <p className="text-caption">A line is left out when the detail it needs is missing, so nothing shows up blank.</p>
      <div>
        <p className="text-caption">Placeholders you can use</p>
        <dl className="mt-2 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {PLACEHOLDERS.map((p) => (
            <div key={p.key} className="flex gap-2">
              <dt className="shrink-0 font-mono text-xs text-ink">{`{${p.key}}`}</dt>
              <dd className="text-ink-3">{p.help}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Actions pending={pending} actions={actions} dirty={form.formState.isDirty} />
        <button
          type="button"
          className="text-sm text-ink-3 hover:text-ink hover:underline"
          onClick={() => {
            form.setValue("email_subject_template", DEFAULT_SUBJECT, { shouldDirty: true });
            form.setValue("email_body_template", DEFAULT_BODY, { shouldDirty: true });
            form.setValue("email_body_fallback_template", DEFAULT_BODY_FALLBACK, { shouldDirty: true });
          }}
        >
          Reset to default
        </button>
      </div>
    </form>
  );
}
