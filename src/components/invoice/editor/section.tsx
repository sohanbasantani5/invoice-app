"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Collapsible form group card (02 §6). */
export function Section({
  id,
  title,
  summary,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  action,
  children,
}: {
  id: string;
  title: string;
  summary?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [own, setOwn] = useState(defaultOpen);
  const open = controlledOpen ?? own;
  const set = (o: boolean) => (onOpenChange ? onOpenChange(o) : setOwn(o));
  const bodyId = useId();
  return (
    <section id={id} className="scroll-mt-24 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2 px-4 md:px-5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => set(!open)}
          className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-4 text-left"
        >
          <h2 className="shrink-0 text-h3">{title}</h2>
          {!open && summary && <span className="min-w-0 flex-1 truncate text-sm text-ink-3">{summary}</span>}
          <ChevronDown
            className={cn("ml-auto size-4 shrink-0 stroke-[1.5] text-ink-3 transition-transform duration-200", open && "rotate-180")}
            aria-hidden
          />
        </button>
        {action}
      </div>
      {/* Always mounted, so the server HTML and the first client render match; collapsed = zero-height row + inert. */}
      <div
        id={bodyId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border px-4 pt-5 pb-5 md:px-5">{children}</div>
        </div>
      </div>
    </section>
  );
}
