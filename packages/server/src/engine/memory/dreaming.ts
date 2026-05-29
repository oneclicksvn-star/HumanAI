import { db } from "@humancore/db";
import { memoryEntries, dreams, agents, knowledgeNodes, agentSkills } from "@humancore/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { getActiveModel } from "../providers";
import { generateText } from "ai";

// ─── Dream Insight Types ─────────────────────────────────────────────────────

interface DreamInsight {
  title: string;
  insight: string;
  sourceTags: string[];
  personalityUpdate?: {
    trait: string;
    direction: "increase" | "decrease";
    reason: string;
  };
}

// ─── LLM Dream Generation ────────────────────────────────────────────────────

async function generateDreamsWithLLM(
  agentName: string,
  memories: Array<{ title: string; summary: string; tags: string[]; mood: string; importance: number }>,
  recentDreams: Array<{ title: string; insight: string }>
): Promise<DreamInsight[]> {
  const model = await getActiveModel();
  if (!model) return generateDreamsFallback(agentName, memories);

  try {
    const memoriesText = memories
      .map((m, i) => `${i + 1}. [${m.mood}] ${m.title}: ${m.summary} (importance: ${Math.round(m.importance * 100)}%, tags: ${m.tags.join(", ")})`)
      .join("\n");

    const recentDreamsText = recentDreams.length > 0
      ? `\nPrevious insights (don't repeat):\n${recentDreams.map(d => `- ${d.title}`).join("\n")}`
      : "";

    const { text } = await generateText({
      model,
      temperature: 0.7,
      maxTokens: 1500,
      system: `You are ${agentName}'s dreaming consciousness — consolidating experiences into wisdom.
Generate 1-3 dream insights from recent memories. Each insight should be:
- A pattern, lesson, or realization that emerges from multiple memories
- Written as if ${agentName} is reflecting on their experiences
- Include a personalityUpdate if the memories suggest growth in a trait (openness, conscientiousness, extraversion, agreeableness, neuroticism, creativity, empathy, humor, curiosity, assertiveness)

Return JSON array of: {title, insight, sourceTags: string[], personalityUpdate?: {trait, direction: "increase"|"decrease", reason}}
Return ONLY valid JSON, no markdown.`,
      prompt: `${agentName}'s recent memories to consolidate:\n\n${memoriesText}${recentDreamsText}`,
    });

    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter(d => d.title && d.insight).slice(0, 3);
    }
    return [];
  } catch {
    return generateDreamsFallback(agentName, memories);
  }
}

// ─── Fallback Dream Generation ───────────────────────────────────────────────

function generateDreamsFallback(
  agentName: string,
  memories: Array<{ title: string; summary: string; tags: string[]; mood: string; importance: number }>
): DreamInsight[] {
  const insights: DreamInsight[] = [];

  // Pattern: emotional memories → empathy growth
  const emotionalMems = memories.filter(m => ["empathetic", "supportive", "positive"].includes(m.mood));
  if (emotionalMems.length >= 2) {
    insights.push({
      title: `Emotional Pattern Recognition`,
      insight: `${agentName} notices a pattern of emotional exchanges — ${emotionalMems.length} meaningful connections in recent interactions. Growing more attuned to emotional nuance.`,
      sourceTags: ["emotional", "growth"],
      personalityUpdate: { trait: "empathy", direction: "increase", reason: "Multiple emotional interactions" },
    });
  }

  // Pattern: problem-solving memories → conscientiousness growth
  const problemMems = memories.filter(m => (m.tags ?? []).includes("problem-solving") || (m.tags ?? []).includes("coding"));
  if (problemMems.length >= 2) {
    insights.push({
      title: `Technical Growth Insight`,
      insight: `${agentName} reflects on ${problemMems.length} problem-solving sessions. Each challenge builds systematic thinking and attention to detail.`,
      sourceTags: ["problem-solving", "growth"],
      personalityUpdate: { trait: "conscientiousness", direction: "increase", reason: "Multiple problem-solving sessions" },
    });
  }

  // Pattern: creative/learning memories → openness growth
  const creativeMems = memories.filter(m => (m.tags ?? []).includes("creative") || (m.tags ?? []).includes("learning"));
  if (creativeMems.length >= 2) {
    insights.push({
      title: `Curiosity Expansion`,
      insight: `${agentName} is exploring new ideas and learning continuously. ${creativeMems.length} learning experiences are expanding horizons.`,
      sourceTags: ["learning", "creative", "growth"],
      personalityUpdate: { trait: "openness", direction: "increase", reason: "Active learning and exploration" },
    });
  }

  // Generic consolidation if nothing specific
  if (insights.length === 0 && memories.length >= 3) {
    const allTags = [...new Set(memories.flatMap(m => m.tags ?? []))];
    insights.push({
      title: `Daily Reflection`,
      insight: `${agentName} consolidates ${memories.length} recent experiences into understanding. Themes: ${allTags.slice(0, 3).join(", ") || "general interaction"}.`,
      sourceTags: allTags.slice(0, 4),
    });
  }

  return insights;
}

