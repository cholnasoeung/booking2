import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import RatingModel from "@/models/commerce/Rating";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = 20;

  await connectToDatabase();

  const filter: Record<string, any> = {};
  if (status === "pending" || status === "approved" || status === "rejected") {
    filter.status = status;
  }

  const [total, ratings] = await Promise.all([
    RatingModel.countDocuments(filter),
    RatingModel.find(filter)
      .populate("user", "name email")
      .populate("bus", "busNumber departureTime date")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return Response.json({
    ratings: (ratings as any[]).map((r) => ({
      id: String(r._id),
      rating: r.rating,
      review: r.review ?? null,
      aspects: r.aspects,
      wouldRecommend: r.wouldRecommend,
      isVerified: r.isVerified,
      status: r.status,
      createdAt: r.createdAt,
      user: r.user
        ? { id: String((r.user as any)._id), name: (r.user as any).name, email: (r.user as any).email }
        : null,
      bus: r.bus
        ? {
            id: String((r.bus as any)._id),
            busNumber: (r.bus as any).busNumber ?? null,
            departureTime: (r.bus as any).departureTime,
            date: (r.bus as any).date,
          }
        : null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
