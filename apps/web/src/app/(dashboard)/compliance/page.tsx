"use client";

import { Badge, Button, PageHeader, Spinner } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { FileCheck } from "lucide-react";
import { useState } from "react";
import {
  type ComplianceReport,
  complianceReportQueryOptions,
  frameworksQueryOptions
} from "./hooks/use-compliance";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "error"> = {
  met: "success",
  not_met: "error",
  partial: "warning"
};

const STATUS_LABELS: Record<string, string> = {
  met: "Met",
  not_met: "Not Met",
  partial: "Partial"
};

const ReportTable = ({ report }: { report: ComplianceReport }) => (
  <div className="mt-4 space-y-3">
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">
        Overall Score
      </span>
      <span className="text-2xl font-bold">{report.overallScore}%</span>
    </div>
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-4 py-2 text-left font-medium">Control</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Evidence</th>
            <th className="px-4 py-2 text-left font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {report.controls.map((control) => (
            <tr
              className="border-b border-border last:border-b-0"
              key={control.control}
            >
              <td className="px-4 py-2 font-medium">{control.control}</td>
              <td className="px-4 py-2">
                <Badge variant={STATUS_VARIANTS[control.status] ?? "neutral"}>
                  {STATUS_LABELS[control.status] ?? control.status}
                </Badge>
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {control.evidence}
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {control.source}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="text-xs text-muted-foreground">
      Report generated at {new Date(report.generatedAt).toLocaleString()}
    </p>
  </div>
);

const CompliancePage = () => {
  const {
    data: frameworks,
    error,
    isLoading
  } = useQuery(frameworksQueryOptions());

  const [selectedFramework, setSelectedFramework] = useState<string | null>(
    null
  );

  const {
    data: report,
    isFetching: isReportLoading,
    refetch: fetchReport
  } = useQuery({
    ...complianceReportQueryOptions(selectedFramework ?? ""),
    enabled: false
  });

  const handleGenerateReport = (frameworkId: string) => {
    setSelectedFramework(frameworkId);
    setTimeout(() => fetchReport(), 0);
  };

  const frameworkEntries = frameworks ? Object.entries(frameworks) : [];

  return (
    <div>
      <PageHeader
        description="Monitor compliance status across regulatory frameworks."
        title="Compliance"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="size-6" />
        </div>
      )}

      {!isLoading && frameworkEntries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileCheck className="mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No compliance frameworks available.
          </p>
        </div>
      )}

      {!isLoading && frameworkEntries.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {frameworkEntries.map(([id, fw]) => (
            <div
              className="rounded-lg border border-border bg-card p-5"
              key={id}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{fw.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Version {fw.version}
                  </p>
                </div>
                <Badge variant="neutral">
                  {fw.controls.length} control
                  {fw.controls.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <div className="mt-4">
                <Button
                  disabled={isReportLoading && selectedFramework === id}
                  onClick={() => handleGenerateReport(id)}
                  size="sm"
                  variant="secondary"
                >
                  {isReportLoading && selectedFramework === id
                    ? "Generating..."
                    : "Generate Report"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {report && selectedFramework && <ReportTable report={report} />}
    </div>
  );
};

export default CompliancePage;
