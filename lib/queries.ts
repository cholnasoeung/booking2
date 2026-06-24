import "server-only";

import { Types } from "mongoose";

import { formatDateInput, getTravelDateRange } from "@/lib/date";
import { connectToDatabase } from "@/lib/mongodb";
import {
  type BusType,
  type NormalizedSeatLayout,
  type SeatLayout,
  normalizeBusSeatLayout,
  normalizeStoredSeatCodes,
} from "@/lib/seat-layout";
import { BusStop } from "@/types/bus";
import { escapeRegExp, normalizeCity, parsePassengerCount } from "@/lib/validation";
import BookingModel, { type BookingStatus } from "@/models/Booking";
import BusDetailModel from "@/models/BusDetail";
import BusModel from "@/models/Bus";
import DriverModel from "@/models/Driver";
import RatingModel from "@/models/Rating";
import RouteModel from "@/models/Route";
import UserModel, { type UserRole } from "@/models/User";

type RouteRecord = {
  _id: Types.ObjectId;
  from: string;
  to: string;
  duration: string;
  distance: number;
};

type StoredBusRecord = {
  _id: Types.ObjectId;
  routeId: Types.ObjectId;
  date: Date;
  departureTime: string;
  arrivalTime: string;
  busType?: BusType;
  seatLayout?: SeatLayout | null;
  totalSeats: number;
  bookedSeats: Array<string | number>;
  blockedSeats: Array<string | number>;
  pricePerSeat: number;
  amenities?: string[];
  stops?: BusStop[];
  driverId?: Types.ObjectId | null;
  busDetailId?: Types.ObjectId | null;
  departureStatus?: string;
  delayMinutes?: number;
  statusNote?: string;
  seatTierMultipliers?: { business?: number; vip?: number } | null;
};

type DriverRecord = {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber?: string;
  status: "active" | "inactive";
  createdAt: Date;
};

type BusDetailRecord = {
  _id: Types.ObjectId;
  name: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  seatLayoutTemplate?: SeatLayout | null;
  amenities: string[];
  createdAt: Date;
  images: string[];
};

type NormalizedBusRecord = Omit<
  StoredBusRecord,
  "bookedSeats" | "seatLayout" | "busType" | "blockedSeats" | "amenities" | "driverId" | "busDetailId"
> &
  NormalizedSeatLayout & {
    blockedSeats: string[];
    stops: BusStop[];
    driverId: string | null;
    busDetailId: string | null;
    amenities: string[];
  };

type BookingRecord = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  bus: Types.ObjectId;
  seats: string[];
  passengers?: PassengerRecord[];
  totalPrice: number;
  status: BookingStatus;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  boardingStop?: string;
  droppingStop?: string;
};

type PassengerRecord = {
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  contactNumber: string;
  email?: string;
};

type UserRecord = {
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: UserRole;
};

export type RouteSummary = {
  id: string;
  from: string;
  to: string;
  duration: string;
  distance: number;
};

  export type BusSummary = {
    id: string;
  routeId: string;
  from: string;
  to: string;
  duration: string;
  distance: number;
  travelDate: string;
  departureTime: string;
  arrivalTime: string;
  busType: BusType;
  seatLayout: SeatLayout;
  templateStatus: SeatLayout["template"];
  totalSeats: number;
  bookedSeats: string[];
  blockedSeats: string[];
  seatsLeft: number;
  pricePerSeat: number;
  amenities: string[];
  stops: BusStop[];
  departureStatus: string;
  delayMinutes: number;
  statusNote: string;
  seatTierMultipliers?: { business?: number; vip?: number } | null;
  rating?: { average: number; count: number } | null;
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehicleNumber?: string;
  } | null;
    busDetail?: {
      id: string;
      name: string;
      registrationNumber: string;
      busType: BusType;
      totalSeats: number;
      amenities: string[];
      seatLayoutTemplate?: SeatLayout | null;
      images: string[];
    } | null;
};

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type DriverSummary = {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber?: string;
  status: "active" | "inactive";
  createdAt: string;
};

export type BusDetailSummary = {
  id: string;
  name: string;
  registrationNumber: string;
  busType: BusType;
  totalSeats: number;
  amenities: string[];
  createdAt: string;
  seatLayoutTemplate?: SeatLayout | null;
  images: string[];
};

