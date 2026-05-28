import { Hono } from "hono";
import { db } from "@humancore/db";
import { tools } from "@humancore/db/schema";
import { eq } from "drizzle-orm";
import {
  executeTool,
  executeApprovedTool,
  getAvailableTools,
  getPendingApprovals,
  approveToolCall,
  rejectToolCall,
} from "../engine/tools";

export const toolsRoutes = new Hono()
  // CRUD
  .get("/tools", async (c) => {
    const rows = await db.select().from(tools);
    return c.json(rows);
  })
  .post("/tools", async (c) => {
    const body = await c.req.json();
    const [row] = await db.insert(tools).values(body).returning();
    return c.json(row, 201);
  })
  .patch("/tools/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const [row] = await db.update(tools).set(body).where(eq(tools.id, id)).returning();
    return c.json(row);
  })
  .delete("/tools/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.delete(tools).where(eq(tools.id, id));
    return c.body(null, 204);
  })

  // Tool execution
  .post("/tools/execute", async (c) => {
    const body = await c.req.json() as { toolName: string; args: Record<string, unknown>; agentId: number; sessionId?: number };
    if (!body.toolName || !body.agentId) {
      return c.json({ error: "toolName and agentId are required" }, 400);
    }
    const result = await executeTool({
      toolName: body.toolName,
      args: body.args ?? {},
      agentId: body.agentId,
      sessionId: body.sessionId,
    });
    return c.json(result);
  })

  // Execute approved tool
  .post("/tools/execute-approved/:approvalId", async (c) => {
    const approvalId = c.req.param("approvalId");
    const result = await executeApprovedTool(approvalId);
    return c.json(result);
  })

  // Available tools
  .get("/tools/available", async (c) => {
    return c.json(getAvailableTools());
  })

  // Approval queue
  .get("/tools/approvals", async (c) => {
    return c.json(getPendingApprovals());
  })
  .post("/tools/approvals/:id/approve", async (c) => {
    const id = c.req.param("id");
    const ok = approveToolCall(id);
    if (!ok) return c.json({ error: "Approval not found" }, 404);
    // Auto-execute after approval
    const result = await executeApprovedTool(id);
    return c.json({ approved: true, result });
  })
  .post("/tools/approvals/:id/reject", async (c) => {
    const id = c.req.param("id");
    const ok = rejectToolCall(id);
    if (!ok) return c.json({ error: "Approval not found" }, 404);
    return c.json({ rejected: true });
  });
