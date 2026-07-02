import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import SupportConversationModel from "@/models/communication/SupportConversation";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Please log in" }, { status: 401 });
  }

  await connectToDatabase();

  const query = session.user.role === "admin" ? {} : { user: session.user.id };
  const conversations = await SupportConversationModel.find(query)
    .select("subject status createdAt updatedAt messages")
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  return Response.json({
    conversations: conversations.map((c: any) => ({
      id: String(c._id),
      subject: c.subject,
      status: c.status,
      lastMessage: (c.messages ?? []).at(-1)?.text ?? "",
      messageCount: (c.messages ?? []).length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Please log in" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (!subject || !text) {
    return Response.json({ message: "Subject and message are required" }, { status: 400 });
  }

  await connectToDatabase();

  const conversation = await SupportConversationModel.create({
    user: session.user.id,
    subject,
    messages: [{ sender: "user", text }],
  });

  return Response.json({ id: String(conversation._id) }, { status: 201 });
}
