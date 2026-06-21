"use client";

import Link from "next/link";
import { ArrowRight, Search, MapPin } from "lucide-react";
import { useState } from "react";
import { CITY_OPTIONS } from "@/lib/constants";
import { getTomorrowDateInput } from "@/lib/date";

export default function HeroSearchForm() {
  const tomorrow = getTomorrowDateInput();
  const [fromCity, setFromCity] = useState("Phnom Penh");
  const [toCity, setToCity] = useState("Siem Reap");
  const [travelDate, setTravelDate] = useState(tomorrow);
  const [passengers, setPassengers] = useState("1");
  const searchHref = `/search?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&date=${travelDate}&passengers=${passengers}`;

  return (
    <>
      {/* Left: copy */}
      <div className="space-y-8">
        <h1 className="font-serif text-5xl font-bold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Travel{" "}
          <span className="relative inline-block">
            <span className="relative z-10 text-indigo-400">Cambodia</span>
            <span className="absolute inset-x-0 bottom-1 h-[6px] -rotate-1 rounded bg-indigo-400/30" />
          </span>
          <br />
          <span className="text-white/90">in comfort & style</span>
        </h1>

        <p className="max-w-lg text-lg leading-relaxed text-white/70">
          Book bus tickets instantly with live seat selection. Secure payments, instant confirmation, and reliable service across Cambodia.
        </p>

        {/* CTA row */}
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={searchHref}
            className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg hover:from-indigo-600 hover:to-violet-700 transition-all duration-200 hover:-translate-y-0.5"
          >
            Search buses
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/60 underline-offset-4 transition hover:text-white/90 hover:underline"
          >
            Learn more
          </Link>
        </div>
      </div>

      {/* Right: Enhanced search card */}
      <div className="relative">
        {/* Glow effect */}
        <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-indigo-500/10 blur-2xl" />

        <div className="relative rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
          {/* Card header */}
          <div className="bg-white/5 border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/20">
                <MapPin className="size-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Find your bus
                </h3>
                <p className="text-xs text-white/50">
                  Search from 50+ routes across Cambodia
                </p>
              </div>
            </div>
          </div>

          {/* Search form container */}
          <div className="p-6">
            <div className="space-y-4">
              {/* From/To */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/70">From</label>
                  <select
                    value={fromCity}
                    onChange={(e) => setFromCity(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-slate-800 text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    {CITY_OPTIONS.map((city) => (
                      <option key={city} value={city} className="bg-slate-900 text-white">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/70">To</label>
                  <select
                    value={toCity}
                    onChange={(e) => setToCity(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-slate-800 text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    {CITY_OPTIONS.map((city) => (
                      <option key={city} value={city} className="bg-slate-900 text-white">
                        {city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Passengers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/70">Journey Date</label>
                  <input
                    type="date"
                    value={travelDate}
                    min={tomorrow}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-slate-800 text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all [color-scheme:dark]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-white/70">Passengers</label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                    className="w-full rounded-xl border border-white/20 bg-slate-800 text-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="1" className="bg-slate-900 text-white">1 Passenger</option>
                    <option value="2" className="bg-slate-900 text-white">2 Passengers</option>
                    <option value="3" className="bg-slate-900 text-white">3 Passengers</option>
                    <option value="4" className="bg-slate-900 text-white">4 Passengers</option>
                    <option value="5" className="bg-slate-900 text-white">5+ Passengers</option>
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <Link
                href={searchHref}
                className="block w-full rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold px-6 py-3.5 text-center text-sm hover:from-indigo-600 hover:to-violet-700 transition-all duration-200 shadow-lg hover:shadow-indigo-500/30"
              >
                <div className="flex items-center justify-center gap-2">
                  <Search className="size-4" />
                  Search available buses
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Live status indicator */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-indigo-400" />
            </span>
            <p className="text-xs font-medium text-white/70">
              Live seat availability
            </p>
          </div>
          <p className="text-xs text-white/40">120+ daily departures</p>
        </div>
      </div>
    </>
  );
}
