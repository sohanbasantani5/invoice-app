import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { SetupNeeded } from "@/components/shell/setup-needed";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata = { title: "Set up your business" };

export default async function OnboardingPage() {
  const { user, profile, profileError } = await getSession();
  if (!user) redirect("/login");
  if (profileError) return <SetupNeeded detail={profileError} />;
  if (profile?.onboarding_completed) redirect("/dashboard");
  return <OnboardingFlow userId={user.id} email={user.email ?? ""} profile={profile} />;
}
