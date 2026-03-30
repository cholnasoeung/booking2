import { connectToDatabase } from "@/lib/mongodb";
import BusModel from "@/models/Bus";
import BookingModel from "@/models/Booking";
import RouteModel from "@/models/Route";
import UserModel from "@/models/User";
import { sendDetailedAdminAlertEmail } from "@/lib/email-service";

export const runtime = "nodejs";

export interface AlertConfig {
  lowInventoryThreshold: number; // percentage
  overbookingThreshold: number; // percentage
  cancellationSpikeThreshold: number; // percentage
  revenueDropThreshold: number; // percentage
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  lowInventoryThreshold: 20, // Alert when less than 20% seats available
  overbookingThreshold: 100, // Alert when booked seats exceed total
  cancellationSpikeThreshold: 30, // Alert when cancellation rate > 30%
  revenueDropThreshold: 20, // Alert when revenue drops > 20% vs previous period
};

export interface Alert {
  type: "low_inventory" | "overbooking" | "cancellation_spike" | "revenue_drop" | "high_demand";
  severity: "low" | "medium" | "high" | "critical";
  busId?: string;
  routeId?: string;
  message: string;
  data: any;
  timestamp: Date;
}

export interface AlertSummary {
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  alerts: Alert[];
}

/**
 * Check all buses for low inventory and generate alerts
 */
export async function checkLowInventoryAlerts(
  config: AlertConfig = DEFAULT_ALERT_CONFIG
): Promise<Alert[]> {
  await connectToDatabase();

  const alerts: Alert[] = [];
  const threshold = config.lowInventoryThreshold;

  const buses = await BusModel.find({ isActive: true })
    .populate("routeId")
    .lean();

  for (const bus of buses) {
    const totalSeats = bus.totalSeats || 40;
    const bookedSeats = bus.bookedSeats?.length || 0;
    const blockedSeats = bus.blockedSeats?.length || 0;
    const unavailableSeats = bookedSeats + blockedSeats;
    const availableSeats = totalSeats - unavailableSeats;
    const occupancyRate = (bookedSeats / totalSeats) * 100;

    const availablePercentage = (availableSeats / totalSeats) * 100;

    if (availablePercentage <= threshold && availableSeats > 0) {
      let severity: "low" | "medium" | "high" | "critical";
      if (availablePercentage <= 5) {
        severity = "critical";
      } else if (availablePercentage <= 10) {
        severity = "high";
      } else {
        severity = "medium";
      }

      const route = bus.routeId as any;
      alerts.push({
        type: "low_inventory",
        severity,
        busId: bus._id.toString(),
        routeId: route?._id?.toString(),
        message: `Low inventory: Bus ${bus.busNumber} (${route?.from} → ${route?.to}) has only ${availableSeats} seats available (${availablePercentage.toFixed(1)}%)`,
        data: {
          busNumber: bus.busNumber,
          routeName: route ? `${route.from} → ${route.to}` : "Unknown",
          departureDate: bus.date,
          totalSeats,
          bookedSeats,
          blockedSeats,
          availableSeats,
          occupancyRate: occupancyRate.toFixed(1) + "%",
        },
        timestamp: new Date(),
      });
    }
  }

  return alerts;
}

/**
 * Check for overbookings (booked seats exceeding total seats)
 */
export async function checkOverbookingAlerts(): Promise<Alert[]> {
  await connectToDatabase();

  const alerts: Alert[] = [];

  const buses = await BusModel.find({ isActive: true })
    .populate("routeId")
    .lean();

  for (const bus of buses) {
    const totalSeats = bus.totalSeats || 40;
    const bookedSeats = bus.bookedSeats?.length || 0;

    if (bookedSeats > totalSeats) {
      const route = bus.routeId as any;
      alerts.push({
        type: "overbooking",
        severity: "critical",
        busId: bus._id.toString(),
        routeId: route?._id?.toString(),
        message: `CRITICAL: Bus ${bus.busNumber} is overbooked! ${bookedSeats} seats booked but only ${totalSeats} available`,
        data: {
          busNumber: bus.busNumber,
          routeName: route ? `${route.from} → ${route.to}` : "Unknown",
          departureDate: bus.date,
          totalSeats,
          bookedSeats,
          overbookedBy: bookedSeats - totalSeats,
        },
        timestamp: new Date(),
      });
    }
  }

  return alerts;
}

/**
 * Check for high cancellation rates
 */
