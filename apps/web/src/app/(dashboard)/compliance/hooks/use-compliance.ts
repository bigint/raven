"use client";

import { queryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ComplianceFramework {
  id: string;
  name: string;
  version: string;
  controls: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
  }>;
}

export interface ComplianceReport {
  framework: string;
  overallScore: number;
  controls: Array<{
    control: string;
    status: "met" | "partial" | "not_met";
    evidence: string;
    source: string;
  }>;
  generatedAt: string;
}

export const frameworksQueryOptions = () =>
  queryOptions({
    queryFn: () =>
      api.get<Record<string, ComplianceFramework>>("/v1/compliance/frameworks"),
    queryKey: ["compliance-frameworks"]
  });

export const complianceReportQueryOptions = (frameworkId: string) =>
  queryOptions({
    enabled: !!frameworkId,
    queryFn: () =>
      api.get<ComplianceReport>(
        `/v1/compliance/frameworks/${frameworkId}/report`
      ),
    queryKey: ["compliance-report", frameworkId]
  });