export type BookingSummary = {
  id: string;
  status: BookingStatus;
  seats: string[];
  totalPrice: number;
  createdAt: string;
  bus: BusSummary | null;
  boardingStop?: string;
  droppingStop?: string;
};

export type PassengerSummary = {
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  contactNumber: string;
  email?: string;
};

export type AdminBookingSummary = BookingSummary & {
  user: UserSummary | null;
  passengers: PassengerSummary[];
  cancelledAt: string | null;
  cancellationReason: string | null;
};

function serializeRoute(route: RouteRecord): RouteSummary {
  return {
    id: String(route._id),
    from: route.from,
    to: route.to,
    duration: route.duration,
    distance: route.distance,
  };
}

function normalizeBusRecord(bus: StoredBusRecord): NormalizedBusRecord {
  const normalized = normalizeBusSeatLayout(bus);
  const { driverId, busDetailId, bookedSeats, blockedSeats, amenities, ...rest } = bus;

  return {
    ...rest,
    busType: normalized.busType,
    seatLayout: normalized.seatLayout,
    templateStatus: normalized.templateStatus,
    totalSeats: normalized.totalSeats,
    bookedSeats: normalized.bookedSeats,
    seatCodes: normalized.seatCodes,
    stops: (bus.stops ?? []).map((stop) => ({
      location: stop.location,
      boarding: stop.boarding,
      dropping: stop.dropping,
      order: stop.order,
    })),
    driverId: driverId ? String(driverId) : null,
    busDetailId: busDetailId ? String(busDetailId) : null,
    blockedSeats: (blockedSeats || []).map(String),
    amenities: amenities ?? [],
  };
}

function serializeBus(
  bus: NormalizedBusRecord,
  route: RouteRecord,
  driver: DriverRecord | null = null,
  busDetail: BusDetailRecord | null = null
): BusSummary {
  const stops =
    bus.stops && bus.stops.length > 0
      ? bus.stops
      : [
          { location: route.from, boarding: true, dropping: false, order: 0 },
          { location: route.to, boarding: false, dropping: true, order: 1 },
        ];

  return {
    id: String(bus._id),
    routeId: String(route._id),
    from: route.from,
    to: route.to,
    duration: route.duration,
    distance: route.distance,
    travelDate: formatDateInput(bus.date),
    departureTime: bus.departureTime,
    arrivalTime: bus.arrivalTime,
    busType: bus.busType,
    seatLayout: bus.seatLayout,
    templateStatus: bus.templateStatus,
    totalSeats: bus.totalSeats,
    bookedSeats: bus.bookedSeats,
    blockedSeats: bus.blockedSeats ?? [],
    seatsLeft: Math.max(bus.totalSeats - bus.bookedSeats.length - (bus.blockedSeats?.length ?? 0), 0),
    pricePerSeat: bus.pricePerSeat,
    amenities: bus.amenities,
    departureStatus: bus.departureStatus ?? "scheduled",
    delayMinutes: bus.delayMinutes ?? 0,
    statusNote: bus.statusNote ?? "",
    seatTierMultipliers: bus.seatTierMultipliers ?? null,
    stops,
    driver: driver
      ? {
          id: String(driver._id),
          name: driver.name,
          phone: driver.phone,
          vehicleNumber: driver.vehicleNumber,
        }
      : null,
    busDetail: busDetail
      ? {
          id: String(busDetail._id),
          name: busDetail.name,
          registrationNumber: busDetail.registrationNumber,
          busType: busDetail.busType,
          totalSeats: busDetail.totalSeats,
          amenities: busDetail.amenities,
          seatLayoutTemplate: busDetail.seatLayoutTemplate ?? null,
          images: busDetail.images ?? [],
        }
      : null,
  };
}

