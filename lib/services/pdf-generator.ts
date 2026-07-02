import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { AdminBookingSummary } from './queries';

interface TicketData {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  route: string;
  busType: string;
  date: string;
  departureTime: string;
  arrivalTime: string;
  seats: string[];
  passengers: Array<{ name: string; age: string; gender: string }>;
  totalPrice: number;
  bookingDate: string;
}

/**
 * Generate a PDF ticket with QR code for boarding verification
 */
export async function generateTicketPDF(data: TicketData): Promise<Buffer> {
  // Create PDF document (A4 size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header with gradient-like background
  doc.setFillColor(220, 38, 38); // Red-600
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('BUS TICKET', pageWidth / 2, 25, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('RedMiles Cambodia', pageWidth / 2, 35, { align: 'center' });

  yPosition = 60;

  // Generate QR Code
  const qrData = JSON.stringify({
    bookingId: data.bookingId,
    seats: data.seats,
    date: data.date,
  });

  const qrCodeDataURL = await QRCode.toDataURL(qrData || data.bookingId, {
    width: 200,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  // Add QR Code to the right side
  doc.addImage(qrCodeDataURL, 'PNG', pageWidth - 55, yPosition, 40, 40);

  // Booking Details Box
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.roundedRect(15, yPosition, pageWidth - 80, 50, 3, 3, 'F');

  doc.setTextColor(31, 41, 55); // Gray-800
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Booking Details', 20, yPosition + 10);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99); // Gray-600

  const leftCol = 20;
  let detailY = yPosition + 20;

  doc.text(`Booking ID: ${data.bookingId}`, leftCol, detailY);
  detailY += 7;
  doc.text(`Date: ${data.date}`, leftCol, detailY);
  detailY += 7;
  doc.text(`Time: ${data.departureTime} - ${data.arrivalTime}`, leftCol, detailY);
  detailY += 7;
  doc.text(`Bus Type: ${data.busType}`, leftCol, detailY);

  yPosition += 60;

  // Route Information
  doc.setFillColor(239, 68, 68); // Red-500
  doc.roundedRect(15, yPosition, pageWidth - 30, 30, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.route, pageWidth / 2, yPosition + 12, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.departureTime} → ${data.arrivalTime}`, pageWidth / 2, yPosition + 22, { align: 'center' });

  yPosition += 40;

  // Passenger Details
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Passenger Information', 15, yPosition);

  yPosition += 10;

  // Draw table header
  doc.setFillColor(243, 244, 246); // Gray-100
  doc.rect(15, yPosition, pageWidth - 30, 8, 'F');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(55, 65, 81);

  const colWidth = (pageWidth - 30) / 4;
  doc.text('Name', 20, yPosition + 5);
  doc.text('Age', 20 + colWidth, yPosition + 5);
  doc.text('Gender', 20 + colWidth * 2, yPosition + 5);
  doc.text('Seat', 20 + colWidth * 3, yPosition + 5);

  yPosition += 8;

  // Passenger rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99);

  data.passengers.forEach((passenger, index) => {
    const rowY = yPosition + (index * 8);
    if (rowY > pageHeight - 30) {
      doc.addPage();
      yPosition = 20;
    }

    // Alternate row colors
    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(15, rowY, pageWidth - 30, 8, 'F');
    }

    doc.text(passenger.name.substring(0, 20), 20, rowY + 5);
    doc.text(passenger.age, 20 + colWidth, rowY + 5);
    doc.text(passenger.gender, 20 + colWidth * 2, rowY + 5);
    doc.text(data.seats[index] || '-', 20 + colWidth * 3, rowY + 5);
  });

  yPosition += data.passengers.length * 8 + 15;

  // Pricing Information
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.roundedRect(15, yPosition, pageWidth - 30, 25, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount Paid', 20, yPosition + 10);

  doc.setFontSize(20);
  doc.text(`$${data.totalPrice.toFixed(2)}`, pageWidth - 25, yPosition + 15, { align: 'right' });

  // Footer
  yPosition = pageHeight - 30;
  doc.setTextColor(107, 114, 128); // Gray-500
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    'Please present this ticket at boarding. Show the QR code for quick verification.',
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  doc.text(
    `Booked on: ${data.bookingDate} | Customer: ${data.customerName} (${data.customerEmail})`,
    pageWidth / 2,
    yPosition + 7,
    { align: 'center' }
  );

  // Cancellation Policy
  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  const policyText = 'Cancellation Policy: Full refund if cancelled 48h before departure. ' +
    '75% refund if cancelled 24-48h before. 50% refund if cancelled 4-24h before. ' +
    'No refund within 4h of departure.';
  const splitTitle = doc.splitTextToSize(policyText, pageWidth - 30);
  doc.text(splitTitle, pageWidth / 2, yPosition + 15, { align: 'center' });

  // Generate buffer
  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Create a ticket data object from booking summary
 */
export function createTicketDataFromBooking(
  booking: AdminBookingSummary,
  userEmail: string,
  userName: string
): TicketData {
  return {
    bookingId: booking.id,
    customerName: userName,
    customerEmail: userEmail,
    route: booking.bus ? `${booking.bus.from} to ${booking.bus.to}` : 'Unknown Route',
    busType: booking.bus ? booking.bus.busType : 'Bus',
    date: booking.bus ? booking.bus.travelDate : 'N/A',
    departureTime: booking.bus ? booking.bus.departureTime : 'N/A',
    arrivalTime: booking.bus ? booking.bus.arrivalTime : 'N/A',
    seats: booking.seats,
    passengers: booking.passengers || [],
    totalPrice: booking.totalPrice,
    bookingDate: new Date(booking.createdAt).toLocaleDateString(),
  };
}
