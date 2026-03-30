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
      <section className="w-full bg-white px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20 -mt-8 relative z-30">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[40px] bg-white p-8 shadow-2xl border border-slate-100/50 sm:p-10 lg:p-12">
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
      <section className="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[40px] border border-slate-200/50 bg-white p-8 shadow-xl sm:p-10 lg:p-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-indigo-600">
                Popular trips
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Quick routes travellers book the most
              </h2>
            </div>
            <p className="max-w-xl text-sm text-slate-600 leading-relaxed">
              Seeded routes make it easy to explore the booking flow right away.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {POPULAR_ROUTES.map((route) => (
              <Link
                key={`${route.from}-${route.to}`}
                href={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&date=${tomorrow}&passengers=1`}
                className="group rounded-[32px] border-2 border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-100/50"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-heading text-2xl font-bold text-slate-900">
                    {route.from}
                  </p>
                  <ArrowRight className="size-6 text-indigo-600 transition-all duration-300 group-hover:translate-x-2 group-hover:scale-110" />
                  <p className="font-heading text-2xl font-bold text-slate-900">
                    {route.to}
                  </p>
                </div>
                <div className="mt-7 flex items-center justify-between text-sm">
                  <span className="rounded-full bg-indigo-50 px-4 py-1.5 font-semibold text-indigo-700">
                    {route.duration}
                  </span>
                  <span className="font-bold text-slate-900 text-base">
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
