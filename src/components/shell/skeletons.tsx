import { Skeleton } from "@/components/ui/skeleton";

/** Route skeletons: same outer size as the real page, so nothing jumps when data arrives. */
export function ListSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-6" role="status" aria-label="Loading">
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="mb-5 h-10" />
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>
    </div>
  );
}

/** Invoice view: header row, status row, A4 paper. */
export function ViewSkeleton() {
  return (
    <div className="mx-auto max-w-[920px] px-4 py-6 md:px-6 md:py-8" role="status" aria-label="Loading">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="mt-5 h-10 w-72" />
      <div className="mt-6 rounded-xl bg-surface-2 p-3 sm:p-6">
        <Skeleton className="mx-auto aspect-[210/297] w-full max-w-[595px] bg-surface" />
      </div>
    </div>
  );
}

/** Editor: form column + paper column. */
export function EditorSkeleton() {
  return (
    <div className="lg:grid lg:h-dvh lg:grid-cols-[45fr_55fr]" role="status" aria-label="Loading">
      <div className="space-y-4 px-4 py-5 md:px-6">
        <Skeleton className="h-10 w-56" />
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="hidden bg-surface-2 p-8 lg:block">
        <Skeleton className="mx-auto aspect-[210/297] w-full max-w-[595px] bg-surface" />
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6" role="status" aria-label="Loading">
      <Skeleton className="mb-6 h-9 w-36" />
      <Skeleton className="mb-8 h-10" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}

/** Dashboard body (under the real header): 4 stat cards, a chart panel and a list. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[102px] rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

/** Filters + list, under the real page header. */
export function ListBodySkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton className="mb-5 h-10" />
      <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-6" />
        ))}
      </div>
    </div>
  );
}
