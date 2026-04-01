export type UserRole = "user" | "admin";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "refunded";
export type BusType = "bus_45" | "mini_bus" | "car";
export type SeatLayoutItemKind =
  | "seat"
  | "sleeper"
  | "aisle"
  | "driver"
  | "toilet"
  | "empty";

export type SeatLayoutItem = {
  id: string;
  kind: SeatLayoutItemKind;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
  seatCode?: string;
  label?: string;
};

export type SeatLayout = {
  version: 1;
  template: BusType | "custom";
  grid: {
    rows: number;
    cols: number;
  };
  items: SeatLayoutItem[];
};

export type BusStop = {
  location: string;
  boarding: boolean;
  dropping: boolean;
  order: number;
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
  busDetail?: {
    id: string;
    name: string;
    registrationNumber: string;
    busType: BusType;
    totalSeats: number;
    amenities: string[];
  } | null;
};

export type Passenger = {
  id: string;
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  contactNumber: string;
  email?: string;
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

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
};

export type Promotion = {
  id: string;
  code: string;
  discount: number | string;
  description: string;
  expiresIn?: string;
  isActive: boolean;
  backgroundColor?: string;
  icon?: string;
};
