import { BusFront, ShieldCheck, Clock3, Ticket, MapPin } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const values = [
  {
    icon: BusFront,
    title: "Wide Bus Network",
    description: "Access buses across Cambodia with routes connecting all major cities and towns.",
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

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white">
        <section className="bg-gradient-to-r from-red-700 to-orange-500 py-16 text-white">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
              <MapPin className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">About TKBus</h1>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Cambodia&apos;s trusted platform for booking intercity bus tickets online — connecting
              travelers to destinations across the country with a simple, secure booking experience.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900">Our Mission</h2>
          <p className="mt-3 leading-relaxed text-slate-600">
            Intercity bus travel in Cambodia has traditionally meant phone calls, physical ticket
            counters, and uncertainty about seat availability. TKBus was built to replace that
            with a single online platform where passengers can search routes, see real-time seat
            availability, and book a confirmed seat in minutes — while giving bus operators the tools
            to manage their fleet, drivers, and bookings from one dashboard.
          </p>
        </section>

        <section className="bg-slate-50 py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-center text-2xl font-bold text-slate-900">Why Travelers Choose Us</h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((v) => {
                const Icon = v.icon;
                return (
                  <div
                    key={v.title}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50">
                      <Icon className="size-5 text-indigo-600" />
                    </div>
                    <h3 className="mt-3 font-semibold text-slate-900">{v.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{v.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
