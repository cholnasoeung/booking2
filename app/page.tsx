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

  return (
    <>
      <Navbar />
      <main>
        <DiscountPopup />

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-r from-red-700 to-orange-500 pb-32 pt-14 text-white">
          {/* Angkor Wat + palm silhouette */}
          <div className="pointer-events-none absolute inset-0 flex items-end justify-end">
            <svg
              viewBox="0 0 540 310"
              xmlns="http://www.w3.org/2000/svg"
              fill="white"
              preserveAspectRatio="xMaxYMax meet"
              className="h-full w-auto max-w-[62%] opacity-[0.13]"
            >
              {/* Ground platform */}
              <rect x="0" y="280" width="540" height="30" />

              {/* ── Tower 1 – far left, short ── */}
              <rect x="28" y="258" width="66" height="22" />
              <rect x="36" y="244" width="50" height="14" />
              <rect x="44" y="232" width="34" height="12" />
              <polygon points="41,232 61,192 81,232" />
              <polygon points="57,210 61,182 65,210" />

              {/* ── Tower 2 – left medium ── */}
              <rect x="128" y="250" width="82" height="30" />
              <rect x="138" y="234" width="62" height="16" />
              <rect x="149" y="220" width="40" height="14" />
              <rect x="158" y="208" width="22" height="12" />
              <polygon points="152,208 169,162 186,208" />
              <polygon points="165,183 169,148 173,183" />

              {/* ── Tower 3 – center, tallest ── */}
              <rect x="228" y="240" width="114" height="40" />
              <rect x="240" y="222" width="90" height="18" />
              <rect x="253" y="206" width="64" height="16" />
              <rect x="264" y="192" width="42" height="14" />
              <rect x="273" y="180" width="24" height="12" />
              <polygon points="267,180 285,108 303,180" />
              <polygon points="281,134 285,92 289,134" />
              <polygon points="282,110 285,68 288,110" />

              {/* ── Tower 4 – right medium ── */}
              <rect x="360" y="250" width="82" height="30" />
              <rect x="370" y="234" width="62" height="16" />
              <rect x="381" y="220" width="40" height="14" />
              <rect x="390" y="208" width="22" height="12" />
              <polygon points="384,208 401,162 418,208" />
              <polygon points="397,183 401,148 405,183" />

              {/* ── Tower 5 – far right, short ── */}
              <rect x="456" y="258" width="66" height="22" />
              <rect x="464" y="244" width="50" height="14" />
              <rect x="472" y="232" width="34" height="12" />
              <polygon points="469,232 489,192 509,232" />
              <polygon points="485,210 489,182 493,210" />

              {/* Gallery walls */}
              <rect x="94" y="270" width="34" height="10" />
              <rect x="210" y="270" width="18" height="10" />
              <rect x="342" y="270" width="18" height="10" />
              <rect x="522" y="270" width="18" height="10" />

              {/* ── Palm tree – left ── */}
              <rect x="6" y="245" width="7" height="35" rx="2" />
              <ellipse cx="9" cy="243" rx="18" ry="5" transform="rotate(-45 9 243)" />
              <ellipse cx="9" cy="243" rx="17" ry="5" transform="rotate(-20 9 243)" />
              <ellipse cx="9" cy="243" rx="15" ry="5" transform="rotate(8 9 243)" />
              <ellipse cx="9" cy="243" rx="13" ry="4" transform="rotate(32 9 243)" />

              {/* ── Palm tree – right ── */}
              <rect x="527" y="245" width="7" height="35" rx="2" />
              <ellipse cx="530" cy="243" rx="18" ry="5" transform="rotate(-45 530 243)" />
              <ellipse cx="530" cy="243" rx="17" ry="5" transform="rotate(-20 530 243)" />
              <ellipse cx="530" cy="243" rx="15" ry="5" transform="rotate(8 530 243)" />
              <ellipse cx="530" cy="243" rx="13" ry="4" transform="rotate(32 530 243)" />
            </svg>
          </div>

          <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
            <h1 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
              Book Bus Tickets Online in Cambodia
            </h1>
            <p className="mt-2 text-base text-white/85 sm:text-lg">
              World&apos;s largest bus booking platform
            </p>
          </div>
        </section>

        {/* ── SEARCH FORM — floats over hero bottom ─────────────────────── */}
        <div className="relative z-10 -mt-20 pb-14">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <HeroSearchForm />
          </div>
        </div>

        {/* ── TRUST STATS ───────────────────────────────────────────────── */}
        <div className="border-y border-slate-100 bg-white py-7">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14">
              {[
                { icon: Star, value: "4.9 / 5", label: "Rider rating" },
                { icon: Users, value: "5,000+", label: "Happy travelers" },
                { icon: Zap, value: "~90s", label: "Avg. booking" },
                { icon: Shield, value: "100%", label: "Secure payments" },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <Icon className="size-5 text-red-500" />
                  <span className="font-bold text-slate-900">{value}</span>
                  <span className="text-sm text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── POPULAR ROUTES ────────────────────────────────────────────── */}
        <section className="bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-500">
                  Popular trips
                </p>
                <h2 className="text-3xl font-bold text-slate-900">Routes people love</h2>
              </div>
              <p className="max-w-xs text-sm text-slate-500">
                Most-booked journeys — ready to search in one click.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {POPULAR_ROUTES.map((route) => (
                <Link
                  key={`${route.from}-${route.to}`}
                  href={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&date=${tomorrow}&passengers=1`}
                  className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-red-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">From</p>
                      <p className="mt-0.5 text-lg font-bold text-slate-900">{route.from}</p>
                    </div>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 transition group-hover:border-red-200 group-hover:bg-red-50">
                      <ArrowRight className="size-4 text-slate-400 transition group-hover:text-red-500" />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400">To</p>
                      <p className="mt-0.5 text-lg font-bold text-slate-900">{route.to}</p>
                    </div>
                  </div>

                  <div className="my-4 h-px bg-slate-100" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock className="size-3.5" />
                      {route.duration}
                    </div>
                    <p className="text-sm font-semibold text-slate-700">
                      from <span className="text-red-500">{formatCurrency(route.fare)}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURE STRIP ─────────────────────────────────────────────── */}
        <section className="border-y border-slate-100 bg-white py-14">
          <div className="mx-auto max-w-7xl px-5">
            <div className="grid gap-6 sm:grid-cols-3">
              {[
                {
                  icon: Zap,
                  title: "Instant confirmation",
                  body: "Your booking is confirmed the moment you pay — no waiting, no uncertainty.",
                },
                {
                  icon: MapPin,
                  title: "Live seat maps",
                  body: "See exactly which seats are available in real time before you book.",
                },
                {
                  icon: Shield,
                  title: "Secure payments",
                  body: "Your payment details are encrypted and never stored on our servers.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <div key={title} className="flex gap-4 rounded-xl border border-slate-100 p-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <Icon className="size-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <AboutSection />
        <HowItWorks />
        <CTASection />
        <FAQSection />
        <Footer />
      </main>
    </>
  );
}
