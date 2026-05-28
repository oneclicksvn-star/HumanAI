import { Hono } from "hono";
import { db } from "@humancore/db";
import { subAgentSpawns, delegations, agentLinks, agents } from "@humancore/db/schema";
import { eq, desc } from "drizzle-orm";
import { spawnSubAgent, terminateSubAgent, completeSubAgent, getAgentSpawns } from "../engine/spawn";
import { delegateTask, executeDelegation, getDelegations, findBestAgent } from "../engine/delegation";

export const spawnRoutes = new Hono();

// ─── Sub-Agent Spawns ────────────────────────────────────────────────────────

spawnRoutes.get("/agents/:id/spawns", async (c) => {
  const agentId = Number(c.req.param("id"));
  const spawns = await getAgentSpawns(agentId);
  return c.json(spawns);
});

spawnRoutes.post("/agents/:id/spawn", async (c) => {
  const parentAgentId = Number(c.req.param("id"));
  const body = await c.req.json();

  try {
    const result = await spawnSubAgent({
      parentAgentId,
      sessionId: body.sessionId,
      purpose: body.purpose,
      mode: body.mode,
      name: body.name,
      emoji: body.emoji,
      skills: body.skills,
    });
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Spawn failed" }, 400);
  }
});

spawnRoutes.post("/spawns/:id/terminate", async (c) => {
  const spawnId = Number(c.req.param("id"));
  try {
    const result = await terminateSubAgent(spawnId);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Terminate failed" }, 400);
  }
});

spawnRoutes.post("/spawns/:id/complete", async (c) => {
  const spawnId = Number(c.req.param("id"));
  const body = await c.req.json();
  try {
    const result = await completeSubAgent(spawnId, body.result ?? "");
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Complete failed" }, 400);
  }
});

// ─── Delegations ─────────────────────────────────────────────────────────────

spawnRoutes.get("/delegations", async (c) => {
  const agentId = c.req.query("agentId");
  const direction = (c.req.query("direction") ?? "all") as "from" | "to" | "all";

  if (agentId) {
    const results = await getDelegations(Number(agentId), direction);
    return c.json(results);
  }

  const rows = await db.select().from(delegations).orderBy(desc(delegations.createdAt));
  const enriched = await Promise.all(rows.map(async (d) => {
    const [from] = await db.select().from(agents).where(eq(agents.id, d.fromAgentId));
    const [to] = await db.select().from(agents).where(eq(agents.id, d.toAgentId));
    return {
      ...d,
      fromAgent: from ? { id: from.id, name: from.name, emoji: from.emoji } : null,
      toAgent: to ? { id: to.id, name: to.name, emoji: to.emoji } : null,
    };
  }));
  return c.json(enriched);
});

spawnRoutes.post("/delegations", async (c) => {
  const body = await c.req.json();
  try {
    const result = await delegateTask({
      fromAgentId: body.fromAgentId,
      toAgentId: body.toAgentId,
      sessionId: body.sessionId,
      taskDescription: body.taskDescription,
      context: body.context,
      priority: body.priority,
      autoExecute: body.autoExecute ?? false,
    });
    return c.json(result, 201);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Delegation failed" }, 400);
  }
});

spawnRoutes.post("/delegations/:id/execute", async (c) => {
  const delegationId = Number(c.req.param("id"));
  try {
    const result = await executeDelegation(delegationId);
    return c.json(result);
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : "Execution failed" }, 400);
  }
});

// ─── Agent Links ─────────────────────────────────────────────────────────────

spawnRoutes.get("/agent-links", async (c) => {
  const agentId = c.req.query("agentId");
  let rows;
  if (agentId) {
    const fromLinks = await db.select().from(agentLinks).where(eq(agentLinks.fromAgentId, Number(agentId)));
    const toLinks = await db.select().from(agentLinks).where(eq(agentLinks.toAgentId, Number(agentId)));
    rows = [...fromLinks, ...toLinks];
  } else {
    rows = await db.select().from(agentLinks);
  }

  const enriched = await Promise.all(rows.map(async (l) => {
    const [from] = await db.select().from(agents).where(eq(agents.id, l.fromAgentId));
    const [to] = await db.select().from(agents).where(eq(agents.id, l.toAgentId));
    return {
      ...l,
      fromAgent: from ? { id: from.id, name: from.name, emoji: from.emoji } : null,
      toAgent: to ? { id: to.id, name: to.name, emoji: to.emoji } : null,
    };
  }));
  return c.json(enriched);
});

// ─── Find best agent for task ────────────────────────────────────────────────

spawnRoutes.post("/agents/find-best", async (c) => {
  const body = await c.req.json();
  const agent = await findBestAgent(body.taskDescription, body.excludeAgentId);
  if (!agent) return c.json({ error: "No available agents" }, 404);
  return c.json(agent);
});
