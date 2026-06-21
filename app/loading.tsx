export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20">
      {/* Navbar skeleton */}
      <div className="sticky top-0 z-40">
        <div className="h-[3px] w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <div className="border-b border-slate-200/70 bg-white/92 shadow-sm">
          <div className="mx-auto flex h-[62px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-2xl bg-indigo-200" />
              <div className="hidden space-y-1.5 sm:block">
                <div className="h-3.5 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-2.5 w-44 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
            <div className="hidden md:flex items-center gap-4">
              {[80, 64, 96, 72].map((w, i) => (
                <div key={i} className="h-8 animate-pulse rounded-xl bg-slate-100" style={{ width: w }} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 animate-pulse rounded-full bg-slate-100" />
              <div className="h-8 w-24 animate-pulse rounded-full bg-indigo-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Page content skeleton */}
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Card skeleton */}
        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white shadow-xl shadow-indigo-900/5">
          {/* Top banner */}
          <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />

          <div className="p-8 space-y-6">
            {/* Heading area */}
            <div className="space-y-3">
              <div className="h-8 w-64 animate-pulse rounded-xl bg-slate-200" />
              <div className="h-4 w-96 animate-pulse rounded bg-slate-100" />
            </div>

            {/* Grid of tiles */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 animate-pulse rounded-xl bg-indigo-100 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                      <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                </div>
              ))}
            </div>

            {/* Bottom row */}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-10 w-36 animate-pulse rounded-full bg-indigo-200" />
              <div className="h-10 w-28 animate-pulse rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating loading indicator */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3 shadow-xl shadow-indigo-900/10">
        <div className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
        </div>
        <p className="text-sm font-medium text-slate-700">Loading page…</p>
      </div>
    </div>
  );
}
