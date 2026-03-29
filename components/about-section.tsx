import { BusFront, ShieldCheck, Clock3, Ticket, HeadphonesIcon, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: BusFront,
    title: "Wide Bus Network",
    description: "Access 500+ buses across Cambodia with routes connecting all major cities and towns.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Ticket,
    title: "Instant Booking",
    description: "Book your seats in seconds with instant confirmation and e-ticket delivery to your email.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: ShieldCheck,
    title: "Secure Payments",
    description: "Multiple payment options with bank-grade security to keep your transactions safe.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Clock3,
    title: "24/7 Support",
    description: "Our customer support team is available around the clock to assist you with any queries.",
    color: "from-amber-500 to-orange-500",
  },
];

const steps = [
  {
    number: "01",
    title: "Search Routes",
    description: "Enter your departure city, destination, and travel date to see available buses.",
  },
  {
    number: "02",
    title: "Select Seats",
    description: "Choose your preferred seats from the interactive seat map and see the total price.",
  },
  {
    number: "03",
    title: "Book & Pay",
    description: "Fill passenger details and complete payment using your preferred payment method.",
  },
  {
    number: "04",
    title: "Get Confirmation",
    description: "Receive instant booking confirmation with e-ticket sent to your email.",
  },
];

export default function AboutSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Why Choose CambodiaBus?
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Cambodia's most trusted bus ticket booking platform with thousands of happy travelers
          </p>
        </div>

        {/* Features Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg hover:-translate-y-1"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} text-white shadow-md transition group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Stats Bar */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">500+</p>
              <p className="mt-1 text-sm text-slate-600">Buses Daily</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">50+</p>
              <p className="mt-1 text-sm text-slate-600">Routes</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">10K+</p>
              <p className="mt-1 text-sm text-slate-600">Happy Travelers</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">4.9</p>
              <p className="mt-1 text-sm text-slate-600">User Rating</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
