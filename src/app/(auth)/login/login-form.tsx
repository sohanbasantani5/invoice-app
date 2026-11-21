"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";
import { prepareCredentialLogin, sendMagicLink, sendPasswordReset } from "../actions";
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

function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid") || m.includes("wrong") || m.includes("credentials")) {
    return "That email and password don't match. Try again or use a magic link.";
  }
  if (m.includes("not confirmed") || m.includes("verify")) {
    return "Please confirm your email first — check your inbox for the link.";
  }
  if (m.includes("already") || m.includes("exists")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (m.includes("weak") || m.includes("strong") || m.includes("short")) {
    return "Please choose a stronger password (8+ characters).";
  }
  return message;
}

export function LoginForm({
  next,
  initialError,
  initialMessage,
  enableGoogle = false,
}: {
  next: string;
  initialError?: string;
  initialMessage?: string;
  enableGoogle?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState<string | undefined>(initialError);
  const [message, setMessage] = useState<string | undefined>(initialMessage);
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const copy = COPY[mode];
  const showPassword = mode === "signin" || mode === "signup";

  function handleModeChange(newMode: Mode) {
    setMode(newMode);
    setError(undefined);
    setMessage(undefined);
  }

  async function withGoogle() {
    setError(undefined);
    setPending(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: next,
      });
    } catch (err: unknown) {
      setPending(false);
      setError(friendly(err instanceof Error ? err.message : "Failed to sign in with Google"));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setMessage(undefined);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (showPassword && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setPending(true);

    try {
      if (mode === "signin") {
        // Legacy Supabase password bridge: verify against Supabase on first login,
        // store a bcrypt hash in Better Auth, then sign in normally.
        const bridge = await prepareCredentialLogin(trimmedEmail, password);
        if (bridge.error) {
          setError(friendly(bridge.error));
          setPending(false);
          return;
        }

        const { error: signInError } = await authClient.signIn.email({
          email: trimmedEmail,
          password,
          callbackURL: next,
        });

        if (signInError) {
          setError(friendly(signInError.message || "Sign in failed"));
          setPending(false);
          return;
        }

        window.location.href = next;
        return;
      }

      if (mode === "signup") {
        const name = trimmedEmail.split("@")[0];
        const { error: signUpError } = await authClient.signUp.email({
          email: trimmedEmail,
          password,
          name,
          callbackURL: "/onboarding",
        });

        if (signUpError) {
          setError(friendly(signUpError.message || "Sign up failed"));
          setPending(false);
          return;
        }

        window.location.href = "/onboarding";
        return;
      }

      if (mode === "forgot") {
        const formData = new FormData();
        formData.set("email", trimmedEmail);
        const res = await sendPasswordReset(null, formData);
        setPending(false);
        if (res?.error) {
          setError(res.error);
        } else if (res?.message) {
          setMessage(res.message);
        }
        return;
      }

      if (mode === "magic") {
        const formData = new FormData();
        formData.set("email", trimmedEmail);
        const res = await sendMagicLink(null, formData);
        setPending(false);
        if (res?.error) {
          setError(res.error);
        } else if (res?.message) {
          setMessage(res.message);
        }
        return;
      }
    } catch (err: unknown) {
      setPending(false);
      setError(friendly(err instanceof Error ? err.message : "An unexpected error occurred"));
    }
  }

  return (
    <div className="w-full max-w-sm">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-accent">Invoice workspace</p>
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
              onClick={() => handleModeChange(m)}
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

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {showPassword && (
          <Field label="Password" htmlFor="password" helper={mode === "signup" ? "At least 8 characters." : undefined}>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-lg bg-accent-soft px-3 py-2 text-sm text-accent">
            {message}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="mt-1 w-full">
          {pending ? copy.pending : copy.cta}
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        {mode === "signin" && (
          <>
            <button type="button" className="text-accent hover:underline" onClick={() => handleModeChange("magic")}>
              Email me a sign-in link instead
            </button>
            <button type="button" className="text-ink-3 hover:text-ink" onClick={() => handleModeChange("forgot")}>
              Forgot password?
            </button>
          </>
        )}
        {(mode === "magic" || mode === "forgot") && (
          <button type="button" className="text-accent hover:underline" onClick={() => handleModeChange("signin")}>
            ← Back to sign in
          </button>
        )}
      </div>

      {enableGoogle && (mode === "signin" || mode === "signup") && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-ink-3">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="secondary" size="lg" className="w-full" onClick={withGoogle} disabled={pending}>
            Continue with Google
          </Button>
        </>
      )}
    </div>
  );
}
