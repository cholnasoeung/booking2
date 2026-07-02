import Navbar from "@/components/layout/navbar";
import SupportChat from "@/components/common/support-chat";
import { getCurrentUser } from "@/lib/auth";

export default async function SupportPage() {
  const user = await getCurrentUser();

  return (
    <>
      <Navbar />
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Support</p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-foreground">
            We&apos;re here to help
          </h1>
          <p className="text-sm text-muted-foreground">
            Chat with our support team. Available 06:00 – 22:00 daily.
          </p>
        </div>

        {user ? (
          <SupportChat />
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
            <p className="text-slate-600">Please log in to start a support conversation.</p>
            <a
              href="/login?callbackUrl=%2Fsupport"
              className="inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
            >
              Login
            </a>
          </div>
        )}
      </div>
    </>
  );
}
