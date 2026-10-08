import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="space-y-2"><h2 className="font-heading text-lg font-semibold">{title}</h2><div className="space-y-2 text-sm leading-7 text-ink-2">{children}</div></section>
);

export default function TermsPage() {
  return <article className="mx-auto max-w-3xl space-y-8 px-5 py-12 sm:px-8 sm:py-16">
    <header className="space-y-3"><p className="text-label uppercase tracking-[0.16em] text-accent">Invoice App</p><h1 className="font-heading text-3xl font-semibold tracking-tight">Terms of Service</h1><p className="text-sm text-ink-3">Last updated: 8 October 2026</p></header>
    <Section title="Using the service"><p>Invoice App provides tools to create, manage, export, and email invoices. You may use the service only for lawful business and personal invoicing activities and in accordance with these terms.</p></Section>
    <Section title="Your responsibility"><p>You are responsible for your account, the information you enter, and keeping your sign-in credentials secure. You are responsible for checking invoice calculations, tax details, client information, payment status, and generated documents before relying on or sending them.</p><p>Invoice App is a software tool, not professional tax, legal, or accounting advice. Consult a qualified professional for advice about your circumstances and compliance obligations.</p></Section>
    <Section title="Your content and acceptable use"><p>You retain responsibility for business, client, invoice, payment, branding, and other content you provide. Do not use the service to upload unlawful, infringing, abusive, deceptive, malicious, or unauthorised content, or to attempt to disrupt, probe, or gain unauthorised access to the service or another account.</p></Section>
    <Section title="Availability and liability"><p>The service is provided on an availability basis and may change, be interrupted, or become unavailable for maintenance or reasons outside our control. To the extent permitted by law, Invoice App is not responsible for indirect, incidental, or consequential loss arising from use of the service. Nothing in these terms excludes liability that cannot lawfully be excluded.</p></Section>
    <Section title="Changes"><p>We may update the service or these terms as the product changes. Updated terms will be posted on this page with a new date. Continued use after an update means you accept the updated terms.</p></Section>
    <Section title="Contact"><p>For questions about these terms, contact the support email configured in your Invoice App account settings.</p></Section>
  </article>;
}
