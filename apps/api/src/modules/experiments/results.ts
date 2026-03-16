import type { Database } from "@raven/db";
import { experiments, experimentVariants } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { NotFoundError } from "@/lib/errors";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";

export const getExperimentResults =
  (db: Database, redis: Redis) => async (c: AppContext) => {
    const orgId = c.get("orgId");
    const id = c.req.param("id") as string;

    const [experiment] = await db
      .select()
      .from(experiments)
      .where(and(eq(experiments.id, id), eq(experiments.organizationId, orgId)))
      .limit(1);

    if (!experiment) {
      throw new NotFoundError("Experiment not found");
    }

    const variants = await db
      .select()
      .from(experimentVariants)
      .where(eq(experimentVariants.experimentId, id));

    const results = await Promise.all(
      variants.map(async (variant) => {
        const counterKey = `exp:${orgId}:${variant.id}:count`;
        const raw = await redis.get(counterKey);
        return {
          model: variant.model,
          provider: variant.provider,
          requestCount: raw ? Number.parseInt(raw, 10) : 0,
          variantId: variant.id,
          variantName: variant.name,
          weight: variant.weight
        };
      })
    );

    const totalRequests = results.reduce((sum, r) => sum + r.requestCount, 0);

    return success(c, {
      experimentId: experiment.id,
      name: experiment.name,
      status: experiment.status,
      totalRequests,
      variants: results
    });
  };
