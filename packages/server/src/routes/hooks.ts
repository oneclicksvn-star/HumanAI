import { Hono } from "hono";
import { db } from "@humancore/db";
import { hooks } from "@humancore/db/schema";
import { eq } from "drizzle-orm";
import { emit, getHookApprovals, approveHook, rejectHook } from "../engine/hooks";
import type { EventType } from "../engine/hooks";

export const hooksRoutes = new Hono()
  .get("/hooks", async (c) => {
    const rows = await db.select().from(hooks);
    return c.json(rows);
  })
  .post("/hooks", async (c) => {
    const body = await c.req.json();
    const [row] = await db.insert(hooks).values(body).returning();
    return c.json(row, 201);
  })
  .patch("/hooks/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const [row] = await db.update(hooks).set(body).where(eq(hooks.id, id)).returning();
    return c.json(row);
  })
  .delete("/hooks/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.delete(hooks).where(eq(hooks.id, id));
    return c.body(null, 204);
  })

  // Emit an event (for testing / manual triggers)
  .post("/hooks/emit", async (c) => {
    const body = await c.req.json() as {
      type: EventType;
      agentId?: number;
      sessionId?: number;
      data?: Record<string, unknown>;
    };
    if (!body.type) return c.json({ error: "type is required" }, 400);

    const result = await emit({
      type: body.type,
      agentId: body.agentId,
      sessionId: body.sessionId,
      data: body.data ?? {},
      timestamp: new Date().toISOString(),
    });
    return c.json(result);
  })

  // Hook approvals
  .get("/hooks/approvals", async (c) => {
    return c.json(getHookApprovals());
  })
  .post("/hooks/approvals/:id/approve", async (c) => {
    const id = c.req.param("id");
    const ok = approveHook(id);
    if (!ok) return c.json({ error: "Approval not found" }, 404);
    return c.json({ approved: true });
  })
  .post("/hooks/approvals/:id/reject", async (c) => {
    const id = c.req.param("id");
    const ok = rejectHook(id);
    if (!ok) return c.json({ error: "Approval not found" }, 404);
    return c.json({ rejected: true });
  });
