import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { AdminBookingSummary } from '../db/queries';

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
  doc.text('TKbus', pageWidth / 2, 35, { align: 'center' });

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

interface RosterEntry {
  driverName: string;
  driverPhone: string;
  busName: string;
  busReg: string;
  date: string; // ISO yyyy-mm-dd
  shiftStart: string;
  shiftEnd: string;
  status: string;
  notes: string;
}

const ROSTER_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

const ROSTER_STATUS_COLOR: Record<string, { bar: [number, number, number]; bg: [number, number, number] }> = {
  scheduled: { bar: [59, 130, 246],  bg: [239, 246, 255] }, // blue
  active:    { bar: [16, 185, 129],  bg: [236, 253, 245] }, // emerald
  completed: { bar: [148, 163, 184], bg: [248, 250, 252] }, // slate
  cancelled: { bar: [248, 113, 113], bg: [254, 242, 242] }, // red
  no_show:   { bar: [249, 115, 22],  bg: [255, 247, 237] }, // orange
};

const ROSTER_DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let hours = parseInt(hStr, 10);
  if (Number.isNaN(hours)) return time24;
  const period = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${mStr ?? '00'} ${period}`;
}

/**
 * Generate a printable driver roster PDF laid out as a 7-day week calendar,
 * mirroring the admin Week view grid (one column per day, shifts as cards).
 */
export function generateDriverRosterPDF(
  entries: RosterEntry[],
  weekDays: string[], // 7 ISO dates (yyyy-mm-dd), Monday first
  weekLabel: string
): Buffer {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const gridTop = 32;
  const dayHeaderHeight = 12;
  const bottomMargin = 12;

  // Header bar
  doc.setFillColor(79, 70, 229); // Indigo-600
  doc.rect(0, 0, pageWidth, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Driver Roster', marginX, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(weekLabel, pageWidth - marginX, 14, { align: 'right' });

  const colWidth = (pageWidth - marginX * 2) / 7;
  const todayIso = new Date().toISOString().slice(0, 10);
  const gridBottom = pageHeight - bottomMargin;

  // Group shifts by date, sorted by start time
  const byDate = new Map<string, RosterEntry[]>();
  for (const entry of entries) {
    if (!byDate.has(entry.date)) byDate.set(entry.date, []);
    byDate.get(entry.date)!.push(entry);
  }
  for (const list of byDate.values()) {
    list.sort((a, b) => a.shiftStart.localeCompare(b.shiftStart));
  }

  weekDays.forEach((iso, i) => {
    const colX = marginX + i * colWidth;
    const isToday = iso === todayIso;

    // Day header cell
    doc.setFillColor(238, 242, 255); // Indigo-50
    doc.rect(colX, gridTop, colWidth, dayHeaderHeight, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(isToday ? 79 : 100, isToday ? 70 : 116, isToday ? 229 : 139);
    doc.text(ROSTER_DAY_NAMES[i], colX + colWidth / 2, gridTop + 5, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(isToday ? 79 : 30, isToday ? 70 : 41, isToday ? 229 : 55);
    doc.text(String(new Date(iso + 'T00:00:00').getDate()), colX + colWidth / 2, gridTop + 10.5, { align: 'center' });

    // Column outline
    doc.setDrawColor(226, 232, 240);
    doc.rect(colX, gridTop, colWidth, gridBottom - gridTop, 'S');

    const dayEntries = byDate.get(iso) ?? [];
    const cardWidth = colWidth - 3;
    const cardX = colX + 1.5;
    const cardHeight = 15;
    const cardGap = 1.5;
    const maxCards = Math.max(1, Math.floor((gridBottom - (gridTop + dayHeaderHeight + 2)) / (cardHeight + cardGap)));

    if (dayEntries.length === 0) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(190, 197, 209);
      doc.text('No shifts', colX + colWidth / 2, gridTop + dayHeaderHeight + 14, { align: 'center' });
      return;
    }

    let cardY = gridTop + dayHeaderHeight + 2;
    dayEntries.slice(0, maxCards).forEach((entry) => {
      const colors = ROSTER_STATUS_COLOR[entry.status] ?? ROSTER_STATUS_COLOR.scheduled;

      doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
      doc.rect(cardX, cardY, cardWidth, cardHeight, 'F');
      doc.setFillColor(colors.bar[0], colors.bar[1], colors.bar[2]);
      doc.rect(cardX, cardY, 1.2, cardHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(31, 41, 55);
      doc.text(entry.driverName.substring(0, 16), cardX + 2.5, cardY + 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`${entry.busName}${entry.busReg ? ` · ${entry.busReg}` : ''}`.substring(0, 20), cardX + 2.5, cardY + 8);
      doc.setFontSize(5.3);
      doc.text(`${formatTime12h(entry.shiftStart)} - ${formatTime12h(entry.shiftEnd)}`, cardX + 2.5, cardY + 11.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(colors.bar[0], colors.bar[1], colors.bar[2]);
      doc.text(ROSTER_STATUS_LABEL[entry.status] ?? entry.status, cardX + cardWidth - 2, cardY + 11.5, { align: 'right' });

      cardY += cardHeight + cardGap;
    });

    if (dayEntries.length > maxCards) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text(`+${dayEntries.length - maxCards} more`, colX + colWidth / 2, cardY + 3, { align: 'center' });
    }
  });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text(
    `Generated ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} — ${entries.length} shift${entries.length !== 1 ? 's' : ''}`,
    marginX,
    pageHeight - 5
  );

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
