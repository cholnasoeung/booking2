import { getBusSummary } from "@/lib/db/queries";
import { isValidObjectId } from "@/lib/utils/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid bus ID." }, { status: 400 });
  }

  try {
    const bus = await getBusSummary(id);

    if (!bus) {
      return Response.json({ message: "Bus not found." }, { status: 404 });
    }

    return Response.json({ bus });
  } catch {
    return Response.json({ message: "Unable to load bus details right now." }, { status: 500 });
  }
}
