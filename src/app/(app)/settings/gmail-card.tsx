"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { disconnectGmail } from "@/lib/actions/gmail";

const MESSAGES: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Gmail connected." },
  denied: { ok: false, text: "Gmail was not connected: permission was declined." },
  error: { ok: false, text: "Couldn't connect Gmail. Please try again." },
  not_configured: { ok: false, text: "Gmail connection isn't set up on this site yet." },
};

/** Connect / disconnect Gmail. Only the "create drafts" permission is requested; mail is never read. */
export function GmailCard({ connectedEmail, configured, result }: { connectedEmail: string | null; configured: boolean; result?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  useEffect(() => {
    const m = result ? MESSAGES[result] : null;
    if (!m) return;
    (m.ok ? toast.success : toast.error)(m.text);
    router.replace("/settings?tab=email", { scroll: false }); // so a reload doesn't repeat the message
  }, [result, router]);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-2">
        <Mail className="size-5 stroke-[1.5]" aria-hidden />
      </span>
      <div className="min-w-[12rem] flex-1">
        {connectedEmail ? (
          <>
            <p className="text-sm font-medium">
              Gmail connected <span className="font-normal text-ink-2">· {connectedEmail}</span>
            </p>
            <p className="text-caption">The Email button creates a draft in this account with the PDF attached.</p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium">Gmail is not connected</p>
            <p className="text-caption">
              Connect it and the Email button creates a draft with the PDF already attached. We can only create drafts, never read your mail.
            </p>
          </>
        )}
      </div>
      {connectedEmail ? (
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Disconnect Gmail? Emails will go back to the download-and-link way.")) return;
            start(async () => {
              const r = await disconnectGmail();
              if (!r.ok) return void toast.error(r.error ?? "Couldn't disconnect.");
              toast.success("Gmail disconnected.");
              router.refresh();
            });
          }}
        >
          {pending ? "Disconnecting…" : "Disconnect Gmail"}
        </Button>
      ) : configured ? (
        // A full page load on purpose: it leaves for Google's consent screen.
        <a href="/api/gmail/connect" className={buttonVariants()}>
          Connect Gmail
        </a>
      ) : (
        <Button disabled title="Needs the Google keys to be added to the site first.">
          Connect Gmail
        </Button>
      )}
    </div>
  );
}
