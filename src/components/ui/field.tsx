import { cn } from "@/lib/utils";

export type Badge = "required" | "gst" | "optional";

const BADGE_TEXT: Record<Badge, string> = { required: "Required", gst: "GST", optional: "Optional" };

/** Label above the control, small badge, helper below; warning is amber, error is red. */
export function Field({
  label,
  htmlFor,
  badge,
  badgeHighlight = false,
  helper,
  warning,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  badge?: Badge;
  /** GST badge turns amber when the field is needed and empty (02 §5). */
  badgeHighlight?: boolean;
  helper?: React.ReactNode;
  warning?: string | null;
  error?: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const msgId = htmlFor ? `${htmlFor}-msg` : undefined;
  const message = error ?? warning ?? null;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-label text-ink-2">
          {label}
        </label>
        {badge && (
          <span
            className={cn(
              "text-[11px] leading-none",
              badge === "gst" && badgeHighlight ? "font-medium text-warning" : "text-ink-3",
            )}
          >
            {BADGE_TEXT[badge]}
          </span>
        )}
      </div>
      {children}
      {message ? (
        <p id={msgId} role={error ? "alert" : undefined} className={cn("text-xs", error ? "text-danger" : "text-warning")}>
          {message}
        </p>
      ) : helper ? (
        <p id={msgId} className="text-caption">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

export const controlCls =
  "h-10 w-full min-w-0 rounded-md border border-border bg-surface px-3 text-[0.9375rem] text-ink transition-[border-color,box-shadow] duration-150 outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(controlCls, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(controlCls, "h-auto min-h-20 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        controlCls,
        "appearance-none bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2216%22%20height=%2216%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%238A8D94%22%20stroke-width=%221.5%22><path%20d=%22m6%209%206%206%206-6%22/></svg>')] bg-[position:right_10px_center] bg-no-repeat pr-9",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/** Accessible on/off switch built on a native checkbox. */
export function Switch({
  label,
  description,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type"> & { label: string; description?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4 py-1", className)}>
      <span className="min-w-0">
        <span className="block text-sm text-ink">{label}</span>
        {description && <span className="block text-caption">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" {...props} />
        <span className="h-5 w-9 rounded-full bg-border-strong transition-colors duration-150 peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent" />
        <span className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-150 peer-checked:translate-x-4" />
      </span>
    </label>
  );
}

export function Card({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-xl border border-border bg-surface", className)} {...props} />;
}
