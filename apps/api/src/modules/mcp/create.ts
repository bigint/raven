import type { Database } from "@raven/db";
import type { z } from "zod";
import { publishEvent } from "@/lib/events";
import { created } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { createMcpServerSchema } from "./schema";
import { mcpServers } from "./table";

type Body = z.infer<typeof createMcpServerSchema>;

export const createMcpServer =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const {
      name,
      url,
      transport,
      description,
      capabilities,
      accessControl,
      healthCheckInterval,
      metadata
    } = c.req.valid("json");

    const [record] = await db
      .insert(mcpServers)
      .values({
        accessControl: {
          allowedKeys: accessControl?.allowedKeys ?? [],
          allowedTeams: accessControl?.allowedTeams ?? []
        },
        capabilities: capabilities ?? [],
        description: description ?? "",
        healthCheckInterval: healthCheckInterval ?? 60,
        metadata: metadata ?? {},
        name,
        organizationId: orgId,
        transport,
        url
      })
      .returning();

    const safe = record as NonNullable<typeof record>;
    void publishEvent(orgId, "mcp_server.created", safe);
    void logAudit(db, {
      action: "mcp_server.created",
      actorId: user.id,
      metadata: { name, transport, url },
      orgId,
      resourceId: safe.id,
      resourceType: "mcp_server"
    });
    return created(c, safe);
  };
