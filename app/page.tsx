import Link from "next/link";
import { ArrowRight } from "lucide-react";

import Navbar from "@/components/navbar";
import SearchForm from "@/components/search-form";
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
  const heroHighlights = [
    { label: "Routes", value: "50+", description: "Cambodia-wide network" },
    { label: "Departure pairs", value: "120+", description: "Daily schedules" },
    { label: "Seats filled", value: "5k+", description: "Happy travellers" },
  ];
  const heroMiniHighlights = [
    { label: "Comfort score", value: "4.9/5", description: "From rider reviews" },
    { label: "Check-in speed", value: "90s", description: "Avg. boarding time" },
  ];

  return (
    <>
      <Navbar />
      <div className="pb-20">
        {/* Hero Section */}
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 text-white w-full">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
          <div className="pointer-events-none absolute -right-20 top-8 h-60 w-60 rounded-full bg-amber-400/15 blur-[90px]" />
          <div className="pointer-events-none absolute -left-5 bottom-0 h-44 w-44 rounded-full bg-cyan-400/20 blur-[90px]" />
          <div className="relative z-10 mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:py-16 lg:grid-cols-[1fr_1fr] lg:items-center lg:justify-center">
            <div className="space-y-4 max-w-xl">
              <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.4em] text-white/80">
                <span className="inline-flex items-center rounded-full border border-white/30 px-3 py-1 text-[0.65rem]">
                  Cambodia express
                </span>
                <span className="inline-flex items-center rounded-full border border-white/30 px-3 py-1 text-[0.65rem]">
                  Live seat map
                </span>
              </div>
              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                Color the next bus ride with bold gradients, fast confirmation, and calm live data.
              </h1>
              <p className="max-w-xl text-lg text-white/80">
                Our crews keep every coach sparkling, our sensors refresh seat boards in real time,
                and our confirmations land in your inbox instantly—so planning feels joyful instead
                of stressful.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/search?from=Phnom Penh&to=Siem Reap&date=${tomorrow}&passengers=1`}
                  className="inline-flex items-center gap-2 rounded-3xl bg-gradient-to-r from-amber-300 to-orange-500 px-5 py-3 text-sm font-semibold text-slate-900 shadow-2xl shadow-amber-500/40 transition hover:-translate-y-0.5 hover:scale-[1.02]"
                >
                  Search buses
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-2 rounded-3xl border border-white/60 px-5 py-3 text-sm font-semibold text-white/80 transition hover:border-white hover:text-white"
                >
                  View route map
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {heroHighlights.map((highlight) => (
                  <div
                    key={highlight.label}
                    className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm shadow-xl backdrop-blur"
                  >
                    <p className="text-2xl font-semibold text-white">{highlight.value}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                      {highlight.label}
                    </p>
                    <p className="text-xs text-white/70">{highlight.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-5">
              <div className="rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
                <SearchForm
                  compact
                  initialValues={{
                    from: "Phnom Penh",
                    to: "Siem Reap",
                    date: tomorrow,
                    passengers: 1,
                  }}
                  title="Quick search"
                  description="Swap, select a date, and take off in seconds."
                  className="bg-transparent border-0 text-white shadow-none"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {heroMiniHighlights.map((highlight) => (
                  <div
                    key={`${highlight.label}-mini`}
                    className="rounded-3xl border border-white/15 bg-white/5 p-4 text-sm shadow-xl backdrop-blur transition hover:border-amber-300/60"
                  >
                    <p className="text-2xl font-semibold text-white">{highlight.value}</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                      {highlight.label}
                    </p>
                    <p className="text-xs text-white/70">{highlight.description}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-sm text-white/80 shadow-2xl backdrop-blur">
                <p className="text-xs uppercase tracking-[0.5em] text-white/60">Live status</p>
                <p className="text-base font-semibold text-white">
                  Every seat is updated in real time—swap, confirm, and relax.
                </p>
              </div>
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
    </>
  );
}
