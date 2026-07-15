import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const channels = [
  {
    icon: Phone,
    title: "Phone",
    value: "+855 12 345 678",
    href: "tel:+85512345678",
  },
  {
    icon: Mail,
    title: "Email",
    value: "support@cambodiabus.kh",
    href: "mailto:support@cambodiabus.kh",
  },
  {
    icon: MapPin,
    title: "Office",
    value: "Phnom Penh, Cambodia",
    href: undefined,
  },
];

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50">
        <section className="bg-gradient-to-r from-red-700 to-orange-500 py-16 text-white">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold sm:text-4xl">Contact Us</h1>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Have a question about a booking, a route, or your account? Reach us any of the ways
              below.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {channels.map((c) => {
              const Icon = c.icon;
              const content = (
                <>
                  <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-50">
                    <Icon className="size-5 text-indigo-600" />
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900">{c.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{c.value}</p>
                </>
              );
              return c.href ? (
                <a
                  key={c.title}
                  href={c.href}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {content}
                </a>
              ) : (
                <div key={c.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  {content}
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-2xl border border-indigo-100 bg-indigo-50 p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              Already have a booking question?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Log in and chat directly with our support team for the fastest response — available
              06:00–22:00 daily.
            </p>
            <Link
              href="/support"
              className="mt-4 inline-block rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Open Support Chat
            </Link>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
