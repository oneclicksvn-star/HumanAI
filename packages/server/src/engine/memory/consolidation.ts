import { db } from "@humancore/db";
import { consolidationJobs, agents } from "@humancore/db/schema";
import { eq, desc } from "drizzle-orm";
import { runEpisodicWorker } from "./episodic";
import { runSemanticWorker } from "./semantic";
import { runDreamingWorker } from "./dreaming";
import { applyGlobalDecay } from "./forgetting";

// ─── Consolidation Pipeline ──────────────────────────────────────────────────
//
// Full pipeline: Episodic → Semantic → Dreaming → Decay
//
// 1. Episodic: Extract memories from recent conversations
// 2. Semantic: Build knowledge graph from unconsolidated memories
// 3. Dreaming: Generate insights and personality evolution
// 4. Decay: Apply Ebbinghaus forgetting curve

export interface ConsolidationResult {
  jobId: number;
  status: "completed" | "failed";
  episodic: {
    memoriesCreated: number;
  };
  semantic: {
    entitiesExtracted: number;
    relationsCreated: number;
    memoriesMerged: number;
  };
  dreaming: {
    dreamsGenerated: number;
    personalityUpdates: Array<{ trait: string; direction: string }>;
    xpGranted: number;
  };
  decay: {
    totalProcessed: number;
    decayedBelow10: number;
  };
  durationMs: number;
  error?: string;
}

/**
 * Run the full memory consolidation pipeline for an agent.
 */
export async function runConsolidation(
  agentId: number,
  type: "episodic" | "semantic" | "dreaming" | "full" = "full"
): Promise<ConsolidationResult> {
  const startTime = Date.now();

  // Create job record
  const [job] = await db.insert(consolidationJobs).values({
    agentId,
    type,
    status: "running",
    startedAt: new Date().toISOString(),
  }).returning();

  const result: ConsolidationResult = {
    jobId: job.id,
    status: "completed",
    episodic: { memoriesCreated: 0 },
    semantic: { entitiesExtracted: 0, relationsCreated: 0, memoriesMerged: 0 },
    dreaming: { dreamsGenerated: 0, personalityUpdates: [], xpGranted: 0 },
    decay: { totalProcessed: 0, decayedBelow10: 0 },
    durationMs: 0,
  };

  try {
    // Step 1: Episodic Worker
    if (type === "full" || type === "episodic") {
      const episodicResult = await runEpisodicWorker(agentId, undefined, { forceAll: true });
      result.episodic.memoriesCreated = episodicResult.memoriesCreated;
    }

    // Step 2: Semantic Worker
    if (type === "full" || type === "semantic") {
      const semanticResult = await runSemanticWorker(agentId);
      result.semantic = semanticResult;
    }

    // Step 3: Dreaming Worker
    if (type === "full" || type === "dreaming") {
      const dreamingResult = await runDreamingWorker(agentId);
      result.dreaming = {
        dreamsGenerated: dreamingResult.dreamsGenerated,
        personalityUpdates: dreamingResult.personalityUpdates,
        xpGranted: dreamingResult.xpGranted,
      };
    }

    // Step 4: Apply global decay
    if (type === "full") {
      const decayResult = await applyGlobalDecay(agentId);
      result.decay = {
        totalProcessed: decayResult.totalProcessed,
        decayedBelow10: decayResult.decayedBelow10,
      };
    }

    // Update job
    await db.update(consolidationJobs).set({
      status: "completed",
      memoriesProcessed: result.episodic.memoriesCreated,
      entitiesExtracted: result.semantic.entitiesExtracted,
      dreamsGenerated: result.dreaming.dreamsGenerated,
      memoriesMerged: result.semantic.memoriesMerged,
      completedAt: new Date().toISOString(),
    }).where(eq(consolidationJobs.id, job.id));

    result.status = "completed";
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    result.status = "failed";
    result.error = errorMsg;

    await db.update(consolidationJobs).set({
      status: "failed",
      error: errorMsg,
      completedAt: new Date().toISOString(),
    }).where(eq(consolidationJobs.id, job.id));
  }

  result.durationMs = Date.now() - startTime;
  return result;
}

/**
 * Run consolidation for all active agents.
 */
export async function runConsolidationForAll(): Promise<ConsolidationResult[]> {
  const activeAgents = await db.select().from(agents)
    .where(eq(agents.status, "active"));

  const results: ConsolidationResult[] = [];
  for (const agent of activeAgents) {
    const result = await runConsolidation(agent.id, "full");
    results.push(result);
  }
  return results;
}

/**
 * Get consolidation history for an agent.
 */
export async function getConsolidationHistory(agentId: number, limit = 10) {
  return db.select().from(consolidationJobs)
    .where(eq(consolidationJobs.agentId, agentId))
    .orderBy(desc(consolidationJobs.createdAt))
    .limit(limit);
}
