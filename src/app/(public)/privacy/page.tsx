import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2"><h2 className="font-heading text-lg font-semibold">{title}</h2><div className="space-y-2 text-sm leading-7 text-ink-2">{children}</div></section>
);

export default function PrivacyPage() {
  return <article className="mx-auto max-w-3xl space-y-8 px-5 py-12 sm:px-8 sm:py-16">
    <header className="space-y-3"><p className="text-label uppercase tracking-[0.16em] text-accent">Invoice App</p><h1 className="font-heading text-3xl font-semibold tracking-tight">Privacy Policy</h1><p className="text-sm text-ink-3">Last updated: 8 October 2026</p></header>
    <Section title="What Invoice App is"><p>Invoice App is an invoice creation and management tool for freelancers and small businesses. It helps you prepare invoices, manage clients and items, track payment status, and create invoice PDFs.</p></Section>
    <Section title="Information we use"><p>When you use the app, we use account and profile information such as your sign-in identity, business name, contact details, tax details, branding, and preferences.</p><p>You may also enter business details, client details, invoice numbers and dates, line items, tax and payment information, notes, payment status, and related invoice records. This information is used to create, save, display, export, and send your invoices at your direction.</p></Section>
    <Section title="Storage and service providers"><p>App data is stored using Supabase infrastructure. Supabase provides the database, authentication, and private file storage used by the app. Invoice PDFs and branding files are kept in private storage and are accessed through authenticated app workflows.</p></Section>
    <Section title="Gmail integration"><p>If you connect Gmail, the app uses Google OAuth with the <code className="rounded bg-surface-2 px-1 py-0.5 text-xs">gmail.compose</code> scope for the requested invoice-email workflow. It can create a Gmail draft, populate its recipient, subject, and body, and attach the generated invoice PDF.</p><p>The app does not read your inbox, email history, or message contents. Google OAuth data is used only to provide the connected Gmail draft functionality. The refresh token is encrypted before it is stored in the app database and is used only to maintain that Gmail connection.</p></Section>
    <Section title="Sharing"><p>We do not sell your personal data. The app shares information only with service providers needed to operate the service, such as Supabase and Google when you choose to connect Gmail and create a draft.</p></Section>
    <Section title="Retention and deletion"><p>Your invoice and profile data remains in your account until you delete it or ask for deletion. You can disconnect Gmail from Settings; this removes the stored Gmail connection and the app revokes the connected token where possible. To request account or data deletion, contact the support email configured for your Invoice App account.</p></Section>
    <Section title="Contact"><p>For privacy questions or deletion requests, contact the support email configured in your Invoice App account settings.</p></Section>
  </article>;
}
