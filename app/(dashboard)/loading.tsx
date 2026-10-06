// Shown instantly while a dashboard page loads on the server (Next.js wraps
// the page in a Suspense boundary with this as the fallback). Grey blocks
// shaped like the real page, so it doesn't jump when the content arrives.
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-busy="true" aria-label="Loading">
      <div className="mb-8 space-y-3">
        <div className="h-7 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <div className="mb-6 h-9 w-full animate-pulse rounded-md bg-muted" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
