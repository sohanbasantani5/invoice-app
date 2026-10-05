import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";
import { Sidebar } from "@/components/shell/sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { LazyCommandMenu } from "@/components/shell/command-menu-lazy";
import { SmoothScroll } from "@/components/motion/smooth-scroll";
import { SetupNeeded } from "@/components/shell/setup-needed";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, profileError } = await getSession();
  if (!user) redirect("/login");
  if (profileError) return <SetupNeeded detail={profileError} />;
  if (!profile?.onboarding_completed) redirect("/onboarding");

  return (
    <SmoothScroll>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:rounded-lg focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-on-accent"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh">
        <Sidebar businessName={profile.business_name ?? ""} />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 pb-24 outline-none lg:pb-0">{children}</main>
      </div>
      <BottomNav />
      <LazyCommandMenu />
    </SmoothScroll>
  );
}
