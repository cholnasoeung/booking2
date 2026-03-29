import { Search, MapPin, Calendar, CreditCard, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Search Buses",
    description: "Enter your route, date, and passengers to see all available buses",
  },
  {
    icon: Calendar,
    title: "Choose Date & Time",
    description: "Select your preferred departure time from multiple options",
  },
  {
    icon: MapPin,
    title: "Select Seats",
    description: "Pick your exact seats from the live seat map with real-time availability",
  },
  {
    icon: CreditCard,
    title: "Pay & Confirm",
    description: "Complete secure payment and get instant confirmation via email",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Book your bus tickets in 4 simple steps
          </p>
        </div>

        {/* Steps */}
        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={index} className="relative">
                {/* Step Number */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden h-0.5 flex-1 bg-indigo-200 lg:block" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <a
            href="/search"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3 font-semibold text-white shadow-lg transition hover:bg-indigo-700 hover:shadow-xl"
          >
            <CheckCircle className="h-5 w-5" />
            Start Booking Now
          </a>
        </div>
      </div>
    </section>
  );
}
