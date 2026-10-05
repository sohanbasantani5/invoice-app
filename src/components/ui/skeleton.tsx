import { cn } from "@/lib/utils";

/** Thin grey bar placeholder. No spinners on full pages (05 Phase 6). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}
