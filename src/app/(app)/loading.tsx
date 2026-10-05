import { Skeleton } from "@/components/ui/skeleton";

/** Shown while any app page streams in: header, 4 cards, a list. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6" role="status" aria-label="Loading">
      <Skeleton className="mb-2 h-9 w-48" />
      <Skeleton className="mb-8 h-4 w-72 max-w-full" />
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-5" />
        ))}
      </div>
    </div>
  );
}
