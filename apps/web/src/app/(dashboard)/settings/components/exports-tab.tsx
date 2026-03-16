"use client";

import { Button, Select } from "@raven/ui";
import { Download } from "lucide-react";
import { useState } from "react";
import { TextMorph } from "torph/react";
import { api } from "@/lib/api";

const FORMAT_OPTIONS = [
  { label: "JSON", value: "json" },
  { label: "CSV", value: "csv" },
  { label: "NDJSON", value: "ndjson" }
];

const ExportsTab = () => {
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
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Data Exports</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Export your data for external analysis or compliance.
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Request Logs</p>
            <p className="text-xs text-muted-foreground">
              All request logs with tokens, cost, and latency
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              className="w-28"
              id="export-format"
              onChange={setFormat}
              options={FORMAT_OPTIONS}
              value={format}
            />
            <Button
              disabled={loading === "request-logs"}
              onClick={() => handleExport("request-logs")}
              size="sm"
            >
              <Download className="size-3.5" />
              <TextMorph>
                {loading === "request-logs" ? "Exporting..." : "Export"}
              </TextMorph>
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Audit Logs</p>
            <p className="text-xs text-muted-foreground">
              Audit trail of all organization actions
            </p>
          </div>
          <Button
            disabled={loading === "audit-logs"}
            onClick={() => handleExport("audit-logs")}
            size="sm"
          >
            <Download className="size-3.5" />
            <TextMorph>
              {loading === "audit-logs" ? "Exporting..." : "Export"}
            </TextMorph>
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">Cost Report</p>
            <p className="text-xs text-muted-foreground">
              Aggregated cost breakdown by model and provider
            </p>
          </div>
          <Button
            disabled={loading === "cost-report"}
            onClick={() => handleExport("cost-report")}
            size="sm"
          >
            <Download className="size-3.5" />
            <TextMorph>
              {loading === "cost-report" ? "Generating..." : "Generate"}
            </TextMorph>
          </Button>
        </div>
      </div>
    </div>
  );
};

export { ExportsTab };
