"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV, isActive, isEditorPath } from "./nav";

export function BottomNav() {
  const pathname = usePathname();
  if (isEditorPath(pathname)) return null;
  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
                active ? "font-medium text-accent" : "text-ink-3",
              )}
            >
              <Icon className="size-5 stroke-[1.5]" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
