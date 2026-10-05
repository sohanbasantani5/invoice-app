"use client";

import { Command } from "cmdk";
import { commandSearch } from "@/lib/actions/library";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Moon, Pencil, Plus, UserPlus } from "lucide-react";
import { useTheme } from "next-themes";
import { NAV } from "./nav";
import { OPEN_COMMAND_MENU } from "./command-menu-events";


export type CommandSearchResult = { id: string; label: string; hint: string; href: string; editHref?: string };

function isTyping(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null;
  return !!t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));
}

/** Global command menu (Ctrl+K). Uses server search for invoices/clients. */
export function CommandMenu({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommandSearchResult[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTyping(e)) {
        e.preventDefault();
        router.push("/invoices/new");
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_MENU, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_MENU, onOpen);
    };
  }, [router]);

  useEffect(() => {
    if (query.trim().length < 1) return;
    let cancelled = false;
    const t = setTimeout(() => {
      commandSearch(query.trim())
        .then((r) => !cancelled && setResults(r))
        .catch(() => {});
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const itemCls =
    "flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-ink-2 data-[selected=true]:bg-surface-2 data-[selected=true]:text-ink [&_svg]:size-4 [&_svg]:stroke-[1.5]";
  const groupCls =
    "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-ink-3";

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
      label="Command menu"
      overlayClassName="fixed inset-0 z-50 bg-ink/20 backdrop-blur-[1px]"
      contentClassName="fixed top-[15vh] left-1/2 z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-float animate-in fade-in-0 zoom-in-[0.98] duration-200"
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Search or jump to…"
        className="h-12 w-full border-b border-border bg-transparent px-4 text-[0.9375rem] outline-none"
      />
      <Command.List data-lenis-prevent className="max-h-[50vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-6 text-center text-sm text-ink-3">No results.</Command.Empty>
        {query.trim() && results.length > 0 && (
          <Command.Group heading="Results" className={groupCls}>
            {results.map((r) => (
              <Fragment key={r.id}>
                <Command.Item value={`${r.label} ${r.hint} ${r.id}`} onSelect={() => go(r.href)} className={itemCls}>
                  <span className="truncate">{r.label}</span>
                  <span className="ml-auto truncate text-xs text-ink-3">{r.hint}</span>
                </Command.Item>
                {r.editHref && (
                  <Command.Item value={`edit ${r.label} ${r.hint} ${r.id}`} onSelect={() => go(r.editHref!)} className={itemCls}>
                    <Pencil aria-hidden /> <span className="truncate">Edit {r.label}</span>
                    <span className="ml-auto truncate text-xs text-ink-3">{r.hint}</span>
                  </Command.Item>
                )}
              </Fragment>
            ))}
          </Command.Group>
        )}
        <Command.Group heading="Actions" className={groupCls}>
          <Command.Item onSelect={() => go("/invoices/new")} className={itemCls}>
            <Plus aria-hidden /> New invoice
            <kbd className="ml-auto text-[11px] text-ink-3">N</kbd>
          </Command.Item>
          <Command.Item onSelect={() => go("/clients?new=1")} className={itemCls}>
            <UserPlus aria-hidden /> Add client
          </Command.Item>
          <Command.Item
            onSelect={() => {
              setTheme(resolvedTheme === "dark" ? "light" : "dark");
              setOpen(false);
            }}
            className={itemCls}
          >
            <Moon aria-hidden /> Toggle dark mode
          </Command.Item>
        </Command.Group>
        <Command.Group heading="Go to" className={groupCls}>
          {NAV.map(({ href, label, icon: Icon }) => (
            <Command.Item key={href} onSelect={() => go(href)} className={itemCls}>
              <Icon aria-hidden /> {label}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}