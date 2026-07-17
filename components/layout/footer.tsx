import Link from "next/link";
import { BusFront, Mail, Phone, MapPin } from "lucide-react";

const quickLinks = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQs", href: "/faq" },
  { label: "Blog", href: "/blog" },
];

const legalLinks = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Refund Policy", href: "/refund" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <BusFront className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-slate-900">
                  TKBus
                </h3>
                <p className="text-xs text-slate-600">Your Journey Starts Here</p>
              </div>
            </div>

            <p className="max-w-sm text-sm text-slate-600 leading-relaxed">
              Cambodia's leading bus ticket booking platform. Book your seats across 50+ routes with instant confirmation.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-indigo-600" />
                <span>+855 12 345 678</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-indigo-600" />
                <span>support@tkbus.kh</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-indigo-600" />
                <span>Phnom Penh, Cambodia</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-semibold text-slate-900">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-600 transition hover:text-indigo-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="mb-4 font-semibold text-slate-900">Legal</h4>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-600 transition hover:text-indigo-600"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-slate-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-slate-600">
              © {new Date().getFullYear()} TKBus. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/privacy" className="text-slate-600 hover:text-indigo-600">
                Privacy
              </Link>
              <span className="text-slate-300">|</span>
              <Link href="/terms" className="text-slate-600 hover:text-indigo-600">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
