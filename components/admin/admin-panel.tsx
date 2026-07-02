"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import AdminBookingsManager from "@/components/admin/admin-bookings-manager";
import AdminBusesManager from "@/components/admin/admin-buses-manager";
import AdminOverviewTab from "@/components/admin/admin-overview-tab";
import AdminRoutesManager from "@/components/admin/admin-routes-manager";
import AdminAnalyticsTab from "@/components/admin/admin-analytics-tab";
import AdminPromoCodesTab from "@/components/admin/admin-promo-codes-tab";
import AdminImportExportTab from "@/components/admin/admin-import-export-tab";
import AdminAlertsTab from "@/components/admin/admin-alerts-tab";
import AdminAuditLogsTab from "@/components/admin/admin-audit-logs-tab";
import AdminBusDetailsManager from "@/components/admin/admin-bus-details-manager";
import AdminDriversManager from "@/components/admin/admin-drivers-manager";
import AdminSecurityTab from "@/components/admin/admin-security-tab";
import AdminSystemStatusTab from "@/components/admin/admin-system-status-tab";
import AdminUsersManager from "@/components/admin/admin-users-manager";
import AdminSupportInbox from "@/components/admin/admin-support-inbox";
import AdminRatingsManager from "@/components/admin/admin-ratings-manager";
import AdminTodayTab from "@/components/admin/admin-today-tab";
import AdminCounterBooking from "@/components/admin/admin-counter-booking";
import AdminCheckinTab from "@/components/admin/admin-checkin-tab";
import AdminSettingsTab from "@/components/admin/admin-settings-tab";
import AdminFuelLogsTab from "@/components/admin/admin-fuel-logs-tab";
import AdminDriverEarningsTab from "@/components/admin/admin-driver-earnings-tab";
import AdminMaintenanceTab from "@/components/admin/admin-maintenance-tab";
import AdminDriverScheduleTab from "@/components/admin/admin-driver-schedule-tab";
import AdminEmployeesTab from "@/components/admin/admin-employees-tab";
import AdminPayrollTab from "@/components/admin/admin-payroll-tab";
import AdminReportsTab from "@/components/admin/admin-reports-tab";
import AdminLostFoundTab from "@/components/admin/admin-lost-found-tab";
import AdminRefundTab from "@/components/admin/admin-refund-tab";
import AdminIncidentTab from "@/components/admin/admin-incident-tab";
import AdminFinanceTab from "@/components/admin/admin-finance-tab";
import AdminDriverPerformanceTab from "@/components/admin/admin-driver-performance-tab";
import type {
  AdminBookingSummary,
  BusDetailSummary,
  BusSummary,
  DriverSummary,
  RouteSummary,
} from "@/lib/db/queries";

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
          drivers={drivers}
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

      {activeTab === "users" ? <AdminUsersManager /> : null}

      {activeTab === "support-inbox" ? <AdminSupportInbox /> : null}

      {activeTab === "ratings" ? <AdminRatingsManager /> : null}

      {activeTab === "today" ? <AdminTodayTab /> : null}

      {activeTab === "counter-booking" ? <AdminCounterBooking /> : null}

      {activeTab === "checkin" ? <AdminCheckinTab /> : null}

      {activeTab === "settings" ? <AdminSettingsTab /> : null}

      {activeTab === "fuel-logs" ? <AdminFuelLogsTab /> : null}

      {activeTab === "driver-earnings" ? <AdminDriverEarningsTab /> : null}

      {activeTab === "maintenance" ? <AdminMaintenanceTab /> : null}

      {activeTab === "driver-roster" ? <AdminDriverScheduleTab /> : null}

      {activeTab === "employees" ? <AdminEmployeesTab /> : null}

      {activeTab === "payroll" ? <AdminPayrollTab /> : null}

      {activeTab === "reports"    ? <AdminReportsTab />    : null}
      {activeTab === "lost-found" ? <AdminLostFoundTab /> : null}
      {activeTab === "refunds"    ? <AdminRefundTab />    : null}
      {activeTab === "incidents"         ? <AdminIncidentTab />            : null}
      {activeTab === "finance"           ? <AdminFinanceTab />             : null}
      {activeTab === "driver-performance" ? <AdminDriverPerformanceTab /> : null}
    </div>
  );
}
