import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-3xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <Card className="w-full border-white/60 bg-white/92 shadow-2xl shadow-red-950/10">
        <CardHeader>
          <CardTitle>We couldn&apos;t find that page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            The trip, booking, or page you were looking for may have moved or no
            longer exists.
          </p>
          <Link
            href="/"
            className="inline-flex rounded-full bg-primary px-4 py-2 font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-90"
          >
            Return home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
