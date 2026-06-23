import Link from "next/link";
import { ArrowLeft, PackageSearch } from "lucide-react";
import Navbar from "@/components/navbar";
import { connectToDatabase } from "@/lib/mongodb";
import LostFoundModel from "@/models/LostFound";
import LostFoundClient from "@/components/lost-found-client";
import { getCurrentSession } from "@/lib/auth";

export default async function LostFoundPage() {
  const session = await getCurrentSession();
  const userEmail = session?.user?.email ?? "";
  const userName  = session?.user?.name  ?? "";

  await connectToDatabase();

  const raw: any[] = userEmail
    ? await LostFoundModel.find({ reporterEmail: userEmail })
        .sort({ createdAt: -1 })
        .lean()
    : [];

  const initialRecords = raw.map((r: any) => ({
    id:           String(r._id),
    refNumber:    r.refNumber,
    itemName:     r.itemName,
    itemCategory: r.itemCategory,
    status:       r.status,
    adminNotes:   r.adminNotes ?? null,
    returnedAt:   r.returnedAt ? new Date(r.returnedAt).toISOString() : null,
    createdAt:    new Date(r.createdAt).toISOString(),
  }));

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/20 to-cyan-50/20 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">

          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          {/* Header */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-600 p-8 text-white shadow-xl shadow-teal-100">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <PackageSearch className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black">Lost &amp; Found</h1>
                <p className="mt-1 text-sm text-white/80">
                  Report a lost item or check the status of your previous reports.
                </p>
              </div>
            </div>
          </div>

          <LostFoundClient
            initialRecords={initialRecords}
            userEmail={userEmail}
            userName={userName}
          />
        </div>
      </div>
    </>
  );
}
