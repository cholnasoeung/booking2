import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import BookingModel from "@/models/booking/Booking";

export const runtime = "nodejs";

function serializeBooking(b: any) {
  const user = b.user;
  const bus  = b.bus;
  const route = bus?.routeId;
  return {
    id:                 String(b._id),
    shortId:            String(b._id).slice(-6).toUpperCase(),
    userId:             user?._id ? String(user._id) : null,
    userName:           user?.name  ?? b.metadata?.guestName  ?? "Guest",
    userEmail:          user?.email ?? b.metadata?.guestEmail ?? "—",
    userPhone:          user?.phone ?? b.metadata?.guestPhone ?? null,
    routeFrom:          route?.from ?? "—",
    routeTo:            route?.to   ?? "—",
    busDate:            bus?.date   ?? null,
    departureTime:      bus?.departureTime ?? null,
    seats:              b.seats ?? [],
    seatCount:          (b.seats ?? []).length,
    finalPrice:         b.finalPrice   ?? 0,
    discountAmount:     b.discountAmount ?? 0,
    refundAmount:       b.refundAmount  ?? 0,
    refundStatus:       b.refundStatus  ?? "pending",
    cancellationReason: b.cancellationReason ?? null,
    cancelledAt:        b.cancelledAt ?? null,
    status:             b.status,
    paymentStatus:      b.paymentStatus,
    createdAt:          b.createdAt,
    updatedAt:          b.updatedAt,
  };
}

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page          = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit         = 20;
  const refundStatus  = searchParams.get("refundStatus") ?? "";
  const search        = searchParams.get("search") ?? "";

  await connectToDatabase();

  // Base: all cancelled bookings that have a refund amount > 0
  const base: Record<string, unknown> = {
    status:       { $in: ["cancelled", "refunded"] },
    refundAmount: { $gt: 0 },
  };
  if (refundStatus) base.refundStatus = refundStatus;

  // If searching — join user info after
  let filter = { ...base };
  if (search) {
    (filter as any).$or = [
      { cancellationReason: { $regex: search, $options: "i" } },
    ];
  }

  const [total, bookings, summaryRaw] = await Promise.all([
    BookingModel.countDocuments(filter),

    BookingModel.find(filter)
      .sort({ cancelledAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("user", "name email phone")
      .populate({
        path: "bus",
        select: "date departureTime routeId",
        populate: { path: "routeId", select: "from to" },
      })
      .lean(),

    // Summary aggregation
    BookingModel.aggregate([
      { $match: { status: { $in: ["cancelled", "refunded"] }, refundAmount: { $gt: 0 } } },
      {
        $group: {
          _id: "$refundStatus",
          count:       { $sum: 1 },
          totalAmount: { $sum: "$refundAmount" },
        },
      },
    ]),
  ]);

  const summary = {
    pending:          0, pendingAmount:   0,
    processed:        0, processedAmount: 0,
    failed:           0, failedAmount:    0,
    total,
  };
  for (const s of summaryRaw as any[]) {
    const key = s._id ?? "pending";
    if (key === "pending")   { summary.pending   = s.count; summary.pendingAmount   = Math.round(s.totalAmount * 100) / 100; }
    if (key === "processed") { summary.processed = s.count; summary.processedAmount = Math.round(s.totalAmount * 100) / 100; }
    if (key === "failed")    { summary.failed    = s.count; summary.failedAmount    = Math.round(s.totalAmount * 100) / 100; }
  }

  // Post-filter by search on populated user fields
  let results = (bookings as any[]).map(serializeBooking);
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(r =>
      r.userName.toLowerCase().includes(q)  ||
      r.userEmail.toLowerCase().includes(q) ||
      r.shortId.toLowerCase().includes(q)   ||
      r.routeFrom.toLowerCase().includes(q) ||
      r.routeTo.toLowerCase().includes(q)
    );
  }

  return Response.json({
    bookings:   results,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    summary,
  });
}
