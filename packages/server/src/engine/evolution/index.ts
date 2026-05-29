import { db } from "@humancore/db";
import { agents, memoryEntries, agentSkills, activityLog, sessions, messages } from "@humancore/db/schema";
import { eq, count } from "drizzle-orm";

// ─── Self-Evolution System ───────────────────────────────────────────────────
//
// Tracks agent metrics, generates improvement suggestions, and allows
// agents to evolve their own behavior over time.
//
// Components:
// 1. Metrics Tracking — conversations, tool usage, success rates
// 2. Suggestions Engine — auto-generate improvement suggestions
// 3. Commitment System — track promises/goals with deadlines
// 4. Level/Lifecycle — XP-based progression with stage transitions

// ─── Agent Metrics ───────────────────────────────────────────────────────────

export interface AgentMetrics {
  agentId: number;
  totalConversations: number;
  totalMessages: number;
  avgResponseQuality: number;
  toolUsageCount: number;
  toolSuccessRate: number;
  memoriesCreated: number;
  delegationsGiven: number;
  delegationsReceived: number;
  moodStability: number; // 0-1, higher = more stable
  skillCount: number;
  level: number;
  xp: number;
  lifecycle: string;
}

export async function getAgentMetrics(agentId: number): Promise<AgentMetrics> {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) throw new Error("Agent not found");

  // Count sessions
  const [sessionCount] = await db.select({ count: count() }).from(sessions).where(eq(sessions.agentId, agentId));

  // Count messages
  const [msgCount] = await db.select({ count: count() }).from(messages).where(eq(messages.sessionId, agentId));

  // Count memories
  const [memCount] = await db.select({ count: count() }).from(memoryEntries).where(eq(memoryEntries.agentId, agentId));

  // Count skills
  const [skillCount] = await db.select({ count: count() }).from(agentSkills).where(eq(agentSkills.agentId, agentId));

  // Activity counts
  const activities = await db.select().from(activityLog).where(eq(activityLog.agentId, agentId));
  const toolActivities = activities.filter(a => a.type === "tool");
  const toolSuccesses = toolActivities.filter(a => a.summary?.includes("success"));

  return {
    agentId,
    totalConversations: sessionCount?.count ?? 0,
    totalMessages: msgCount?.count ?? 0,
    avgResponseQuality: 0.75, // Would be computed from observation stage feedback
    toolUsageCount: toolActivities.length,
    toolSuccessRate: toolActivities.length > 0 ? toolSuccesses.length / toolActivities.length : 0,
    memoriesCreated: memCount?.count ?? 0,
    delegationsGiven: activities.filter(a => a.summary?.includes("delegat")).length,
    delegationsReceived: 0,
    moodStability: 0.8,
    skillCount: skillCount?.count ?? 0,
    level: agent.level ?? 1,
    xp: agent.xp ?? 0,
    lifecycle: agent.lifecycle ?? "infant",
  };
}

// ─── Improvement Suggestions ─────────────────────────────────────────────────

export interface Suggestion {
  id: string;
  agentId: number;
  type: "skill" | "personality" | "tool" | "workflow" | "memory";
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  actionable: boolean;
  createdAt: string;
  status: "pending" | "accepted" | "rejected" | "applied";
}

