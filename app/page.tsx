import Link from "next/link";
import { ArrowRight, MapPin, Clock, Users, Star, Zap, Shield } from "lucide-react";

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

  const trustBadges = [
    { icon: Star, value: "4.9/5", label: "Rider rating" },
    { icon: Users, value: "5,000+", label: "Happy travellers" },
    { icon: Zap, value: "90s", label: "Avg. boarding" },
    { icon: Shield, value: "100%", label: "Secure booking" },
  ];

  return (
    <>
      <Navbar />

      <main>
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative min-h-[92vh] overflow-hidden bg-[#0f0c1a] text-white flex flex-col">
          {/* Background layers */}
          <div className="pointer-events-none absolute inset-0">
            {/* Saffron glow – top right */}
            <div className="absolute -top-20 right-0 h-[520px] w-[520px] rounded-full bg-amber-500/20 blur-[120px]" />
            {/* Deep magenta glow – bottom left */}
            <div className="absolute bottom-0 -left-20 h-[400px] w-[400px] rounded-full bg-rose-700/15 blur-[100px]" />
            {/* Subtle center tint */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-950/10 to-[#0f0c1a]/80" />
            {/* Grain texture */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
                backgroundRepeat: "repeat",
                backgroundSize: "128px 128px",
              }}
            />
          </div>

          {/* Decorative dotted grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle, #f59e0b 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pt-14 pb-20 lg:pt-20">
            {/* Eyebrow */}
            <div className="mb-8 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-amber-300">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                Live seat data · Cambodia
              </span>
            </div>

            {/* Main heading + search grid */}
            <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              {/* Left: copy */}
              <div className="space-y-8">
                <h1
                  className="font-serif text-5xl font-bold leading-[1.07] tracking-tight text-white sm:text-6xl lg:text-7xl"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
                >
                  Travel{" "}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-amber-400">Cambodia</span>
                    <span className="absolute inset-x-0 bottom-1 h-[6px] -rotate-1 rounded bg-amber-400/20" />
                  </span>
                  <br />
                  without the{" "}
                  <span className="italic text-white/60">hassle.</span>
                </h1>

                <p className="max-w-md text-base leading-relaxed text-white/60">
                  Instant confirmation, real-time seat maps, and spotless coaches across 50+
                  routes. Book in seconds, board with confidence.
                </p>

                {/* CTA row */}
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href={`/search?from=Phnom Penh&to=Siem Reap&date=${tomorrow}&passengers=1`}
                    className="group inline-flex items-center gap-2.5 rounded-2xl bg-amber-400 px-6 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-amber-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-amber-400/40"
                  >
                    Search buses
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                  <Link
                    href="/about"
                    className="inline-flex items-center gap-2 text-sm font-medium text-white/50 underline-offset-4 transition hover:text-white/80 hover:underline"
                  >
                    View route map
                  </Link>
                </div>

                {/* Trust badges */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                  {trustBadges.map(({ icon: Icon, value, label }) => (
                    <div
                      key={label}
                      className="flex flex-col gap-1 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 backdrop-blur-sm"
                    >
                      <Icon className="size-3.5 text-amber-400/80" />
                      <p className="text-xl font-bold text-white">{value}</p>
                      <p className="text-[0.7rem] uppercase tracking-widest text-white/40">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: search card */}
              <div className="relative">
                {/* Decorative ring */}
                <div className="pointer-events-none absolute -inset-4 rounded-[44px] border border-amber-400/10" />

                <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-7 shadow-2xl backdrop-blur-xl">
                  {/* Card header */}
                  <div className="mb-6 flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-xl bg-amber-400/15">
                      <MapPin className="size-4 text-amber-400" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">Quick search</p>
                      <p className="text-xs text-white/40">Swap, pick a date, take off.</p>
                    </div>
                  </div>

                  {/* Force all child grids/columns to stack full-width */}
                  <div className="[&_form]:w-full [&_form>*]:w-full [&_.grid]:grid-cols-1 [&_.grid]:w-full [&_select]:w-full [&_input]:w-full [&_button[type=submit]]:w-full">
                    <SearchForm
                      compact
                      initialValues={{
                        from: "Phnom Penh",
                        to: "Siem Reap",
                        date: tomorrow,
                        passengers: 1,
                      }}
                      title=""
                      description=""
                      className="w-full border-0 bg-transparent p-0 shadow-none text-white"
                    />
                  </div>
                </div>

                {/* Live status pill */}
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-5 py-3.5 backdrop-blur-sm">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
                    </span>
                    <p className="text-xs font-medium text-white/70">
                      Seats updating live
                    </p>
                  </div>
                  <p className="text-xs text-white/30">120+ daily departures</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom fade */}
          <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-white to-transparent" />
        </section>

        {/* ── POPULAR ROUTES ────────────────────────────────────────────── */}
        <section className="bg-white py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            {/* Section header */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-amber-500">
                  Popular trips
                </p>
                <h2
                  className="font-serif text-4xl font-bold text-slate-900 sm:text-5xl"
                  style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
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
                  className="group relative overflow-hidden rounded-[28px] border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-100/60"
                >
                  {/* Index number watermark */}
                  <span className="pointer-events-none absolute right-6 top-5 font-serif text-7xl font-bold text-slate-100 select-none transition-colors duration-300 group-hover:text-amber-50">
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

                    <div className="flex size-9 items-center justify-center rounded-full bg-amber-400/10 transition-all duration-300 group-hover:bg-amber-400 group-hover:scale-110">
                      <ArrowRight className="size-4 text-amber-500 transition-colors duration-300 group-hover:text-slate-900" />
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
                      <span className="text-amber-600">{formatCurrency(route.fare)}</span>
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
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-400/15">
                    <Icon className="size-5 text-amber-600" />
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