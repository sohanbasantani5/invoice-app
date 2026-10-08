import { LoginForm } from "./login-form";
import { IntroArt } from "./intro-art";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import Link from "next/link";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/dashboard";
  const error = typeof sp.error === "string" ? sp.error.slice(0, 200) : undefined;

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative flex flex-col px-4 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-heading text-[0.9375rem] font-semibold">
            <span aria-hidden className="grid size-7 place-items-center rounded-lg bg-accent text-xs text-on-accent">
              ₹
            </span>
            Invoices
          </span>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <LoginForm next={next} initialError={error} />
        </div>
        <div className="space-y-2 text-center"><p className="text-caption">GST-ready invoices for Indian freelancers.</p><p className="text-caption"><Link href="/privacy" className="hover:text-accent">Privacy</Link><span className="mx-2">·</span><Link href="/terms" className="hover:text-accent">Terms</Link></p></div>
      </section>
      <section className="hidden items-center justify-center border-l border-border bg-surface-2 p-12 lg:flex">
        <div className="w-full max-w-md">
          <IntroArt />
          <p className="mt-10 text-center font-heading text-lg font-medium text-ink-2">
            Bill a repeat client in under a minute.
          </p>
        </div>
      </section>
    </main>
  );
}
