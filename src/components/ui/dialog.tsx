"use client";

import { Dialog as D } from "@base-ui/react/dialog";
import { X } from "lucide-react";

/** Modal: scale 0.98 → 1 + fade, 200ms; bottom sheet on mobile (02 §8). */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Backdrop className="fixed inset-0 z-50 bg-ink/25 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <D.Popup
          data-lenis-prevent
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-2xl border border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-float transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-[min(480px,calc(100vw-32px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:pb-5 sm:data-[ending-style]:translate-y-[-50%] sm:data-[ending-style]:scale-[0.98] sm:data-[starting-style]:translate-y-[-50%] sm:data-[starting-style]:scale-[0.98]"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <D.Title className="text-h2">{title}</D.Title>
              {description && <D.Description className="mt-1 text-sm text-ink-2">{description}</D.Description>}
            </div>
            <D.Close aria-label="Close" className="-mt-1 -mr-1 grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-surface-2 hover:text-ink">
              <X className="size-4 stroke-[1.5]" aria-hidden />
            </D.Close>
          </div>
          {children}
        </D.Popup>
      </D.Portal>
    </D.Root>
  );
}
