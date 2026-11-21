import { ResetForm } from "./reset-form";

export const metadata = { title: "Set a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <ResetForm token={token ?? ""} />
    </main>
  );
}
