import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Set a new password" };

export default async function ResetPage() {
  const { user } = await getSession();
  if (!user) redirect("/login?error=" + encodeURIComponent("Your reset link expired. Please request a new one."));
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <ResetForm />
    </main>
  );
}
