import type { Database } from "@raven/db";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContextWithJson } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import type { updateMcpServerSchema } from "./schema";
import { mcpServers } from "./table";

type Body = z.infer<typeof updateMcpServerSchema>;

export const updateMcpServer =
  (db: Database) => async (c: AppContextWithJson<Body>) => {
    const orgId = c.get("orgId");
    const user = c.get("user");
    const id = c.req.param("id") as string;
    const {
      name,
      url,
      transport,
      description,
      capabilities,
      accessControl,
      healthCheckInterval,
      isEnabled,
      metadata
    } = c.req.valid("json");

    const [existing] = await db
      .select({ id: mcpServers.id })
      .from(mcpServers)
      .where(and(eq(mcpServers.id, id), eq(mcpServers.organizationId, orgId)))
      .limit(1);

    if (!existing) {
      throw new NotFoundError("MCP server not found");
    }

    const updates: Partial<typeof mcpServers.$inferInsert> = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (url !== undefined) {
      updates.url = url;
    }

    if (transport !== undefined) {
      updates.transport = transport;
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (capabilities !== undefined) {
      updates.capabilities = capabilities;
    }

    if (accessControl !== undefined) {
      updates.accessControl = accessControl as {
        allowedKeys: string[];
        allowedTeams: string[];
      };
    }

    if (healthCheckInterval !== undefined) {
      updates.healthCheckInterval = healthCheckInterval;
    }

    if (isEnabled !== undefined) {
      updates.isEnabled = isEnabled;
    }

    if (metadata !== undefined) {
      updates.metadata = metadata;
    }

    const [updated] = await db
      .update(mcpServers)
      .set(updates)
      .where(and(eq(mcpServers.id, id), eq(mcpServers.organizationId, orgId)))
      .returning();

    void publishEvent(orgId, "mcp_server.updated", updated);
    void logAudit(db, {
      action: "mcp_server.updated",
      actorId: user.id,
      metadata: { isEnabled, name, transport, url },
      orgId,
      resourceId: id,
      resourceType: "mcp_server"
    });
    return success(c, updated);
  };
