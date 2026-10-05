"use client";

import { useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  sendMagicLink,
  sendPasswordReset,
  signIn,
  signUp,
  type AuthState,
} from "../actions";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "magic" | "forgot";

const COPY: Record<Mode, { title: string; sub: string; cta: string; pending: string }> = {
  signin: { title: "Welcome back", sub: "Sign in to your invoices.", cta: "Sign in", pending: "Signing in…" },
  signup: { title: "Create your account", sub: "Free, private, takes a minute.", cta: "Create account", pending: "Creating…" },
  magic: { title: "Email me a link", sub: "Sign in without a password.", cta: "Send magic link", pending: "Sending…" },
  forgot: { title: "Reset your password", sub: "We'll email you a reset link.", cta: "Send reset link", pending: "Sending…" },
};

const ACTIONS = { signin: signIn, signup: signUp, magic: sendMagicLink, forgot: sendPasswordReset } as const;

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  return <ModeForm key={mode} mode={mode} setMode={setMode} next={next} initialError={mode === "signin" ? initialError : undefined} />;
}

function ModeForm({
  mode,
  setMode,
  next,
  initialError,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  next: string;
  initialError?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    ACTIONS[mode],
    initialError ? { error: initialError } : null,
  );
  const copy = COPY[mode];
  const showPassword = mode === "signin" || mode === "signup";
  const google = process.env.NEXT_PUBLIC_ENABLE_GOOGLE === "true";

  async function withGoogle() {
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-display">{copy.title}</h1>
      <p className="mt-1 text-ink-2">{copy.sub}</p>

      {(mode === "signin" || mode === "signup") && (
        <div role="tablist" aria-label="Account" className="mt-8 grid grid-cols-2 rounded-lg bg-surface-2 p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "h-8 rounded-md text-sm transition-colors",
                mode === m ? "bg-surface font-medium text-ink shadow-sm" : "text-ink-2 hover:text-ink",
              )}
            >
              {m === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>
      )}

      <form action={action} className="mt-6 flex flex-col gap-4" noValidate>
        <input type="hidden" name="next" value={next} />
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
            defaultValue={state?.email}
          />
        </Field>
        {showPassword && (
          <Field
            label="Password"
            htmlFor="password"
            helper={mode === "signup" ? "At least 8 characters." : undefined}
          >
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </Field>
        )}

        {state?.error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p role="status" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
            {state.message}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? copy.pending : copy.cta}
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        {mode === "signin" && (
          <>
            <button type="button" className="text-accent hover:underline" onClick={() => setMode("magic")}>
              Email me a sign-in link instead
            </button>
            <button type="button" className="text-ink-3 hover:text-ink" onClick={() => setMode("forgot")}>
              Forgot password?
            </button>
          </>
        )}
        {(mode === "magic" || mode === "forgot") && (
          <button type="button" className="text-accent hover:underline" onClick={() => setMode("signin")}>
            ← Back to sign in
          </button>
        )}
      </div>

      {google && (mode === "signin" || mode === "signup") && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-ink-3">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="secondary" size="lg" className="w-full" onClick={withGoogle}>
            Continue with Google
          </Button>
        </>
      )}
    </div>
  );
}
