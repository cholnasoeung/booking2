import { connectToDatabase } from "@/lib/db/mongodb";
import BusModel from "@/models/transport/Bus";

export const runtime = "nodejs";

// Server-Sent Events: stream booked/blocked seat changes for a specific bus.
// Polls every 4 seconds and pushes a diff when the seat state changes.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // client disconnected
        }
      }

      await connectToDatabase();

      const bus = await BusModel.findById(id).select("bookedSeats blockedSeats").lean() as any;
      if (!bus) {
        send({ error: "Bus not found" });
        controller.close();
        return;
      }

      let lastHash = JSON.stringify([...(bus.bookedSeats ?? []), ...(bus.blockedSeats ?? [])].sort());

      // Send initial state
      send({ bookedSeats: (bus.bookedSeats ?? []).map(String), blockedSeats: (bus.blockedSeats ?? []).map(String) });

      // Poll every 4 seconds
      const interval = setInterval(async () => {
        try {
          const updated = await BusModel.findById(id).select("bookedSeats blockedSeats").lean() as any;
          if (!updated) {
            clearInterval(interval);
            controller.close();
            return;
          }

          const newHash = JSON.stringify([...(updated.bookedSeats ?? []), ...(updated.blockedSeats ?? [])].sort());
          if (newHash !== lastHash) {
            lastHash = newHash;
            send({ bookedSeats: (updated.bookedSeats ?? []).map(String), blockedSeats: (updated.blockedSeats ?? []).map(String) });
          }
        } catch {
          clearInterval(interval);
          try { controller.close(); } catch {}
        }
      }, 4000);

      // Clean up on client disconnect (stream cancel)
      return () => clearInterval(interval);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
