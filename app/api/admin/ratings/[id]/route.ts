import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import RatingModel from "@/models/commerce/Rating";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid rating ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const newStatus = body.status;

  if (newStatus !== "approved" && newStatus !== "rejected" && newStatus !== "pending") {
    return Response.json({ message: "Status must be approved, rejected, or pending" }, { status: 400 });
  }

  const update: Record<string, any> = { status: newStatus };
  if (typeof body.response === "string" && body.response.trim()) {
    update.response = body.response.trim();
    update.responseDate = new Date();
  }

  await connectToDatabase();

  const rating = await RatingModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean() as any;

  if (!rating) {
    return Response.json({ message: "Rating not found" }, { status: 404 });
  }

  return Response.json({ rating: { id: String(rating._id), status: rating.status } });
}
