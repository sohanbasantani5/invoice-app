// Item-table columns shared by every template's HTML preview and PDF, so both always show the
// same columns (discount / GST columns appear only when the PaperModel says so).
import type { PaperModel, PaperRow } from "@/lib/invoice/paper-model";

export type ItemColKey = "n" | "desc" | "qty" | "rate" | "discount" | "taxable" | "gst" | "amount";
/** `mm` is the fixed PDF width; 0 = the flexible description column. */
export type ItemCol = { key: ItemColKey; label: string; align: "left" | "right"; mm: number };

export function itemCols(m: PaperModel): ItemCol[] {
  const cols: ItemCol[] = [
    { key: "n", label: "#", align: "left", mm: 7 },
    { key: "desc", label: "Description", align: "left", mm: 0 },
    { key: "qty", label: "Qty", align: "right", mm: 13 },
    { key: "rate", label: "Rate", align: "right", mm: 20 },
  ];
  if (m.showDiscount) cols.push({ key: "discount", label: "Disc.", align: "right", mm: 16 });
  if (m.showGst) cols.push({ key: "taxable", label: "Taxable", align: "right", mm: 20 }, { key: "gst", label: "GST", align: "right", mm: 10 });
  cols.push({ key: "amount", label: "Amount", align: "right", mm: 23 });
  return cols;
}

export function cellText(r: PaperRow, key: ItemColKey): string {
  switch (key) {
    case "n":
      return String(r.n);
    case "desc":
      return r.name;
    default:
      return r[key];
  }
}

/** The last totals row (balance due when there are payments, otherwise the grand total). */
export function amountDue(m: PaperModel) {
  return m.totals[m.totals.length - 1] ?? { label: "Total", value: "" };
}
