import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import SupportConversationModel from "@/models/communication/SupportConversation";

export const runtime = "nodejs";

// GET — full conversation with all messages
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await connectToDatabase();
  const convo = await SupportConversationModel.findById(id)
    .populate("user", "name email")
    .lean() as any;

  if (!convo) return Response.json({ message: "Not found." }, { status: 404 });

  return Response.json({
    conversation: {
      id:        String(convo._id),
      subject:   convo.subject,
      status:    convo.status,
      userName:  convo.user?.name  ?? "Deleted User",
      userEmail: convo.user?.email ?? "",
      messages:  (convo.messages ?? []).map((m: any) => ({
        sender:    m.sender,
        text:      m.text,
        createdAt: m.createdAt,
      })),
      createdAt: convo.createdAt,
      updatedAt: convo.updatedAt,
    },
  });
}

// POST — admin reply + optional status change
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { text, status } = body;

  if (!text?.trim() && !status) {
    return Response.json({ message: "text or status is required." }, { status: 400 });
  }

  await connectToDatabase();

  const update: Record<string, unknown> = {};
  if (status) update.status = status;

  const convo = await SupportConversationModel.findByIdAndUpdate(
    id,
    {
      ...update,
      ...(text?.trim() ? { $push: { messages: { sender: "admin", text: text.trim() } } } : {}),
    },
    { new: true }
  ).populate("user", "name email").lean() as any;

  if (!convo) return Response.json({ message: "Not found." }, { status: 404 });

  return Response.json({
    conversation: {
      id:        String(convo._id),
      subject:   convo.subject,
      status:    convo.status,
      userName:  convo.user?.name  ?? "Deleted User",
      userEmail: convo.user?.email ?? "",
      messages:  (convo.messages ?? []).map((m: any) => ({ sender: m.sender, text: m.text, createdAt: m.createdAt })),
      createdAt: convo.createdAt,
      updatedAt: convo.updatedAt,
    },
  });
}
