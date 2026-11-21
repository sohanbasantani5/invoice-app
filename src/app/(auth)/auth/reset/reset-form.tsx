"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import type { AuthState } from "../../actions";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ResetForm({ token }: { token: string }) {
  const [state, setState] = useState<AuthState>(null);
  const [pending, setPending] = useState(false);
  async function submit(formData: FormData) {
    setPending(true);
    const result = await authClient.resetPassword({
      newPassword: String(formData.get("password") ?? ""),
      token,
    });
    setPending(false);
    if (result.error) setState({ error: result.error.message });
    else window.location.assign("/dashboard");
  }
  return (
    <form action={submit} className="flex w-full max-w-sm flex-col gap-4">
      <h1 className="text-display">Set a new password</h1>
      <Field label="New password" htmlFor="password" helper="At least 8 characters.">
        <Input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
      </Field>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
