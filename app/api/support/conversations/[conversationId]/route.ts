import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { isValidObjectId } from "@/lib/utils/validation";
import SupportConversationModel from "@/models/communication/SupportConversation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Please log in" }, { status: 401 });
  }

  const { conversationId } = await params;
  if (!isValidObjectId(conversationId)) {
    return Response.json({ message: "Invalid conversation ID" }, { status: 400 });
  }

  await connectToDatabase();

  const conversation = await SupportConversationModel.findById(conversationId).lean() as any;
  if (!conversation) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  const isOwner = String(conversation.user) === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  return Response.json({
    id: String(conversation._id),
    subject: conversation.subject,
    status: conversation.status,
    messages: conversation.messages.map((m: any) => ({
      sender: m.sender,
      text: m.text,
      createdAt: m.createdAt,
    })),
    createdAt: conversation.createdAt,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { conversationId } = await params;
  if (!isValidObjectId(conversationId)) {
    return Response.json({ message: "Invalid conversation ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const newStatus = body.status;
  if (newStatus !== "open" && newStatus !== "resolved" && newStatus !== "closed") {
    return Response.json({ message: "Invalid status" }, { status: 400 });
  }

  await connectToDatabase();

  const conversation = await SupportConversationModel.findByIdAndUpdate(
    conversationId,
    { $set: { status: newStatus } },
    { new: true }
  ).lean() as any;

  if (!conversation) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  return Response.json({ status: conversation.status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return Response.json({ message: "Please log in" }, { status: 401 });
  }

  const { conversationId } = await params;
  if (!isValidObjectId(conversationId)) {
    return Response.json({ message: "Invalid conversation ID" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return Response.json({ message: "Message text is required" }, { status: 400 });
  }

  await connectToDatabase();

  const conversation = await SupportConversationModel.findById(conversationId) as any;
  if (!conversation) {
    return Response.json({ message: "Not found" }, { status: 404 });
  }

  const isOwner = String(conversation.user) === session.user.id;
  const isAdmin = session.user.role === "admin";
  if (!isOwner && !isAdmin) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const sender = isAdmin ? "admin" : "user";
  conversation.messages.push({ sender, text });
  conversation.updatedAt = new Date();
  await conversation.save();

  return Response.json({ success: true });
}
