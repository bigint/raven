import type { BigRAG } from "@bigrag/client";
import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator } from "@/lib/validation";
import { createCollection } from "./create";
import { deleteCollection } from "./delete";
import { getCollection } from "./get";
import { listCollections } from "./list";
import { createCollectionSchema, updateCollectionSchema } from "./schema";
import { updateCollection } from "./update";

export const createCollectionsModule = (db: Database, bigrag: BigRAG) => {
  const app = new Hono();

  app.get("/", listCollections(db));
  app.post(
    "/",
    jsonValidator(createCollectionSchema),
    createCollection(db, bigrag)
  );
  app.get("/:id", getCollection(db, bigrag));
  app.patch(
    "/:id",
    jsonValidator(updateCollectionSchema),
    updateCollection(db)
  );
  app.delete("/:id", deleteCollection(db, bigrag));

  return app;
};
