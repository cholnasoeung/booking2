import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

loadEnvConfig(process.cwd());

async function backfillSeatLayouts() {
  const [
    { connectToDatabase },
    {
      needsLegacySeatLayoutUpgrade,
      normalizeBusSeatLayout,
      normalizeStoredSeatCodes,
    },
    { default: BookingModel },
    { default: BusModel },
  ] = await Promise.all([
    import("../lib/db/mongodb"),
    import("../lib/seat/seat-layout"),
    import("../models/booking/Booking"),
    import("../models/transport/Bus"),
  ]);

  await connectToDatabase();

  const buses = await BusModel.find();
  let updatedBuses = 0;

  for (const bus of buses) {
    const currentBus = bus.toObject();
    const normalized = normalizeBusSeatLayout(currentBus);
    const shouldUpdate =
      needsLegacySeatLayoutUpgrade(currentBus) ||
      String(currentBus.busType) !== normalized.busType ||
      currentBus.totalSeats !== normalized.totalSeats ||
      JSON.stringify(currentBus.bookedSeats ?? []) !==
        JSON.stringify(normalized.bookedSeats) ||
      JSON.stringify(currentBus.seatLayout ?? null) !==
        JSON.stringify(normalized.seatLayout);

    if (!shouldUpdate) {
      continue;
    }

    bus.set({
      busType: normalized.busType,
      seatLayout: normalized.seatLayout,
      totalSeats: normalized.totalSeats,
      bookedSeats: normalized.bookedSeats,
    });
    await bus.save();
    updatedBuses += 1;
  }

  const refreshedBuses = await BusModel.find().lean();
  const seatLayoutMap = new Map(
    refreshedBuses.map((bus) => {
      const normalized = normalizeBusSeatLayout(bus);
      return [String(bus._id), normalized.seatLayout] as const;
    })
  );

  const bookings = await BookingModel.find();
  let updatedBookings = 0;

  for (const booking of bookings) {
    const seatLayout = seatLayoutMap.get(String(booking.bus));

    if (!seatLayout) {
      continue;
    }

    const normalizedSeats = normalizeStoredSeatCodes(booking.seats, seatLayout);

    if (JSON.stringify(booking.seats) === JSON.stringify(normalizedSeats)) {
      continue;
    }

    booking.set({
      seats: normalizedSeats,
    });
    await booking.save();
    updatedBookings += 1;
  }

  console.log("Backfill completed successfully.");
  console.log(`Buses updated: ${updatedBuses}`);
  console.log(`Bookings updated: ${updatedBookings}`);
}

backfillSeatLayouts()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
