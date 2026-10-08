import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-bg text-ink">
      <header className="border-b border-border bg-surface/80"><div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-8"><Link href="/login" className="font-heading text-base font-semibold tracking-tight">Invoices</Link><Link href="/login" className="text-label text-ink-2 hover:text-accent">Sign in</Link></div></header>
      {children}
      <footer className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-2 px-5 py-8 text-caption sm:px-8"><Link href="/privacy" className="hover:text-accent">Privacy</Link><Link href="/terms" className="hover:text-accent">Terms</Link></footer>
    </main>
  );
}
