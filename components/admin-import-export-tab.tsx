"use client";

import { useState } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle } from "lucide-react";

export default function AdminImportExportTab() {
  const [importResult, setImportResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async (file: File) => {
    setLoading(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/import-export", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      setImportResult(data);
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      const response = await fetch(
        `/api/admin/import-export?action=export&format=${format}&includeBookedSeats=false`
      );

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seat-layouts-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export seat layouts");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(
        "/api/admin/import-export?action=template&format=csv"
      );

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "seat-layouts-template.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Template download failed:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Import / Export</h2>
        <p className="text-sm text-gray-600">Bulk manage seat layouts</p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h3 className="font-semibold text-blue-900 mb-3">📝 How to Use</h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>
            <strong>Download the template</strong> to see the expected CSV format
          </li>
          <li>
            <strong>Fill in your seat data</strong> - Bus numbers must exist in the system
          </li>
          <li>
            <strong>Import the CSV file</strong> - Seats will be updated based on status
          </li>
          <li>
            <strong>Review errors</strong> - Any rows with errors will be shown in the results
          </li>
          <li>
            <strong>Export to verify</strong> - Download current seat layouts to confirm changes
          </li>
        </ol>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Download Template */}
        <button
          onClick={handleDownloadTemplate}
          className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
        >
          <FileSpreadsheet className="w-8 h-8 text-indigo-500" />
          <div className="text-center">
            <p className="font-semibold text-gray-900">Download Template</p>
            <p className="text-xs text-gray-500">CSV format template</p>
          </div>
        </button>

        {/* Import */}
        <label className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 transition-all cursor-pointer">
          <Upload className="w-8 h-8 text-green-500" />
          <div className="text-center">
            <p className="font-semibold text-gray-900">Import Seats</p>
            <p className="text-xs text-gray-500">Upload CSV file</p>
          </div>
          <input
            type="file"
            accept=".csv,.json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
            }}
            className="hidden"
          />
        </label>

        {/* Export CSV */}
        <button
          onClick={() => handleExport("csv")}
          className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all"
        >
          <Download className="w-8 h-8 text-blue-500" />
          <div className="text-center">
            <p className="font-semibold text-gray-900">Export Seats</p>
            <p className="text-xs text-gray-500">Download CSV</p>
          </div>
        </button>
      </div>

      {/* Import Results */}
      {importResult && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Import Results</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <span className="text-sm text-gray-600">Total Rows:</span>
              <span className="ml-2 font-bold">{importResult.totalRows}</span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Processed:</span>
              <span className="ml-2 font-bold">{importResult.processedRows}</span>
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm text-gray-600">Succeeded:</span>
              <span className="ml-2 font-bold text-green-600">
                {importResult.succeededRows}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-gray-600">Failed:</span>
              <span className="ml-2 font-bold text-red-600">{importResult.failedRows}</span>
            </div>
          </div>

          {importResult.errors?.length > 0 && (
            <div className="mt-4">
              <h4 className="font-semibold text-red-600 mb-2">Errors:</h4>
              <div className="max-h-48 overflow-y-auto bg-red-50 rounded-lg p-4">
                {importResult.errors.map((error: any, index: number) => (
                  <div key={index} className="text-sm py-1 border-b border-red-200">
                    <span className="font-mono bg-red-200 px-1">
                      Row {error.row}
                    </span>
                    <span className="ml-2">
                      {error.busNumber} / {error.seatNumber}: {error.error}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CSV Format Reference */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">CSV Format Reference</h3>
        </div>
        <div className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-semibold">Field</th>
                <th className="text-left py-2 font-semibold">Required</th>
                <th className="text-left py-2 font-semibold">Values</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 font-mono text-indigo-600">Bus Number</td>
                <td className="py-2">✅ Yes</td>
                <td className="py-2">Existing bus number</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono text-indigo-600">Seat Number</td>
                <td className="py-2">✅ Yes</td>
                <td className="py-2">e.g., 1A, 2B</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono text-indigo-600">Seat Type</td>
                <td className="py-2">✅ Yes</td>
                <td className="py-2">window, aisle, sleeper</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono text-indigo-600">Status</td>
                <td className="py-2">✅ Yes</td>
                <td className="py-2">available, blocked, booked</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 font-mono text-indigo-600">Deck</td>
                <td className="py-2">No</td>
                <td className="py-2">lower, upper</td>
              </tr>
              <tr>
                <td className="py-2 font-mono text-indigo-600">Price</td>
                <td className="py-2">No</td>
                <td className="py-2">Positive number</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
