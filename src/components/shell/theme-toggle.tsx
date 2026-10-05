"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={showLabel ? "Theme: switch light or dark mode" : "Switch light or dark mode"}
      className={cn(
        "flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <Sun className="size-[18px] stroke-[1.5] dark:hidden" aria-hidden />
      <Moon className="hidden size-[18px] stroke-[1.5] dark:block" aria-hidden />
      {showLabel && <span className="truncate">Theme</span>}
    </button>
  );
}
