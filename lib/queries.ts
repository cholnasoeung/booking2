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
import { escapeRegExp, normalizeCity, parsePassengerCount } from "@/lib/validation";
import BookingModel, { type BookingStatus } from "@/models/Booking";
import BusModel from "@/models/Bus";
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
  pricePerSeat: number;
};

type NormalizedBusRecord = Omit<StoredBusRecord, "bookedSeats" | "seatLayout" | "busType"> &
  NormalizedSeatLayout;

type BookingRecord = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  bus: Types.ObjectId;
  seats: string[];
  passengers?: any[];
  totalPrice: number;
  status: BookingStatus;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
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
  seatsLeft: number;
  pricePerSeat: number;
};

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export type BookingSummary = {
  id: string;
  status: BookingStatus;
  seats: string[];
  totalPrice: number;
  createdAt: string;
  bus: BusSummary | null;
};

export type AdminBookingSummary = BookingSummary & {
  user: UserSummary | null;
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

  return {
    ...bus,
    busType: normalized.busType,
    seatLayout: normalized.seatLayout,
    templateStatus: normalized.templateStatus,
    totalSeats: normalized.totalSeats,
    bookedSeats: normalized.bookedSeats,
    seatCodes: normalized.seatCodes,
  };
}

function serializeBus(bus: NormalizedBusRecord, route: RouteRecord): BusSummary {
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
    seatsLeft: Math.max(bus.totalSeats - bus.bookedSeats.length, 0),
    pricePerSeat: bus.pricePerSeat,
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

  const routeMap = new Map(routes.map((route) => [String(route._id), route]));
  const passengers = parsePassengerCount(filters.passengers);

  return buses
    .map((bus) => {
      const route = routeMap.get(String(bus.routeId));
      if (!route) {
        return null;
      }

      return serializeBus(normalizeBusRecord(bus), route);
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

  return serializeBus(normalizeBusRecord(bus), route);
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

  const routeMap = new Map(typedRoutes.map((route) => [String(route._id), route]));
  const busMap = new Map(typedBuses.map((bus) => [String(bus._id), bus]));
  const userMap = new Map(typedUsers.map((user) => [String(user._id), user]));

  return {
    routes: typedRoutes.map(serializeRoute),
    buses: typedBuses
      .map((bus) => {
        const route = routeMap.get(String(bus.routeId));
        return route ? serializeBus(bus, route) : null;
      })
      .filter((bus): bus is BusSummary => bus !== null),
    bookings: typedBookings.map((booking) =>
      serializeBooking(booking, busMap, routeMap, userMap)
    ),
  };
}
