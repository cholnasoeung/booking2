"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import AdminBookingsManager from "@/components/admin-bookings-manager";
import AdminBusesManager from "@/components/admin-buses-manager";
import AdminOverviewTab from "@/components/admin-overview-tab";
import AdminRoutesManager from "@/components/admin-routes-manager";
import AdminAnalyticsTab from "@/components/admin-analytics-tab";
import AdminPromoCodesTab from "@/components/admin-promo-codes-tab";
import AdminImportExportTab from "@/components/admin-import-export-tab";
import AdminAlertsTab from "@/components/admin-alerts-tab";
import AdminAuditLogsTab from "@/components/admin-audit-logs-tab";
import AdminBusDetailsManager from "@/components/admin-bus-details-manager";
import AdminDriversManager from "@/components/admin-drivers-manager";
import AdminSecurityTab from "@/components/admin-security-tab";
import AdminSystemStatusTab from "@/components/admin-system-status-tab";
import AdminRatingsTab from "@/components/admin-ratings-tab";
import AdminUsersTab from "@/components/admin-users-tab";
import type {
  AdminBookingSummary,
  BusDetailSummary,
  BusSummary,
  DriverSummary,
  RouteSummary,
} from "@/lib/queries";

type FeedbackState =
  | {
      kind: "success" | "error";
      message: string;
    }
  | null;

type AdminPanelProps = {
  routes: RouteSummary[];
  buses: BusSummary[];
  bookings: AdminBookingSummary[];
  drivers: DriverSummary[];
  busDetails: BusDetailSummary[];
};

export default function AdminPanel({
  routes,
  buses,
  bookings,
  drivers,
  busDetails,
}: AdminPanelProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams?.get("tab") ?? "overview";
  const [managerFeedback, setManagerFeedback] = useState<FeedbackState>(null);

  return (
    <div className="space-y-6">
      {managerFeedback ? (
        <div
          className={
            managerFeedback.kind === "success"
              ? "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
              : "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          }
        >
          {managerFeedback.message}
        </div>
      ) : null}

      {activeTab === "overview" ? (
        <AdminOverviewTab routes={routes} buses={buses} bookings={bookings} />
      ) : null}

      {activeTab === "routes" ? (
        <AdminRoutesManager
          routes={routes}
          buses={buses}
          bookings={bookings}
          onFeedback={setManagerFeedback}
        />
      ) : null}

      {activeTab === "buses" ? (
        <AdminBusesManager
          routes={routes}
          buses={buses}
          onFeedback={setManagerFeedback}
        />
      ) : null}

      {activeTab === "bookings" ? (
        <AdminBookingsManager routes={routes} bookings={bookings} />
      ) : null}

      {activeTab === "analytics" ? <AdminAnalyticsTab /> : null}

      {activeTab === "promo-codes" ? <AdminPromoCodesTab /> : null}

      {activeTab === "import-export" ? <AdminImportExportTab /> : null}

      {activeTab === "alerts" ? <AdminAlertsTab /> : null}

      {activeTab === "audit-logs" ? <AdminAuditLogsTab /> : null}

      {activeTab === "drivers" ? (
        <AdminDriversManager drivers={drivers} />
      ) : null}

      {activeTab === "bus-details" ? (
        <AdminBusDetailsManager busDetails={busDetails} />
      ) : null}

      {activeTab === "security" ? <AdminSecurityTab /> : null}

      {activeTab === "system-status" ? <AdminSystemStatusTab /> : null}

      {activeTab === "ratings" ? <AdminRatingsTab /> : null}

      {activeTab === "users" ? <AdminUsersTab /> : null}
    </div>
  );
}
