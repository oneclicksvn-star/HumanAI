import { db } from "@humancore/db";
import { agents, personality, sessions, subAgentSpawns, agentLinks, activityLog } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

const MAX_SPAWN_DEPTH = 3;
const MAX_CHILDREN_PER_AGENT = 8;

export interface SpawnOptions {
  parentAgentId: number;
  sessionId?: number;
  purpose: string;
  mode?: "isolated" | "fork" | "shared";
  name?: string;
  emoji?: string;
  skills?: string[];
}

export async function spawnSubAgent(opts: SpawnOptions) {
  const [parent] = await db.select().from(agents).where(eq(agents.id, opts.parentAgentId));
  if (!parent) throw new Error("Parent agent not found");

  // Check spawn depth
  const existingSpawns = await db.select().from(subAgentSpawns)
    .where(eq(subAgentSpawns.parentAgentId, opts.parentAgentId));
  const activeSpawns = existingSpawns.filter(s => s.status === "active");

  if (activeSpawns.length >= MAX_CHILDREN_PER_AGENT) {
    throw new Error(`Max children reached (${MAX_CHILDREN_PER_AGENT})`);
  }

  // Check depth limit
  const parentSpawn = await db.select().from(subAgentSpawns)
    .where(eq(subAgentSpawns.childAgentId, opts.parentAgentId));
  const currentDepth = parentSpawn[0]?.depth ?? 0;
  if (currentDepth + 1 > MAX_SPAWN_DEPTH) {
    throw new Error(`Max spawn depth reached (${MAX_SPAWN_DEPTH})`);
  }

  // Create child agent
  const childName = opts.name ?? `${parent.name}-sub-${activeSpawns.length + 1}`;
  const [child] = await db.insert(agents).values({
    name: childName,
    emoji: opts.emoji ?? "🔧",
    nature: `Sub-agent of ${parent.name}`,
    purpose: opts.purpose,
    vibe: parent.vibe,
    status: "active",
    lifecycle: "infant",
    skills: opts.skills ?? [],
    systemPrompt: `You are a sub-agent spawned by ${parent.name} (${parent.emoji}).
Your specific task: ${opts.purpose}
Mode: ${opts.mode ?? "isolated"}
Report your findings back concisely.`,
  }).returning();

  // Fork personality from parent if mode is fork/shared
  if (opts.mode === "fork" || opts.mode === "shared") {
    const [parentPersonality] = await db.select().from(personality)
      .where(eq(personality.agentId, opts.parentAgentId));
    if (parentPersonality) {
      const { id: _, agentId: __, ...traits } = parentPersonality;
      await db.insert(personality).values({ agentId: child.id, ...traits });
    }
  } else {
    await db.insert(personality).values({ agentId: child.id });
  }

  // Create spawn record
  const [spawn] = await db.insert(subAgentSpawns).values({
    parentAgentId: opts.parentAgentId,
    childAgentId: child.id,
    sessionId: opts.sessionId ?? null,
    purpose: opts.purpose,
    mode: opts.mode ?? "isolated",
    depth: currentDepth + 1,
  }).returning();

  // Create agent link
  await db.insert(agentLinks).values({
    fromAgentId: opts.parentAgentId,
    toAgentId: child.id,
    type: "supervision",
  });

  // Create session for sub-agent
  const [childSession] = await db.insert(sessions).values({
    agentId: child.id,
    title: `[Sub] ${opts.purpose}`,
  }).returning();

  // Log activity
  await db.insert(activityLog).values({
    agentId: opts.parentAgentId,
    type: "spawn",
    summary: `${parent.name} spawned sub-agent "${childName}" for: ${opts.purpose}`,
    metadata: { childId: child.id, mode: opts.mode ?? "isolated", depth: currentDepth + 1 },
  });

  return { agent: child, spawn, session: childSession };
}

export async function terminateSubAgent(spawnId: number) {
  const [spawn] = await db.select().from(subAgentSpawns).where(eq(subAgentSpawns.id, spawnId));
  if (!spawn) throw new Error("Spawn not found");

  await db.update(subAgentSpawns).set({
    status: "terminated",
    completedAt: new Date().toISOString(),
  }).where(eq(subAgentSpawns.id, spawnId));

  await db.update(agents).set({ status: "archived" }).where(eq(agents.id, spawn.childAgentId));

  return spawn;
}

export async function completeSubAgent(spawnId: number, result: string) {
  const [spawn] = await db.select().from(subAgentSpawns).where(eq(subAgentSpawns.id, spawnId));
  if (!spawn) throw new Error("Spawn not found");

  await db.update(subAgentSpawns).set({
    status: "completed",
    result,
    completedAt: new Date().toISOString(),
  }).where(eq(subAgentSpawns.id, spawnId));

  await db.update(agents).set({ status: "archived" }).where(eq(agents.id, spawn.childAgentId));

  // Log activity
  const [parent] = await db.select().from(agents).where(eq(agents.id, spawn.parentAgentId));
  if (parent) {
    await db.insert(activityLog).values({
      agentId: parent.id,
      type: "spawn_complete",
      summary: `Sub-agent completed task: ${spawn.purpose}`,
      metadata: { spawnId, result: result.slice(0, 200) },
    });
  }

  return { spawn, result };
}

export async function getAgentSpawns(agentId: number) {
  const spawns = await db.select().from(subAgentSpawns)
    .where(eq(subAgentSpawns.parentAgentId, agentId));

  const childIds = spawns.map(s => s.childAgentId);
  const children = childIds.length > 0
    ? await Promise.all(childIds.map(id => db.select().from(agents).where(eq(agents.id, id)).then(r => r[0])))
    : [];

  return spawns.map((s, i) => ({
    ...s,
    childAgent: children[i] ?? null,
  }));
}
