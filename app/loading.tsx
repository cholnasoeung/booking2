export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full rounded-[32px] border border-white/60 bg-white/88 p-8 text-center shadow-xl shadow-red-950/5">
        <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-primary/20" />
        <p className="mt-4 font-heading text-2xl font-semibold text-foreground">
          Loading your trip details
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Fetching routes, seats, and booking information.
        </p>
      </div>
    </div>
  );
}
