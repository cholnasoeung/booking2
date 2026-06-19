import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

import Navbar from "@/components/navbar";
import Providers from "@/components/providers";
import AnalyticsTracker from "@/components/analytics-tracker";
import { APP_NAME } from "@/lib/constants";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} | Bus Tickets Across Cambodia`,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Search bus routes, pick your seats, and manage bookings with a RedBus-inspired Cambodia travel app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable} antialiased`}
    >
      <body>
        <Providers>
          <AnalyticsTracker />
          <div className="relative min-h-screen overflow-x-clip">
            {/* Enhanced animated background */}
            <div className="pointer-events-none fixed inset-0 -z-10">
              {/* Primary gradient orbs */}
              <div className="absolute top-[-12rem] left-[-8rem] h-[26rem] w-[26rem] rounded-full bg-gradient-to-br from-amber-400/15 to-orange-500/10 blur-3xl animate-pulse-glow" />
              <div className="absolute top-[10rem] right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-gradient-to-bl from-orange-400/12 to-red-500/10 blur-3xl animate-pulse-glow delay-700" />
              <div className="absolute bottom-[-10rem] left-1/3 h-[20rem] w-[20rem] rounded-full bg-gradient-to-tr from-amber-300/10 to-amber-500/10 blur-3xl animate-pulse-glow delay-1000" />

              {/* Additional subtle accent orbs */}
              <div className="absolute top-[40%] left-[20%] h-[16rem] w-[16rem] rounded-full bg-red-400/5 blur-3xl animate-pulse-glow delay-300" />
              <div className="absolute bottom-[20%] right-[15%] h-[18rem] w-[18rem] rounded-full bg-orange-300/5 blur-3xl animate-pulse-glow delay-500" />

              {/* Decorative gradient mesh */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-transparent to-orange-50/30" />
            </div>

            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
