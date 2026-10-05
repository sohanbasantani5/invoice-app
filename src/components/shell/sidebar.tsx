"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV, isActive } from "./nav";
import { ThemeToggle } from "./theme-toggle";
import { openCommandMenu } from "./command-menu-events";
import { signOut } from "@/app/(auth)/actions";

const KEY = "sidebar-collapsed";
const listeners = new Set<() => void>();
function readCollapsed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}
function setCollapsed(v: boolean) {
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function Sidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);

  const item = cn(
    "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm",
    collapsed && "justify-center px-0",
  );
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface px-3 py-4 transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("mb-5 flex items-center gap-2 px-1", collapsed && "justify-center px-0")}>
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent font-heading text-sm font-semibold text-on-accent"
        >
          {(businessName || "I").slice(0, 1).toUpperCase()}
        </span>
        {!collapsed && (
          <span className="truncate font-heading text-[0.9375rem] font-semibold">
            {businessName || "Invoices"}
          </span>
        )}
      </div>

      <Link
        href="/invoices/new"
        aria-label={collapsed ? "New invoice" : undefined}
        className={cn(item, "mb-2 bg-accent font-medium text-on-accent hover:bg-accent-hover")}
      >
        <Plus className="size-[18px] stroke-[1.75]" aria-hidden />
        {!collapsed && "New invoice"}
      </Link>
      <button
        type="button"
        onClick={openCommandMenu}
        aria-label={collapsed ? "Search" : undefined}
        className={cn(item, "mb-4 text-ink-3 hover:bg-surface-2 hover:text-ink")}
      >
        <Search className="size-[18px] stroke-[1.5]" aria-hidden />
        {!collapsed && (
          <>
            <span>Search</span>
            <kbd className="ml-auto rounded border border-border px-1.5 font-sans text-[11px] text-ink-3">
              Ctrl K
            </kbd>
          </>
        )}
      </button>

      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              aria-label={collapsed ? label : undefined}
              className={cn(
                item,
                active
                  ? "bg-accent-soft font-medium text-accent"
                  : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              <Icon className="size-[18px] stroke-[1.5]" aria-hidden />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-0.5">
        <ThemeToggle showLabel={!collapsed} className={cn(collapsed && "justify-center px-0")} />
        <form action={signOut}>
          <button
            type="submit"
            aria-label={collapsed ? "Sign out" : undefined}
            className={cn(item, "w-full text-ink-2 hover:bg-surface-2 hover:text-ink")}
          >
            <LogOut className="size-[18px] stroke-[1.5]" aria-hidden />
            {!collapsed && "Sign out"}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(item, "text-ink-3 hover:bg-surface-2 hover:text-ink")}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-[18px] stroke-[1.5]" aria-hidden />
          ) : (
            <PanelLeftClose className="size-[18px] stroke-[1.5]" aria-hidden />
          )}
          {!collapsed && "Collapse"}
        </button>
      </div>
    </aside>
  );
}