export async function checkCancellationSpikeAlerts(
  config: AlertConfig = DEFAULT_ALERT_CONFIG
): Promise<Alert[]> {
  await connectToDatabase();

  const alerts: Alert[] = [];

  // Look at last 7 days
  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endDate = new Date();

  const bookings = await BookingModel.find({
    createdAt: { $gte: startDate, $lte: endDate },
  }).lean();

  const totalBookings = bookings.length;
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;

  if (totalBookings > 0) {
    const cancellationRate = (cancelledBookings / totalBookings) * 100;

    if (cancellationRate >= config.cancellationSpikeThreshold) {
      let severity: "low" | "medium" | "high" | "critical";
      if (cancellationRate >= 50) {
        severity = "critical";
      } else if (cancellationRate >= 40) {
        severity = "high";
      } else {
        severity = "medium";
      }

      alerts.push({
        type: "cancellation_spike",
        severity,
        message: `High cancellation rate detected: ${cancellationRate.toFixed(1)}% (${cancelledBookings}/${totalBookings} bookings cancelled in last 7 days)`,
        data: {
          totalBookings,
          cancelledBookings,
          cancellationRate: cancellationRate.toFixed(1) + "%",
          period: "last 7 days",
        },
        timestamp: new Date(),
      });
    }
  }

  return alerts;
}

/**
 * Check for revenue drops compared to previous period
 */
