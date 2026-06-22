import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import LostFoundModel from "@/models/LostFound";

export const runtime = "nodejs";

function serialize(l: any) {
  return {
    id:               String(l._id),
    refNumber:        l.refNumber,
    reportedBy:       l.reportedBy ? String(l.reportedBy._id ?? l.reportedBy) : null,
    reporterName:     l.reporterName,
    reporterEmail:    l.reporterEmail,
    reporterPhone:    l.reporterPhone  ?? null,
    bookingId:        l.bookingId?._id ? String(l.bookingId._id) : (l.bookingId ? String(l.bookingId) : null),
    busId:            l.busId?._id     ? String(l.busId._id)     : (l.busId     ? String(l.busId)     : null),
    routeId:          l.routeId?._id   ? String(l.routeId._id)   : (l.routeId   ? String(l.routeId)   : null),
    routeLabel:       l.routeId?.from  ? `${l.routeId.from} → ${l.routeId.to}` : null,
    busLabel:         l.busId?.busNumber ? `Bus ${l.busId.busNumber}` : null,
    travelDate:       l.travelDate       ?? null,
    seatNumber:       l.seatNumber       ?? null,
    itemName:         l.itemName,
    itemCategory:     l.itemCategory,
    itemDescription:  l.itemDescription,
    color:            l.color            ?? null,
    brand:            l.brand            ?? null,
    lastSeenLocation: l.lastSeenLocation ?? null,
    status:           l.status,
    adminNotes:       l.adminNotes       ?? null,
    foundLocation:    l.foundLocation    ?? null,
    handledBy:        l.handledBy        ?? null,
    returnedAt:       l.returnedAt       ?? null,
    createdAt:        l.createdAt,
    updatedAt:        l.updatedAt,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  await connectToDatabase();
  const record = await LostFoundModel.findById(id)
    .populate("busId",   "date departureTime busNumber")
    .populate("routeId", "from to")
    .lean() as any;

  if (!record) return Response.json({ message: "Not found" }, { status: 404 });
  return Response.json({ record: serialize(record) });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};

  if (body.status !== undefined)        update.status        = body.status;
  if (body.adminNotes !== undefined)    update.adminNotes    = body.adminNotes?.trim()    || undefined;
  if (body.foundLocation !== undefined) update.foundLocation = body.foundLocation?.trim() || undefined;
  if (body.handledBy !== undefined)     update.handledBy     = body.handledBy?.trim()     || undefined;
  if (body.bookingId !== undefined)     update.bookingId     = body.bookingId             || undefined;
  if (body.busId !== undefined)         update.busId         = body.busId                 || undefined;
  if (body.routeId !== undefined)       update.routeId       = body.routeId               || undefined;
  if (body.status === "returned")       update.returnedAt    = new Date();

  await connectToDatabase();
  const record = await LostFoundModel.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true }
  )
    .populate("busId",   "date departureTime busNumber")
    .populate("routeId", "from to")
    .lean() as any;

  if (!record) return Response.json({ message: "Not found" }, { status: 404 });
  return Response.json({ record: serialize(record) });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  await connectToDatabase();
  const record = await LostFoundModel.findByIdAndDelete(id);
  if (!record) return Response.json({ message: "Not found" }, { status: 404 });

  return Response.json({ message: "Report deleted" });
}
