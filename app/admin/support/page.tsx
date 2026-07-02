import AdminSidebar from "@/components/admin/admin-sidebar";
import { requireAdmin, getCurrentUser } from "@/lib/auth";

export default async function AdminSupportPage() {
  await requireAdmin("/dashboard");
  const user = await getCurrentUser();

  return (
    <div className="flex min-h-screen w-full">
      <AdminSidebar
        userName={user?.name ?? "Admin"}
        userEmail={user?.email ?? "admin@example.com"}
      />
      <div className="flex-1 flex flex-col bg-slate-50">
        <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
              Support Center
            </p>
            <p className="text-lg font-semibold text-gray-900">
              Reach out to the ops team for incident help.
            </p>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-10">
          <section className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-lg sm:p-10">
            <h2 className="text-2xl font-semibold text-gray-900">Need help?</h2>
            <p className="text-sm text-gray-600">
              Operators and admins can reach support for escalations, incident behaviour, and
              infrastructure questions. We monitor 24/7.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">support@busbooking.internal</p>
                <p className="text-xs text-gray-500">Response within 30 minutes.</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Hotline</p>
                <p className="mt-1 text-lg font-semibold text-gray-900">+1 (555) 000-1234</p>
                <p className="text-xs text-gray-500">Priority for escalated incidents.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Report an incident</p>
              <p className="text-xs text-gray-500">
                Share details about the affected routes, bookings, or drivers to speed up triage.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
