"use client";

import { Button, PageHeader, Select } from "@raven/ui";
import { Download, FileSpreadsheet, FileText, Receipt } from "lucide-react";
import { useState } from "react";
import { TextMorph } from "torph/react";
import { api } from "@/lib/api";

const FORMAT_OPTIONS = [
  { label: "JSON", value: "json" },
  { label: "CSV", value: "csv" },
  { label: "NDJSON", value: "ndjson" }
];

const ExportsPage = () => {
  const [format, setFormat] = useState("json");
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (type: string) => {
    setLoading(type);
    try {
      const endpoint =
        type === "request-logs"
          ? `/v1/exports/request-logs?format=${format}`
          : type === "audit-logs"
            ? "/v1/exports/audit-logs"
            : "/v1/exports/cost-report";

      const data = await api.get(endpoint);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div>
      <PageHeader
        description="Export your data for external analysis or compliance."
        title="Data Exports"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border p-6">
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Request Logs</h3>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Export all request logs with full details.
          </p>
          <div className="mb-3">
            <Select
              id="export-format"
              label="Format"
              onChange={setFormat}
              options={FORMAT_OPTIONS}
              value={format}
            />
          </div>
          <Button
            disabled={loading === "request-logs"}
            onClick={() => handleExport("request-logs")}
            size="sm"
          >
            <Download className="size-4" />
            <TextMorph>
              {loading === "request-logs" ? "Exporting..." : "Download"}
            </TextMorph>
          </Button>
        </div>

        <div className="rounded-xl border border-border p-6">
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
            <FileSpreadsheet className="size-5 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Audit Logs</h3>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Export audit trail of all organization actions.
          </p>
          <Button
            disabled={loading === "audit-logs"}
            onClick={() => handleExport("audit-logs")}
            size="sm"
          >
            <Download className="size-4" />
            <TextMorph>
              {loading === "audit-logs" ? "Exporting..." : "Download"}
            </TextMorph>
          </Button>
        </div>

        <div className="rounded-xl border border-border p-6">
          <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
            <Receipt className="size-5 text-muted-foreground" />
          </div>
          <h3 className="font-medium">Cost Report</h3>
          <p className="mb-4 mt-1 text-sm text-muted-foreground">
            Generate a detailed cost breakdown report.
          </p>
          <Button
            disabled={loading === "cost-report"}
            onClick={() => handleExport("cost-report")}
            size="sm"
          >
            <Download className="size-4" />
            <TextMorph>
              {loading === "cost-report" ? "Generating..." : "Generate Report"}
            </TextMorph>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportsPage;
