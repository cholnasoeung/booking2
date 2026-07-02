import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import LostFoundModel from "@/models/communication/LostFound";

export const runtime = "nodejs";

function genRefNumber() {
  const now  = new Date();
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `LF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${rand}`;
}

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

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit    = 20;
  const status   = searchParams.get("status")   ?? "";
  const category = searchParams.get("category") ?? "";
  const search   = searchParams.get("search")   ?? "";

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (status)   filter.status       = status;
  if (category) filter.itemCategory = category;
  if (search) {
    filter.$or = [
      { refNumber:       { $regex: search, $options: "i" } },
      { itemName:        { $regex: search, $options: "i" } },
      { itemDescription: { $regex: search, $options: "i" } },
      { reporterName:    { $regex: search, $options: "i" } },
      { reporterEmail:   { $regex: search, $options: "i" } },
    ];
  }

  const [total, records, summaryRaw] = await Promise.all([
    LostFoundModel.countDocuments(filter),
    LostFoundModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("busId",    "date departureTime busNumber")
      .populate("routeId",  "from to")
      .lean(),
    LostFoundModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const summary: Record<string, number> = {
    reported: 0, under_review: 0, found: 0, returned: 0, not_found: 0, closed: 0,
  };
  for (const s of summaryRaw as any[]) {
    if (s._id in summary) summary[s._id] = s.count;
  }

  return Response.json({
    records:    (records as any[]).map(serialize),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary:    { ...summary, total },
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { reporterName, reporterEmail, itemName, itemCategory, itemDescription } = body;

  if (!reporterName || !reporterEmail || !itemName || !itemCategory || !itemDescription) {
    return Response.json(
      { message: "Reporter name, email, item name, category, and description are required." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  let refNumber = "";
  for (let i = 0; i < 5; i++) {
    const candidate = genRefNumber();
    const exists = await LostFoundModel.exists({ refNumber: candidate });
    if (!exists) { refNumber = candidate; break; }
  }
  if (!refNumber) refNumber = `LF-${Date.now()}`;

  const record = await LostFoundModel.create({
    refNumber,
    reporterName:     reporterName.trim(),
    reporterEmail:    reporterEmail.trim().toLowerCase(),
    reporterPhone:    body.reporterPhone?.trim()    || undefined,
    bookingId:        body.bookingId                || undefined,
    busId:            body.busId                    || undefined,
    routeId:          body.routeId                  || undefined,
    travelDate:       body.travelDate ? new Date(body.travelDate) : undefined,
    seatNumber:       body.seatNumber?.trim()       || undefined,
    itemName:         itemName.trim(),
    itemCategory,
    itemDescription:  itemDescription.trim(),
    color:            body.color?.trim()            || undefined,
    brand:            body.brand?.trim()            || undefined,
    lastSeenLocation: body.lastSeenLocation?.trim() || undefined,
  });

  return Response.json({ record: serialize(record.toObject()) }, { status: 201 });
}
