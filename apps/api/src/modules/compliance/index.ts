import type { Database } from "@raven/db";
import { Hono } from "hono";
import { ValidationError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { generateComplianceReport } from "./evidence-generator";
import { COMPLIANCE_FRAMEWORKS } from "./frameworks";

const listFrameworks = () => (c: AppContext) => {
  const frameworks = Object.entries(COMPLIANCE_FRAMEWORKS).map(
    ([key, value]) => ({
      controlCount: value.controls.length,
      id: key,
      name: value.name,
      version: value.version
    })
  );
  return success(c, frameworks);
};

const getFramework = () => (c: AppContext) => {
  const id = c.req.param("id") as string;
  const framework = COMPLIANCE_FRAMEWORKS[id];

  if (!framework) {
    throw new ValidationError(`Unknown compliance framework: ${id}`);
  }

  return success(c, { id, ...framework });
};

const getReport = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const frameworkId = c.req.param("id") as string;

  if (!COMPLIANCE_FRAMEWORKS[frameworkId]) {
    throw new ValidationError(`Unknown compliance framework: ${frameworkId}`);
  }

  const report = await generateComplianceReport(db, orgId, frameworkId);
  return success(c, report);
};

export const createComplianceModule = (db: Database) => {
  const app = new Hono();

  app.get("/frameworks", listFrameworks());
  app.get("/frameworks/:id", getFramework());
  app.get("/frameworks/:id/report", getReport(db));

  return app;
};
