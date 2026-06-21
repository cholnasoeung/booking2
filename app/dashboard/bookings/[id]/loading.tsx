export default function BookingDetailLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Back link skeleton */}
        <div className="h-5 w-36 animate-pulse rounded-full bg-slate-200" />

        {/* ── Main ticket card skeleton ── */}
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-indigo-100/50 border border-indigo-100/60">

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="h-3 w-20 animate-pulse rounded bg-white/20" />
                <div className="h-4 w-48 animate-pulse rounded bg-white/15" />
              </div>
              <div className="h-7 w-24 animate-pulse rounded-full bg-white/20" />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-white/20" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-28 animate-pulse rounded bg-white/20" />
                <div className="h-5 w-5 animate-pulse rounded bg-white/15" />
                <div className="h-7 w-28 animate-pulse rounded bg-white/20" />
              </div>
            </div>
            <div className="mt-1.5 h-4 w-40 animate-pulse rounded bg-white/15" />
          </div>

          {/* Perforation */}
          <div className="relative flex h-5 items-center bg-white">
            <div className="absolute -left-2.5 h-5 w-5 rounded-full bg-slate-100" />
            <div className="mx-6 flex-1 border-t-2 border-dashed border-slate-200" />
            <div className="absolute -right-2.5 h-5 w-5 rounded-full bg-slate-100" />
          </div>

          {/* Body */}
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
            <div className="space-y-5 min-w-0">

              {/* Journey timeline */}
              <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3.5">
                <div className="space-y-1.5 text-center min-w-[64px]">
                  <div className="h-7 w-14 animate-pulse rounded bg-indigo-200/60 mx-auto" />
                  <div className="h-3 w-10 animate-pulse rounded bg-indigo-200/40 mx-auto" />
                </div>
                <div className="flex flex-1 items-center gap-1.5">
                  <div className="h-px flex-1 bg-indigo-200" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-indigo-200/70" />
                  <div className="h-px flex-1 bg-indigo-200" />
                </div>
                <div className="space-y-1.5 text-center min-w-[64px]">
                  <div className="h-7 w-14 animate-pulse rounded bg-indigo-200/60 mx-auto" />
                  <div className="h-3 w-10 animate-pulse rounded bg-indigo-200/40 mx-auto" />
                </div>
              </div>

              {/* Info tiles */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                    <div className="mt-0.5 h-4 w-4 animate-pulse rounded bg-slate-200 shrink-0" />
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="h-2.5 w-10 animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Fare card */}
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-16 animate-pulse rounded bg-indigo-200/60" />
                    <div className="h-9 w-28 animate-pulse rounded bg-indigo-300/40" />
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="h-3 w-14 animate-pulse rounded bg-indigo-200/50 ml-auto" />
                    <div className="h-5 w-16 animate-pulse rounded bg-indigo-200/50 ml-auto" />
                  </div>
                </div>
              </div>
            </div>

            {/* QR code placeholder */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="rounded-2xl border-2 border-indigo-100 bg-indigo-50 p-3">
                <div className="h-[180px] w-[180px] animate-pulse rounded-lg bg-indigo-200/50" />
              </div>
              <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        </div>

        {/* ── Passenger list skeleton ── */}
        <div className="rounded-3xl border border-slate-100 bg-white shadow-md p-6">
          <div className="mb-4 flex items-center gap-2">
            <div className="h-5 w-5 animate-pulse rounded bg-indigo-200" />
            <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5">
                <div className="h-9 w-9 animate-pulse rounded-full bg-indigo-100 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-48 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="space-y-1 text-right shrink-0">
                  <div className="h-2.5 w-8 animate-pulse rounded bg-slate-200 ml-auto" />
                  <div className="h-4 w-8 animate-pulse rounded bg-indigo-200 ml-auto" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Action buttons skeleton ── */}
        <div className="flex flex-wrap gap-3">
          <div className="h-10 w-40 animate-pulse rounded-full bg-indigo-200" />
          <div className="h-10 w-32 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
