import { db } from "@humancore/db";
import { agents, delegations, agentLinks, sessions, messages, activityLog } from "@humancore/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getActiveModel } from "./providers";
import { buildSystemPrompt } from "./prompts";
import { generateText } from "ai";

export interface DelegateOptions {
  fromAgentId: number;
  toAgentId: number;
  sessionId?: number;
  taskDescription: string;
  context?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  autoExecute?: boolean;
}

export async function delegateTask(opts: DelegateOptions) {
  const [fromAgent] = await db.select().from(agents).where(eq(agents.id, opts.fromAgentId));
  const [toAgent] = await db.select().from(agents).where(eq(agents.id, opts.toAgentId));

  if (!fromAgent) throw new Error("Source agent not found");
  if (!toAgent) throw new Error("Target agent not found");
  if (toAgent.status !== "active") throw new Error(`Agent ${toAgent.name} is not active`);

  // Create delegation record
  const [delegation] = await db.insert(delegations).values({
    fromAgentId: opts.fromAgentId,
    toAgentId: opts.toAgentId,
    sessionId: opts.sessionId ?? null,
    taskDescription: opts.taskDescription,
    context: opts.context ?? null,
    priority: opts.priority ?? "medium",
    status: "pending",
  }).returning();

  // Ensure agent link exists
  const existingLinks = await db.select().from(agentLinks)
    .where(and(
      eq(agentLinks.fromAgentId, opts.fromAgentId),
      eq(agentLinks.toAgentId, opts.toAgentId),
    ));

  if (existingLinks.length === 0) {
    await db.insert(agentLinks).values({
      fromAgentId: opts.fromAgentId,
      toAgentId: opts.toAgentId,
      type: "delegation",
    });
  }

  // Log activity
  await db.insert(activityLog).values({
    agentId: opts.fromAgentId,
    type: "delegation",
    summary: `${fromAgent.name} delegated to ${toAgent.name}: ${opts.taskDescription}`,
    metadata: { delegationId: delegation.id, toAgentId: opts.toAgentId, priority: opts.priority },
  });

  // Auto-execute if requested
  if (opts.autoExecute) {
    return await executeDelegation(delegation.id);
  }

  return {
    delegation,
    fromAgent: { id: fromAgent.id, name: fromAgent.name, emoji: fromAgent.emoji },
    toAgent: { id: toAgent.id, name: toAgent.name, emoji: toAgent.emoji },
  };
}

