import { BusFront, ShieldCheck, Clock3, Ticket } from "lucide-react";

const features = [
  {
    icon: BusFront,
    title: "Wide Bus Network",
    description: "Access 500+ buses across Cambodia with routes connecting all major cities and towns.",
  },
  {
    icon: Ticket,
    title: "Instant Booking",
    description: "Book your seats in seconds with instant confirmation and e-ticket delivery.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    description: "Multiple payment options with bank-grade security to keep your transactions safe.",
  },
  {
    icon: Clock3,
    title: "24/7 Support",
    description: "Our customer support team is available around the clock to assist you.",
  },
];

const stats = [
  { value: "500+", label: "Buses Daily" },
  { value: "50+", label: "Routes" },
  { value: "10K+", label: "Happy Travelers" },
  { value: "4.9", label: "User Rating" },
];

export default function AboutSection() {
  return (
    <section className="bg-slate-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Why choose us
          </p>
          <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Why Choose CambodiaBus?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-500">
            Cambodia&apos;s most trusted bus ticket booking platform with thousands of happy travelers.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50">
                  <Icon className="size-5 text-indigo-600" />
                </div>
                <h3 className="mt-3 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Stats bar */}
        <div className="mt-10 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-bold text-indigo-600">{value}</p>
                <p className="mt-1 text-sm text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
