import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const TIERS = [
  { window: "48+ hours before departure", refund: "100%", tone: "bg-green-50 border-green-200 text-green-700" },
  { window: "24–48 hours before departure", refund: "75%", tone: "bg-amber-50 border-amber-200 text-amber-700" },
  { window: "4–24 hours before departure", refund: "50%", tone: "bg-amber-50 border-amber-200 text-amber-700" },
  { window: "Within 4 hours of departure", refund: "0%", tone: "bg-red-50 border-red-200 text-red-700" },
];

export default function RefundPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900">Refund Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: 2026</p>

          <p className="mt-6 text-sm leading-relaxed text-slate-600">
            The refund amount for a cancelled booking depends on how much time remains before the
            bus&apos;s scheduled departure at the moment you cancel:
          </p>

          <div className="mt-6 space-y-3">
            {TIERS.map((t) => (
              <div
                key={t.window}
                className={`flex items-center justify-between rounded-xl border p-4 ${t.tone}`}
              >
                <span className="text-sm font-medium">{t.window}</span>
                <span className="text-lg font-bold">{t.refund} Refund</span>
              </div>
            ))}
          </div>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-slate-600">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">How Refunds Are Processed</h2>
              <p className="mt-2">
                Approved refunds are returned to your original payment method (Stripe or ABA PayWay)
                within 5–7 business days. You can track the status of a refund from your{" "}
                <a href="/dashboard/bookings" className="font-medium text-indigo-600 hover:text-indigo-700">
                  My Bookings
                </a>{" "}
                page.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">Promo Codes</h2>
              <p className="mt-2">
                Promo codes and discounts applied at the time of booking are not reinstated upon
                cancellation, even for a 100% refund.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">Delays and Cancelled Trips</h2>
              <p className="mt-2">
                If a scheduled bus is cancelled or delayed by more than two hours by the operator, you
                are entitled to a full refund regardless of how close to departure it is, or the option
                to rebook a later trip at no additional cost.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">Questions</h2>
              <p className="mt-2">
                If you believe a refund was calculated incorrectly, contact our support team via{" "}
                <a href="/support" className="font-medium text-indigo-600 hover:text-indigo-700">
                  Support Chat
                </a>{" "}
                or{" "}
                <a
                  href="mailto:support@cambodiabus.kh"
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                >
                  support@cambodiabus.kh
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
