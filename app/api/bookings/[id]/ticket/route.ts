import { getCurrentSession } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { isValidObjectId } from "@/lib/validation";
import { getBookingSummaryById } from "@/lib/queries";
import { createTicketDataFromBooking, generateTicketPDF } from "@/lib/pdf-generator";
import BookingModel from "@/models/Booking";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return Response.json({ message: "Please log in to download ticket." }, { status: 401 });
  }

  const { id } = await params;

  if (!isValidObjectId(id)) {
    return Response.json({ message: "Invalid booking id." }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const booking = await BookingModel.findById(id).populate('bus user');

    if (!booking) {
      return Response.json({ message: "Booking not found." }, { status: 404 });
    }

    const isOwner = String(booking.user._id) === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return Response.json(
        { message: "You are not authorized to download this ticket." },
        { status: 403 }
      );
    }

    // Get populated bus data
    const bookingSummary = await getBookingSummaryById(id);

    if (!bookingSummary) {
      return Response.json({ message: "Unable to generate ticket." }, { status: 500 });
    }

    // Generate PDF
    const ticketData = createTicketDataFromBooking(
      bookingSummary,
      (booking.user as any).email,
      (booking.user as any).name
    );

    const pdfBuffer = await generateTicketPDF(ticketData);

    // Return PDF as downloadable file
    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${id}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return Response.json(
      { message: error instanceof Error ? error.message : "Unable to generate ticket PDF." },
      { status: 500 }
    );
  }
}
