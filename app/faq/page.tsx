import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import FAQSection from "@/components/landing/faq-section";

export default function FAQPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-white">
        <section className="bg-gradient-to-r from-red-700 to-orange-500 py-16 text-white">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold sm:text-4xl">Frequently Asked Questions</h1>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Everything you need to know about booking, payments, and cancellations.
            </p>
          </div>
        </section>
        <FAQSection />
      </div>
      <Footer />
    </>
  );
}
