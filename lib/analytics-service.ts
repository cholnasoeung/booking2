import { connectToDatabase } from "@/lib/mongodb";
import BookingModel from "@/models/Booking";
import BusModel from "@/models/Bus";
import RouteModel from "@/models/Route";
import UserModel from "@/models/User";

export const runtime = "nodejs";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface RevenueMetrics {
  totalRevenue: number;
  bookedSeats: number;
  totalBookings: number;
  averageOrderValue: number;
  revenueByRoute: Array<{
    routeId: string;
    routeName: string;
    revenue: number;
    bookings: number;
    occupancyRate: number;
  }>;
  revenueByBusType: Array<{
    busType: string;
    revenue: number;
    bookings: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    bookings: number;
  }>;
}

export interface KPIs {
  totalRevenue: number;
  revenueChange: number; // percentage change from previous period
  totalBookings: number;
  bookingsChange: number;
  averageOccupancy: number;
  occupancyChange: number;
  cancellationRate: number;
  totalPassengers: number;
  activeRoutes: number;
  activeBuses: number;
}

type RouteStats = {
  routeId: string;
  routeName: string;
  from: string;
  to: string;
  distance: number;
  totalBookings: number;
  totalRevenue: number;
  totalSeats: number;
  bookedSeats: number;
  cancellations: number;
  seatFrequency: Map<string, number>;
};

type RevenueRouteStats = {
  routeId: string;
  routeName: string;
  revenue: number;
  bookings: number;
  totalSeats: number;
  bookedSeats: number;
};

export interface RoutePerformance {
  routeId: string;
  routeName: string;
  from: string;
  to: string;
  distance: number;
  totalBookings: number;
  totalRevenue: number;
  averageOccupancy: number;
  cancellationRate: number;
  averageTicketPrice: number;
  popularSeats: string[];
  performanceRating: "excellent" | "good" | "average" | "poor";
}

export interface OccupancyReport {
  busId: string;
  busNumber?: string;
  routeName: string;
  departureDate: Date;
  totalSeats: number;
  bookedSeats: number;
  blockedSeats: number;
  availableSeats: number;
  occupancyRate: number;
  status: "available" | "limited" | "sold_out" | "blocked";
}

/**
 * Get comprehensive revenue metrics for a date range
 */
export async function getRevenueMetrics(
  dateRange: DateRange
): Promise<RevenueMetrics> {
  await connectToDatabase();

  const { startDate, endDate } = dateRange;

  // Get all confirmed bookings within date range
  const bookings = await BookingModel.find({
    createdAt: { $gte: startDate, $lte: endDate },
    status: "confirmed",
  })
    .populate("bus")
    .lean();

  // Calculate total revenue
  const totalRevenue = bookings.reduce(
    (sum, booking) => sum + (booking.finalPrice || 0),
    0
  );

  // Count total bookings and seats
  const totalBookings = bookings.length;
  const bookedSeats = bookings.reduce(
    (sum, booking) => sum + (booking.seats?.length || 0),
    0
  );

  // Calculate average order value
  const averageOrderValue =
    totalBookings > 0 ? totalRevenue / totalBookings : 0;

  // Group revenue by route
  const routeMap = new Map<string, RevenueRouteStats>();

  for (const booking of bookings) {
    const bus = booking.bus as any;
    if (!bus?.routeId) continue;

    const routeId = bus.routeId.toString();
    if (!routeMap.has(routeId)) {
      const route = await RouteModel.findById(routeId).lean();
      routeMap.set(routeId, {
        routeId,
        routeName: route ? `${route.from} → ${route.to}` : "Unknown Route",
        revenue: 0,
        bookings: 0,
        totalSeats: 0,
        bookedSeats: 0,
      });
    }

    const route = routeMap.get(routeId);
    if (!route) {
      continue;
    }
    route.revenue += booking.finalPrice || 0;
    route.bookings += 1;
    route.totalSeats += bus.totalSeats || 40;
    route.bookedSeats += booking.seats?.length || 0;
  }

  const revenueByRoute = Array.from(routeMap.values()).map((route) => ({
    routeId: route.routeId,
    routeName: route.routeName,
    revenue: route.revenue,
    bookings: route.bookings,
    occupancyRate: route.totalSeats > 0 ? route.bookedSeats / route.totalSeats : 0,
  }));

  // Group revenue by bus type
  const busTypeMap = new Map<string, any>();

  for (const booking of bookings) {
    const bus = booking.bus as any;
    if (!bus) continue;

    const busType = bus.busType || "standard";
    if (!busTypeMap.has(busType)) {
      busTypeMap.set(busType, {
        busType,
        revenue: 0,
        bookings: 0,
      });
    }

    const typeData = busTypeMap.get(busType);
    typeData.revenue += booking.finalPrice || 0;
    typeData.bookings += 1;
  }

  const revenueByBusType = Array.from(busTypeMap.values());

  // Calculate daily revenue
  const dailyMap = new Map<string, any>();

  for (const booking of bookings) {
    const dateKey = new Date(booking.createdAt)
      .toISOString()
      .split("T")[0];

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        revenue: 0,
        bookings: 0,
      });
    }

    const dayData = dailyMap.get(dateKey);
    dayData.revenue += booking.finalPrice || 0;
    dayData.bookings += 1;
  }

  const dailyRevenue = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    totalRevenue,
    bookedSeats,
    totalBookings,
    averageOrderValue,
    revenueByRoute,
    revenueByBusType,
    dailyRevenue,
  };
}

