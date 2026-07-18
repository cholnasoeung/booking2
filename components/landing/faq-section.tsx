"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    question: "How do I book a bus ticket?",
    answer: "Simply enter your departure city, destination, and travel date on our homepage. Browse available buses, select your preferred seats, enter passenger details, and complete payment. You'll receive instant confirmation via email.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, debit cards, bank transfers, and popular mobile wallets like ABA Bank, Wing, and TrueMoney. All payments are secure and encrypted.",
  },
  {
    question: "Can I cancel my booking?",
    answer: "Yes, you can cancel your booking up to 24 hours before departure. Cancellation fees may apply depending on how close to departure you cancel. Full refund is available for cancellations made 48+ hours before departure.",
  },
  {
    question: "How do I select my seats?",
    answer: "After selecting your bus, you'll see an interactive seat map showing available seats. Click on your preferred seats to select them. Selected seats will be highlighted and the total price will update automatically.",
  },
  {
    question: "Do you offer discounts?",
    answer: "Yes! We offer early bird discounts for bookings made 7 days in advance, group discounts for bookings of 5+ passengers, and special promotional discounts during festivals and holidays.",
  },
  {
    question: "What if my bus is delayed?",
    answer: "If your bus is delayed by more than 30 minutes, you'll receive an SMS notification. For significant delays over 2 hours, you can reschedule or request a full refund.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section className="bg-zinc-900 py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-500">
            <HelpCircle className="h-6 w-6" />
          </div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Find answers to common questions about booking buses with us
          </p>
        </div>

        {/* FAQ List */}
        <div className="mt-12 space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800 shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                className="flex w-full items-center justify-between p-6 text-left transition hover:bg-zinc-800/50"
              >
                <span className="font-semibold text-white">{faq.question}</span>
                <span className="ml-4 flex-shrink-0">
                  {openIndex === index ? (
                    <ChevronUp className="h-5 w-5 text-red-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-zinc-500" />
                  )}
                </span>
              </button>
              <div
                className={cn(
                  "overflow-hidden transition-all duration-300 ease-in-out",
                  openIndex === index ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                )}
              >
                <div className="px-6 pb-6">
                  <p className="text-zinc-400 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <p className="text-zinc-400">
            Still have questions?{" "}
            <a href="/contact" className="font-semibold text-red-500 hover:text-red-400">
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
