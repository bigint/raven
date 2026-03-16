import type { Database } from "@raven/db";
import { Hono } from "hono";
import { jsonValidator, queryValidator } from "@/lib/validation";
import { createCatalogItem } from "./create";
import { deleteCatalogItem } from "./delete";
import { getCatalogItem } from "./get";
import { listCatalogItems } from "./list";
import {
  createCatalogItemSchema,
  listCatalogQuerySchema,
  updateCatalogItemSchema
} from "./schema";
import { updateCatalogItem } from "./update";

export const createCatalogModule = (db: Database) => {
  const app = new Hono();

  app.get("/", queryValidator(listCatalogQuerySchema), listCatalogItems(db));
  app.get("/:id", getCatalogItem(db));
  app.post("/", jsonValidator(createCatalogItemSchema), createCatalogItem(db));
  app.put(
    "/:id",
    jsonValidator(updateCatalogItemSchema),
    updateCatalogItem(db)
  );
  app.delete("/:id", deleteCatalogItem(db));

  return app;
};
