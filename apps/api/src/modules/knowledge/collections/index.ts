import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createCollection } from "./create";
import { getDefaultCollection } from "./default";
import { deleteCollection } from "./delete";
import { getCollection } from "./get";
import { listCollections } from "./list";
import { createCollectionSchema, updateCollectionSchema } from "./schema";
import { getCollectionStats } from "./stats";
import { updateCollection } from "./update";

export const createCollectionsModule = (db: Database, bigrag: BigRAG) => {
  const app = new Hono();

  app.get("/", listCollections(bigrag));
  app.post(
    "/",
    jsonValidator(createCollectionSchema),
    createCollection(db, bigrag)
  );
  app.get("/default", getDefaultCollection(bigrag));
  app.get("/:name", getCollection(bigrag));
  app.get("/:name/stats", getCollectionStats(bigrag));
  app.put(
    "/:name",
    jsonValidator(updateCollectionSchema),
    updateCollection(db, bigrag)
  );
  app.delete("/:name", deleteCollection(db, bigrag));

  return app;
};
