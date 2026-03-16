import type { Database } from "@raven/db";
import {
  guardrailRules,
  policies,
  policyEvaluations,
  policyRules
} from "@raven/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { COMPLIANCE_FRAMEWORKS } from "./frameworks";

export interface ComplianceEvidence {
  framework: string;
  control: string;
  controlName: string;
  status: "met" | "partial" | "not_met";
  evidence: string;
  source: string;
  collectedAt: Date;
}

export interface ComplianceReport {
  framework: string;
  frameworkName: string;
  overallScore: number;
  controls: ComplianceEvidence[];
  generatedAt: Date;
}

const checkGuardrailsConfigured = async (
  db: Database,
  orgId: string
): Promise<boolean> => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(guardrailRules)
    .where(
      and(
        eq(guardrailRules.organizationId, orgId),
        eq(guardrailRules.isEnabled, true)
      )
    );
  return (result?.count ?? 0) > 0;
};

const checkPoliciesConfigured = async (
  db: Database,
  orgId: string
): Promise<boolean> => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(policies)
    .where(
      and(eq(policies.organizationId, orgId), eq(policies.isEnabled, true))
    );
  return (result?.count ?? 0) > 0;
};

const checkPiiDetectionEnabled = async (
  db: Database,
  orgId: string
): Promise<boolean> => {
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(guardrailRules)
    .where(
      and(
        eq(guardrailRules.organizationId, orgId),
        eq(guardrailRules.isEnabled, true),
        eq(guardrailRules.type, "pii_detection")
      )
    );
  return (result?.count ?? 0) > 0;
};

const checkCompliancePolicies = async (
  db: Database,
  orgId: string,
  framework: string
): Promise<string[]> => {
  const orgPolicies = await db
    .select({ id: policies.id })
    .from(policies)
    .where(
      and(eq(policies.organizationId, orgId), eq(policies.isEnabled, true))
    );

  if (orgPolicies.length === 0) return [];

  const policyIds = orgPolicies.map((p) => p.id);
  const rules = await db
    .select({
      complianceMap: policyRules.complianceMap
    })
    .from(policyRules)
    .where(
      and(
        policyIds.length === 1
          ? eq(policyRules.policyId, policyIds[0] as string)
          : sql`${policyRules.policyId} IN ${policyIds}`,
        eq(policyRules.isEnabled, true)
      )
    );

  return rules
    .map((r) => r.complianceMap[framework])
    .filter((c): c is string => c !== undefined);
};

const getRecentEvaluationCount = async (
  db: Database,
  orgId: string,
  daysBack: number
): Promise<number> => {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(policyEvaluations)
    .where(
      and(
        eq(policyEvaluations.organizationId, orgId),
        gte(policyEvaluations.createdAt, since)
      )
    );
  return result?.count ?? 0;
};

const generateControlEvidence = async (
  db: Database,
  orgId: string,
  framework: string,
  controlId: string,
  controlName: string
): Promise<ComplianceEvidence> => {
  const now = new Date();
  const hasGuardrails = await checkGuardrailsConfigured(db, orgId);
  const hasPolicies = await checkPoliciesConfigured(db, orgId);
  const hasPiiDetection = await checkPiiDetectionEnabled(db, orgId);
  const mappedControls = await checkCompliancePolicies(db, orgId, framework);
  const recentEvalCount = await getRecentEvaluationCount(db, orgId, 30);
  const isControlMapped = mappedControls.includes(controlId);

  // Framework-specific evidence generation
  if (framework === "soc2") {
    return generateSoc2Evidence(
      controlId,
      controlName,
      framework,
      now,
      hasGuardrails,
      hasPolicies,
      isControlMapped,
      recentEvalCount
    );
  }

  if (framework === "hipaa") {
    return generateHipaaEvidence(
      controlId,
      controlName,
      framework,
      now,
      hasPiiDetection,
      hasPolicies,
      isControlMapped
    );
  }

  if (framework === "gdpr") {
    return generateGdprEvidence(
      controlId,
      controlName,
      framework,
      now,
      hasPiiDetection,
      hasPolicies,
      isControlMapped
    );
  }

  // Default evidence for other frameworks
  if (isControlMapped && hasPolicies) {
    return {
      collectedAt: now,
      control: controlId,
      controlName,
      evidence: `Policy rules mapped to control ${controlId} are active and enforced`,
      framework,
      source: "policy_engine",
      status: "met"
    };
  }

  if (hasPolicies || hasGuardrails) {
    return {
      collectedAt: now,
      control: controlId,
      controlName,
      evidence: `Partial coverage: guardrails or policies are configured but not specifically mapped to ${controlId}`,
      framework,
      source: "policy_engine",
      status: "partial"
    };
  }

  return {
    collectedAt: now,
    control: controlId,
    controlName,
    evidence: `No policies or guardrails configured for control ${controlId}`,
    framework,
    source: "policy_engine",
    status: "not_met"
  };
};

