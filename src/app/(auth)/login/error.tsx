"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Login route error:", error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 size-10 stroke-[1.5] text-danger" aria-hidden />
        <h1 className="text-h2">Sign in error</h1>
        <p className="mt-2 text-ink-2">There was a temporary problem loading the sign-in page.</p>
        {error.message && (
          <p className="mt-3 rounded-md bg-danger/10 p-2 font-mono text-xs text-danger text-left overflow-auto max-h-32">
            {error.message}
          </p>
        )}
        {error.digest && <p className="mt-2 font-mono text-xs text-ink-3">Ref: {error.digest}</p>}
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-surface-2">
            Reload
          </Link>
        </div>
      </div>
    </main>
  );
}
