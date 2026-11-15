import { Skeleton } from "./primitives";

/**
 * What a page looks like before its data arrives: the same header, figure row and table or list shape,
 * so nothing jumps when the real content replaces it.
 */
export function PageSkeleton({ figures = 0, rows = 5, label = "Loading" }: { figures?: number; rows?: number; label?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="mb-8 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      {figures > 0 && (
        <div className="mb-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: figures }).map((_, i) => (
            <div key={i} className="space-y-2 bg-surface p-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="border-b border-line bg-surface-2 px-5 py-3"><Skeleton className="h-3 w-40" /></div>
        <div className="divide-y divide-line">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-6 px-5 py-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
