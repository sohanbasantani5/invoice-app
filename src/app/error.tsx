"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

/** 500 page: catches render/server errors in every route below the root layout. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 size-10 stroke-[1.5] text-danger" aria-hidden />
        <h1 className="text-h2">Something went wrong</h1>
        <p className="mt-2 text-ink-2">Your saved invoices are safe. Try again, or go back to the dashboard.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-ink-3">Ref: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/dashboard" className={buttonVariants({ variant: "secondary" })}>
            <Home aria-hidden /> Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
