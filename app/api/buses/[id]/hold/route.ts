import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import BusModel from "@/models/Bus";

export const runtime = "nodejs";

// POST /api/buses/[id]/hold  — temporarily block seats for 10 minutes
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to continue." }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid bus id." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const seats: string[] = Array.isArray(body.seats) ? body.seats : [];

  if (seats.length === 0) {
    return Response.json({ message: "No seats provided." }, { status: 400 });
  }

  await connectToDatabase();

  const bus = await BusModel.findById(id).lean() as any;
  if (!bus) return Response.json({ message: "Bus not found." }, { status: 404 });

  // Check none of the requested seats are already booked/blocked
  const alreadyTaken = seats.filter(
    (s) => bus.bookedSeats?.includes(s) || bus.blockedSeats?.includes(s)
  );
  if (alreadyTaken.length > 0) {
    return Response.json(
      { message: `Seat(s) ${alreadyTaken.join(", ")} are no longer available.` },
      { status: 409 }
    );
  }

  // Add to blockedSeats; $addToSet avoids duplicates
  await BusModel.findByIdAndUpdate(id, {
    $addToSet: { blockedSeats: { $each: seats } },
  });

  // Auto-release after 10 minutes via a background timeout stored in memory.
  // In production replace with a job queue (BullMQ / Agenda).
  const releaseAt = Date.now() + 10 * 60 * 1000;
  setTimeout(async () => {
    try {
      await connectToDatabase();
      await BusModel.findByIdAndUpdate(id, {
        $pullAll: { blockedSeats: seats },
      });
    } catch { /* swallow */ }
  }, 10 * 60 * 1000);

  return Response.json({ held: seats, expiresAt: new Date(releaseAt).toISOString() });
}

// DELETE /api/buses/[id]/hold  — release held seats early (user navigates away / confirms booking)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid bus id." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const seats: string[] = Array.isArray(body.seats) ? body.seats : [];

  if (seats.length === 0) {
    return Response.json({ message: "No seats provided." }, { status: 400 });
  }

  await connectToDatabase();
  await BusModel.findByIdAndUpdate(id, { $pullAll: { blockedSeats: seats } });

  return Response.json({ released: seats });
}