export async function executeDelegation(delegationId: number) {
  const [delegation] = await db.select().from(delegations).where(eq(delegations.id, delegationId));
  if (!delegation) throw new Error("Delegation not found");

  // Update status
  await db.update(delegations).set({
    status: "in_progress",
    startedAt: new Date().toISOString(),
  }).where(eq(delegations.id, delegationId));

  const [toAgent] = await db.select().from(agents).where(eq(agents.id, delegation.toAgentId));
  const [fromAgent] = await db.select().from(agents).where(eq(agents.id, delegation.fromAgentId));
  if (!toAgent || !fromAgent) throw new Error("Agent not found");

  // Create or find a session for the target agent
  let [targetSession] = await db.select().from(sessions)
    .where(eq(sessions.agentId, delegation.toAgentId))
    .orderBy(desc(sessions.createdAt))
    .limit(1);

  if (!targetSession) {
    [targetSession] = await db.insert(sessions).values({
      agentId: delegation.toAgentId,
      title: `[Delegation] ${delegation.taskDescription.slice(0, 50)}`,
    }).returning();
  }

  // Try to use LLM for the delegated task
  const activeModel = await getActiveModel();
  let result: string;

  if (activeModel) {
    const systemPrompt = await buildSystemPrompt(toAgent.id);
    const delegationPrompt = `You received a delegation from ${fromAgent.name} (${fromAgent.emoji}).

Task: ${delegation.taskDescription}
${delegation.context ? `Context: ${delegation.context}` : ""}
Priority: ${delegation.priority}

Complete this task thoroughly and report your findings.`;

    try {
      const response = await generateText({
        model: activeModel.model,
        system: systemPrompt,
        messages: [{ role: "user", content: delegationPrompt }],
        maxTokens: 2048,
      });
      result = response.text;
    } catch (err) {
      result = `[Error executing delegation: ${err instanceof Error ? err.message : "Unknown error"}]`;
    }
  } else {
    result = `[${toAgent.name}] Task acknowledged: "${delegation.taskDescription}"\n\nAnalysis complete. Results would appear here with a configured LLM provider.\n\n*[Mock execution — configure a provider in Settings for real delegation]*`;
  }

  // Save result message in target agent's session
  await db.insert(messages).values({
    sessionId: targetSession.id,
    role: "system",
    content: `📨 Delegation from ${fromAgent.name}: ${delegation.taskDescription}`,
  });

  await db.insert(messages).values({
    sessionId: targetSession.id,
    role: "agent",
    content: result,
    mood: toAgent.mood,
  });

  // Update delegation status
  await db.update(delegations).set({
    status: "completed",
    result,
    completedAt: new Date().toISOString(),
  }).where(eq(delegations.id, delegationId));

  // Notify in original session if exists
  if (delegation.sessionId) {
    await db.insert(messages).values({
      sessionId: delegation.sessionId,
      role: "system",
      content: `📬 Delegation result from ${toAgent.name} (${toAgent.emoji}):\n\n${result}`,
    });
  }

  // Log activity
  await db.insert(activityLog).values({
    agentId: delegation.toAgentId,
    type: "delegation_complete",
    summary: `${toAgent.name} completed delegation from ${fromAgent.name}`,
    metadata: { delegationId, resultPreview: result.slice(0, 200) },
  });

  return {
    delegation: { ...delegation, status: "completed", result },
    fromAgent: { id: fromAgent.id, name: fromAgent.name, emoji: fromAgent.emoji },
    toAgent: { id: toAgent.id, name: toAgent.name, emoji: toAgent.emoji },
  };
}

export async function getDelegations(agentId: number, direction: "from" | "to" | "all" = "all") {
  let rows;
  if (direction === "from") {
    rows = await db.select().from(delegations).where(eq(delegations.fromAgentId, agentId)).orderBy(desc(delegations.createdAt));
  } else if (direction === "to") {
    rows = await db.select().from(delegations).where(eq(delegations.toAgentId, agentId)).orderBy(desc(delegations.createdAt));
  } else {
    const fromRows = await db.select().from(delegations).where(eq(delegations.fromAgentId, agentId));
    const toRows = await db.select().from(delegations).where(eq(delegations.toAgentId, agentId));
    rows = [...fromRows, ...toRows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // Attach agent info
  return Promise.all(rows.map(async (d) => {
    const [from] = await db.select().from(agents).where(eq(agents.id, d.fromAgentId));
    const [to] = await db.select().from(agents).where(eq(agents.id, d.toAgentId));
    return {
      ...d,
      fromAgent: from ? { id: from.id, name: from.name, emoji: from.emoji } : null,
      toAgent: to ? { id: to.id, name: to.name, emoji: to.emoji } : null,
    };
  }));
}

export async function findBestAgent(taskDescription: string, excludeAgentId?: number) {
  const allAgents = await db.select().from(agents);
  const available = allAgents.filter(a =>
    a.status === "active" && a.id !== excludeAgentId
  );

  if (available.length === 0) return null;

  const lower = taskDescription.toLowerCase();
  const scored = available.map(a => {
    let score = 0;
    const skills = a.skills ?? [];
    for (const skill of skills) {
      if (lower.includes(skill.toLowerCase())) score += 10;
    }
    if (a.nature && lower.includes(a.nature.toLowerCase())) score += 5;
    if (a.purpose && lower.includes(a.purpose.toLowerCase())) score += 5;
    if (a.lifecycle === "expert" || a.lifecycle === "mentor") score += 3;
    if (a.energy > 50) score += 2;
    return { agent: a, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.agent ?? available[0];
}
