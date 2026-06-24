import { requireAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import BusDetailModel from "@/models/BusDetail";
import { isValidObjectId } from "@/lib/validation";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  await requireAdmin("/");
  const { id, docId } = await params;
  if (!isValidObjectId(id) || !isValidObjectId(docId)) {
    return Response.json({ message: "Invalid ID" }, { status: 400 });
  }

  const body = await req.json();
  const { docType, docNumber, issueDate, expiryDate, notes } = body;

  if (docType && !["insurance", "road_tax", "inspection", "permit", "other"].includes(docType)) {
    return Response.json({ message: "Invalid document type" }, { status: 400 });
  }

  await connectToDatabase();

  const update: Record<string, unknown> = {};
  if (docType)    update["documents.$.docType"]   = docType;
  if (docNumber)  update["documents.$.docNumber"]  = docNumber.trim();
  if (expiryDate) update["documents.$.expiryDate"] = new Date(expiryDate);
  if (issueDate !== undefined) update["documents.$.issueDate"] = issueDate ? new Date(issueDate) : undefined;
  if (notes !== undefined)    update["documents.$.notes"]      = notes?.trim() ?? "";

  const detail = await BusDetailModel.findOneAndUpdate(
    { _id: id, "documents._id": docId },
    { $set: update },
    { new: true }
  ).lean() as any;

  if (!detail) return Response.json({ message: "Document not found" }, { status: 404 });

  const updated = (detail.documents as any[]).find((d: any) => String(d._id) === docId);
  return Response.json({ document: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  await requireAdmin("/");
  const { id, docId } = await params;
  if (!isValidObjectId(id) || !isValidObjectId(docId)) {
    return Response.json({ message: "Invalid ID" }, { status: 400 });
  }

  await connectToDatabase();

  const result = await BusDetailModel.findByIdAndUpdate(
    id,
    { $pull: { documents: { _id: docId } } },
    { new: true }
  );

  if (!result) return Response.json({ message: "Vehicle not found" }, { status: 404 });
  return Response.json({ message: "Document deleted" });
}