/**
 * Get key performance indicators (KPIs) with comparison to previous period
 */
export async function getKPIs(
  currentRange: DateRange,
  previousRange: DateRange
): Promise<KPIs> {
  await connectToDatabase();

  // Get current period metrics
  const currentBookings = await BookingModel.find({
    createdAt: { $gte: currentRange.startDate, $lte: currentRange.endDate },
    status: { $in: ["confirmed", "pending"] },
  }).lean();

  const currentRevenue = currentBookings.reduce(
    (sum, b) => sum + (b.finalPrice || 0),
    0
  );
  const currentBookingsCount = currentBookings.length;
  const currentPassengers = currentBookings.reduce(
    (sum, b) => sum + (b.seats?.length || 0),
    0
  );

  // Get previous period metrics for comparison
  const previousBookings = await BookingModel.find({
    createdAt: { $gte: previousRange.startDate, $lte: previousRange.endDate },
    status: { $in: ["confirmed", "pending"] },
  }).lean();

  const previousRevenue = previousBookings.reduce(
    (sum, b) => sum + (b.finalPrice || 0),
    0
  );
  const previousBookingsCount = previousBookings.length;

  // Calculate percentage changes
  const revenueChange =
    previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;
  const bookingsChange =
    previousBookingsCount > 0
      ? ((currentBookingsCount - previousBookingsCount) / previousBookingsCount) *
        100
      : 0;

  // Calculate average occupancy
  const buses = await BusModel.find().lean();
  const totalSeats = buses.reduce((sum, bus) => sum + (bus.totalSeats || 40), 0);
  const averageOccupancy = totalSeats > 0 ? currentPassengers / totalSeats : 0;

  // Calculate cancellation rate
  const cancelledBookings = await BookingModel.countDocuments({
    createdAt: { $gte: currentRange.startDate, $lte: currentRange.endDate },
    status: "cancelled",
  });
  const cancellationRate =
    currentBookingsCount > 0
      ? (cancelledBookings / currentBookingsCount) * 100
      : 0;

  // Get active counts
  const activeRoutes = await RouteModel.countDocuments({ isActive: true });
  const activeBuses = await BusModel.countDocuments({ isActive: true });

  return {
    totalRevenue: currentRevenue,
    revenueChange: Math.round(revenueChange * 10) / 10,
    totalBookings: currentBookingsCount,
    bookingsChange: Math.round(bookingsChange * 10) / 10,
    averageOccupancy: Math.round(averageOccupancy * 1000) / 10,
    occupancyChange: 0, // Would need historical data for this
    cancellationRate: Math.round(cancellationRate * 10) / 10,
    totalPassengers: currentPassengers,
    activeRoutes,
    activeBuses,
  };
}

/**
 * Get detailed performance metrics for all routes
 */