function serializeUser(user: UserRecord): UserSummary {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function serializeDriver(driver: DriverRecord): DriverSummary {
  return {
    id: String(driver._id),
    name: driver.name,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
    vehicleNumber: driver.vehicleNumber,
    status: driver.status,
    createdAt: driver.createdAt.toISOString(),
  };
}

function serializeBusDetail(detail: BusDetailRecord): BusDetailSummary {
  return {
    id: String(detail._id),
    name: detail.name,
    registrationNumber: detail.registrationNumber,
    busType: detail.busType,
    totalSeats: detail.totalSeats,
    amenities: detail.amenities,
    createdAt: detail.createdAt.toISOString(),
    seatLayoutTemplate: detail.seatLayoutTemplate ?? null,
    images: detail.images ?? [],
  };
}

function serializeBooking(
  booking: BookingRecord,
  busMap: Map<string, NormalizedBusRecord>,
  routeMap: Map<string, RouteRecord>,
  userMap?: Map<string, UserRecord>
): AdminBookingSummary {
  const bus = busMap.get(String(booking.bus));
  const route = bus ? routeMap.get(String(bus.routeId)) ?? null : null;
  const userRecord = userMap?.get(String(booking.user)) ?? null;
  const seats = bus
    ? normalizeStoredSeatCodes(booking.seats, bus.seatLayout)
    : booking.seats;

  return {
    id: String(booking._id),
    status: booking.status,
    seats,
    totalPrice: booking.totalPrice,
    createdAt: booking.createdAt.toISOString(),
    bus: bus && route ? serializeBus(bus, route) : null,
    user: userRecord ? serializeUser(userRecord) : null,
    passengers: (booking.passengers ?? []).map((passenger) => ({
      name: passenger.name,
      age: passenger.age,
      gender: passenger.gender,
      contactNumber: passenger.contactNumber,
      email: passenger.email,
    })),
    boardingStop: booking.boardingStop,
    droppingStop: booking.droppingStop,
    cancelledAt: booking.cancelledAt?.toISOString() ?? null,
    cancellationReason: booking.cancellationReason ?? null,
  };
}

export async function getRouteSummaries() {
  await connectToDatabase();

  const routes = (await RouteModel.find()
    .sort({ from: 1, to: 1 })
    .lean()) as RouteRecord[];

  return routes.map(serializeRoute);
}

export async function searchBuses(filters: {
  from?: string;
  to?: string;
  date?: string;
  passengers?: number;
}) {
  await connectToDatabase();

  const routeQuery: Record<string, unknown> = {};

  if (filters.from) {
    routeQuery.from = new RegExp(
      `^${escapeRegExp(normalizeCity(filters.from))}$`,
      "i"
    );
  }

  if (filters.to) {
    routeQuery.to = new RegExp(`^${escapeRegExp(normalizeCity(filters.to))}$`, "i");
  }

  const routes = (await RouteModel.find(routeQuery).lean()) as RouteRecord[];

  if (routes.length === 0) {
    return [];
  }

  const routeIds = routes.map((route) => route._id);
  const busQuery: Record<string, unknown> = {
    routeId: {
      $in: routeIds,
    },
  };

  if (filters.date) {
    const { start, end } = getTravelDateRange(filters.date);
    busQuery.date = {
      $gte: start,
      $lte: end,
    };
  }

  const buses = (await BusModel.find(busQuery)
    .sort({ departureTime: 1 })
    .lean()) as StoredBusRecord[];

  const detailIds = [
    ...new Set(
      buses
        .map((bus) => bus.busDetailId)
        .filter((id): id is Types.ObjectId => Boolean(id))
        .map((id) => String(id))
    ),
  ];
  const busDetails =
    detailIds.length === 0
      ? []
      : ((await BusDetailModel.find({ _id: { $in: detailIds } }).lean()) as BusDetailRecord[]);
  const busDetailMap = new Map(busDetails.map((detail) => [String(detail._id), detail]));
  const routeMap = new Map(routes.map((route) => [String(route._id), route]));
  const passengers = parsePassengerCount(filters.passengers);

  // Bulk-fetch ratings for all buses in results
  const busObjectIds = buses.map((bus) => bus._id);
  const ratingAggs = busObjectIds.length > 0
    ? await RatingModel.aggregate([
        { $match: { bus: { $in: busObjectIds }, status: "approved" } },
        { $group: { _id: "$bus", average: { $avg: "$rating" }, count: { $sum: 1 } } },
      ])
    : [];
  const ratingMap = new Map<string, { average: number; count: number }>(
    ratingAggs.map((r) => [String(r._id), { average: Math.round(r.average * 10) / 10, count: r.count }])
  );

  return buses
      .map((bus) => {
        const route = routeMap.get(String(bus.routeId));
        if (!route) {
          return null;
        }

        const busDetail = bus.busDetailId
          ? busDetailMap.get(String(bus.busDetailId)) ?? null
          : null;

        const result = serializeBus(normalizeBusRecord(bus), route, null, busDetail);
        result.rating = ratingMap.get(String(bus._id)) ?? null;
        return result;
      })
    .filter((bus): bus is BusSummary => bus !== null)
    .filter((bus) => bus.seatsLeft >= passengers)
    .sort((first, second) => first.departureTime.localeCompare(second.departureTime));
}

export async function getBusSummary(busId: string) {
  await connectToDatabase();

  const bus = (await BusModel.findById(busId).lean()) as StoredBusRecord | null;

  if (!bus) {
    return null;
  }

  const route = (await RouteModel.findById(bus.routeId).lean()) as RouteRecord | null;

  if (!route) {
    return null;
  }

  const [driver, busDetail] = await Promise.all([
    bus.driverId
      ? (DriverModel.findById(bus.driverId).lean() as Promise<DriverRecord | null>)
      : Promise.resolve(null),
    bus.busDetailId
      ? (BusDetailModel.findById(bus.busDetailId).lean() as Promise<BusDetailRecord | null>)
      : Promise.resolve(null),
  ]);

  return serializeBus(normalizeBusRecord(bus), route, driver, busDetail);
}

export async function getUserBookings(userId: string) {
  await connectToDatabase();

  const bookings = (await BookingModel.find({ user: userId })
    .sort({ createdAt: -1 })
    .lean()) as BookingRecord[];

  if (bookings.length === 0) {
    return [];
  }

  const busIds = [...new Set(bookings.map((booking) => String(booking.bus)))];
  const buses = (await BusModel.find({
    _id: { $in: busIds },
  }).lean()) as StoredBusRecord[];

  const normalizedBuses = buses.map(normalizeBusRecord);
  const routeIds = [...new Set(normalizedBuses.map((bus) => String(bus.routeId)))];
  const routes = (await RouteModel.find({
    _id: { $in: routeIds },
  }).lean()) as RouteRecord[];

  const busMap = new Map(normalizedBuses.map((bus) => [String(bus._id), bus]));
  const routeMap = new Map(routes.map((route) => [String(route._id), route]));

  return bookings.map((booking) => {
    const summary = serializeBooking(booking, busMap, routeMap);

    return {
      id: summary.id,
      status: summary.status,
      seats: summary.seats,
      totalPrice: summary.totalPrice,
      createdAt: summary.createdAt,
      bus: summary.bus,
    } satisfies BookingSummary;
  });
}

export async function getBookingSummaryById(bookingId: string) {
  await connectToDatabase();

  const booking = (await BookingModel.findById(bookingId).lean()) as BookingRecord | null;

  if (!booking) {
    return null;
  }

  const bus = (await BusModel.findById(booking.bus).lean()) as StoredBusRecord | null;
  const normalizedBus = bus ? normalizeBusRecord(bus) : null;
  const route =
    normalizedBus &&
    ((await RouteModel.findById(normalizedBus.routeId).lean()) as RouteRecord | null);
  const user = (await UserModel.findById(booking.user)
    .select("name email role")
    .lean()) as UserRecord | null;

  const busMap = new Map<string, NormalizedBusRecord>();
  const routeMap = new Map<string, RouteRecord>();
  const userMap = new Map<string, UserRecord>();

  if (normalizedBus) {
    busMap.set(String(normalizedBus._id), normalizedBus);
  }

  if (route) {
    routeMap.set(String(route._id), route);
  }

  if (user) {
    userMap.set(String(user._id), user);
  }

  return serializeBooking(booking, busMap, routeMap, userMap);
}

export async function getAdminSnapshot() {
  await connectToDatabase();

  const [routes, buses, bookings, users] = await Promise.all([
    RouteModel.find().sort({ from: 1, to: 1 }).lean(),
    BusModel.find().sort({ date: 1, departureTime: 1 }).lean(),
    BookingModel.find().sort({ createdAt: -1 }).lean(),
    UserModel.find().select("name email role").lean(),
  ]);

  const typedRoutes = routes as RouteRecord[];
  const typedBuses = (buses as StoredBusRecord[]).map(normalizeBusRecord);
  const typedBookings = bookings as BookingRecord[];
  const typedUsers = users as UserRecord[];
  const drivers = (await DriverModel.find().lean()) as DriverRecord[];

  const typedDrivers = drivers;
  const detailIds = [
    ...new Set(
      typedBuses
        .map((bus) => bus.busDetailId)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const typedBusDetails =
    detailIds.length === 0
      ? []
      : ((await BusDetailModel.find({
          _id: { $in: detailIds },
        }).lean()) as BusDetailRecord[]);
  const busDetailMap = new Map(typedBusDetails.map((detail) => [String(detail._id), detail]));
  const routeMap = new Map(typedRoutes.map((route) => [String(route._id), route]));
  const busMap = new Map(typedBuses.map((bus) => [String(bus._id), bus]));
  const userMap = new Map(typedUsers.map((user) => [String(user._id), user]));
  const driverMap = new Map(typedDrivers.map((driver) => [String(driver._id), driver]));

  return {
    routes: typedRoutes.map(serializeRoute),
    buses: typedBuses
      .map((bus) => {
        const route = routeMap.get(String(bus.routeId));
        const driver = bus.driverId ? driverMap.get(bus.driverId) ?? null : null;
        const busDetail = bus.busDetailId
          ? busDetailMap.get(bus.busDetailId) ?? null
          : null;
        return route ? serializeBus(bus, route, driver, busDetail) : null;
      })
      .filter((bus): bus is BusSummary => bus !== null),
      bookings: typedBookings.map((booking) =>
        serializeBooking(booking, busMap, routeMap, userMap)
      ),
      drivers: typedDrivers.map(serializeDriver),
      busDetails: typedBusDetails.map(serializeBusDetail),
    };
  }

export interface KPIMetrics {
  revenueToday: {
    value: number;
    change: number;
  };
  bookingsToday: {
    value: number;
    change: number;
  };
  cancellations: {
    value: number;
    change: number;
  };
  pendingRefunds: {
    value: number;
  };
}

export async function getKPIMetrics(): Promise<KPIMetrics> {
  await connectToDatabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Today's revenue
  const revenueTodayResult = await BookingModel.aggregate([
    {
      $match: {
        status: 'confirmed',
        createdAt: { $gte: today }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalPrice' }
      }
    }
  ]);

  const revenueYesterdayResult = await BookingModel.aggregate([
    {
      $match: {
        status: 'confirmed',
        createdAt: { $gte: yesterday, $lt: today }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totalPrice' }
      }
    }
  ]);

  const revenueToday = revenueTodayResult[0]?.total || 0;
  const revenueYesterday = revenueYesterdayResult[0]?.total || 0;
  const revenueChange = revenueYesterday > 0
    ? Math.round(((revenueToday - revenueYesterday) / revenueYesterday) * 100)
    : 0;

  // Today's bookings
  const bookingsToday = await BookingModel.countDocuments({
    status: 'confirmed',
    createdAt: { $gte: today }
  });

  const bookingsYesterday = await BookingModel.countDocuments({
    status: 'confirmed',
    createdAt: { $gte: yesterday, $lt: today }
  });

  const bookingsChange = bookingsYesterday > 0
    ? Math.round(((bookingsToday - bookingsYesterday) / bookingsYesterday) * 100)
    : 0;

  // Today's cancellations
  const cancellationsToday = await BookingModel.countDocuments({
    status: 'cancelled',
    updatedAt: { $gte: today }
  });

  const cancellationsYesterday = await BookingModel.countDocuments({
    status: 'cancelled',
    updatedAt: { $gte: yesterday, $lt: today }
  });

  const cancellationsChange = cancellationsYesterday > 0
    ? Math.round(((cancellationsToday - cancellationsYesterday) / cancellationsYesterday) * 100)
    : 0;

  // Pending refunds
  const pendingRefunds = await BookingModel.countDocuments({
    status: 'cancelled',
    $or: [
      { refundStatus: { $exists: false } },
      { refundStatus: 'pending' }
    ]
  });

  return {
    revenueToday: {
      value: revenueToday,
      change: revenueChange
    },
    bookingsToday: {
      value: bookingsToday,
      change: bookingsChange
    },
    cancellations: {
      value: cancellationsToday,
      change: cancellationsChange
    },
    pendingRefunds: {
      value: pendingRefunds
    }
  };
}
