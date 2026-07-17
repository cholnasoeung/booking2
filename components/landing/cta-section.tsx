import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const benefits = [
  "Instant booking confirmation",
  "Best price guarantee",
  "24/7 customer support",
  "Secure payment options",
];

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-black via-zinc-950 to-red-950 py-16 sm:py-20 lg:py-24">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwLTItMi00LTItNHMyLTItNCAyLTRzLTItMi00LTJjMCAwIDItMiAyLTRzLTItMi00LTJjMCAwIDItMiAyLTRzLTItMi00LTJjMCAwIDItMiAyLTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L2c+PC9zdmc+')] opacity-10" />
      {/* Red glow accent */}
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-red-700/20 blur-3xl" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
            <CheckCircle2 className="h-4 w-4" />
            Trusted by 10,000+ Travelers
          </div>

          {/* Heading */}
          <h2 className="mt-6 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Ready to Start Your Journey?
          </h2>

          {/* Description */}
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-300">
            Join thousands of happy travelers who book their bus tickets with us. Fast, easy, and secure.
          </p>

          {/* Benefits List */}
          <div className="mx-auto mt-8 max-w-lg">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center justify-center gap-2 text-white">
                  <CheckCircle2 className="h-5 w-5 text-red-400" />
                  <span className="text-sm font-medium">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/search"
              className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-lg font-bold text-red-600 shadow-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            >
              Search Buses Now
              <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-3 rounded-full border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:border-white hover:bg-white/10"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
