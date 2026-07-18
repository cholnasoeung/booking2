import Link from "next/link";
import { Clock, Zap, Shield, ArrowRight, MapPin } from "lucide-react";

import Navbar from "@/components/layout/navbar";
import AboutSection from "@/components/landing/about-section";
import HowItWorks from "@/components/landing/how-it-works";
import CTASection from "@/components/landing/cta-section";
import FAQSection from "@/components/landing/faq-section";
import Footer from "@/components/layout/footer";
import HeroSearchForm from "@/components/landing/hero-search-form";
import PromoBanner from "@/components/landing/promo-banner";
import { POPULAR_ROUTES } from "@/lib/utils/constants";
import { getTomorrowDateInput } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/formatters";

export default function Home() {
  const tomorrow = getTomorrowDateInput();

  return (
    <>
      <Navbar />
      <PromoBanner />
      <main>
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-zinc-900 pb-32 pt-14 text-white">
          {/* Red glow accents */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-red-700/30 blur-3xl" />
            <div className="absolute top-1/3 right-0 h-[28rem] w-[28rem] rounded-full bg-red-600/20 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-b from-red-950/40 via-zinc-900 to-zinc-900" />
          </div>

          {/* Bus, van & car silhouette — sits in the gap between the subtitle and the search card */}
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            <svg
              viewBox="0 0 640 276"
              xmlns="http://www.w3.org/2000/svg"
              fill="white"
              preserveAspectRatio="xMinYMax meet"
              className="absolute bottom-0 left-[34%] h-[186px] w-auto opacity-[0.16]"
            >
              {/* Road line */}
              <rect x="10" y="144" width="610" height="4" rx="2" />

              {/* ── Coach bus ── */}
              <rect x="40" y="50" width="160" height="26" rx="6" />
              <rect x="40" y="70" width="190" height="55" rx="8" />
              <rect x="212" y="96" width="10" height="16" rx="2" />
              <circle cx="75" cy="128" r="14" />
              <circle cx="195" cy="128" r="14" />
              <circle cx="75" cy="128" r="5" fill="black" fillOpacity="0.35" />
              <circle cx="195" cy="128" r="5" fill="black" fillOpacity="0.35" />

              {/* ── Van ── */}
              <polygon points="260,90 260,135 350,135 350,100 330,90" />
              <circle cx="280" cy="128" r="11" />
              <circle cx="335" cy="128" r="11" />
              <circle cx="280" cy="128" r="4" fill="black" fillOpacity="0.35" />
              <circle cx="335" cy="128" r="4" fill="black" fillOpacity="0.35" />

              {/* ── Sedan car ── */}
              <path d="M395,135 L395,120 Q400,105 420,102 L440,90 Q456,85 476,90 L496,102 Q511,105 516,120 L516,135 Z" />
              <circle cx="416" cy="132" r="10" />
              <circle cx="491" cy="132" r="10" />
              <circle cx="416" cy="132" r="3.5" fill="black" fillOpacity="0.35" />
              <circle cx="491" cy="132" r="3.5" fill="black" fillOpacity="0.35" />
            </svg>
          </div>

          {/* Angkor Wat + palm silhouette */}
          <div className="pointer-events-none absolute inset-0 flex items-end justify-end">
            <svg
              viewBox="0 0 540 310"
              xmlns="http://www.w3.org/2000/svg"
              fill="white"
              preserveAspectRatio="xMaxYMax meet"
              className="h-full w-auto max-w-[62%] opacity-[0.08]"
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
        <div className="relative z-10 -mt-20 bg-zinc-900 pb-14">
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <HeroSearchForm />
          </div>
        </div>

        {/* ── POPULAR ROUTES ────────────────────────────────────────────── */}
        <section className="bg-zinc-900 py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-red-500">
                  Popular trips
                </p>
                <h2 className="text-3xl font-bold text-white">Routes people love</h2>
              </div>
              <p className="max-w-xs text-sm text-zinc-400">
                Most-booked journeys — ready to search in one click.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {POPULAR_ROUTES.map((route) => (
                <Link
                  key={`${route.from}-${route.to}`}
                  href={`/search?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&date=${tomorrow}&passengers=1`}
                  className="group rounded-xl border border-zinc-700 bg-zinc-800 p-5 shadow-sm transition hover:border-red-600/50 hover:shadow-md hover:shadow-red-900/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500">From</p>
                      <p className="mt-0.5 text-lg font-bold text-white">{route.from}</p>
                    </div>
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-600 bg-zinc-700 transition group-hover:border-red-600/50 group-hover:bg-red-500/10">
                      <ArrowRight className="size-4 text-zinc-500 transition group-hover:text-red-500" />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-widest text-zinc-500">To</p>
                      <p className="mt-0.5 text-lg font-bold text-white">{route.to}</p>
                    </div>
                  </div>

                  <div className="my-4 h-px bg-zinc-700" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Clock className="size-3.5" />
                      {route.duration}
                    </div>
                    <p className="text-sm font-semibold text-zinc-300">
                      from <span className="text-red-500">{formatCurrency(route.fare)}</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURE STRIP ─────────────────────────────────────────────── */}
        <section className="border-y border-zinc-700 bg-zinc-900 py-14">
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
                <div key={title} className="flex gap-4 rounded-xl border border-zinc-700 p-5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                    <Icon className="size-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400">{body}</p>
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
