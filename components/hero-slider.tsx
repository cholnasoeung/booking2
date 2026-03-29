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
    <section className="relative h-[280px] overflow-hidden sm:h-[320px] lg:h-[360px]">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={cn(
            "absolute inset-0 transition-opacity duration-500",
            index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
          )}
        >
          {/* Background Image */}
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms]",
              isAnimating && index === currentSlide && "scale-110"
            )}
            style={{ backgroundImage: `url(${slide.image})` }}
          />

          {/* Gradient Overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r opacity-90",
            slide.gradient
          )} />

          {/* Animated Pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAzNGMwLTItMi00LTItNHMyLTItNCAyLTRzLTItMi00LTJjMCAwIDItMiAyLTRzLTItMi00LTJjMCAwIDItMiAyLTRzLTItMi00LTJjMCAwIDItMiAyLTR6IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz48L2c+PC9zdmc+')] opacity-20" />

          {/* Content */}
          <div className="relative mx-auto h-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-full flex-col justify-center py-6">
              <div className="max-w-3xl space-y-3 animate-slide-up">
                {/* Badge */}
                <div className="inline-flex animate-fade-in items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm border border-white/20">
                  <span className="flex h-2 w-2 animate-pulse rounded-full bg-slate-300" />
                  {slide.subtitle}
                </div>

                {/* Title */}
                <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl animate-fade-in-delayed">
                  {slide.title}
                </h1>

                {/* Description */}
                <p className="max-w-2xl text-sm text-white/90 animate-fade-in-delayed-2">
                  {slide.description}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap gap-3 pt-1 animate-fade-in-delayed-3">
                  {slide.stats.map((stat, statIndex) => {
                    const Icon = stat.icon;
                    return (
                      <div key={statIndex} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur-sm border border-white/20">
                        <Icon className="h-3.5 w-3.5 text-slate-200" />
                        <div>
                          <p className="text-sm font-bold text-white">{stat.value}</p>
                          <p className="text-xs text-slate-200">{stat.label}</p>
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
        className="absolute left-4 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm border border-white/20 transition hover:bg-white/20 hover:scale-110 sm:left-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={nextSlide}
        className="absolute right-4 top-1/2 z-20 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm border border-white/20 transition hover:bg-white/20 hover:scale-110 sm:right-8"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goToSlide(index)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === currentSlide
                ? "w-8 bg-white/90"
                : "w-2 bg-white/40 hover:bg-white/60"
            )}
          />
        ))}
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 z-20 h-16 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
