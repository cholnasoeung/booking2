import type { UserRole } from "@/models/User";

export type Permission =
  | "manageUsers"      // create, edit, ban users
  | "manageRoutes"     // add / edit / delete routes
  | "manageBuses"      // add / edit / delete buses
  | "manageBookings"   // view and cancel any booking
  | "managePromos"     // create and disable promo codes
  | "viewAnalytics"    // analytics tab
  | "viewAuditLogs"    // audit logs tab
  | "viewDashboard"    // admin dashboard overview
  | "manageSecurity"   // security settings
  | "manageDrivers"    // drivers tab
  | "manageBusDetails" // bus details tab
  | "manageAlerts"     // alerts tab
  | "approveRatings"   // approve / reject reviews
  | "importExport";    // bulk import/export

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [],
  driver: [
    "viewDashboard",
  ],
  support: [
    "viewDashboard",
    "manageBookings",
    "viewAnalytics",
    "approveRatings",
  ],
  admin: [
    "manageUsers",
    "manageRoutes",
    "manageBuses",
    "manageBookings",
    "managePromos",
    "viewAnalytics",
    "viewAuditLogs",
    "viewDashboard",
    "manageSecurity",
    "manageDrivers",
    "manageBusDetails",
    "manageAlerts",
    "approveRatings",
    "importExport",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export const ALL_ROLES: { value: UserRole; label: string; description: string; color: string }[] = [
  { value: "user",    label: "User",    description: "Regular customer — can book tickets",              color: "border-slate-200 bg-slate-50 text-slate-600" },
  { value: "driver",  label: "Driver",  description: "Bus driver — sees assigned buses only",            color: "border-blue-200 bg-blue-50 text-blue-700" },
  { value: "support", label: "Support", description: "Support agent — can view and cancel bookings",     color: "border-amber-200 bg-amber-50 text-amber-700" },
  { value: "admin",   label: "Admin",   description: "Full access — manages all system resources",       color: "border-indigo-200 bg-indigo-50 text-indigo-700" },
];
