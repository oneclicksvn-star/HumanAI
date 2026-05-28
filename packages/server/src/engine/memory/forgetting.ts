import { db } from "@humancore/db";
import { memoryEntries } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

// ─── Ebbinghaus Forgetting Curve ─────────────────────────────────────────────
//
// Formula: decayedImportance = baseImportance * e^(-t / halfLife)
//
// halfLife values:
// - Emotional memories: 60 days (decay slower)
// - Important memories (>= 0.7): 45 days
// - Normal memories: 30 days
// - Low importance (<= 0.3): 15 days
//
// Recall boost: When a memory is recalled, importance += 0.1 (cap at 1.0)
// The recall also resets the decay timer (lastRecalledAt)

const EMOTIONAL_MOODS = ["empathetic", "positive", "satisfied", "supportive"];

function getHalfLife(importance: number, mood: string): number {
  if (EMOTIONAL_MOODS.includes(mood)) return 60;
  if (importance >= 0.7) return 45;
  if (importance <= 0.3) return 15;
  return 30;
}

/**
 * Calculate decayed importance using Ebbinghaus forgetting curve.
 */
export function calculateDecayedImportance(
  baseImportance: number,
  createdAt: string,
  lastRecalledAt: string | null,
  mood: string,
  decayFactor: number
): number {
  const referenceTime = lastRecalledAt ? new Date(lastRecalledAt) : new Date(createdAt);
  const now = new Date();
  const daysSinceReference = (now.getTime() - referenceTime.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceReference <= 0) return baseImportance;

  const halfLife = getHalfLife(baseImportance, mood) * decayFactor;
  const decayed = baseImportance * Math.exp(-daysSinceReference / halfLife);

  // Floor at 5% — memories never fully disappear
  return Math.max(0.05, decayed);
}

/**
 * Boost memory importance on recall (Spacing Effect).
 * Called when a memory is retrieved during search or context injection.
 */
export async function boostOnRecall(memoryId: number): Promise<{ newImportance: number; recallCount: number }> {
  const [memory] = await db.select().from(memoryEntries).where(eq(memoryEntries.id, memoryId));
  if (!memory) return { newImportance: 0, recallCount: 0 };

  const newImportance = Math.min(1.0, memory.importance + 0.1);
  const newRecallCount = memory.recallCount + 1;

  await db.update(memoryEntries).set({
    importance: newImportance,
    recallCount: newRecallCount,
    lastRecalledAt: new Date().toISOString(),
    // Reduce decay factor on recall (memory strengthens)
    decayFactor: Math.max(0.3, memory.decayFactor - 0.05),
  }).where(eq(memoryEntries.id, memoryId));

  return { newImportance, recallCount: newRecallCount };
}

/**
 * Apply decay to all memories of an agent.
 * Run during consolidation to update effective importance.
 * Returns count of memories that decayed below threshold.
 */
export async function applyGlobalDecay(agentId: number): Promise<{
  totalProcessed: number;
  decayedBelow10: number;
  archived: number;
}> {
  const allMemories = await db.select().from(memoryEntries)
    .where(eq(memoryEntries.agentId, agentId));

  let totalProcessed = 0;
  let decayedBelow10 = 0;
  let archived = 0;

  for (const mem of allMemories) {
    const decayed = calculateDecayedImportance(
      mem.importance,
      mem.createdAt,
      mem.lastRecalledAt,
      mem.mood,
      mem.decayFactor
    );

    // Only update if decay changed significantly (> 0.01 difference)
    if (Math.abs(decayed - mem.importance) > 0.01) {
      await db.update(memoryEntries).set({ importance: decayed })
        .where(eq(memoryEntries.id, mem.id));
      totalProcessed++;

      if (decayed < 0.1) decayedBelow10++;
      if (decayed < 0.05) archived++;
    }
  }

  return { totalProcessed, decayedBelow10, archived };
}

/**
 * Get memories sorted by effective importance (with decay applied).
 * Useful for retrieving "strongest" memories.
 */
export function sortByEffectiveImportance(
  memories: Array<{
    id: number;
    importance: number;
    createdAt: string;
    lastRecalledAt: string | null;
    mood: string;
    decayFactor: number;
  }>
): Array<{ id: number; effectiveImportance: number }> {
  return memories
    .map(m => ({
      id: m.id,
      effectiveImportance: calculateDecayedImportance(
        m.importance,
        m.createdAt,
        m.lastRecalledAt,
        m.mood,
        m.decayFactor
      ),
    }))
    .sort((a, b) => b.effectiveImportance - a.effectiveImportance);
}
