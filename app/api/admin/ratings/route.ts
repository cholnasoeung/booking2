import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import RatingModel from "@/models/Rating";

export const runtime = "nodejs";

// GET pending ratings for admin review
export async function GET(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id || session.user.role !== "admin") {
    return Response.json({ message: "Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;

  try {
    await connectToDatabase();

    const [ratings, total] = await Promise.all([
      RatingModel.find({ status })
        .populate("user", "name email")
        .populate("bus", "departureTime date")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      RatingModel.countDocuments({ status }),
    ]);

    return Response.json({ ratings, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("Admin ratings fetch error:", error);
    return Response.json({ message: "Unable to fetch ratings" }, { status: 500 });
  }
}

// PATCH approve or reject a rating
export async function PATCH(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id || session.user.role !== "admin") {
    return Response.json({ message: "Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const ratingId = typeof body?.ratingId === "string" ? body.ratingId : "";
    const action = typeof body?.action === "string" ? body.action : "";

    if (!isValidObjectId(ratingId) || !["approve", "reject"].includes(action)) {
      return Response.json({ message: "Invalid request" }, { status: 400 });
    }

    await connectToDatabase();

    const rating = await RatingModel.findById(ratingId);
    if (!rating) {
      return Response.json({ message: "Rating not found" }, { status: 404 });
    }

    rating.status = action === "approve" ? "approved" : "rejected";
    await rating.save();

    return Response.json({ message: `Rating ${rating.status}` });
  } catch (error) {
    console.error("Admin rating action error:", error);
    return Response.json({ message: "Unable to update rating" }, { status: 500 });
  }
}
