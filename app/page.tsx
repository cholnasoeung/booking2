import Link from "next/link";
import { ArrowRight } from "lucide-react";

import SearchForm from "@/components/search-form";
import HeroSlider from "@/components/hero-slider";
import AboutSection from "@/components/about-section";
import HowItWorks from "@/components/how-it-works";
import CTASection from "@/components/cta-section";
import FAQSection from "@/components/faq-section";
import Footer from "@/components/footer";
import { POPULAR_ROUTES } from "@/lib/constants";
import { getTomorrowDateInput } from "@/lib/date";
import { formatCurrency } from "@/lib/formatters";

export default function Home() {
  const tomorrow = getTomorrowDateInput();

  return (
    <div className="pb-20">
      {/* Hero Slider Section */}
      <HeroSlider />

      {/* Search Section */}
      <section className="w-full bg-white px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16 -mt-4 relative z-30">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[32px] bg-white p-6 shadow-xl sm:p-8">
            <SearchForm
              initialValues={{
                from: "Phnom Penh",
                to: "Siem Reap",
                date: tomorrow,
                passengers: 1,
              }}
              title="Search buses across Cambodia"
              description="Choose your route, travel date, and passenger count to see departures that still have room."
            />
          </div>
        </div>
      </section>

      {/* Popular Routes Section */}
      <section className="mx-auto mt-12 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-slate-500">
                Popular trips
              </p>
              <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-slate-900">
                Quick routes travellers book the most
              </h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600">
              Seeded routes make it easy to explore the booking flow right away.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {POPULAR_ROUTES.map((route) => (
              <Link
                key={`${route.from}-${route.to}`}
                href={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&date=${tomorrow}&passengers=1`}
                className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-heading text-2xl font-semibold text-slate-900">
                    {route.from}
                  </p>
                  <ArrowRight className="size-5 text-indigo-600 transition group-hover:translate-x-1" />
                  <p className="font-heading text-2xl font-semibold text-slate-900">
                    {route.to}
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between text-sm">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                    {route.duration}
                  </span>
                  <span className="font-medium text-slate-900">
                    from {formatCurrency(route.fare)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <AboutSection />

      {/* How It Works */}
      <HowItWorks />

      {/* CTA Section */}
      <CTASection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <Footer />
    </div>
  );
}