export async function getRoutePerformance(
  dateRange?: DateRange
): Promise<RoutePerformance[]> {
  await connectToDatabase();

  const matchQuery: any = { status: "confirmed" };
  if (dateRange) {
    matchQuery.createdAt = {
      $gte: dateRange.startDate,
      $lte: dateRange.endDate,
    };
  }

  const bookings = await BookingModel.find(matchQuery).populate("bus").lean();

  // Group by route
  const routeMap = new Map<string, RouteStats>();

  for (const booking of bookings) {
    const bus = booking.bus as any;
    if (!bus?.routeId) continue;

    const routeId = bus.routeId.toString();
    if (!routeMap.has(routeId)) {
      const route = await RouteModel.findById(routeId).lean();
      routeMap.set(routeId, {
        routeId,
        routeName: route ? `${route.from} → ${route.to}` : "Unknown Route",
        from: route?.from || "",
        to: route?.to || "",
        distance: route?.distance || 0,
        totalBookings: 0,
        totalRevenue: 0,
        totalSeats: 0,
        bookedSeats: 0,
        cancellations: 0,
        seatFrequency: new Map<string, number>(),
      });
    }

    const route = routeMap.get(routeId);
    if (!route) {
      continue;
    }
    route.totalBookings += 1;
    route.totalRevenue += booking.finalPrice || 0;
    route.totalSeats += bus.totalSeats || 40;
    route.bookedSeats += booking.seats?.length || 0;

    // Track seat popularity
    for (const seat of booking.seats || []) {
      route.seatFrequency.set(
        seat,
        (route.seatFrequency.get(seat) || 0) + 1
      );
    }
  }

  // Calculate performance metrics
  const performance: RoutePerformance[] = [];

  for (const [_, data] of routeMap) {
    const totalBookings = data.totalBookings;
    const cancelledBookings = data.cancellations;
    const cancellationRate =
      totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

    const averageOccupancy =
      data.totalSeats > 0 ? (data.bookedSeats / data.totalSeats) * 100 : 0;

    const averageTicketPrice =
      totalBookings > 0 ? data.totalRevenue / data.bookedSeats : 0;

    // Get top 5 most popular seats
    const popularSeats = Array.from(data.seatFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([seat]) => seat);

    // Calculate performance rating
    let performanceRating: "excellent" | "good" | "average" | "poor";
    if (averageOccupancy > 80 && cancellationRate < 5) {
      performanceRating = "excellent";
    } else if (averageOccupancy > 60 && cancellationRate < 15) {
      performanceRating = "good";
    } else if (averageOccupancy > 40 && cancellationRate < 25) {
      performanceRating = "average";
    } else {
      performanceRating = "poor";
    }

    performance.push({
      routeId: data.routeId,
      routeName: data.routeName,
      from: data.from,
      to: data.to,
      distance: data.distance,
      totalBookings,
      totalRevenue: data.totalRevenue,
      averageOccupancy: Math.round(averageOccupancy * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      averageTicketPrice: Math.round(averageTicketPrice),
      popularSeats,
      performanceRating,
    });
  }

  return performance.sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Get occupancy report for all buses
 */
export async function getOccupancyReport(): Promise<OccupancyReport[]> {
  await connectToDatabase();

  const buses = await BusModel.find({ isActive: true })
    .populate("routeId")
    .lean();

  const reports: OccupancyReport[] = [];

  for (const bus of buses) {
    const route = bus.routeId as any;
    const routeName = route ? `${route.from} → ${route.to}` : "Unknown Route";

    const totalSeats = bus.totalSeats || 40;
    const bookedSeats = bus.bookedSeats?.length || 0;
    const blockedSeats = bus.blockedSeats?.length || 0;
    const availableSeats = totalSeats - bookedSeats - blockedSeats;
    const occupancyRate = totalSeats > 0 ? (bookedSeats / totalSeats) * 100 : 0;

    // Determine status
    let status: "available" | "limited" | "sold_out" | "blocked";
    if (blockedSeats >= totalSeats) {
      status = "blocked";
    } else if (availableSeats === 0) {
      status = "sold_out";
    } else if (occupancyRate > 80) {
      status = "limited";
    } else {
      status = "available";
    }

    reports.push({
      busId: bus._id.toString(),
      busNumber: bus.busNumber,
      routeName,
      departureDate: bus.date,
      totalSeats,
      bookedSeats,
      blockedSeats,
      availableSeats,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      status,
    });
  }

  return reports.sort((a, b) => b.occupancyRate - a.occupancyRate);
}

/**
 * Get booking trends over time
 */
export async function getBookingTrends(
  months: number = 12
): Promise<Array<{ month: string; bookings: number; revenue: number }>> {
  await connectToDatabase();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const bookings = await BookingModel.find({
    createdAt: { $gte: startDate },
    status: "confirmed",
  }).lean();

  const monthlyMap = new Map<string, { bookings: number; revenue: number }>();

  for (const booking of bookings) {
    const date = new Date(booking.createdAt);
    const monthKey = date.toLocaleString("default", {
      year: "numeric",
      month: "short",
    });

    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, { bookings: 0, revenue: 0 });
    }

    const monthData = monthlyMap.get(monthKey)!;
    monthData.bookings += 1;
    monthData.revenue += booking.finalPrice || 0;
  }

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      bookings: data.bookings,
      revenue: data.revenue,
    }))
    .sort((a, b) => {
      const dateA = new Date(a.month);
      const dateB = new Date(b.month);
      return dateA.getTime() - dateB.getTime();
    });
}
