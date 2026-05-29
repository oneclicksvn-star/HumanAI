import { Hono } from "hono";
import { db } from "@humancore/db";
import { messages, sessions } from "@humancore/db/schema";
import { eq, asc } from "drizzle-orm";

export const messagesRoutes = new Hono();

messagesRoutes.get("/sessions/:sessionId/messages", async (c) => {
  const sessionId = Number(c.req.param("sessionId"));
  const rows = await db.select().from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));
  return c.json(rows);
});

messagesRoutes.post("/sessions/:sessionId/messages", async (c) => {
  const sessionId = Number(c.req.param("sessionId"));
  const body = await c.req.json();
  const [msg] = await db.insert(messages).values({
    sessionId,
    role: body.role ?? "user",
    content: body.content,
    mood: body.mood,
    thinking: body.thinking,
    toolCalls: body.toolCalls,
    moodShift: body.moodShift,
  }).returning();

  // Update session timestamp
  await db.update(sessions).set({ updatedAt: new Date().toISOString() }).where(eq(sessions.id, sessionId));

  return c.json(msg, 201);
});

messagesRoutes.delete("/messages/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(messages).where(eq(messages.id, id));
  return c.body(null, 204);
});
