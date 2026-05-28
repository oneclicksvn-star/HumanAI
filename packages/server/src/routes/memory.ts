import { Hono } from "hono";
import { db } from "@humancore/db";
import { memoryEntries, knowledgeNodes, knowledgeEdges, agentSkills, dreams } from "@humancore/db/schema";
import { eq, desc, like } from "drizzle-orm";

export const memoryRoutes = new Hono();

// Memory entries
memoryRoutes.get("/memory", async (c) => {
  const agentId = c.req.query("agentId");
  const type = c.req.query("type");
  let query = db.select().from(memoryEntries).orderBy(desc(memoryEntries.createdAt)).$dynamic();
  if (agentId) query = query.where(eq(memoryEntries.agentId, Number(agentId)));
  const rows = await query;
  return c.json(type ? rows.filter(r => r.type === type) : rows);
});

memoryRoutes.post("/memory", async (c) => {
  const body = await c.req.json();
  const [entry] = await db.insert(memoryEntries).values({
    agentId: body.agentId,
    title: body.title,
    summary: body.summary,
    type: body.type ?? "episodic",
    mood: body.mood ?? "neutral",
    tags: body.tags ?? [],
    importance: body.importance ?? 0.5,
  }).returning();
  return c.json(entry, 201);
});

memoryRoutes.delete("/memory/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(memoryEntries).where(eq(memoryEntries.id, id));
  return c.body(null, 204);
});

// Knowledge graph
memoryRoutes.get("/knowledge-graph", async (c) => {
  const agentId = c.req.query("agentId");
  const nodesQuery = agentId
    ? db.select().from(knowledgeNodes).where(eq(knowledgeNodes.agentId, Number(agentId)))
    : db.select().from(knowledgeNodes);
  const edgesQuery = agentId
    ? db.select().from(knowledgeEdges).where(eq(knowledgeEdges.agentId, Number(agentId)))
    : db.select().from(knowledgeEdges);
  const [nodes, edges] = await Promise.all([nodesQuery, edgesQuery]);
  return c.json({ nodes, edges });
});

// Skills
memoryRoutes.get("/skills", async (c) => {
  const agentId = c.req.query("agentId");
  const query = agentId
    ? db.select().from(agentSkills).where(eq(agentSkills.agentId, Number(agentId)))
    : db.select().from(agentSkills);
  return c.json(await query);
});

// Dreams
memoryRoutes.get("/dreams", async (c) => {
  const agentId = c.req.query("agentId");
  const query = agentId
    ? db.select().from(dreams).where(eq(dreams.agentId, Number(agentId))).orderBy(desc(dreams.consolidatedAt))
    : db.select().from(dreams).orderBy(desc(dreams.consolidatedAt));
  return c.json(await query);
});
