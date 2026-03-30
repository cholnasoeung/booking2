import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import {
  importSeatLayouts,
  exportSeatLayouts,
  getImportTemplate,
  type ExportOptions,
} from "@/lib/import-export-service";
import UserModel from "@/models/User";

export const runtime = "nodejs";

// Helper: Verify admin access
async function verifyAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return { authorized: false, error: "Unauthorized" };
  }

  await connectToDatabase();
  const userDoc = await UserModel.findById(user.id);

  if (!userDoc || userDoc.role !== "admin") {
    return { authorized: false, error: "Forbidden: Admin access required" };
  }

  return { authorized: true, user: userDoc };
}

// GET /api/admin/import-export - Export seat layouts or get template
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json(
        { message: auth.error },
        { status: auth.error === "Unauthorized" ? 401 : 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action"); // "export" or "template"
    const format = (searchParams.get("format") as "csv" | "json") || "csv";

    if (action === "template") {
      // Get import template
      const template = getImportTemplate(format);

      const filename = `seat-layouts-template.${format}`;
      const mimeType = format === "json" ? "application/json" : "text/csv";

      return new NextResponse(template, {
        headers: {
          "Content-Type": mimeType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (action === "export") {
      // Export seat layouts
      const options: ExportOptions = {
        busId: searchParams.get("busId") || undefined,
        routeId: searchParams.get("routeId") || undefined,
        dateFrom: searchParams.get("dateFrom")
          ? new Date(searchParams.get("dateId")!)
          : undefined,
        dateTo: searchParams.get("dateTo")
          ? new Date(searchParams.get("dateTo")!)
          : undefined,
        includeBookedSeats: searchParams.get("includeBookedSeats") === "true",
        format,
      };

      const result = await exportSeatLayouts(options);

      return new NextResponse(result.content, {
        headers: {
          "Content-Type": result.mimeType,
          "Content-Disposition": `attachment; filename="${result.filename}"`,
        },
      });
    }

    return NextResponse.json(
      { message: "Invalid action. Use 'export' or 'template'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in export/template:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}

// POST /api/admin/import-export - Import seat layouts from CSV
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await verifyAdmin();
    if (!auth.authorized) {
      return NextResponse.json(
        { message: auth.error },
        { status: auth.error === "Unauthorized" ? 401 : 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { message: "No file uploaded" },
        { status: 400 }
      );
    }

    // Check file type
    if (!file.name.endsWith(".csv") && !file.name.endsWith(".json")) {
      return NextResponse.json(
        { message: "Invalid file format. Only CSV and JSON files are supported" },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: "File too large. Maximum size is 5MB" },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Import seat layouts
    const result = await importSeatLayouts(content);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Import completed with errors",
          ...result,
        },
        { status: 207 } // Multi-status - some succeeded, some failed
      );
    }

    return NextResponse.json({
      success: true,
      message: "Import completed successfully",
      ...result,
    });
  } catch (error) {
    console.error("Error importing seat layouts:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
