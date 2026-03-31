import Link from "next/link";
import { Clock, Users, Star, Zap, Shield, ArrowRight, MapPin } from "lucide-react";

import Navbar from "@/components/navbar";
import AboutSection from "@/components/about-section";
import HowItWorks from "@/components/how-it-works";
import CTASection from "@/components/cta-section";
import FAQSection from "@/components/faq-section";
import Footer from "@/components/footer";
import HeroSearchForm from "@/components/hero-search-form";
import DiscountPopup from "@/components/discount-popup";
import { POPULAR_ROUTES } from "@/lib/constants";
import { getTomorrowDateInput } from "@/lib/date";
import { formatCurrency } from "@/lib/formatters";

export default function Home() {
  const tomorrow = getTomorrowDateInput();

  const trustBadges = [
    { icon: Star, value: "4.9/5", label: "Rider rating" },
    { icon: Users, value: "5,000+", label: "Happy travellers" },
    { icon: Zap, value: "90s", label: "Avg. booking" },
    { icon: Shield, value: "100%", label: "Secure payments" },
  ];

  return (
    <>
      <Navbar />

      <main>
        <DiscountPopup />
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative min-h-[90vh] overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col">
          {/* Background layers */}
          <div className="pointer-events-none absolute inset-0">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 via-transparent to-slate-900/20" />
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pt-14 pb-20 lg:pt-20">
            {/* Eyebrow */}
            <div className="mb-8 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live seat data · Cambodia
              </span>
            </div>

            {/* Main heading + search grid */}
            <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
              <HeroSearchForm />

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {trustBadges.map(({ icon: Icon, value, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                  >
                    <Icon className="size-4 text-emerald-400" />
                    <div>
                      <p className="text-lg font-bold text-white">{value}</p>
                      <p className="text-[0.65rem] uppercase tracking-wider text-white/50">
                        {label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white to-transparent" />
        </section>

        {/* ── POPULAR ROUTES ────────────────────────────────────────────── */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            {/* Section header */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-emerald-600">
                  Popular trips
                </p>
                <h2
                  className="font-serif text-4xl font-bold text-slate-900 sm:text-5xl"
                >
                  Routes people love
                </h2>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-slate-500">
                The most-booked journeys across Cambodia — ready to search in one click.
              </p>
            </div>

            {/* Route cards */}
            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {POPULAR_ROUTES.map((route, i) => (
                <Link
                  key={`${route.from}-${route.to}`}
                  href={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&date=${tomorrow}&passengers=1`}
                  className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/40"
                >
                  {/* Index number watermark */}
                  <span className="pointer-events-none absolute right-6 top-5 font-serif text-6xl font-bold text-slate-100 select-none transition-colors duration-300 group-hover:text-emerald-50">
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Route */}
                  <div className="relative flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        From
                      </p>
                      <p className="mt-0.5 text-xl font-bold text-slate-900">{route.from}</p>
                    </div>

                    <div className="flex size-9 items-center justify-center rounded-full bg-emerald-50 transition-all duration-300 group-hover:bg-emerald-500 group-hover:scale-110">
                      <ArrowRight className="size-4 text-emerald-600 transition-colors duration-300 group-hover:text-white" />
                    </div>

                    <div className="flex-1 text-right">
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        To
                      </p>
                      <p className="mt-0.5 text-xl font-bold text-slate-900">{route.to}</p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="relative my-5 h-px bg-slate-100">
                    <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white px-3 py-0.5 text-[0.65rem] font-medium uppercase tracking-widest text-slate-400">
                      {route.duration}
                    </span>
                  </div>

                  {/* Price row */}
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="size-3.5" />
                      Daily departures
                    </div>
                    <p className="text-lg font-bold text-slate-900">
                      from{" "}
                      <span className="text-emerald-600">{formatCurrency(route.fare)}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURE STRIP ─────────────────────────────────────────────── */}
        <section className="border-y border-slate-100 bg-slate-50 py-14">
          <div className="mx-auto max-w-7xl px-5">
            <div className="grid gap-10 sm:grid-cols-3">
              {[
                {
                  icon: Zap,
                  title: "Instant confirmation",
                  body: "Your booking is confirmed the moment you tap — no waiting, no uncertainty.",
                },
                {
                  icon: MapPin,
                  title: "Live seat maps",
                  body: "Every seat refreshes in real time so you always see what's available right now.",
                },
                {
                  icon: Shield,
                  title: "Secure & simple",
                  body: "Bank-grade encryption keeps your payment and details safe, every time.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
                    <Icon className="size-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REMAINING SECTIONS (unchanged components) ─────────────────── */}
        <AboutSection />
        <HowItWorks />
        <CTASection />
        <FAQSection />
        <Footer />
      </main>
    </>
  );
}
