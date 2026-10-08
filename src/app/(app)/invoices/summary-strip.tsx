import { formatMoney } from "@/lib/format";
import type { InvoiceSummary } from "@/lib/invoice/summary";

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "danger" }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-label text-ink-3">{label}</p>
      <p className={`tnum mt-1.5 font-heading text-[1.375rem] leading-tight font-semibold ${tone === "danger" ? "text-danger" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-caption">{hint}</p>}
    </div>
  );
}

/** Four numbers for the filtered result, plus one caption that says exactly what they cover. */
export function SummaryStrip({
  summary,
  matching,
  truncated,
  filtered,
}: {
  summary: InvoiceSummary;
  matching: number;
  truncated: boolean;
  filtered: boolean;
}) {
  const notes = ["Totals cover issued invoices; drafts and cancelled are excluded."];
  if (summary.excludedDraftsCancelled) notes.push(`${summary.excludedDraftsCancelled} draft/cancelled left out.`);
  if (summary.otherCurrency) notes.push(`${summary.otherCurrency} in another currency not totalled.`);
  if (truncated) notes.push(`Totals are for the first ${summary.count} of ${matching} matches.`);

  return (
    <section aria-label="Filtered result summary" className="mb-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Total invoiced"
          value={formatMoney(summary.invoiced, summary.currency)}
          hint={`${summary.issued} issued invoice${summary.issued === 1 ? "" : "s"}`}
        />
        <Stat label="Amount received" value={formatMoney(summary.received, summary.currency)} />
        <Stat
          label="Outstanding"
          value={formatMoney(summary.outstanding, summary.currency)}
          hint={summary.open ? `${summary.open} open` : "Nothing due"}
        />
        <Stat
          label="TDS"
          value={formatMoney(summary.tds, summary.currency)}
          hint={summary.tdsPending ? `${formatMoney(summary.tdsPending)} pending` : summary.tds ? "All accounted" : "No TDS in view"}
        />
      </div>
      <p className="mt-2 text-caption">
        {filtered ? `${matching} match${matching === 1 ? "" : "es"}` : `${matching} invoice${matching === 1 ? "" : "s"}`}
        {truncated ? ` · showing the first ${summary.count}` : ""} · {notes.join(" ")}
      </p>
    </section>
  );
}
