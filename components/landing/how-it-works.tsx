import Link from "next/link";
import { Search, MapPin, Calendar, CreditCard } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Search Buses",
    description: "Enter your route, date, and passengers to see all available buses.",
  },
  {
    icon: Calendar,
    title: "Choose Date & Time",
    description: "Select your preferred departure time from multiple daily options.",
  },
  {
    icon: MapPin,
    title: "Select Seats",
    description: "Pick your exact seats from the live seat map with real-time availability.",
  },
  {
    icon: CreditCard,
    title: "Pay & Confirm",
    description: "Complete secure payment and get instant confirmation via email.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Simple process
          </p>
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base text-slate-500">
            Book your bus ticket in 4 simple steps.
          </p>
        </div>

        {/* Steps */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-xl border border-slate-100 bg-slate-50 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="flex size-9 items-center justify-center rounded-lg bg-white border border-slate-200">
                    <Icon className="size-5 text-indigo-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Start Booking Now
          </Link>
        </div>
      </div>
    </section>
  );
}
