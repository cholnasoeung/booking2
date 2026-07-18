"use client";

import Link from "next/link";
import { Search, ArrowLeftRight, BusFront, Calendar, Users } from "lucide-react";
import { useState } from "react";
import { CITY_OPTIONS } from "@/lib/utils/constants";
import { getTomorrowDateInput } from "@/lib/utils/date";

export default function HeroSearchForm() {
  const tomorrow = getTomorrowDateInput();
  const [fromCity, setFromCity] = useState("Phnom Penh");
  const [toCity, setToCity] = useState("Siem Reap");
  const [travelDate, setTravelDate] = useState(tomorrow);
  const [passengers, setPassengers] = useState("1");

  function swapCities() {
    setFromCity(toCity);
    setToCity(fromCity);
  }

  const searchHref = `/search?from=${encodeURIComponent(fromCity)}&to=${encodeURIComponent(toCity)}&date=${travelDate}&passengers=${passengers}`;

  const selectClass =
    "w-full cursor-pointer appearance-none border-0 bg-transparent p-0 text-sm font-semibold text-white focus:outline-none focus:ring-0 [color-scheme:dark]";

  return (
    <div>
      {/* Horizontal search bar */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800 shadow-xl shadow-red-950/20 sm:flex-row">
        {/* FROM */}
        <div className="flex flex-1 items-center gap-3 border-b border-zinc-700 px-5 py-4 sm:border-b-0 sm:border-r">
          <BusFront className="size-5 shrink-0 text-zinc-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500">From</p>
            <select
              value={fromCity}
              onChange={(e) => setFromCity(e.target.value)}
              className={selectClass}
            >
              {CITY_OPTIONS.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* SWAP */}
        <div className="hidden sm:flex w-14 shrink-0 items-center justify-center border-r border-zinc-700">
          <button
            type="button"
            onClick={swapCities}
            className="flex size-8 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700"
          >
            <ArrowLeftRight className="size-4" />
          </button>
        </div>

        {/* TO */}
        <div className="flex flex-1 items-center gap-3 border-b border-zinc-700 px-5 py-4 sm:border-b-0 sm:border-r">
          <BusFront className="size-5 shrink-0 text-zinc-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500">To</p>
            <select
              value={toCity}
              onChange={(e) => setToCity(e.target.value)}
              className={selectClass}
            >
              {CITY_OPTIONS.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>

        {/* DATE */}
        <div className="flex flex-1 items-center gap-3 border-b border-zinc-700 px-5 py-4 sm:border-b-0 sm:border-r">
          <Calendar className="size-5 shrink-0 text-zinc-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500">Date of journey</p>
            <input
              type="date"
              value={travelDate}
              min={tomorrow}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full border-0 bg-transparent p-0 text-sm font-semibold text-white focus:outline-none focus:ring-0 [color-scheme:dark]"
            />
          </div>
        </div>

        {/* PASSENGERS */}
        <div className="flex flex-1 items-center gap-3 px-5 py-4">
          <Users className="size-5 shrink-0 text-zinc-500" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500">Passengers</p>
            <select
              value={passengers}
              onChange={(e) => setPassengers(e.target.value)}
              className={selectClass}
            >
              <option value="1">1 Passenger</option>
              <option value="2">2 Passengers</option>
              <option value="3">3 Passengers</option>
              <option value="4">4 Passengers</option>
              <option value="5">5+ Passengers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search button */}
      <div className="mt-5 flex justify-center">
        <Link
          href={searchHref}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 px-16 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition hover:bg-red-700"
        >
          <Search className="size-4" />
          Search buses
        </Link>
      </div>
    </div>
  );
}
