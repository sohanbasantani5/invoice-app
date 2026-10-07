import { redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/supabase/server";
import { InvoiceEditor } from "@/components/invoice/editor/invoice-editor";
import { brandingUrls, connectedGmail, editorLists, emailConfig, proposedNumber } from "@/lib/invoice/load";
import { documentToForm, emptyLine, rowToDocument, sellerFromProfile } from "@/lib/invoice/document";
import { chargesTax, defaultDocType } from "@/lib/invoice/doc-type";
import { DEFAULT_SERVICE_GST_RATE } from "@/lib/india/gst-rates";
import { addDaysISO, todayISO } from "@/lib/format";
import type { InvoiceFormValues } from "@/lib/validation/invoice";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage({ searchParams }: PageProps<"/invoices/new">) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const from = typeof sp.from === "string" && /^[0-9a-f-]{36}$/i.test(sp.from) ? sp.from : null;

  const today = todayISO();
  // Everything that doesn't depend on the profile starts together with it.
  const [{ profile }, gmailEmail, lists, copyFrom] = await Promise.all([
    getProfile(),
    connectedGmail(supabase),
    editorLists(supabase),
    from
      ? Promise.all([
          supabase.from("invoices").select("*").eq("id", from).maybeSingle(),
          supabase.from("invoice_items").select("*").eq("invoice_id", from),
        ])
      : null,
  ]);
  const seller = sellerFromProfile(profile);
  const docType = defaultDocType(seller.gst_status);
  const gst = chargesTax(docType, seller.gst_status) ? DEFAULT_SERVICE_GST_RATE : 0;
  const due = addDaysISO(today, profile?.default_due_days ?? 7);
  const [assets, number] = await Promise.all([brandingUrls(supabase, seller), proposedNumber(supabase, profile, today)]);

  let initial: InvoiceFormValues = {
    doc_type: docType,
    invoice_number: number,
    auto_number: true,
    issue_date: today,
    due_date: due,
    place_of_supply_code: "",
    reverse_charge: false,
    currency: "INR",
    reference: "",
    client_id: null,
    save_client: true,
    buyer: {
      name: "",
      client_type: "individual",
      contact_person: "",
      email: "",
      phone: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state_code: "",
      pincode: "",
      country: "India",
      gstin: "",
      pan: "",
    },
    ship_to_enabled: false,
    ship_to: { name: "", address_line1: "", address_line2: "", city: "", state_code: "", pincode: "" },
    lines: [emptyLine(gst)],
    round_off_enabled: profile?.round_off_default ?? true,
    tds_enabled: false,
    tds_rate: "",
    tds_label: "TDS",
    notes: profile?.default_notes ?? "",
    terms: profile?.default_terms ?? "",
    show_bank: true,
    show_upi_qr: true,
    show_signature: true,
    template_id: profile?.default_template_id ?? "default",
  };

  // Duplicate: same client and lines, new number, today's date (01 §6).
  if (copyFrom) {
    const [{ data: row }, { data: lines }] = copyFrom;
    if (row) {
      const copy = documentToForm(rowToDocument(row, lines ?? []), row.client_id);
      initial = {
        ...copy,
        id: undefined,
        doc_type: row.doc_type === "credit_note" ? docType : copy.doc_type,
        invoice_number: number,
        auto_number: true,
        issue_date: today,
        due_date: due,
      };
    }
  }

  return (
    <InvoiceEditor
      key={from ?? "new"}
      initial={initial}
      seller={seller}
      status="draft"
      profileSeller={seller}
      amountPaidPaise={0}
      clients={lists.clients}
      items={lists.items}
      assets={assets}
      defaultGst={DEFAULT_SERVICE_GST_RATE}
      email={emailConfig(user, profile, gmailEmail)}
    />
  );
}
