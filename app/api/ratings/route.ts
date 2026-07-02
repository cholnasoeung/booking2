import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import RatingModel from "@/models/commerce/Rating";

export const runtime = "nodejs";

// GET all ratings for a bus
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const busId = searchParams.get("busId");

  if (!busId || !isValidObjectId(busId)) {
    return Response.json({ message: "Invalid bus ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const ratings = await RatingModel.find({
      bus: busId,
      status: "approved",
    })
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const summary = await RatingModel.getBusRatingSummary(busId);

    return Response.json({
      ratings,
      summary,
    });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return Response.json(
      { message: "Unable to fetch ratings" },
      { status: 500 }
    );
  }
}

// POST submit a new rating
export async function POST(request: Request) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to submit a review" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const busId = typeof body?.busId === "string" ? body.busId : "";
    const bookingId = typeof body?.bookingId === "string" ? body.bookingId : "";
    const rating = typeof body?.rating === "number" ? body.rating : null;
    const review = typeof body?.review === "string" ? body.review : "";
    const aspects = body?.aspects || {};
    const wouldRecommend = typeof body?.wouldRecommend === "boolean" ? body.wouldRecommend : true;

    if (!isValidObjectId(busId) || !isValidObjectId(bookingId)) {
      return Response.json({ message: "Invalid bus or booking ID" }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return Response.json({ message: "Rating must be between 1 and 5" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user already rated this booking
    const existingRating = await RatingModel.findOne({
      user: session.user.id,
      booking: bookingId,
    });

    if (existingRating) {
      return Response.json(
        { message: "You have already rated this booking" },
        { status: 400 }
      );
    }

    const newRating = await RatingModel.create({
      user: session.user.id,
      bus: busId,
      booking: bookingId,
      rating,
      review: review.trim() || undefined,
      aspects: {
        punctuality: aspects.punctuality || 5,
        cleanliness: aspects.cleanliness || 5,
        staffBehavior: aspects.staffBehavior || 5,
        comfort: aspects.comfort || 5,
      },
      wouldRecommend,
      isVerified: true,
      status: "pending", // Requires admin approval
    });

    return Response.json({
      message: "Review submitted successfully. It will be visible after approval.",
      rating: {
        id: newRating._id,
        rating: newRating.rating,
        review: newRating.review,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error submitting rating:", error);
    return Response.json(
      { message: "Unable to submit review" },
      { status: 500 }
    );
  }
}
