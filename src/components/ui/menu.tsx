"use client";

import { Menu as M } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";

/** Accessible dropdown menu (Base UI), styled to our tokens. */
export function Menu({
  trigger,
  triggerLabel,
  triggerClassName,
  children,
  side = "bottom",
  align = "end",
}: {
  trigger: React.ReactNode;
  triggerLabel: string;
  triggerClassName?: string;
  children: React.ReactNode;
  side?: "top" | "bottom";
  align?: "start" | "end";
}) {
  return (
    <M.Root>
      <M.Trigger aria-label={triggerLabel} className={triggerClassName}>
        {trigger}
      </M.Trigger>
      <M.Portal>
        <M.Positioner side={side} align={align} sideOffset={6} collisionPadding={16} collisionAvoidance={{ side: "flip", align: "shift", fallbackAxisSide: "end" }} className="z-[70]">
          <M.Popup className="min-w-48 max-w-[calc(100vw-32px)] origin-[var(--transform-origin)] rounded-xl border border-border bg-surface p-1 text-sm shadow-float outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0">
            {children}
          </M.Popup>
        </M.Positioner>
      </M.Portal>
    </M.Root>
  );
}

export function MenuItem({
  onClick,
  children,
  danger,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <M.Item
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:stroke-[1.5]",
        danger ? "text-danger" : "text-ink-2 data-[highlighted]:text-ink",
      )}
    >
      {children}
    </M.Item>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}
