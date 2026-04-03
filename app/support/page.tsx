export default function SupportPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="mx-auto w-full max-w-4xl space-y-6 rounded-3xl border border-gray-200 bg-white p-8 shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-500">
          Support
        </p>
        <h1 className="text-3xl font-bold text-gray-900">We’re here to help</h1>
        <p className="text-sm text-gray-600">
          For booking issues, payment questions, or operator feedback, contact the live
          support team. We’re available every day from 06:00 to 22:00.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Email</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">support@busbooking.example</p>
            <p className="text-xs text-gray-500">Response within 30 minutes.</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Live chat</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">Chat with agents</p>
            <p className="text-xs text-gray-500">7:00 – 22:00 daily</p>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-gray-300 p-6">
          <h2 className="text-lg font-semibold text-gray-900">Need urgent help?</h2>
          <p className="text-sm text-gray-600">
            Call +1 (555) 987-6543 and mention your booking ID. We prioritize safety incidents and
            critical disruptions.
          </p>
        </div>
      </div>
    </div>
  );
}
