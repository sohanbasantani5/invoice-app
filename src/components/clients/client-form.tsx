"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { saveClient, type ClientInput } from "@/lib/actions/library";
import { buyerFormFromClient } from "@/lib/invoice/document";
import { gstinWarning, panWarning, checkGstin } from "@/lib/validation/india";
import { EXPORT_STATE_CODE, STATES } from "@/lib/india/states";
import type { ClientRow } from "@/types/database";

export function ClientForm({ client, onDone }: { client: ClientRow | null; onDone?: (id: string) => void }) {
  const router = useRouter();
  const [v, setV] = useState<ClientInput>({ ...buyerFormFromClient(client), notes: client?.notes ?? "" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [pending, start] = useTransition();
  const set = (k: keyof ClientInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((x) => ({ ...x, [k]: e.target.value }));

  function onGstinBlur() {
    setTouched((t) => ({ ...t, gstin: true }));
    const g = checkGstin(v.gstin ?? "");
    if (g.ok)
      setV((x) => ({
        ...x,
        state_code: x.state_code || g.stateCode,
        pan: x.pan || g.pan,
        client_type: x.client_type === "individual" ? "business_registered" : x.client_type,
      }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveClient(client?.id ?? null, v);
      if (!r.ok) return void toast.error(r.error);
      toast.success(client ? "Client updated" : "Client added");
      onDone?.(r.id);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
      <Field label="Client / company name" htmlFor="c-name" badge="required" className="sm:col-span-2">
        <Input id="c-name" required placeholder="Sample Client" value={v.name} onChange={set("name")} />
      </Field>
      <Field label="Client type" htmlFor="c-type" badge="optional">
        <Select id="c-type" value={v.client_type} onChange={set("client_type")}>
          <option value="individual">Individual</option>
          <option value="business_registered">GST-registered business</option>
          <option value="business_unregistered">Unregistered business</option>
          <option value="overseas">Overseas</option>
        </Select>
      </Field>
      <Field label="Contact person" htmlFor="c-contact" badge="optional">
        <Input id="c-contact" value={v.contact_person} onChange={set("contact_person")} />
      </Field>
      <Field label="GSTIN" htmlFor="c-gstin" badge="optional" warning={touched.gstin ? gstinWarning(v.gstin) : null}>
        <Input id="c-gstin" className="font-mono uppercase" maxLength={15} placeholder="27ABCDE1234F1Z0" value={v.gstin} onChange={set("gstin")} onBlur={onGstinBlur} />
      </Field>
      <Field label="PAN" htmlFor="c-pan" badge="optional" warning={touched.pan ? panWarning(v.pan) : null}>
        <Input id="c-pan" className="font-mono uppercase" maxLength={10} placeholder="ABCDE1234F" value={v.pan} onChange={set("pan")} onBlur={() => setTouched((t) => ({ ...t, pan: true }))} />
      </Field>
      <Field label="Address" htmlFor="c-addr" badge="optional" className="sm:col-span-2">
        <Input id="c-addr" placeholder="Office 12, Andheri East" value={v.address_line1} onChange={set("address_line1")} />
      </Field>
      <Field label="City" htmlFor="c-city" badge="optional">
        <Input id="c-city" value={v.city} onChange={set("city")} />
      </Field>
      <Field label="PIN code" htmlFor="c-pin" badge="optional">
        <Input id="c-pin" inputMode="numeric" value={v.pincode} onChange={set("pincode")} />
      </Field>
      {v.client_type === "overseas" ? (
        <Field label="Country" htmlFor="c-country" badge="optional">
          <Input id="c-country" value={v.country} onChange={set("country")} />
        </Field>
      ) : (
        <Field label="State" htmlFor="c-state" badge="optional">
          <Select id="c-state" value={v.state_code} onChange={set("state_code")}>
            <option value="">Select state</option>
            {STATES.filter((s) => s.code !== EXPORT_STATE_CODE).map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Email" htmlFor="c-email" badge="optional">
        <Input id="c-email" type="email" value={v.email} onChange={set("email")} />
      </Field>
      <Field label="Phone" htmlFor="c-phone" badge="optional">
        <Input id="c-phone" type="tel" value={v.phone} onChange={set("phone")} />
      </Field>
      <Field label="Notes" htmlFor="c-notes" badge="optional" className="sm:col-span-2">
        <Textarea id="c-notes" rows={2} value={v.notes} onChange={set("notes")} />
      </Field>
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? "Saving…" : client ? "Save changes" : "Add client"}
      </Button>
    </form>
  );
}
