import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import PricingRuleModel from "@/models/commerce/PricingRule";
import RouteModel from "@/models/transport/Route";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const active = searchParams.get("active") ?? "";

  await connectToDatabase();

  const filter: Record<string, unknown> = {};
  if (active === "true")  filter.isActive = true;
  if (active === "false") filter.isActive = false;

  const [rules, routes] = await Promise.all([
    PricingRuleModel.find(filter)
      .populate("routeId", "from to")
      .sort({ priority: -1, startDate: 1 })
      .lean(),
    RouteModel.find().select("from to").sort({ from: 1 }).lean(),
  ]);

  // Active rules today
  const now = new Date();
  const activeToday = (rules as any[]).filter(r => r.isActive && new Date(r.startDate) <= now && new Date(r.endDate) >= now);

  return Response.json({
    rules: (rules as any[]).map((r) => ({
      id:          String(r._id),
      name:        r.name,
      type:        r.type,
      scope:       r.scope,
      routeId:     r.routeId ? String(r.routeId._id ?? r.routeId) : null,
      routeLabel:  r.routeId ? `${r.routeId.from} → ${r.routeId.to}` : null,
      busType:     r.busType ?? null,
      startDate:   r.startDate,
      endDate:     r.endDate,
      multiplier:  r.multiplier,
      isActive:    r.isActive,
      priority:    r.priority,
      description: r.description ?? null,
      createdAt:   r.createdAt,
    })),
    activeTodayCount: activeToday.length,
    routes: routes.map((r: any) => ({ id: String(r._id), label: `${r.from} → ${r.to}` })),
  });
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (session?.user?.role !== "admin") {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { name, type, scope, routeId, busType, startDate, endDate, multiplier, priority, description } = body;

  if (!name?.trim() || !type || !startDate || !endDate || !multiplier) {
    return Response.json({ message: "name, type, startDate, endDate, and multiplier are required." }, { status: 400 });
  }

  const mult = Number(multiplier);
  if (isNaN(mult) || mult < 0.1 || mult > 10) {
    return Response.json({ message: "multiplier must be between 0.1 and 10." }, { status: 400 });
  }

  const start = new Date(startDate);
  const end   = new Date(endDate);
  if (end < start) return Response.json({ message: "endDate must be after startDate." }, { status: 400 });

  await connectToDatabase();

  const rule = await PricingRuleModel.create({
    name: name.trim(),
    type, scope: scope ?? "all",
    routeId: routeId || undefined,
    busType: busType?.trim() || undefined,
    startDate: start, endDate: end,
    multiplier: mult,
    priority: Number(priority ?? 1),
    description: description?.trim() || undefined,
  });

  return Response.json({ rule: { id: String(rule._id), ...rule.toObject() } }, { status: 201 });
}
