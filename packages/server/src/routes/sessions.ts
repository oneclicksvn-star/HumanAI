import { Hono } from "hono";
import { db } from "@humancore/db";
import { sessions, messages, agents } from "@humancore/db/schema";
import { eq, desc, count } from "drizzle-orm";

export const sessionsRoutes = new Hono();

sessionsRoutes.get("/sessions", async (c) => {
  const rows = await db.select().from(sessions).orderBy(desc(sessions.updatedAt));
  // Get message counts
  const result = await Promise.all(rows.map(async (s) => {
    const [{ cnt }] = await db.select({ cnt: count() }).from(messages).where(eq(messages.sessionId, s.id));
    const [agent] = await db.select().from(agents).where(eq(agents.id, s.agentId));
    return { ...s, messageCount: cnt, agent: agent ?? null };
  }));
  return c.json(result);
});

sessionsRoutes.get("/sessions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
  if (!session) return c.json({ error: "Session not found" }, 404);
  const [agent] = await db.select().from(agents).where(eq(agents.id, session.agentId));
  const [{ cnt }] = await db.select({ cnt: count() }).from(messages).where(eq(messages.sessionId, id));
  return c.json({ ...session, messageCount: cnt, agent });
});

sessionsRoutes.post("/sessions", async (c) => {
  const body = await c.req.json();
  const [session] = await db.insert(sessions).values({
    agentId: body.agentId,
    title: body.title ?? "New Chat",
  }).returning();
  return c.json(session, 201);
});

sessionsRoutes.patch("/sessions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [session] = await db.update(sessions).set({
    ...body,
    updatedAt: new Date().toISOString(),
  }).where(eq(sessions.id, id)).returning();
  if (!session) return c.json({ error: "Session not found" }, 404);
  return c.json(session);
});

sessionsRoutes.delete("/sessions/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(sessions).where(eq(sessions.id, id));
  return c.body(null, 204);
});
