import { Hono } from "hono";
import { db } from "@humancore/db";
import { agents, personality } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const agentsRoutes = new Hono();

agentsRoutes.get("/agents", async (c) => {
  const rows = await db.select().from(agents);
  return c.json(rows);
});

agentsRoutes.get("/agents/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  return c.json(agent);
});

agentsRoutes.post("/agents", async (c) => {
  const body = await c.req.json();
  const [agent] = await db.insert(agents).values({
    name: body.name ?? "New Agent",
    emoji: body.emoji ?? "🤖",
    nature: body.nature,
    purpose: body.purpose,
    vibe: body.vibe,
  }).returning();

  await db.insert(personality).values({ agentId: agent.id });
  return c.json(agent, 201);
});

agentsRoutes.patch("/agents/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [agent] = await db.update(agents).set({
    ...body,
    updatedAt: new Date().toISOString(),
  }).where(eq(agents.id, id)).returning();
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  return c.json(agent);
});

agentsRoutes.delete("/agents/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(agents).where(eq(agents.id, id));
  return c.body(null, 204);
});

// Personality
agentsRoutes.get("/agents/:id/personality", async (c) => {
  const agentId = Number(c.req.param("id"));
  let [p] = await db.select().from(personality).where(eq(personality.agentId, agentId));
  if (!p) {
    [p] = await db.insert(personality).values({ agentId }).returning();
  }
  return c.json(p);
});

agentsRoutes.patch("/agents/:id/personality", async (c) => {
  const agentId = Number(c.req.param("id"));
  const body = await c.req.json();
  const [existing] = await db.select().from(personality).where(eq(personality.agentId, agentId));
  let p;
  if (existing) {
    [p] = await db.update(personality).set(body).where(eq(personality.agentId, agentId)).returning();
  } else {
    [p] = await db.insert(personality).values({ agentId, ...body }).returning();
  }
  return c.json(p);
});

// Emotion state
agentsRoutes.get("/agents/:id/emotion", async (c) => {
  const agentId = Number(c.req.param("id"));
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  return c.json({
    agentId: agent.id,
    mood: agent.mood,
    moodLabel: agent.moodLabel,
    energy: agent.energy,
    stress: Math.max(0, 100 - agent.energy),
  });
});
