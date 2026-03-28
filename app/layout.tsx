import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";

import Navbar from "@/components/navbar";
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
        <div className="relative min-h-screen overflow-x-clip">
          <div className="pointer-events-none fixed inset-0 -z-10">
            <div className="absolute top-[-12rem] left-[-8rem] h-[26rem] w-[26rem] rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute top-[10rem] right-[-6rem] h-[24rem] w-[24rem] rounded-full bg-amber-300/20 blur-3xl" />
            <div className="absolute bottom-[-10rem] left-1/3 h-[20rem] w-[20rem] rounded-full bg-orange-200/30 blur-3xl" />
          </div>
          <Navbar />
          <main className="relative">{children}</main>
        </div>
      </body>
    </html>
  );
}