const generateSoc2Evidence = (
  controlId: string,
  controlName: string,
  framework: string,
  now: Date,
  hasGuardrails: boolean,
  hasPolicies: boolean,
  isControlMapped: boolean,
  recentEvalCount: number
): ComplianceEvidence => {
  const accessControls = ["CC6.1", "CC6.2", "CC6.3"];
  const monitoringControls = ["CC7.1", "CC7.2"];

  if (accessControls.includes(controlId)) {
    if (hasPolicies && isControlMapped) {
      return {
        collectedAt: now,
        control: controlId,
        controlName,
        evidence:
          "Access control policies are configured and mapped to this control. Virtual key authentication enforces logical access.",
        framework,
        source: "policy_engine",
        status: "met"
      };
    }
    return {
      collectedAt: now,
      control: controlId,
      controlName,
      evidence: hasPolicies
        ? "Policies exist but are not specifically mapped to this SOC 2 control"
        : "No access control policies configured",
      framework,
      source: "policy_engine",
      status: hasPolicies ? "partial" : "not_met"
    };
  }

  if (monitoringControls.includes(controlId)) {
    if (recentEvalCount > 0 && hasGuardrails) {
      return {
        collectedAt: now,
        control: controlId,
        controlName,
        evidence: `${recentEvalCount} policy evaluations logged in the last 30 days. Guardrails actively monitoring requests.`,
        framework,
        source: "policy_engine",
        status: "met"
      };
    }
    return {
      collectedAt: now,
      control: controlId,
      controlName,
      evidence: hasGuardrails
        ? "Guardrails configured but no recent evaluation data"
        : "No monitoring guardrails or policies configured",
      framework,
      source: "policy_engine",
      status: hasGuardrails ? "partial" : "not_met"
    };
  }

  return {
    collectedAt: now,
    control: controlId,
    controlName,
    evidence: isControlMapped
      ? "Policy rules mapped and actively enforced"
      : "Control not yet mapped to specific policy rules",
    framework,
    source: "policy_engine",
    status: isControlMapped ? "met" : "partial"
  };
};

const generateHipaaEvidence = (
  controlId: string,
  controlName: string,
  framework: string,
  now: Date,
  hasPiiDetection: boolean,
  hasPolicies: boolean,
  isControlMapped: boolean
): ComplianceEvidence => {
  const dataProtectionControls = [
    "164.312.a.2.iv",
    "164.312.c.1",
    "164.312.e.1",
    "164.502.a"
  ];

  if (dataProtectionControls.includes(controlId)) {
    if (hasPiiDetection && isControlMapped) {
      return {
        collectedAt: now,
        control: controlId,
        controlName,
        evidence:
          "PII detection guardrails active. Policy rules mapped to this HIPAA control enforce PHI protection.",
        framework,
        source: "policy_engine",
        status: "met"
      };
    }
    return {
      collectedAt: now,
      control: controlId,
      controlName,
      evidence: hasPiiDetection
        ? "PII detection is enabled but not explicitly mapped to this HIPAA control"
        : "No PII detection or data protection policies configured",
      framework,
      source: "policy_engine",
      status: hasPiiDetection ? "partial" : "not_met"
    };
  }

  return {
    collectedAt: now,
    control: controlId,
    controlName,
    evidence: isControlMapped
      ? "Policy rules mapped and actively enforced"
      : hasPolicies
        ? "Policies exist but not mapped to this control"
        : "No policies configured for this control",
    framework,
    source: "policy_engine",
    status: isControlMapped ? "met" : hasPolicies ? "partial" : "not_met"
  };
};

const generateGdprEvidence = (
  controlId: string,
  controlName: string,
  framework: string,
  now: Date,
  hasPiiDetection: boolean,
  hasPolicies: boolean,
  isControlMapped: boolean
): ComplianceEvidence => {
  const dataProtectionArticles = ["Art.5", "Art.25", "Art.32"];

  if (dataProtectionArticles.includes(controlId)) {
    if (hasPiiDetection && hasPolicies) {
      return {
        collectedAt: now,
        control: controlId,
        controlName,
        evidence:
          "Data protection measures in place: PII detection enabled, governance policies active.",
        framework,
        source: "policy_engine",
        status: isControlMapped ? "met" : "partial"
      };
    }
    return {
      collectedAt: now,
      control: controlId,
      controlName,
      evidence: hasPiiDetection
        ? "PII detection enabled but comprehensive data governance policies needed"
        : "Data protection policies and PII detection not configured",
      framework,
      source: "policy_engine",
      status: hasPiiDetection ? "partial" : "not_met"
    };
  }

  return {
    collectedAt: now,
    control: controlId,
    controlName,
    evidence: isControlMapped
      ? "Policy rules mapped and actively enforced for this GDPR article"
      : hasPolicies
        ? "Policies exist but not mapped to this GDPR article"
        : "No policies configured for this GDPR article",
    framework,
    source: "policy_engine",
    status: isControlMapped ? "met" : hasPolicies ? "partial" : "not_met"
  };
};

export const generateComplianceReport = async (
  db: Database,
  orgId: string,
  framework: string
): Promise<ComplianceReport> => {
  const frameworkDef = COMPLIANCE_FRAMEWORKS[framework];
  if (!frameworkDef) {
    return {
      controls: [],
      framework,
      frameworkName: framework,
      generatedAt: new Date(),
      overallScore: 0
    };
  }

  const controls: ComplianceEvidence[] = [];

  for (const control of frameworkDef.controls) {
    const evidence = await generateControlEvidence(
      db,
      orgId,
      framework,
      control.id,
      control.name
    );
    controls.push(evidence);
  }

  const totalControls = controls.length;
  const metControls = controls.filter((c) => c.status === "met").length;
  const partialControls = controls.filter((c) => c.status === "partial").length;
  const overallScore =
    totalControls > 0
      ? Math.round(
          ((metControls + partialControls * 0.5) / totalControls) * 100
        )
      : 0;

  return {
    controls,
    framework,
    frameworkName: frameworkDef.name,
    generatedAt: new Date(),
    overallScore
  };
};
