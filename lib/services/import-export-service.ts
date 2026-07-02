import { connectToDatabase } from "@/lib/db/mongodb";
import BusModel from "@/models/transport/Bus";
import RouteModel from "@/models/transport/Route";

export const runtime = "nodejs";

export interface SeatLayoutRow {
  busNumber?: string;
  seatNumber: string;
  seatType: "window" | "aisle" | "sleeper";
  status: "available" | "blocked" | "booked";
  deck?: "lower" | "upper";
  price?: number;
}

export interface BatchImportResult {
  success: boolean;
  totalRows: number;
  processedRows: number;
  succeededRows: number;
  failedRows: number;
  errors: Array<{
    row: number;
    busNumber: string;
    seatNumber: string;
    error: string;
  }>;
}

export interface ExportOptions {
  busId?: string;
  routeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  includeBookedSeats?: boolean;
  format: "csv" | "json";
}

/**
 * Parse CSV content into seat layout rows
 */
function parseCSV(csvContent: string): SeatLayoutRow[] {
  const lines = csvContent.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const rows: SeatLayoutRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: any = {};

    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    // Map CSV columns to SeatLayoutRow interface
    rows.push({
      busNumber: row.busnumber || row.bus_number || row["bus number"] || "",
      seatNumber: row.seatnumber || row.seat_number || row["seat number"] || "",
      seatType: row.seattype || row.seat_type || row["seat type"] || "aisle",
      status: row.status || "available",
      deck: row.deck || undefined,
      price: row.price ? parseFloat(row.price) : undefined,
    });
  }

  return rows;
}

/**
 * Convert seat layout rows to CSV format
 */
function generateCSV(rows: SeatLayoutRow[]): string {
  const headers = [
    "Bus Number",
    "Seat Number",
    "Seat Type",
    "Status",
    "Deck",
    "Price",
  ];

  const csvRows = [
    headers.join(","),
    ...rows.map(
      (row) =>
        [
          row.busNumber,
          row.seatNumber,
          row.seatType,
          row.status,
          row.deck || "",
          row.price || "",
        ].join(",")
    ),
  ];

  return csvRows.join("\n");
}

/**
 * Validate seat layout row
 */
function validateSeatRow(row: SeatLayoutRow): { valid: boolean; error?: string } {
  if (!row.busNumber) {
    return { valid: false, error: "Bus number is required" };
  }

  if (!row.seatNumber) {
    return { valid: false, error: "Seat number is required" };
  }

  if (!["window", "aisle", "sleeper"].includes(row.seatType)) {
    return {
      valid: false,
      error: "Invalid seat type. Must be: window, aisle, or sleeper",
    };
  }

  if (!["available", "blocked", "booked"].includes(row.status)) {
    return {
      valid: false,
      error: "Invalid status. Must be: available, blocked, or booked",
    };
  }

  if (row.deck && !["lower", "upper"].includes(row.deck)) {
    return {
      valid: false,
      error: "Invalid deck. Must be: lower or upper",
    };
  }

  if (row.price !== undefined && (isNaN(row.price) || row.price < 0)) {
    return { valid: false, error: "Price must be a positive number" };
  }

  return { valid: true };
}

/**
 * Batch import seat layouts from CSV content
 */
export async function importSeatLayouts(
  csvContent: string
): Promise<BatchImportResult> {
  await connectToDatabase();

  const rows = parseCSV(csvContent);

  const result: BatchImportResult = {
    success: true,
    totalRows: rows.length,
    processedRows: 0,
    succeededRows: 0,
    failedRows: 0,
    errors: [],
  };

  // Group rows by bus number for efficient processing
  const busGroups = new Map<string, SeatLayoutRow[]>();
  rows.forEach((row) => {
    const busKey = row.busNumber ?? "unknown";
    if (!busGroups.has(busKey)) {
      busGroups.set(busKey, []);
    }
    busGroups.get(busKey)!.push(row);
  });

  // Process each bus
  for (const [busNumber, seatRows] of busGroups.entries()) {
    const bus = await BusModel.findOne({ busNumber });

    if (!bus) {
      // Add errors for all rows in this bus
      seatRows.forEach((row, index) => {
        result.errors.push({
          row: rows.indexOf(row) + 1,
          busNumber: row.busNumber ?? "unknown",
          seatNumber: row.seatNumber,
          error: `Bus ${busNumber} not found`,
        });
        result.failedRows++;
      });
      continue;
    }

    // Process each seat row
    for (const seatRow of seatRows) {
      result.processedRows++;

      const validation = validateSeatRow(seatRow);
      if (!validation.valid) {
        result.errors.push({
          row: rows.indexOf(seatRow) + 1,
          busNumber: seatRow.busNumber ?? "unknown",
          seatNumber: seatRow.seatNumber,
          error: validation.error!,
        });
        result.failedRows++;
        continue;
      }

      try {
        // Update seat status based on import
        if (seatRow.status === "blocked") {
          // Add to blocked seats if not already there
          if (!bus.blockedSeats) {
            bus.blockedSeats = [];
          }
          if (!bus.blockedSeats.includes(seatRow.seatNumber)) {
            bus.blockedSeats.push(seatRow.seatNumber);
          }

          // Remove from booked seats if present
          if (bus.bookedSeats && bus.bookedSeats.includes(seatRow.seatNumber)) {
            bus.bookedSeats = bus.bookedSeats.filter(
              (s) => s !== seatRow.seatNumber
            );
          }
        } else if (seatRow.status === "booked") {
          // Add to booked seats if not already there
          if (!bus.bookedSeats) {
            bus.bookedSeats = [];
          }
          if (!bus.bookedSeats.includes(seatRow.seatNumber)) {
            bus.bookedSeats.push(seatRow.seatNumber);
          }

          // Remove from blocked seats if present
          if (bus.blockedSeats && bus.blockedSeats.includes(seatRow.seatNumber)) {
            bus.blockedSeats = bus.blockedSeats.filter(
              (s) => s !== seatRow.seatNumber
            );
          }
        } else {
          // Remove from both booked and blocked seats
          if (bus.bookedSeats) {
            bus.bookedSeats = bus.bookedSeats.filter(
              (s) => s !== seatRow.seatNumber
            );
          }
          if (bus.blockedSeats) {
            bus.blockedSeats = bus.blockedSeats.filter(
              (s) => s !== seatRow.seatNumber
            );
          }
        }

        await bus.save();
        result.succeededRows++;
      } catch (error) {
        result.errors.push({
          row: rows.indexOf(seatRow) + 1,
          busNumber: seatRow.busNumber ?? "unknown",
          seatNumber: seatRow.seatNumber,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update seat status",
        });
        result.failedRows++;
      }
    }
  }

  result.success = result.failedRows === 0;
  return result;
}

