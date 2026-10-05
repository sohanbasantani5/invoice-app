import { redirect } from "next/navigation";
import { getProfile, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { ItemsLibrary } from "./items-library";

export const metadata = { title: "Items" };

export default async function ItemsPage() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");
  const [{ profile }, { data: items }] = await Promise.all([
    getProfile(),
    supabase.from("items").select("*").order("use_count", { ascending: false }).order("name"),
  ]);
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6">
      <PageHeader title="Items" description="Services you bill often. They autocomplete in the invoice editor." />
      <ItemsLibrary items={items ?? []} canTax={profile?.gst_status === "regular"} />
    </div>
  );
}
