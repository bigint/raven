import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import type { z } from "zod";
import { auditAndPublish } from "@/lib/audit";
import { success } from "@/lib/response";
import type { AuthContextWithJson } from "@/lib/types";
import type { updateCollectionSchema } from "./schema";

type Body = z.infer<typeof updateCollectionSchema>;

export const updateCollection =
  (db: Database, bigrag: BigRAG) => async (c: AuthContextWithJson<Body>) => {
    const user = c.get("user");
    const name = c.req.param("name") as string;
    const body = c.req.valid("json");

    const collection = await bigrag.updateCollection(name, {
      description: body.description
    });

    void auditAndPublish(db, user, "collection", "updated", {
      metadata: { description: body.description },
      resourceId: name
    });

    return success(c, collection);
  };