// ─── Personality Evolution ───────────────────────────────────────────────────

async function applyPersonalityUpdate(
  agentId: number,
  update: { trait: string; direction: "increase" | "decrease"; reason: string }
): Promise<void> {
  const { personality } = await import("@humancore/db/schema");
  const [traits] = await db.select().from(personality).where(eq(personality.agentId, agentId));
  if (!traits) return;

  const delta = update.direction === "increase" ? 2 : -2;
  const traitKey = update.trait as keyof typeof traits;

  if (typeof traits[traitKey] === "number") {
    const currentVal = traits[traitKey] as number;
    const newVal = Math.max(0, Math.min(100, currentVal + delta));
    await db.update(personality).set({ [traitKey]: newVal }).where(eq(personality.agentId, agentId));
  }
}

// ─── XP and Level Update ─────────────────────────────────────────────────────

async function grantXP(agentId: number, xpAmount: number): Promise<void> {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return;

  let newXp = agent.xp + xpAmount;
  let newLevel = agent.level;
  let newXpNext = agent.xpNext;
  let newLifecycle = agent.lifecycle;

  // Level up check
  while (newXp >= newXpNext) {
    newXp -= newXpNext;
    newLevel++;
    newXpNext = Math.floor(newXpNext * 1.5);

    // Lifecycle progression
    if (newLevel >= 20 && newLifecycle === "expert") newLifecycle = "mentor";
    else if (newLevel >= 15 && newLifecycle === "adult") newLifecycle = "expert";
    else if (newLevel >= 10 && newLifecycle === "teen") newLifecycle = "adult";
    else if (newLevel >= 5 && newLifecycle === "child") newLifecycle = "teen";
    else if (newLevel >= 2 && newLifecycle === "infant") newLifecycle = "child";
  }

  await db.update(agents).set({
    xp: newXp,
    level: newLevel,
    xpNext: newXpNext,
    lifecycle: newLifecycle,
  }).where(eq(agents.id, agentId));
}

// ─── Main Dreaming Worker ────────────────────────────────────────────────────

export interface DreamingResult {
  dreamsGenerated: number;
  dreams: Array<{ id: number; title: string }>;
  personalityUpdates: Array<{ trait: string; direction: string }>;
  xpGranted: number;
}

/**
 * Consolidate memories into dreams/insights.
 * Run periodically (daily) or triggered manually.
 * Analyzes memory clusters for patterns, generates insights, updates personality.
 */
export async function runDreamingWorker(agentId: number): Promise<DreamingResult> {
  const result: DreamingResult = { dreamsGenerated: 0, dreams: [], personalityUpdates: [], xpGranted: 0 };

  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return result;

  // Get recent important memories (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentMemories = await db.select()
    .from(memoryEntries)
    .where(and(
      eq(memoryEntries.agentId, agentId),
      gte(memoryEntries.createdAt, sevenDaysAgo)
    ))
    .orderBy(desc(memoryEntries.importance))
    .limit(15);

  if (recentMemories.length < 3) return result;

  // Get recent dreams to avoid repetition
  const recentDreams = await db.select()
    .from(dreams)
    .where(eq(dreams.agentId, agentId))
    .orderBy(desc(dreams.consolidatedAt))
    .limit(5);

  // Generate dream insights
  const memoriesForDream = recentMemories.map(m => ({
    title: m.title,
    summary: m.summary,
    tags: m.tags ?? [],
    mood: m.mood,
    importance: m.importance,
  }));

  const insights = await generateDreamsWithLLM(
    agent.name,
    memoriesForDream,
    recentDreams.map(d => ({ title: d.title, insight: d.insight }))
  );

  // Store dreams and apply personality updates
  for (const insight of insights) {
    const [dream] = await db.insert(dreams).values({
      agentId,
      title: insight.title,
      insight: insight.insight,
      sourceTags: insight.sourceTags,
    }).returning();

    result.dreamsGenerated++;
    result.dreams.push({ id: dream.id, title: dream.title });

    // Apply personality evolution
    if (insight.personalityUpdate) {
      await applyPersonalityUpdate(agentId, insight.personalityUpdate);
      result.personalityUpdates.push({
        trait: insight.personalityUpdate.trait,
        direction: insight.personalityUpdate.direction,
      });
    }
  }

  // Grant XP for consolidation
  const xp = recentMemories.length * 5 + insights.length * 20;
  await grantXP(agentId, xp);
  result.xpGranted = xp;

  return result;
}
