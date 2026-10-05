"use client";

import { useActionState } from "react";
import { Download } from "lucide-react";
import { signOut, updatePassword, type AuthState } from "@/app/(auth)/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, Field, Input } from "@/components/ui/field";

export function AccountPanel({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(updatePassword, null);
  return (
    <>
      <Card className="p-5 md:p-6">
        <h2 className="text-h2">Account</h2>
        <p className="mt-1 text-sm text-ink-2">
          Signed in as <span className="font-medium text-ink">{email}</span>
        </p>
        <form action={action} className="mt-6 flex flex-col gap-4 sm:max-w-sm">
          <Field label="New password" htmlFor="password" helper="At least 8 characters.">
            <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" />
          </Field>
          {state?.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}
          <Button type="submit" variant="secondary" disabled={pending} className="self-start">
            {pending ? "Saving…" : "Change password"}
          </Button>
        </form>
      </Card>
      <Card className="p-5 md:p-6">
        <h2 className="text-h2">Your data</h2>
        <p className="mt-1 text-sm text-ink-2">Download everything as files for your accountant or a backup.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href="/api/export?format=csv" className={buttonVariants({ variant: "secondary" })}>
            <Download aria-hidden /> Invoices (CSV)
          </a>
          <a href="/api/export?format=json" className={buttonVariants({ variant: "secondary" })}>
            <Download aria-hidden /> All data (JSON)
          </a>
        </div>
      </Card>
      <form action={signOut}>
        <Button type="submit" variant="ghost">
          Sign out
        </Button>
      </form>
    </>
  );
}