export async function generateSuggestions(agentId: number): Promise<Suggestion[]> {
  const metrics = await getAgentMetrics(agentId);
  const suggestions: Suggestion[] = [];

  // Low tool success rate → suggest learning
  if (metrics.toolUsageCount > 5 && metrics.toolSuccessRate < 0.7) {
    suggestions.push({
      id: `sug_${Date.now()}_tool`,
      agentId,
      type: "tool",
      title: "Improve tool usage accuracy",
      description: `Tool success rate is ${(metrics.toolSuccessRate * 100).toFixed(0)}%. Consider reviewing failed tool calls and adjusting approach.`,
      priority: "high",
      actionable: true,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  }

  // Few memories → suggest more memory creation
  if (metrics.totalMessages > 50 && metrics.memoriesCreated < 10) {
    suggestions.push({
      id: `sug_${Date.now()}_mem`,
      agentId,
      type: "memory",
      title: "Create more memories from conversations",
      description: `${metrics.totalMessages} messages but only ${metrics.memoriesCreated} memories stored. Important information may be getting lost.`,
      priority: "medium",
      actionable: true,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  }

  // Few skills → suggest skill development
  if (metrics.skillCount < 3 && metrics.level >= 2) {
    suggestions.push({
      id: `sug_${Date.now()}_skill`,
      agentId,
      type: "skill",
      title: "Develop new skills",
      description: `Agent is level ${metrics.level} but only has ${metrics.skillCount} skills. Consider developing new capabilities.`,
      priority: "medium",
      actionable: true,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  }

  // High message count → suggest personality evolution
  if (metrics.totalMessages > 200) {
    suggestions.push({
      id: `sug_${Date.now()}_pers`,
      agentId,
      type: "personality",
      title: "Review personality alignment",
      description: "Enough conversations have occurred to potentially refine personality traits based on user interaction patterns.",
      priority: "low",
      actionable: true,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  }

  // Lifecycle progression
  const nextLifecycle = getNextLifecycleStage(metrics.lifecycle, metrics.level);
  if (nextLifecycle) {
    suggestions.push({
      id: `sug_${Date.now()}_life`,
      agentId,
      type: "workflow",
      title: `Ready for lifecycle transition: ${metrics.lifecycle} → ${nextLifecycle}`,
      description: `Agent has reached level ${metrics.level} and is eligible for the next lifecycle stage.`,
      priority: "high",
      actionable: true,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
  }

  return suggestions;
}

// ─── Commitment System ───────────────────────────────────────────────────────

export interface Commitment {
  id: string;
  agentId: number;
  type: "promise" | "goal" | "check_in" | "deadline" | "open_loop";
  title: string;
  description: string;
  targetUserId?: string;
  deadline?: string;
  reminderSchedule?: string; // "every 1d", "every 7d"
  status: "active" | "completed" | "failed" | "expired";
  createdAt: string;
  completedAt?: string;
}

// In-memory store (in production, would be in DB)
const commitments: Commitment[] = [];

export function createCommitment(commitment: Omit<Commitment, "id" | "createdAt" | "status">): Commitment {
  const newCommitment: Commitment = {
    ...commitment,
    id: `commit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  commitments.push(newCommitment);
  return newCommitment;
}

export function getCommitments(agentId: number): Commitment[] {
  return commitments.filter(c => c.agentId === agentId);
}

export function getActiveCommitments(agentId: number): Commitment[] {
  return commitments.filter(c => c.agentId === agentId && c.status === "active");
}

export function completeCommitment(commitmentId: string): boolean {
  const c = commitments.find(x => x.id === commitmentId);
  if (c) { c.status = "completed"; c.completedAt = new Date().toISOString(); return true; }
  return false;
}

export function failCommitment(commitmentId: string): boolean {
  const c = commitments.find(x => x.id === commitmentId);
  if (c) { c.status = "failed"; return true; }
  return false;
}

export function checkExpiredCommitments(): Commitment[] {
  const now = new Date();
  const expired: Commitment[] = [];
  for (const c of commitments) {
    if (c.status === "active" && c.deadline && new Date(c.deadline) < now) {
      c.status = "expired";
      expired.push(c);
    }
  }
  return expired;
}

// ─── Level & Lifecycle ───────────────────────────────────────────────────────

const LIFECYCLE_STAGES = ["infant", "child", "teen", "adult", "expert", "mentor"] as const;
const LIFECYCLE_THRESHOLDS: Record<string, number> = {
  infant: 1,
  child: 3,
  teen: 7,
  adult: 15,
  expert: 30,
  mentor: 50,
};

function getNextLifecycleStage(current: string, level: number): string | null {
  const currentIndex = LIFECYCLE_STAGES.indexOf(current as typeof LIFECYCLE_STAGES[number]);
  if (currentIndex === -1 || currentIndex >= LIFECYCLE_STAGES.length - 1) return null;

  const nextStage = LIFECYCLE_STAGES[currentIndex + 1];
  const threshold = LIFECYCLE_THRESHOLDS[nextStage];
  if (level >= threshold) return nextStage;
  return null;
}

export async function evolveAgent(agentId: number): Promise<{
  evolved: boolean;
  fromStage?: string;
  toStage?: string;
  newLevel?: number;
}> {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) throw new Error("Agent not found");

  const nextStage = getNextLifecycleStage(agent.lifecycle ?? "infant", agent.level ?? 1);
  if (!nextStage) return { evolved: false };

  await db.update(agents).set({ lifecycle: nextStage }).where(eq(agents.id, agentId));

  await db.insert(activityLog).values({
    agentId,
    type: "evolution",
    summary: `Lifecycle: ${agent.lifecycle} → ${nextStage} (level ${agent.level})`,
  });

  return {
    evolved: true,
    fromStage: agent.lifecycle ?? "infant",
    toStage: nextStage,
    newLevel: agent.level ?? 1,
  };
}

export { LIFECYCLE_STAGES, LIFECYCLE_THRESHOLDS };
