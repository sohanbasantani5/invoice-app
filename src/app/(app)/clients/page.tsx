import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/shell/empty-state";
import { AddClientButton } from "./add-client";
import { formatMoney } from "@/lib/format";
import { stateName } from "@/lib/india/states";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const sp = await searchParams;
  const [{ data: clients }, { data: totals }] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("invoices").select("client_id, total_paise, currency").not("status", "in", "(draft,cancelled)").not("client_id", "is", null),
  ]);
  const billed = new Map<string, { paise: number; count: number }>();
  for (const t of totals ?? []) {
    if (!t.client_id || t.currency !== "INR") continue;
    const b = billed.get(t.client_id) ?? { paise: 0, count: 0 };
    b.paise += t.total_paise;
    b.count += 1;
    billed.set(t.client_id, b);
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
      <PageHeader title="Clients" actions={<AddClientButton openInitially={sp.new === "1"} />} />
      {(clients ?? []).length === 0 ? (
        <EmptyState icon={Users} text="No clients yet. They're saved automatically when you create an invoice, or add one now." action={<AddClientButton label="Add your first client" />} />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(clients ?? []).map((c) => {
            const b = billed.get(c.id);
            return (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="flex h-full flex-col gap-1 rounded-xl border border-border bg-surface p-4 hover:border-border-strong">
                  <span className="truncate font-medium">{c.name}</span>
                  <span className="truncate text-sm text-ink-3">
                    {[c.city, c.state_code ? stateName(c.state_code) : c.country !== "India" ? c.country : null].filter(Boolean).join(", ") || "No address"}
                    {c.gstin ? ` · ${c.gstin}` : ""}
                  </span>
                  <span className="tnum mt-2 text-sm text-ink-2">
                    {b ? `${formatMoney(b.paise)} billed · ${b.count} invoice${b.count === 1 ? "" : "s"}` : "Not billed yet"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
