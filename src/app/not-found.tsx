import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <FileQuestion className="mx-auto mb-4 size-10 stroke-[1.5] text-ink-3" aria-hidden />
        <h1 className="text-h2">Page not found</h1>
        <p className="mt-2 text-ink-2">This page doesn&apos;t exist, or the invoice was deleted.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard" className={buttonVariants()}>
            <Home aria-hidden /> Dashboard
          </Link>
          <Link href="/invoices" className={buttonVariants({ variant: "secondary" })}>
            Invoices
          </Link>
        </div>
      </div>
    </main>
  );
}
