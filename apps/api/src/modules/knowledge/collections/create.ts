import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { created } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { createCollectionSchema } from "./schema";

type Body = z.infer<typeof createCollectionSchema>;

export const createCollection =
  (db: Database, bigrag: BigRAG) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const body = c.req.valid("json");

    const collection = await bigrag.createCollection(body);

    void auditAndPublish(db, user, "collection", "created", {
      metadata: { name: body.name },
      resourceId: collection.name
    });

    return created(c, collection);
  };
