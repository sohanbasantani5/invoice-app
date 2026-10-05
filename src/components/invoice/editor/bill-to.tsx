"use client";

import { useMemo, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { X } from "lucide-react";
import { Combobox, type ComboOption } from "@/components/ui/combobox";
import { Field, Input, Select } from "@/components/ui/field";
import { Section } from "./section";
import type { InvoiceFormValues } from "@/lib/validation/invoice";
import type { ClientRow } from "@/types/database";
import { buyerFormFromClient } from "@/lib/invoice/document";
import { gstinWarning, panWarning, pincodeWarning, checkGstin } from "@/lib/validation/india";
import { EXPORT_STATE_CODE, STATES } from "@/lib/india/states";

const CLIENT_TYPES = [
  { value: "individual", label: "Individual" },
  { value: "business_registered", label: "GST-registered business" },
  { value: "business_unregistered", label: "Unregistered business" },
  { value: "overseas", label: "Overseas" },
] as const;

export function BillTo({
  clients,
  taxInvoice,
  onClientState,
}: {
  clients: ClientRow[];
  taxInvoice: boolean;
  /** Called when the client's state changes so place of supply can follow. */
  onClientState: (code: string) => void;
}) {
  const { register, setValue, control, getValues } = useFormContext<InvoiceFormValues>();
  const [buyer, clientId, saveClient] = useWatch({ control, name: ["buyer", "client_id", "save_client"] });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const options = useMemo<ComboOption<ClientRow>[]>(
    () => clients.map((c) => ({ id: c.id, label: c.name, hint: c.city ?? undefined, value: c })),
    [clients],
  );

  function pick(c: ClientRow | null, name = "") {
    const b = c ? buyerFormFromClient(c) : { ...buyerFormFromClient(null), name };
    setValue("buyer", b, { shouldDirty: true });
    setValue("client_id", c?.id ?? null, { shouldDirty: true });
    onClientState(b.client_type === "overseas" ? EXPORT_STATE_CODE : (b.state_code ?? ""));
  }

  function onGstinBlur() {
    blur("gstin")();
    const g = checkGstin(getValues("buyer.gstin") ?? "");
    if (!g.ok) return;
    if (!getValues("buyer.state_code")) {
      setValue("buyer.state_code", g.stateCode, { shouldDirty: true });
      onClientState(g.stateCode);
    }
    if (!getValues("buyer.pan")) setValue("buyer.pan", g.pan, { shouldDirty: true });
    if (getValues("buyer.client_type") === "individual")
      setValue("buyer.client_type", "business_registered", { shouldDirty: true });
  }

  const type = buyer?.client_type ?? "individual";
  const gstNeeded = taxInvoice && type === "business_registered";
  const overseas = type === "overseas";
  const r = register;

  return (
    <Section id="bill-to" title="Bill to" summary={buyer?.name || "No client yet"}>
      <div className="flex flex-col gap-5">
        <Field label="Client / company name" htmlFor="buyer-name" badge="required">
          <div className="flex gap-2">
            <Combobox
              id="buyer-name"
              className="flex-1"
              value={buyer?.name ?? ""}
              onChange={(v) => setValue("buyer.name", v, { shouldDirty: true })}
              options={options}
              onSelect={(o) => pick(o.value)}
              onCreate={(text) => pick(null, text)}
              createLabel="New client"
              placeholder="Sample Client"
            />
            {clientId && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-border text-ink-3 hover:bg-surface-2 hover:text-ink"
                aria-label="Clear client"
              >
                <X className="size-4 stroke-[1.5]" aria-hidden />
              </button>
            )}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field label="Client type" htmlFor="buyer-type" badge="optional" helper="Decides which details the checklist asks for.">
            <Select
              id="buyer-type"
              {...r("buyer.client_type", {
                onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
                  if (e.target.value === "overseas") onClientState(EXPORT_STATE_CODE);
                },
              })}
            >
              {CLIENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Contact person" htmlFor="buyer-contact" badge="optional">
            <Input id="buyer-contact" placeholder="Alex" {...r("buyer.contact_person")} />
          </Field>
          <Field
            label="GSTIN"
            htmlFor="buyer-gstin"
            badge={gstNeeded ? "gst" : "optional"}
            badgeHighlight={gstNeeded && !buyer?.gstin}
            helper="Needed if your client is GST-registered, so they can claim credit."
            warning={touched.gstin ? gstinWarning(buyer?.gstin) : null}
          >
            <Input
              id="buyer-gstin"
              className="font-mono uppercase"
              maxLength={15}
              placeholder="27ABCDE1234F1Z0"
              {...r("buyer.gstin", { onBlur: onGstinBlur })}
            />
          </Field>
          <Field label="PAN" htmlFor="buyer-pan" badge="optional" warning={touched.pan ? panWarning(buyer?.pan) : null}>
            <Input id="buyer-pan" className="font-mono uppercase" maxLength={10} placeholder="ABCDE1234F" {...r("buyer.pan", { onBlur: blur("pan") })} />
          </Field>
          <Field label="Address" htmlFor="buyer-address" badge="optional" className="sm:col-span-2">
            <Input id="buyer-address" placeholder="Office 12, Andheri East" {...r("buyer.address_line1")} />
          </Field>
          <Field label="Address line 2" htmlFor="buyer-address2" badge="optional" className="sm:col-span-2">
            <Input id="buyer-address2" placeholder="Near metro station" {...r("buyer.address_line2")} />
          </Field>
          <Field label="City" htmlFor="buyer-city" badge="optional">
            <Input id="buyer-city" placeholder="Mumbai" {...r("buyer.city")} />
          </Field>
          <Field label="PIN code" htmlFor="buyer-pincode" badge="optional" warning={touched.pin && !overseas ? pincodeWarning(buyer?.pincode) : null}>
            <Input id="buyer-pincode" inputMode="numeric" placeholder="400069" {...r("buyer.pincode", { onBlur: blur("pin") })} />
          </Field>
          {overseas ? (
            <Field label="Country" htmlFor="buyer-country" badge="optional">
              <Input id="buyer-country" placeholder="United States" {...r("buyer.country")} />
            </Field>
          ) : (
            <Field label="State" htmlFor="buyer-state_code" badge="optional" helper="Sets the place of supply.">
              <Select
                id="buyer-state_code"
                {...r("buyer.state_code", {
                  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onClientState(e.target.value),
                })}
              >
                <option value="">Select state</option>
                {STATES.filter((s) => s.code !== EXPORT_STATE_CODE).map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Email" htmlFor="buyer-email" badge="optional">
            <Input id="buyer-email" type="email" placeholder="client@email.com" {...r("buyer.email")} />
          </Field>
          <Field label="Phone" htmlFor="buyer-phone" badge="optional">
            <Input id="buyer-phone" type="tel" placeholder="+91 98765 43210" {...r("buyer.phone")} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={!!saveClient} onChange={(e) => setValue("save_client", e.target.checked)} />
          {clientId ? "Update this client's saved details" : "Save client for next time"}
        </label>
      </div>
    </Section>
  );
}
