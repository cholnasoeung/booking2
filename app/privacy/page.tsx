import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-500">Last updated: 2026</p>

          <div className="mt-8 space-y-8 text-sm leading-relaxed text-slate-600">
            <section>
              <h2 className="text-lg font-semibold text-slate-900">1. Information We Collect</h2>
              <p className="mt-2">
                When you create an account or make a booking, we collect your name, email address,
                phone number, and the passenger details you provide (name, age, gender) for each
                seat booked. If you sign in with Google, we receive your name and email from your
                Google account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">2. How We Use Your Information</h2>
              <p className="mt-2">
                We use your information to process bookings, send confirmation and reminder emails or
                SMS messages, provide customer support, and improve the platform. We do not sell your
                personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">3. Third-Party Services</h2>
              <p className="mt-2">
                We share the minimum information necessary with the following service providers to
                operate the platform:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Stripe and ABA PayWay — to process payments. We do not store your full card details.</li>
                <li>Resend — to deliver booking confirmations and account emails.</li>
                <li>Twilio — to deliver SMS notifications.</li>
                <li>Google — for sign-in, if you choose to use Google OAuth.</li>
                <li>MongoDB Atlas — our managed database provider, which stores your account and booking data in encrypted form.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">4. Data Security</h2>
              <p className="mt-2">
                Your data is transmitted over encrypted (HTTPS) connections and stored in an encrypted
                database. Passwords are hashed and never stored in plain text. Access to production
                systems is restricted to authorized personnel.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">5. Data Retention</h2>
              <p className="mt-2">
                We retain your account and booking history for as long as your account remains active,
                or as required to comply with legal and accounting obligations.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">6. Your Rights</h2>
              <p className="mt-2">
                You can review and update your personal information from your account settings at any
                time. To request deletion of your account and associated data, contact us using the
                details below.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-slate-900">7. Contact</h2>
              <p className="mt-2">
                Questions about this Privacy Policy can be sent to{" "}
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
