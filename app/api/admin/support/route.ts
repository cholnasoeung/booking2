import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import SupportConversationModel from "@/models/communication/SupportConversation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit  = 20;
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search")?.trim() ?? "";

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (search) filter.subject = { $regex: search, $options: "i" };

  const [total, convos, summaryRaw] = await Promise.all([
    SupportConversationModel.countDocuments(filter),

    SupportConversationModel.find(filter)
      .populate("user", "name email")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),

    SupportConversationModel.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const summary = { open: 0, resolved: 0, closed: 0 } as Record<string, number>;
  for (const row of summaryRaw as any[]) summary[row._id] = row.count;

  return Response.json({
    conversations: (convos as any[]).map((c) => ({
      id:           String(c._id),
      subject:      c.subject,
      status:       c.status,
      userName:     c.user?.name  ?? "Deleted User",
      userEmail:    c.user?.email ?? "",
      userId:       String(c.user?._id ?? c.user),
      messageCount: c.messages?.length ?? 0,
      lastMessage:  c.messages?.at(-1)?.text?.slice(0, 120) ?? "",
      lastSender:   c.messages?.at(-1)?.sender ?? null,
      createdAt:    c.createdAt,
      updatedAt:    c.updatedAt,
    })),
    total, page,
    totalPages: Math.ceil(total / limit),
    summary,
  });
}
