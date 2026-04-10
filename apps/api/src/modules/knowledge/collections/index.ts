import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { getCollectionAnalytics } from "./analytics";
import { createCollection } from "./create";
import { deleteCollection } from "./delete";
import { streamCollectionEvents } from "./events";
import { getCollection } from "./get";
import { listCollections } from "./list";
import { createCollectionSchema, updateCollectionSchema } from "./schema";
import { getCollectionStats } from "./stats";
import { truncateCollection } from "./truncate";
import { updateCollection } from "./update";

export const createCollectionsModule = (db: Database, bigrag: BigRAG) => {
  const app = new Hono();

  app.get("/", listCollections(bigrag));
  app.post(
    "/",
    jsonValidator(createCollectionSchema),
    createCollection(db, bigrag)
  );
  app.get("/:name", getCollection(bigrag));
  app.get("/:name/stats", getCollectionStats(bigrag));
  app.get("/:name/analytics", getCollectionAnalytics(bigrag));
  app.get("/:name/events", streamCollectionEvents(bigrag));
  app.put(
    "/:name",
    jsonValidator(updateCollectionSchema),
    updateCollection(db, bigrag)
  );
  app.delete("/:name", deleteCollection(db, bigrag));
  app.post("/:name/truncate", truncateCollection(db, bigrag));

  return app;
};
