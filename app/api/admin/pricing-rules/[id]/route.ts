import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import PricingRuleModel from "@/models/commerce/PricingRule";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const update: Record<string, unknown> = {};
  if (body.name !== undefined)        update.name        = body.name.trim();
  if (body.type !== undefined)        update.type        = body.type;
  if (body.scope !== undefined)       update.scope       = body.scope;
  if (body.routeId !== undefined)     update.routeId     = body.routeId || undefined;
  if (body.busType !== undefined)     update.busType     = body.busType?.trim() || undefined;
  if (body.startDate !== undefined)   update.startDate   = new Date(body.startDate);
  if (body.endDate !== undefined)     update.endDate     = new Date(body.endDate);
  if (body.multiplier !== undefined)  update.multiplier  = Number(body.multiplier);
  if (body.priority !== undefined)    update.priority    = Number(body.priority);
  if (body.isActive !== undefined)    update.isActive    = body.isActive;
  if (body.description !== undefined) update.description = body.description?.trim() || undefined;

  await connectToDatabase();
  const updated = await PricingRuleModel.findByIdAndUpdate(params.id, update, { new: true }).lean() as any;
  if (!updated) return Response.json({ message: "Not found." }, { status: 404 });

  return Response.json({ rule: { id: String(updated._id), ...updated } });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }
  await connectToDatabase();
  await PricingRuleModel.findByIdAndDelete(params.id);
  return Response.json({ message: "Deleted." });
}
