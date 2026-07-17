import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-600">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. Acceptance of Terms</h2>
              <p className="mt-2">
                By creating an account or booking a ticket through TKbus, you agree to these
                Terms of Service. If you do not agree, please do not use the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">2. Accounts</h2>
              <p className="mt-2">
                You are responsible for keeping your account credentials secure and for all activity
                under your account. You may register with an email and password or sign in with
                Google. You must provide accurate passenger information at the time of booking.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. Bookings and Payment</h2>
              <p className="mt-2">
                A booking is confirmed only after successful payment. We accept payment via Stripe
                (international cards) and ABA PayWay (local payment methods). Seat availability is
                held temporarily while you complete payment and is released if payment is not
                completed within the hold window.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">4. Cancellations and Refunds</h2>
              <p className="mt-2">
                Cancellations are subject to our{" "}
                <a href="/refund" className="font-medium text-indigo-600 hover:text-indigo-700">
                  Refund Policy
                </a>
                . Refund eligibility depends on how close to departure the cancellation is made.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">5. Passenger Conduct</h2>
              <p className="mt-2">
                Passengers must arrive at the boarding point on time and comply with the operating bus
                company&apos;s onboard rules. TKbus is not liable for missed departures due to
                late arrival.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">6. Limitation of Liability</h2>
              <p className="mt-2">
                TKbus facilitates bookings between passengers and bus operators. We are not
                responsible for delays, route changes, or service issues caused by the operating bus
                company, though we will assist with rebooking or refunds where our policies apply.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">7. Changes to These Terms</h2>
              <p className="mt-2">
                We may update these Terms from time to time. Continued use of the platform after an
                update constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">8. Contact</h2>
              <p className="mt-2">
                Questions about these Terms can be sent to{" "}
                <a
                  href="mailto:support@tkbus.kh"
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                >
                  support@tkbus.kh
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
