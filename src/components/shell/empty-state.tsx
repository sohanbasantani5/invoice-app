import type { LucideIcon } from "lucide-react";

/** One icon, one sentence, one button (02 §5). */
export function EmptyState({ icon: Icon, text, action }: { icon: LucideIcon; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border-strong px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-ink-3">
        <Icon className="size-5 stroke-[1.5]" aria-hidden />
      </span>
      <p className="max-w-sm text-ink-2">{text}</p>
      {action}
    </div>
  );
}
