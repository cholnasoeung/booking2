import Link from "next/link";
import { Newspaper } from "lucide-react";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

export default function BlogPage() {
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50">
          <Newspaper className="h-8 w-8 text-indigo-600" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-slate-900">Blog coming soon</h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          We&apos;re working on travel guides, route updates, and news from TKBus. Check back
          soon.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Back to Home
        </Link>
      </div>
      <Footer />
    </>
  );
}
