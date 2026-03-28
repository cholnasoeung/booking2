import { hash } from "bcryptjs";
import mongoose from "mongoose";

import { getTomorrowDateInput, toTravelDate } from "../lib/date";
import { connectToDatabase } from "../lib/mongodb";
import BookingModel from "../models/Booking";
import BusModel from "../models/Bus";
import RouteModel from "../models/Route";
import UserModel from "../models/User";

async function seed() {
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

  const routes = await RouteModel.create([
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
  ]);

  const tomorrow = getTomorrowDateInput();
  const busDate = toTravelDate(tomorrow);
  const buses = routes.flatMap((route, index) => {
    const morningSeats = Array.from({ length: 16 }, (_, seat) => seat + 1);
    const eveningSeats =
      index === 1
        ? Array.from({ length: 40 }, (_, seat) => seat + 1)
        : index === 4
          ? Array.from({ length: 38 }, (_, seat) => seat + 1)
          : Array.from({ length: 10 }, (_, seat) => seat + 1);

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
        totalSeats: 40,
        bookedSeats: morningSeats,
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
        totalSeats: 40,
        bookedSeats: eveningSeats,
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
  console.log(`Users: 2`);
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