/**
 * Export seat layouts based on options
 */
export async function exportSeatLayouts(
  options: ExportOptions
): Promise<{ content: string; filename: string; mimeType: string }> {
  await connectToDatabase();

  let query: any = { isActive: true };

  // Apply filters
  if (options.busId) {
    query._id = options.busId;
  }

  if (options.routeId) {
    query.routeId = options.routeId;
  }

  if (options.dateFrom || options.dateTo) {
    query.date = {};
    if (options.dateFrom) {
      query.date.$gte = options.dateFrom;
    }
    if (options.dateTo) {
      query.date.$lte = options.dateTo;
    }
  }

  const buses = await BusModel.find(query)
    .populate("routeId")
    .lean();

  const rows: SeatLayoutRow[] = [];

  for (const bus of buses) {
    const route = bus.routeId as any;

    // Add available seats (all seats - booked - blocked)
    const totalSeats = bus.totalSeats || 40;
    const bookedSeats = bus.bookedSeats || [];
    const blockedSeats = bus.blockedSeats || [];

    // Generate all possible seat numbers (e.g., 1A, 1B, 2A, 2B, etc.)
    const numRows = Math.ceil(totalSeats / 4); // Assuming 4 seats per row
    for (let row = 1; row <= numRows; row++) {
      for (let col = 0; col < 4; col++) {
        const seatLetter = String.fromCharCode(65 + col); // A, B, C, D
        const seatNumber = `${row}${seatLetter}`;

        let status: "available" | "blocked" | "booked" = "available";
        let seatType: "window" | "aisle" | "sleeper" = "aisle";

        if (blockedSeats.includes(seatNumber)) {
          status = "blocked";
        } else if (bookedSeats.includes(seatNumber)) {
          status = "booked";
        }

        // Determine seat type based on position
        if (col === 0 || col === 3) {
          seatType = "window";
        } else {
          seatType = "aisle";
        }

        // Skip booked seats if not requested
        if (status === "booked" && !options.includeBookedSeats) {
          continue;
        }

        rows.push({
          busNumber: bus.busNumber,
          seatNumber,
          seatType,
          status,
          deck: bus.hasUpperDeck ? (col < 2 ? "lower" : "upper") : undefined,
          price: bus.pricePerSeat,
        });
      }
    }
  }

  const filename = `seat-layouts-${new Date().toISOString().split("T")[0]}`;

  if (options.format === "json") {
    return {
      content: JSON.stringify(rows, null, 2),
      filename: `${filename}.json`,
      mimeType: "application/json",
    };
  } else {
    return {
      content: generateCSV(rows),
      filename: `${filename}.csv`,
      mimeType: "text/csv",
    };
  }
}

/**
 * Get import template with sample data
 */
export function getImportTemplate(format: "csv" | "json" = "csv"): string {
  const sampleData: SeatLayoutRow[] = [
    {
      busNumber: "BUS001",
      seatNumber: "1A",
      seatType: "window",
      status: "available",
      deck: "lower",
      price: 25,
    },
    {
      busNumber: "BUS001",
      seatNumber: "1B",
      seatType: "aisle",
      status: "blocked",
      deck: "lower",
      price: 20,
    },
    {
      busNumber: "BUS001",
      seatNumber: "2A",
      seatType: "window",
      status: "booked",
      deck: "lower",
      price: 25,
    },
    {
      busNumber: "BUS002",
      seatNumber: "1A",
      seatType: "window",
      status: "available",
      deck: "lower",
      price: 30,
    },
  ];

  if (format === "json") {
    return JSON.stringify(sampleData, null, 2);
  } else {
    return generateCSV(sampleData);
  }
}
