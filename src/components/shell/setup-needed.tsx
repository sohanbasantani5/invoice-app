import { Database } from "lucide-react";

/** Shown when the new database schema isn't applied yet (migrations not pasted). */
export function SetupNeeded({ detail }: { detail?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg p-6">
      <div className="max-w-md rounded-xl border border-border bg-surface p-8">
        <Database className="mb-4 size-6 stroke-[1.5] text-accent" aria-hidden />
        <h1 className="text-h2">Database setup needed</h1>
        <p className="mt-2 text-ink-2">
          The app is ready but the database tables aren&apos;t there yet. Paste the SQL files from{" "}
          <code className="font-mono text-sm">supabase/migrations/</code> into the Supabase SQL editor
          (see “Database migrations” in <code className="font-mono text-sm">README.md</code>).
        </p>
        {detail && <p className="mt-4 font-mono text-xs text-ink-3">{detail}</p>}
      </div>
    </main>
  );
}
