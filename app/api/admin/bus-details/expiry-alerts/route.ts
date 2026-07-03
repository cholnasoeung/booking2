import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import BusDetailModel from "@/models/transport/BusDetail";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin")
    return Response.json({ message: "Forbidden" }, { status: 403 });

  await connectToDatabase();

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  // Fetch only buses that have at least one doc expiring within 30 days or already expired
  const buses = await BusDetailModel.find({
    "documents.expiryDate": { $lte: in30 },
  })
    .select("name registrationNumber documents")
    .lean();

  type AlertEntry = {
    busId: string;
    busName: string;
    registrationNumber: string;
    docType: string;
    docNumber: string;
    expiryDate: string;
    status: "expired" | "expiring_soon";
  };

  const expired: AlertEntry[]     = [];
  const expiringSoon: AlertEntry[] = [];

  for (const bus of buses) {
    for (const doc of bus.documents as any[]) {
      const exp = new Date(doc.expiryDate);
      if (exp <= now) {
        expired.push({
          busId: String(bus._id),
          busName: bus.name,
          registrationNumber: bus.registrationNumber,
          docType: doc.docType,
          docNumber: doc.docNumber,
          expiryDate: exp.toISOString(),
          status: "expired",
        });
      } else if (exp <= in30) {
        expiringSoon.push({
          busId: String(bus._id),
          busName: bus.name,
          registrationNumber: bus.registrationNumber,
          docType: doc.docType,
          docNumber: doc.docNumber,
          expiryDate: exp.toISOString(),
          status: "expiring_soon",
        });
      }
    }
  }

  // Sort expired most-overdue first, expiring-soon soonest first
  expired.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  expiringSoon.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  return Response.json({ expired, expiringSoon });
}