export async function checkRevenueDropAlerts(
  config: AlertConfig = DEFAULT_ALERT_CONFIG
): Promise<Alert[]> {
  await connectToDatabase();

  const alerts: Alert[] = [];

  // Current period: last 7 days
  const currentEnd = new Date();
  const currentStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Previous period: 7-14 days ago
  const previousEnd = new Date(currentStart.getTime());
  const previousStart = new Date(previousEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

  const currentRevenue = await BookingModel.aggregate([
    {
      $match: {
        createdAt: { $gte: currentStart, $lte: currentEnd },
        status: "confirmed",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$finalPrice" },
      },
    },
  ]);

  const previousRevenue = await BookingModel.aggregate([
    {
      $match: {
        createdAt: { $gte: previousStart, $lte: previousEnd },
        status: "confirmed",
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$finalPrice" },
      },
    },
  ]);

  const currentRev = currentRevenue[0]?.total || 0;
  const previousRev = previousRevenue[0]?.total || 0;

  if (previousRev > 0) {
    const revenueChange = ((currentRev - previousRev) / previousRev) * 100;

    if (revenueChange <= -config.revenueDropThreshold) {
      let severity: "low" | "medium" | "high" | "critical";
      if (revenueChange <= -40) {
        severity = "critical";
      } else if (revenueChange <= -30) {
        severity = "high";
      } else {
        severity = "medium";
      }

      alerts.push({
        type: "revenue_drop",
        severity,
        message: `Revenue drop detected: ${revenueChange.toFixed(1)}% decrease compared to previous period`,
        data: {
          currentPeriod: "last 7 days",
          currentRevenue: currentRev,
          previousRevenue: previousRev,
          revenueChange: revenueChange.toFixed(1) + "%",
          dropAmount: previousRev - currentRev,
        },
        timestamp: new Date(),
      });
    }
  }

  return alerts;
}

/**
 * Check for high demand (buses selling out quickly)
 */
export async function checkHighDemandAlerts(): Promise<Alert[]> {
  await connectToDatabase();

  const alerts: Alert[] = [];

  const buses = await BusModel.find({ isActive: true })
    .populate("routeId")
    .lean();

  for (const bus of buses) {
    const totalSeats = bus.totalSeats || 40;
    const bookedSeats = bus.bookedSeats?.length || 0;
    const occupancyRate = (bookedSeats / totalSeats) * 100;

    // Check if bus is nearly sold out (over 90%) and departs in 3-7 days
    const daysUntilDeparture = Math.ceil(
      (bus.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    if (
      occupancyRate > 90 &&
      daysUntilDeparture >= 3 &&
      daysUntilDeparture <= 7
    ) {
      const route = bus.routeId as any;
      alerts.push({
        type: "high_demand",
        severity: "medium",
        busId: bus._id.toString(),
        routeId: route?._id?.toString(),
        message: `High demand: Bus ${bus.busNumber} is ${occupancyRate.toFixed(1)}% full with ${daysUntilDeparture} days until departure`,
        data: {
          busNumber: bus.busNumber,
          routeName: route ? `${route.from} → ${route.to}` : "Unknown",
          departureDate: bus.date,
          daysUntilDeparture,
          occupancyRate: occupancyRate.toFixed(1) + "%",
          bookedSeats,
          totalSeats,
        },
        timestamp: new Date(),
      });
    }
  }

  return alerts;
}

/**
 * Run all alert checks and return summary
 */
export async function checkAllAlerts(
  config: AlertConfig = DEFAULT_ALERT_CONFIG
): Promise<AlertSummary> {
  const allAlerts = await Promise.all([
    checkLowInventoryAlerts(config),
    checkOverbookingAlerts(),
    checkCancellationSpikeAlerts(config),
    checkRevenueDropAlerts(config),
    checkHighDemandAlerts(),
  ]);

  const alerts = allAlerts.flat();

  // Count by severity
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;
  const highAlerts = alerts.filter((a) => a.severity === "high").length;
  const mediumAlerts = alerts.filter((a) => a.severity === "medium").length;
  const lowAlerts = alerts.filter((a) => a.severity === "low").length;

  return {
    totalAlerts: alerts.length,
    criticalAlerts,
    highAlerts,
    mediumAlerts,
    lowAlerts,
    alerts: alerts.sort((a, b) => {
      // Sort by severity (critical first), then by timestamp
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamp.getTime() - a.timestamp.getTime();
    }),
  };
}

/**
 * Send alert notifications via email
 */
export async function sendAlertNotifications(
  alerts: Alert[]
): Promise<{ success: boolean; sentCount: number }> {
  if (alerts.length === 0) {
    return { success: true, sentCount: 0 };
  }

  try {
    // Get all admin users
    const adminUsers = await UserModel.find({ role: "admin" }).lean();

    if (adminUsers.length === 0) {
      console.warn("No admin users found to send alerts to");
      return { success: true, sentCount: 0 };
    }

    // Group alerts by severity for better email organization
    const criticalAlerts = alerts.filter((a) => a.severity === "critical");
    const highAlerts = alerts.filter((a) => a.severity === "high");
    const otherAlerts = alerts.filter(
      (a) => a.severity !== "critical" && a.severity !== "high"
    );

    let sentCount = 0;

    // Send critical alerts immediately
    if (criticalAlerts.length > 0) {
      for (const admin of adminUsers) {
        await sendDetailedAdminAlertEmail(admin.email, {
          alertType: "critical",
          alertCount: criticalAlerts.length,
          alerts: criticalAlerts,
          adminName: admin.name,
        }).catch((err) => console.error("Failed to send alert email:", err));
      }
      sentCount += adminUsers.length;
    }

    // Send high priority alerts
    if (highAlerts.length > 0) {
      for (const admin of adminUsers) {
        await sendDetailedAdminAlertEmail(admin.email, {
          alertType: "high",
          alertCount: highAlerts.length,
          alerts: highAlerts,
          adminName: admin.name,
        }).catch((err) => console.error("Failed to send alert email:", err));
      }
      sentCount += adminUsers.length;
    }

    // Send summary of other alerts (batched)
    if (otherAlerts.length > 0) {
      for (const admin of adminUsers) {
        await sendDetailedAdminAlertEmail(admin.email, {
          alertType: "summary",
          alertCount: otherAlerts.length,
          alerts: otherAlerts,
          adminName: admin.name,
        }).catch((err) => console.error("Failed to send alert email:", err));
      }
      sentCount += adminUsers.length;
    }

    return { success: true, sentCount };
  } catch (error) {
    console.error("Error sending alert notifications:", error);
    return { success: false, sentCount: 0 };
  }
}

/**
 * Run alert check and automatically send notifications
 */
export async function runAlertCheck(
  config: AlertConfig = DEFAULT_ALERT_CONFIG
): Promise<AlertSummary & { notificationsSent: boolean }> {
  const summary = await checkAllAlerts(config);

  // Send notifications for critical and high severity alerts
  const alertsToNotify = summary.alerts.filter(
    (a) => a.severity === "critical" || a.severity === "high"
  );

  if (alertsToNotify.length > 0) {
    const result = await sendAlertNotifications(alertsToNotify);
    return {
      ...summary,
      notificationsSent: result.success,
    };
  }

  return {
    ...summary,
    notificationsSent: true, // No alerts to send is considered success
  };
}
