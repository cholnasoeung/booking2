export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero banner skeleton */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 animate-pulse rounded-2xl bg-white/20 shrink-0" />
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-white/20" />
                <div className="h-6 w-40 animate-pulse rounded bg-white/25" />
                <div className="h-3 w-32 animate-pulse rounded bg-white/15" />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-24 animate-pulse rounded-full bg-white/20" />
              <div className="h-9 w-20 animate-pulse rounded-full bg-white/15" />
            </div>
          </div>

          {/* Quick links skeleton */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 max-w-sm">
            {[80, 64, 72].map((w, i) => (
              <div key={i} className="flex flex-col items-center gap-2 rounded-2xl bg-white/10 px-4 py-3">
                <div className="h-8 w-8 animate-pulse rounded-xl bg-white/20" />
                <div className="h-3 animate-pulse rounded bg-white/20" style={{ width: w }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">

          {/* Bookings column */}
          <div className="space-y-5">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {["slate", "emerald", "indigo"].map((color, i) => (
                <div key={i} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <div className="h-3 w-16 animate-pulse rounded bg-slate-200" />
                  <div className="mt-1.5 h-7 w-10 animate-pulse rounded bg-slate-200" />
                </div>
              ))}
            </div>

            {/* Booking cards */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-md">
                <div className="h-1.5 w-full animate-pulse bg-gradient-to-r from-indigo-200 to-purple-200" />
                <div className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 animate-pulse rounded-2xl bg-indigo-100 shrink-0" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
                          <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
                          <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
                        </div>
                        <div className="flex gap-1.5">
                          <div className="h-5 w-16 animate-pulse rounded-full bg-slate-100" />
                          <div className="h-5 w-20 animate-pulse rounded-full bg-emerald-100" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="h-3 w-14 animate-pulse rounded bg-slate-100 ml-auto" />
                      <div className="h-7 w-20 animate-pulse rounded bg-indigo-100 ml-auto" />
                    </div>
                  </div>

                  {/* Info tiles */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                        <div className="h-4 w-4 animate-pulse rounded bg-slate-200 shrink-0" />
                        <div className="space-y-1.5">
                          <div className="h-2.5 w-8 animate-pulse rounded bg-slate-200" />
                          <div className="h-3.5 w-14 animate-pulse rounded bg-slate-200" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-slate-100" />

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <div className="h-8 w-28 animate-pulse rounded-full bg-indigo-100" />
                    <div className="h-8 w-28 animate-pulse rounded-full bg-slate-100" />
                    <div className="h-8 w-24 animate-pulse rounded-full bg-slate-100" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar cards */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-100 bg-white shadow-md p-5 space-y-3">
              <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-20 animate-pulse rounded-2xl bg-gradient-to-r from-indigo-100 to-purple-100" />
              <div className="space-y-2">
                {[100, 80, 90].map((w, i) => (
                  <div key={i} className="h-3 animate-pulse rounded bg-slate-100" style={{ width: `${w}%` }} />
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white shadow-md p-5 space-y-3">
              <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-9 animate-pulse rounded-full bg-indigo-100" />
            </div>
          </div>
        </div>
      </div>

      {/* Floating loading pill */}
      <div className="fixed bottom-6 right-6 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-white px-4 py-3 shadow-xl shadow-indigo-900/10">
        <div className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
        </div>
        <p className="text-sm font-medium text-slate-700">Loading…</p>
      </div>
    </div>
  );
}
