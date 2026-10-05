"use client";

import { useSyncExternalStore } from "react";
import { Popover as P } from "@base-ui/react/popover";
import { Dialog } from "./dialog";
import { cn } from "@/lib/utils";

const PHONE = "(max-width: 639px)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(PHONE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
/** True below 640px, where popovers become bottom sheets. */
export function useIsPhone() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}

/**
 * Popover that can never end up under the sidebar or off screen: rendered in a portal above everything,
 * flips and shifts to stay 16px inside the viewport, and never wider than the viewport minus 32px.
 * On a phone it is a bottom sheet instead.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  triggerLabel,
  triggerClassName,
  title,
  description,
  children,
  align = "start",
  className,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  trigger: React.ReactNode;
  triggerLabel?: string;
  triggerClassName?: string;
  /** Heading of the bottom sheet (and the accessible name of the popover). */
  title: string;
  description?: string;
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const phone = useIsPhone();
  if (phone) {
    return (
      <>
        <button type="button" aria-label={triggerLabel} aria-expanded={open} aria-haspopup="dialog" className={triggerClassName} onClick={() => onOpenChange(true)}>
          {trigger}
        </button>
        <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>
          {children}
        </Dialog>
      </>
    );
  }
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger aria-label={triggerLabel} className={triggerClassName}>
        {trigger}
      </P.Trigger>
      <P.Portal>
        <P.Positioner
          side="bottom"
          align={align}
          sideOffset={8}
          collisionPadding={16}
          collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "end" }}
          className="z-[70]"
        >
          <P.Popup
            aria-label={title}
            data-lenis-prevent
            className={cn(
              "max-h-[min(70vh,var(--available-height))] w-[min(360px,calc(100vw-32px))] max-w-[calc(100vw-32px)] origin-[var(--transform-origin)] overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-float outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0",
              className,
            )}
          >
            {children}
          </P.Popup>
        </P.Positioner>
      </P.Portal>
    </P.Root>
  );
}
