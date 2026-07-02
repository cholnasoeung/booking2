import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import NotificationModel from "@/models/communication/Notification";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || "20"), 50);
  const onlyUnread = searchParams.get("unread") === "1";

  const query: Record<string, unknown> = { userId: session.user.id };
  if (onlyUnread) query.read = false;

  const [notifications, unreadCount] = await Promise.all([
    NotificationModel.find(query).sort({ createdAt: -1 }).limit(limit).lean(),
    NotificationModel.countDocuments({ userId: session.user.id, read: false }),
  ]);

  return Response.json({
    notifications: notifications.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      busId: n.busId ? String(n.busId) : null,
      bookingId: n.bookingId ? String(n.bookingId) : null,
      createdAt: (n as any).createdAt,
    })),
    unreadCount,
  });
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const body = await request.json().catch(() => ({}));

  if (body.action === "markAllRead") {
    await NotificationModel.updateMany(
      { userId: session.user.id, read: false },
      { $set: { read: true } }
    );
    return Response.json({ ok: true });
  }

  if (body.id) {
    await NotificationModel.findOneAndUpdate(
      { _id: body.id, userId: session.user.id },
      { $set: { read: true } }
    );
    return Response.json({ ok: true });
  }

  return Response.json({ message: "No action specified" }, { status: 400 });
}
