"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { Section } from "./section";
import type { InvoiceFormValues } from "@/lib/validation/invoice";
import type { GstStatus } from "@/types/database";
import { allowedDocTypes, DOC_LABELS, suggestBillOfSupply } from "@/lib/invoice/doc-type";
import { STATES } from "@/lib/india/states";
import { invoiceNumberError } from "@/lib/validation/india";
import { addDaysISO, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DetailsCard({
  gstStatus,
  numberError,
  onPlaceOfSupplyTouched,
  isNew,
}: {
  gstStatus: GstStatus;
  numberError?: string | null;
  onPlaceOfSupplyTouched: () => void;
  isNew: boolean;
}) {
  const { register, setValue, control } = useFormContext<InvoiceFormValues>();
  const [docType, number, autoNumber, issue, due, pos, lines, ship] = useWatch({
    control,
    name: ["doc_type", "invoice_number", "auto_number", "issue_date", "due_date", "place_of_supply_code", "lines", "ship_to_enabled"],
  });
  const taxInvoice = docType === "tax_invoice";
  const rates = (lines ?? []).filter((l) => l.name?.trim()).map((l) => Number(l.gst_rate) || 0);
  const chips = [
    { label: "On receipt", days: 0 },
    { label: "7 days", days: 7 },
    { label: "15 days", days: 15 },
    { label: "30 days", days: 30 },
  ];
  const r = register;
  const numErr = numberError ?? (number ? invoiceNumberError(number) : null);

  return (
    <Section id="details" title="Invoice details" summary={`${number || "New"} · ${formatDate(issue)}`}>
      <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <Field label="Document type" htmlFor="doc_type" badge="required">
          <Select id="doc_type" {...r("doc_type")}>
            {allowedDocTypes(gstStatus).map((t) => (
              <option key={t} value={t}>
                {DOC_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Invoice number"
          htmlFor="invoice_number"
          badge="required"
          error={numErr}
          helper={isNew && autoNumber ? "Next number — confirmed when you save." : "Max 16 characters: letters, digits, - and /."}
        >
          <Input
            id="invoice_number"
            className="font-mono"
            maxLength={16}
            {...r("invoice_number", { onChange: () => setValue("auto_number", false) })}
          />
        </Field>
        <Field label="Issue date" htmlFor="issue_date" badge="required">
          <Input id="issue_date" type="date" {...r("issue_date")} />
        </Field>
        <Field
          label="Due date"
          htmlFor="due_date"
          badge="optional"
          warning={due && issue && due < issue ? "Due date is before the issue date." : null}
        >
          <Input id="due_date" type="date" {...r("due_date")} />
        </Field>
        <div className="-mt-3 flex flex-wrap gap-1.5 sm:col-span-2">
          {chips.map((c) => {
            const v = issue ? addDaysISO(issue, c.days) : "";
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => setValue("due_date", v, { shouldDirty: true })}
                className={cn(
                  "h-8 rounded-full border px-3 text-xs",
                  due === v ? "border-accent bg-accent-soft text-accent" : "border-border text-ink-2 hover:bg-surface-2",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <Field
          label="Place of supply"
          htmlFor="place_of_supply_code"
          badge={taxInvoice ? "gst" : "optional"}
          badgeHighlight={taxInvoice && !pos}
          helper="Same state as yours → CGST + SGST. Other state → IGST."
        >
          <Select id="place_of_supply_code" {...r("place_of_supply_code", { onChange: onPlaceOfSupplyTouched })}>
            <option value="">Select state</option>
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="PO / reference no." htmlFor="reference" badge="optional">
          <Input id="reference" placeholder="PO-2291" {...r("reference")} />
        </Field>
        {taxInvoice && (
          <div className="sm:col-span-2">
            <Switch label="Tax payable on reverse charge" description="Usually No for freelancers." {...r("reverse_charge")} />
          </div>
        )}
        {suggestBillOfSupply(gstStatus, rates) && docType === "tax_invoice" && (
          <p className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent sm:col-span-2">
            Every item is 0% GST — a <button type="button" className="font-medium underline" onClick={() => setValue("doc_type", "bill_of_supply", { shouldDirty: true })}>Bill of supply</button> may fit better.
          </p>
        )}
        <div className="sm:col-span-2">
          <Switch label="Different delivery address" description="Adds a “Ship to” block." {...r("ship_to_enabled")} />
        </div>
        {ship && (
          <>
            <Field label="Ship to name" htmlFor="ship-name" badge="optional">
              <Input id="ship-name" {...r("ship_to.name")} />
            </Field>
            <Field label="Ship to address" htmlFor="ship-address" badge="optional">
              <Input id="ship-address" {...r("ship_to.address_line1")} />
            </Field>
            <Field label="City" htmlFor="ship-city" badge="optional">
              <Input id="ship-city" {...r("ship_to.city")} />
            </Field>
            <Field label="State" htmlFor="ship-state" badge="optional">
              <Select id="ship-state" {...r("ship_to.state_code")}>
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
            </Field>
          </>
        )}
      </div>
    </Section>
  );
}
