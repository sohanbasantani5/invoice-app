"use client";

import Link from "next/link";
import { useFormContext } from "react-hook-form";
import { Field, Switch, Textarea } from "@/components/ui/field";
import { Section } from "./section";
import type { InvoiceFormValues } from "@/lib/validation/invoice";
import type { SellerSnapshot } from "@/lib/invoice/types";

export function PaymentNotes({ seller }: { seller: SellerSnapshot }) {
  const { register } = useFormContext<InvoiceFormValues>();
  const r = register;
  const hasBank = !!(seller.bank_account_number || seller.bank_name);
  return (
    <Section id="payment" title="Payment & notes" defaultOpen={false} summary="Bank, UPI QR, notes">
      <div className="flex flex-col gap-2">
        <Switch
          label="Show bank details"
          description={hasBank ? `${seller.bank_name ?? "Bank"} · ${seller.bank_account_number ?? ""}` : "No bank details yet — add them in Settings."}
          {...r("show_bank")}
        />
        <Switch
          label="Show UPI scan-to-pay QR"
          description={seller.upi_id ? seller.upi_id : "Add a UPI ID in Settings to get a QR code."}
          {...r("show_upi_qr")}
        />
        <Switch label="Show signature" description={seller.signature_path ? "Uses your uploaded signature." : "Shows a blank space to sign."} {...r("show_signature")} />
        <Link href="/settings?tab=payments" className="w-fit text-xs text-accent hover:underline">
          Edit payment details in Settings
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4">
        <Field label="Notes" htmlFor="notes" badge="optional">
          <Textarea id="notes" rows={2} placeholder="Thank you for your business." {...r("notes")} />
        </Field>
        <Field label="Terms" htmlFor="terms" badge="optional">
          <Textarea id="terms" rows={2} placeholder="Payment due within 7 days." {...r("terms")} />
        </Field>
      </div>
    </Section>
  );
}
