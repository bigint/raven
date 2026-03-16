import type { Database } from "@raven/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@/lib/errors";
import { publishEvent } from "@/lib/events";
import { success } from "@/lib/response";
import type { AppContext } from "@/lib/types";
import { logAudit } from "@/modules/audit-logs/index";
import { mcpServers } from "./table";

export const deleteMcpServer = (db: Database) => async (c: AppContext) => {
  const orgId = c.get("orgId");
  const user = c.get("user");
  const id = c.req.param("id") as string;

  const [existing] = await db
    .select({ id: mcpServers.id })
    .from(mcpServers)
    .where(and(eq(mcpServers.id, id), eq(mcpServers.organizationId, orgId)))
    .limit(1);

  if (!existing) {
    throw new NotFoundError("MCP server not found");
  }

  await db
    .delete(mcpServers)
    .where(and(eq(mcpServers.id, id), eq(mcpServers.organizationId, orgId)));

  void publishEvent(orgId, "mcp_server.deleted", { id });
  void logAudit(db, {
    action: "mcp_server.deleted",
    actorId: user.id,
    orgId,
    resourceId: id,
    resourceType: "mcp_server"
  });
  return success(c, { success: true });
};
