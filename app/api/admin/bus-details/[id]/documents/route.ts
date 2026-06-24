import { requireAdmin } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import BusDetailModel from "@/models/BusDetail";
import { isValidObjectId } from "@/lib/validation";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin("/");
  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  await connectToDatabase();
  const detail = await BusDetailModel.findById(id).select("documents").lean() as any;
  if (!detail) return Response.json({ message: "Not found" }, { status: 404 });

  return Response.json({ documents: detail.documents ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAdmin("/");
  const { id } = await params;
  if (!isValidObjectId(id)) return Response.json({ message: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const { docType, docNumber, issueDate, expiryDate, notes } = body;

  if (!["insurance", "road_tax", "inspection", "permit", "other"].includes(docType)) {
    return Response.json({ message: "Invalid document type" }, { status: 400 });
  }
  if (!docNumber?.trim()) {
    return Response.json({ message: "Document number is required" }, { status: 400 });
  }
  if (!expiryDate) {
    return Response.json({ message: "Expiry date is required" }, { status: 400 });
  }

  await connectToDatabase();

  const doc: Record<string, unknown> = {
    docType,
    docNumber: docNumber.trim(),
    expiryDate: new Date(expiryDate),
    notes: notes?.trim() ?? "",
  };
  if (issueDate) doc.issueDate = new Date(issueDate);

  const detail = await BusDetailModel.findByIdAndUpdate(
    id,
    { $push: { documents: doc } },
    { new: true, runValidators: true }
  ).lean() as any;

  if (!detail) return Response.json({ message: "Vehicle not found" }, { status: 404 });

  const added = detail.documents[detail.documents.length - 1];
  return Response.json({ document: added }, { status: 201 });
}
