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

export default function AboutSection() {
  return (
    <section className="bg-zinc-900 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-500">
            Why choose us
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Why Choose TKbus?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-zinc-400">
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
                className="rounded-xl border border-zinc-700 bg-zinc-800 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-red-600/50 hover:shadow-md hover:shadow-red-900/20"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
                  <Icon className="size-5 text-red-500" />
                </div>
                <h3 className="mt-3 font-semibold text-white">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
