import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

type RouteSeed = {
  from: string;
  to: string;
  duration: string;
  distance: number;
};

async function seed() {
  const [
    { hash },
    { getTomorrowDateInput, toTravelDate },
    { connectToDatabase },
    { getSeatCodesFromLayout, getSeatLayoutTemplate },
    { default: BookingModel },
    { default: BusModel },
    { default: RouteModel },
    { default: UserModel },
  ] = await Promise.all([
    import("bcryptjs"),
    import("../lib/date"),
    import("../lib/mongodb"),
    import("../lib/seat-layout"),
    import("../models/Booking"),
    import("../models/Bus"),
    import("../models/Route"),
    import("../models/User"),
  ]);

  await connectToDatabase();

  await Promise.all([
    BookingModel.deleteMany({}),
    BusModel.deleteMany({}),
    RouteModel.deleteMany({}),
    UserModel.deleteMany({}),
  ]);

  const [adminPassword, userPassword] = await Promise.all([
    hash("admin123", 10),
    hash("user123", 10),
  ]);

  const [adminUser, regularUser] = await UserModel.create([
    {
      name: "Admin User",
      email: "admin@bus.com",
      password: adminPassword,
      role: "admin",
    },
    {
      name: "Regular User",
      email: "user@bus.com",
      password: userPassword,
      role: "user",
    },
  ]);

  const routeSeeds: RouteSeed[] = [
    {
      from: "Phnom Penh",
      to: "Siem Reap",
      duration: "6h 15m",
      distance: 315,
    },
    {
      from: "Phnom Penh",
      to: "Sihanoukville",
      duration: "4h 45m",
      distance: 230,
    },
    {
      from: "Phnom Penh",
      to: "Kampot",
      duration: "3h 40m",
      distance: 148,
    },
    {
      from: "Siem Reap",
      to: "Battambang",
      duration: "3h 10m",
      distance: 165,
    },
    {
      from: "Phnom Penh",
      to: "Poipet",
      duration: "8h 00m",
      distance: 410,
    },
  ];

  const routes = await RouteModel.create(routeSeeds);

  const tomorrow = getTomorrowDateInput();
  const busDate = toTravelDate(tomorrow);
  const buses = routes.flatMap((route, index) => {
    const morningType =
      index === 2 || index === 3 ? "car" : "mini_bus";
    const eveningType =
      index === 0 || index === 1 || index === 4 ? "sleeping_bus" : "mini_bus";

    const morningLayout = getSeatLayoutTemplate(morningType);
    const eveningLayout = getSeatLayoutTemplate(eveningType);
    const morningSeatCodes = getSeatCodesFromLayout(morningLayout);
    const eveningSeatCodes = getSeatCodesFromLayout(eveningLayout);

    return [
      {
        routeId: route._id,
        date: busDate,
        departureTime: "08:00",
        arrivalTime:
          route.to === "Poipet"
            ? "16:00"
            : route.to === "Siem Reap"
              ? "14:15"
              : route.to === "Sihanoukville"
                ? "12:45"
                : route.to === "Kampot"
                  ? "11:40"
                  : "11:10",
        busType: morningType,
        seatLayout: morningLayout,
        totalSeats: morningSeatCodes.length,
        bookedSeats: morningSeatCodes.slice(
          0,
          morningType === "car" ? 2 : 6 + index
        ),
        pricePerSeat:
          route.to === "Poipet"
            ? 24
            : route.to === "Siem Reap"
              ? 19
              : route.to === "Sihanoukville"
                ? 17
                : route.to === "Kampot"
                  ? 15
                  : 16,
      },
      {
        routeId: route._id,
        date: busDate,
        departureTime: "18:00",
        arrivalTime:
          route.to === "Poipet"
            ? "02:00"
            : route.to === "Siem Reap"
              ? "00:15"
              : route.to === "Sihanoukville"
                ? "22:45"
                : route.to === "Kampot"
                  ? "21:40"
                  : "21:10",
        busType: eveningType,
        seatLayout: eveningLayout,
        totalSeats: eveningSeatCodes.length,
        bookedSeats: eveningSeatCodes.slice(
          0,
          eveningType === "sleeping_bus" ? 7 + index : 4 + index
        ),
        pricePerSeat:
          route.to === "Poipet"
            ? 25
            : route.to === "Siem Reap"
              ? 20
              : route.to === "Sihanoukville"
                ? 18
                : route.to === "Kampot"
                  ? 16
                  : 17,
      },
    ];
  });

  await BusModel.insertMany(buses);

  console.log("Seed completed successfully.");
  console.log(`Routes: ${routes.length}`);
  console.log(`Buses: ${buses.length}`);
  console.log("Users: 2");
  console.log(`Admin: ${adminUser.email} / admin123`);
  console.log(`User: ${regularUser.email} / user123`);
  console.log(`Travel date: ${tomorrow}`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
