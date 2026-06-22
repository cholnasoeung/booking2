import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import LostFoundModel from "@/models/LostFound";

export const runtime = "nodejs";

function genRefNumber() {
  const now  = new Date();
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `LF-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${rand}`;
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const records = await LostFoundModel.find({ reportedBy: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return Response.json({
    records: (records as any[]).map((l) => ({
      id:           String(l._id),
      refNumber:    l.refNumber,
      itemName:     l.itemName,
      itemCategory: l.itemCategory,
      status:       l.status,
      adminNotes:   l.adminNotes  ?? null,
      returnedAt:   l.returnedAt  ?? null,
      createdAt:    l.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();

  const body = await request.json().catch(() => ({}));
  const { reporterName, reporterEmail, itemName, itemCategory, itemDescription } = body;

  if (!reporterName || !reporterEmail || !itemName || !itemCategory || !itemDescription) {
    return Response.json(
      { message: "Name, email, item name, category, and description are required." },
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
    reportedBy:       session?.user?.id ?? undefined,
    reporterName:     reporterName.trim(),
    reporterEmail:    reporterEmail.trim().toLowerCase(),
    reporterPhone:    body.reporterPhone?.trim()    || undefined,
    bookingId:        body.bookingId                || undefined,
    travelDate:       body.travelDate ? new Date(body.travelDate) : undefined,
    seatNumber:       body.seatNumber?.trim()       || undefined,
    itemName:         itemName.trim(),
    itemCategory,
    itemDescription:  itemDescription.trim(),
    color:            body.color?.trim()            || undefined,
    brand:            body.brand?.trim()            || undefined,
    lastSeenLocation: body.lastSeenLocation?.trim() || undefined,
  });

  return Response.json({
    record: {
      id:        String(record._id),
      refNumber: record.refNumber,
      itemName:  record.itemName,
      status:    record.status,
      createdAt: record.createdAt,
    },
  }, { status: 201 });
}
