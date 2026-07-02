"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Star, Users, Route, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const slides = [
  {
    id: 1,
    title: "Book Your Bus Journey",
    subtitle: "Comfortable & Affordable Travel",
    description: "Search from 500+ buses across Cambodia with instant booking and confirmed seats.",
    image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&h=500&fit=crop",
    gradient: "from-slate-800/70 via-slate-700/60 to-slate-900/70",
    stats: [
      { icon: Route, label: "Routes", value: "50+" },
      { icon: Users, label: "Daily", value: "500+" },
      { icon: Star, label: "Rating", value: "4.9" },
    ],
  },
  {
    id: 2,
    title: "Comfortable Seating",
    subtitle: "Travel in Comfort",
    description: "Choose from mini buses, sleeper coaches, and premium cars for your journey.",
    image: "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1200&h=500&fit=crop",
    gradient: "from-slate-700/70 via-stone-700/60 to-slate-800/70",
    stats: [
      { icon: Route, label: "From", value: "$10" },
      { icon: Users, label: "Seats", value: "40+" },
      { icon: Star, label: "Comfort", value: "AC" },
    ],
  },
  {
    id: 3,
    title: "Instant Confirmation",
    subtitle: "Book in Seconds",
    description: "Select your seats, get instant confirmation, and receive e-ticket on your email.",
    image: "https://images.unsplash.com/photo-1556740758-6de364c80d52?w=1200&h=500&fit=crop",
    gradient: "from-zinc-800/70 via-neutral-700/60 to-slate-900/70",
    stats: [
      { icon: Route, label: "Instant", value: "2 min" },
      { icon: Users, label: "Support", value: "24/7" },
      { icon: Star, label: "Trust", value: "100%" },
    ],
  },
];

export default function HeroSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(timer);
  }, [currentSlide]);

  function nextSlide() {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
      setIsAnimating(false);
    }, 300);
  }

  function prevSlide() {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
      setIsAnimating(false);
    }, 300);
  }

  function goToSlide(index: number) {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsAnimating(false);
    }, 300);
  }

  return (
    <section className="relative h-[350px] overflow-hidden sm:h-[400px] lg:h-[480px]">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-all duration-700 ease-out",
            index === currentSlide ? "opacity-100 scale-100 z-10" : "opacity-0 scale-105 z-0"
          )}
        >
          {/* Background Image */}
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center transition-transform duration-[3000ms] ease-out",
              isAnimating && index === currentSlide && "scale-110"
            )}
            style={{ backgroundImage: `url(${slide.image})` }}
          />

          {/* Gradient Overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-95",
            slide.gradient
          )} />

          {/* Animated Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwLTItMi00LTItNHMyLTItNCAyLTRzLTItMi00LTJjMCAwIDItMiAyLTRzLTItMi00LTJjMCAwIDItMiAyLTRzLTItMi00LTJjMCAwIDItMiAyLTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L2c+PC9zdmc+')] opacity-20" />

          {/* Content */}
          <div className="relative mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-full flex-col justify-center py-8 sm:py-10">
              <div className="max-w-3xl space-y-4 animate-slide-up">
                {/* Badge */}
                <div className="inline-flex animate-fade-in items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white backdrop-blur-md border-2 border-white/30 shadow-lg">
                  <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300 shadow-glow" />
                  {slide.subtitle}
                </div>

                {/* Title */}
                <h1 className="font-heading text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl animate-fade-in-delayed drop-shadow-2xl">
                  {slide.title}
                </h1>

                {/* Description */}
                <p className="max-w-2xl text-base text-white/95 animate-fade-in-delayed-2 font-medium leading-relaxed">
                  {slide.description}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-4 pt-2 animate-fade-in-delayed-3">
                  {slide.stats.map((stat, statIndex) => {
                    const Icon = stat.icon;
                    return (
                      <div key={statIndex} className="flex items-center gap-2.5 rounded-full bg-white/15 px-4 py-2 backdrop-blur-md border-2 border-white/30 shadow-lg transition hover:bg-white/20 hover:scale-105">
                        <Icon className="h-4 w-4 text-amber-300" />
                        <div>
                          <p className="text-base font-bold text-white">{stat.value}</p>
                          <p className="text-xs text-white/80">{stat.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        type="button"
        onClick={prevSlide}
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md border-2 border-white/30 shadow-lg transition hover:bg-white/25 hover:scale-110 active:scale-95 sm:left-8"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={nextSlide}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md border-2 border-white/30 shadow-lg transition hover:bg-white/25 hover:scale-110 active:scale-95 sm:right-8"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2.5">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goToSlide(index)}
            className={cn(
              "h-2.5 rounded-full transition-all duration-300 ease-out",
              index === currentSlide
                ? "w-10 bg-white shadow-glow"
                : "w-2.5 bg-white/40 hover:bg-white/60 hover:w-4"
            )}
          />
        ))}
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 z-20 h-24 bg-gradient-to-t from-white via-white/80 to-transparent" />
    </section>
  );
}
