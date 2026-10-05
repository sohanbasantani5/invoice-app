"use client";

import { useId, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { controlCls } from "./field";

export type ComboOption<T> = { id: string; label: string; hint?: string; value: T };

/** Case-insensitive: prefix matches first, then "contains" matches; input order kept within each group. */
export function rankMatches<T>(options: ComboOption<T>[], query: string, limit = 8): ComboOption<T>[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, limit);
  const prefix: ComboOption<T>[] = [];
  const contains: ComboOption<T>[] = [];
  for (const o of options) {
    const l = o.label.toLowerCase();
    if (l.startsWith(q)) prefix.push(o);
    else if (l.includes(q)) contains.push(o);
  }
  return [...prefix, ...contains].slice(0, limit);
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-ink">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Free-text input with suggestions (02 §5): opens on focus/typing, arrow keys + Enter,
 * highlights matched letters, last option "+ Create “text”".
 */
export function Combobox<T>({
  id,
  value,
  onChange,
  options,
  onSelect,
  onCreate,
  createLabel = "Create",
  placeholder,
  className,
  inputClassName,
  ariaLabel,
  onKeyDown,
  onBlur,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: ComboOption<T>[];
  onSelect: (o: ComboOption<T>) => void;
  onCreate?: (text: string) => void;
  createLabel?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  ariaLabel?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}) {
  const autoId = useId();
  const listId = `${id ?? autoId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [typed, setTyped] = useState(false);

  const matches = useMemo(() => rankMatches(options, typed ? value : ""), [options, value, typed]);
  const exact = matches.some((m) => m.label.toLowerCase() === value.trim().toLowerCase());
  const showCreate = !!onCreate && value.trim() !== "" && !exact;
  const count = matches.length + (showCreate ? 1 : 0);
  const visible = open && count > 0;

  function choose(i: number) {
    if (i < matches.length) onSelect(matches[i]);
    else if (showCreate) onCreate?.(value.trim());
    setTyped(false);
    setOpen(false);
  }

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={visible ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        className={cn(controlCls, inputClassName)}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onBlur={() => {
          setTimeout(() => setOpen(false), 120);
          setTyped(false);
          onBlur?.();
        }}
        onChange={(e) => {
          setTyped(true);
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (visible && e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % count);
          } else if (visible && e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + count) % count);
          } else if (visible && e.key === "Enter" && typed) {
            e.preventDefault();
            choose(active);
          } else if (e.key === "Escape" && visible) {
            e.preventDefault();
            setOpen(false);
          } else {
            onKeyDown?.(e);
          }
        }}
      />
      {visible && (
        <ul
          id={listId}
          role="listbox"
          data-lenis-prevent
          className="absolute top-full right-0 left-0 z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-float"
        >
          {matches.map((m, i) => (
            <li
              key={m.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(i);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-ink-2",
                i === active && "bg-surface-2 text-ink",
              )}
            >
              <span className="truncate">
                <Highlight text={m.label} query={value} />
              </span>
              {m.hint && <span className="tnum shrink-0 text-xs text-ink-3">{m.hint}</span>}
            </li>
          ))}
          {showCreate && (
            <li
              id={`${listId}-${matches.length}`}
              role="option"
              aria-selected={active === matches.length}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(matches.length);
              }}
              onMouseEnter={() => setActive(matches.length)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-accent",
                active === matches.length && "bg-accent-soft",
              )}
            >
              <Plus className="size-4 stroke-[1.5]" aria-hidden /> {createLabel} “{value.trim()}”
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
