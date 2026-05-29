import { Hono } from "hono";
import { db } from "@humancore/db";
import { memoryEntries, knowledgeNodes, knowledgeEdges, agentSkills, dreams, consolidationJobs } from "@humancore/db/schema";
import { eq, desc } from "drizzle-orm";
import { calculateDecayedImportance } from "../engine/memory";

export const memoryRoutes = new Hono();

// Memory entries (with effective importance via Ebbinghaus decay)
memoryRoutes.get("/memory", async (c) => {
  const agentId = c.req.query("agentId");
  const type = c.req.query("type");
  let query = db.select().from(memoryEntries).orderBy(desc(memoryEntries.createdAt)).$dynamic();
  if (agentId) query = query.where(eq(memoryEntries.agentId, Number(agentId)));
  const rows = await query;
  const filtered = type ? rows.filter(r => r.type === type) : rows;

  // Attach effective importance with decay
  const withDecay = filtered.map(m => ({
    ...m,
    effectiveImportance: Math.round(calculateDecayedImportance(
      m.importance,
      m.createdAt,
      m.lastRecalledAt,
      m.mood,
      m.decayFactor
    ) * 100) / 100,
  }));

  return c.json(withDecay);
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

// Consolidation jobs
memoryRoutes.get("/consolidation-jobs", async (c) => {
  const agentId = c.req.query("agentId");
  const query = agentId
    ? db.select().from(consolidationJobs).where(eq(consolidationJobs.agentId, Number(agentId))).orderBy(desc(consolidationJobs.createdAt))
    : db.select().from(consolidationJobs).orderBy(desc(consolidationJobs.createdAt));
  return c.json(await query);
});
