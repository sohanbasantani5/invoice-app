"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { AddressTaxForm, BusinessForm, DefaultsForm, PaymentsForm } from "@/components/profile/profile-forms";
import { BrandingUpload } from "@/components/profile/branding-upload";
import { Button } from "@/components/ui/button";
import { saveProfileSection } from "@/lib/actions/profile";
import type { ProfileRow } from "@/types/database";
import { cn } from "@/lib/utils";

const STEPS = [
  { title: "Your business", text: "How your name appears on invoices." },
  { title: "Address & tax", text: "Decides whether invoices carry GST." },
  { title: "Payments & defaults", text: "So clients can pay you in one scan." },
] as const;
// Screen 3 (defaults) is the second half of step 3 in the progress bar.
const SCREENS = 4;
const SCREEN_TEXT = ["", "", "So clients can pay you in one scan.", "Numbering, due dates and notes for new invoices."];

export function OnboardingFlow({
  userId,
  email,
  profile,
}: {
  userId: string;
  email: string;
  profile: ProfileRow | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [finishing, start] = useTransition();
  const seed: Partial<ProfileRow> | null = profile ?? { email };

  const progress = Math.min(step, STEPS.length - 1);
  const next = () => {
    router.refresh();
    setStep((s) => Math.min(s + 1, SCREENS - 1));
  };
  const done = () => {
    router.replace("/dashboard");
    router.refresh();
  };
  const skipAll = () =>
    start(async () => {
      const res = await saveProfileSection("branding", {}, { completeOnboarding: true });
      if (!res.ok) return void toast.error(res.error);
      done();
    });

  const skip = (
    <Button variant="ghost" onClick={step === SCREENS - 1 ? skipAll : next} disabled={finishing}>
      Skip for now
    </Button>
  );

  return (
    <main className="min-h-dvh bg-bg">
      <div className="mx-auto flex max-w-2xl flex-col px-4 py-10 md:py-16">
        <div className="mb-8 flex items-center justify-between gap-4">
          <p className="font-heading text-[0.9375rem] font-semibold">Set up your business</p>
          <Button variant="ghost" size="sm" onClick={skipAll} disabled={finishing}>
            Finish later
          </Button>
        </div>

        <ol className="mb-10 grid grid-cols-3 gap-2" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.title} aria-current={i === progress ? "step" : undefined} className="flex flex-col gap-2">
              <span className={cn("h-1 rounded-full transition-colors duration-300", i <= progress ? "bg-accent" : "bg-border")} />
              <span className={cn("flex items-center gap-1.5 text-xs", i === progress ? "font-medium text-ink" : "text-ink-3")}>
                {i < progress && <Check className="size-3.5 text-accent" aria-hidden />}
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">Step {i + 1}</span>
              </span>
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait" initial={false}>
          <m.section
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-xl border border-border bg-surface p-5 md:p-8"
          >
            <h1 className="text-display">{STEPS[progress].title}</h1>
            <p className="mt-1 mb-8 text-ink-2">{SCREEN_TEXT[step] || STEPS[progress].text}</p>

            {step === 0 && (
              <div className="flex flex-col gap-6">
                <BusinessForm profile={seed} submitLabel="Continue" onSaved={next} extra={skip} />
                <div className="border-t border-border pt-6">
                  <BrandingUpload kind="logo" userId={userId} path={profile?.logo_path ?? null} label="Logo" hint="PNG or SVG, up to 1 MB. Shown top-left on invoices." />
                </div>
              </div>
            )}
            {step === 1 && <AddressTaxForm profile={seed} submitLabel="Continue" onSaved={next} extra={skip} />}
            {step === 2 && <PaymentsForm profile={seed} submitLabel="Continue" onSaved={next} extra={skip} />}
            {step === 3 && (
              <DefaultsForm profile={seed} showTemplate={false} submitLabel="Finish setup" completeOnboarding onSaved={done} extra={skip} />
            )}
          </m.section>
        </AnimatePresence>

        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="mt-4 self-start text-sm text-ink-3 hover:text-ink">
            ← Back
          </button>
        )}
      </div>
    </main>
  );
}
