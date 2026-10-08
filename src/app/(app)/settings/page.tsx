import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import {
  AddressTaxForm,
  BusinessForm,
  DefaultsForm,
  EmailTemplateForm,
  PaymentsForm,
} from "@/components/profile/profile-forms";
import { BrandingUpload } from "@/components/profile/branding-upload";
import { AccountPanel } from "./account-panel";
import { GmailCard } from "./gmail-card";
import { gmailConfigured } from "@/lib/gmail/google";
import { connectedGmail } from "@/lib/invoice/load";
import { cn } from "@/lib/utils";

export const metadata = { title: "Settings" };

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "payments", label: "Payments" },
  { id: "defaults", label: "Invoice defaults" },
  { id: "email", label: "Email" },
  { id: "account", label: "Account" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Section({ title, text, children }: { title: string; text?: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-border pb-8 last:border-b-0">
      <h2 className="text-h2">{title}</h2>
      {text && <p className="mt-1 text-sm text-ink-2">{text}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "profile";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <PageHeader title="Settings" />
      <nav aria-label="Settings sections" className="-mx-4 mb-8 overflow-x-auto px-4">
        <ul className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <li key={t.id}>
              <Link
                href={`/settings?tab=${t.id}`}
                scroll={false}
                aria-current={tab === t.id ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 px-3 py-2.5 text-sm whitespace-nowrap",
                  tab === t.id ? "border-accent font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="flex flex-col gap-6">
        {tab === "profile" && (
          <>
            <Section title="Business" text="Shown at the top of every new invoice. Old invoices keep their details.">
              <BusinessForm profile={profile} />
            </Section>
            <Section title="Address & tax">
              <AddressTaxForm profile={profile} />
            </Section>
            <Section title="Logo & signature">
              <div className="flex flex-col gap-6">
                <BrandingUpload kind="logo" userId={user.id} path={profile?.logo_path ?? null} label="Logo" hint="PNG or JPEG, up to 1 MB." />
                <BrandingUpload kind="signature" userId={user.id} path={profile?.signature_path ?? null} label="Signature" hint="PNG with a transparent background works best." />
              </div>
            </Section>
          </>
        )}
        {tab === "payments" && (
          <Section title="Payment details" text="Printed in the payment block of your invoices.">
            <PaymentsForm profile={profile} />
          </Section>
        )}
        {tab === "defaults" && (
          <Section title="Invoice defaults" text="Used for every new invoice. You can still change them per invoice.">
            <DefaultsForm profile={profile} />
          </Section>
        )}
        {tab === "email" && (
          <>
            <Section title="Gmail" text="Connect Gmail so the Email button can create a draft with the invoice PDF attached.">
              <GmailCard
                connectedEmail={await connectedGmail(supabase)}
                configured={gmailConfigured()}
                result={typeof sp.gmail === "string" ? sp.gmail : undefined}
              />
            </Section>
            <Section title="Email template" text="Used by the Email button on an invoice.">
              <EmailTemplateForm profile={profile} />
            </Section>
          </>
        )}
        {tab === "account" && <AccountPanel email={user.email ?? ""} />}
      </div>
    </div>
  );
}

