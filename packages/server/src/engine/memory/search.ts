import { db } from "@humancore/db";
import { memoryEntries, knowledgeNodes, knowledgeEdges } from "@humancore/db/schema";
import { eq, desc, like, or, and } from "drizzle-orm";
import { calculateDecayedImportance, boostOnRecall } from "./forgetting";

// ─── Hybrid Search Configuration ─────────────────────────────────────────────
//
// Score = (FTS * 0.3) + (Importance * 0.3) + (Recency * 0.2) + (Graph * 0.2)
//
// - FTS: Full-text keyword matching on title + summary + tags
// - Importance: Effective importance with Ebbinghaus decay
// - Recency: Exponential decay based on creation time
// - Graph: Bonus if memory shares entities with query terms

const WEIGHT_FTS = 0.3;
const WEIGHT_IMPORTANCE = 0.3;
const WEIGHT_RECENCY = 0.2;
const WEIGHT_GRAPH = 0.2;

// ─── FTS Scoring ─────────────────────────────────────────────────────────────

function computeFTSScore(query: string, memory: { title: string; summary: string; tags: string[] }): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (queryTerms.length === 0) return 0;

  const searchable = `${memory.title} ${memory.summary} ${(memory.tags ?? []).join(" ")}`.toLowerCase();
  let matches = 0;

  for (const term of queryTerms) {
    if (searchable.includes(term)) matches++;
    // Bonus for exact title match
    if (memory.title.toLowerCase().includes(term)) matches += 0.5;
  }

  return Math.min(1.0, matches / queryTerms.length);
}

// ─── Recency Scoring ─────────────────────────────────────────────────────────

function computeRecencyScore(createdAt: string): number {
  const now = new Date();
  const created = new Date(createdAt);
  const daysSince = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  // Exponential decay: half-score at 14 days
  return Math.exp(-daysSince / 14);
}

// ─── Graph Proximity Scoring ─────────────────────────────────────────────────

async function computeGraphScore(
  agentId: number,
  query: string,
  memoryTags: string[]
): Promise<number> {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (queryTerms.length === 0) return 0;

  // Find KG nodes that match query terms
  const allNodes = await db.select().from(knowledgeNodes)
    .where(eq(knowledgeNodes.agentId, agentId));

  const matchingNodes = allNodes.filter(node =>
    queryTerms.some(term => node.label.toLowerCase().includes(term))
  );

  if (matchingNodes.length === 0) return 0;

  // Check if memory tags overlap with graph entity types/labels
  const nodeLabels = new Set(matchingNodes.map(n => n.label.toLowerCase()));
  const tagOverlap = memoryTags.filter(t => nodeLabels.has(t.toLowerCase()));

  // Check graph connections
  const matchingNodeIds = matchingNodes.map(n => n.nodeId);
  const allEdges = await db.select().from(knowledgeEdges)
    .where(eq(knowledgeEdges.agentId, agentId));

  const connectedNodeIds = new Set<string>();
  for (const edge of allEdges) {
    if (matchingNodeIds.includes(edge.source)) connectedNodeIds.add(edge.target);
    if (matchingNodeIds.includes(edge.target)) connectedNodeIds.add(edge.source);
  }

  // Score based on tag overlap + connectivity
  const connectivityScore = connectedNodeIds.size > 0 ? 0.5 : 0;
  const tagScore = tagOverlap.length > 0 ? 0.5 : 0;

  return Math.min(1.0, connectivityScore + tagScore);
}

// ─── Main Hybrid Search ──────────────────────────────────────────────────────

export interface SearchResult {
  id: number;
  title: string;
  summary: string;
  type: string;
  mood: string;
  tags: string[];
  importance: number;
  effectiveImportance: number;
  recallCount: number;
  score: number;
  scores: {
    fts: number;
    importance: number;
    recency: number;
    graph: number;
  };
  createdAt: string;
}

export interface SearchOptions {
  agentId: number;
  query: string;
  type?: "episodic" | "semantic" | "procedural";
  minImportance?: number;
  limit?: number;
  boostOnRecall?: boolean;
}

/**
 * Hybrid memory search combining FTS + importance + recency + graph proximity.
 */
export async function hybridSearch(options: SearchOptions): Promise<SearchResult[]> {
  const { agentId, query, type, minImportance = 0, limit = 10, boostOnRecall: shouldBoost = true } = options;

  // Get all memories for the agent
  let allMemories = await db.select().from(memoryEntries)
    .where(eq(memoryEntries.agentId, agentId))
    .orderBy(desc(memoryEntries.createdAt));

  // Filter by type if specified
  if (type) {
    allMemories = allMemories.filter(m => m.type === type);
  }

  // Score each memory
  const scoredResults: SearchResult[] = [];

  for (const mem of allMemories) {
    // FTS score
    const ftsScore = computeFTSScore(query, {
      title: mem.title,
      summary: mem.summary,
      tags: mem.tags ?? [],
    });

    // Skip if no FTS match at all (unless query is empty = browse all)
    if (query.trim() && ftsScore === 0) continue;

    // Effective importance with decay
    const effectiveImportance = calculateDecayedImportance(
      mem.importance,
      mem.createdAt,
      mem.lastRecalledAt,
      mem.mood,
      mem.decayFactor
    );

    // Skip below minimum importance
    if (effectiveImportance < minImportance) continue;

    // Recency score
    const recencyScore = computeRecencyScore(mem.createdAt);

    // Graph proximity score
    const graphScore = await computeGraphScore(agentId, query, mem.tags ?? []);

    // Combined score
    const totalScore = query.trim()
      ? (ftsScore * WEIGHT_FTS) + (effectiveImportance * WEIGHT_IMPORTANCE) + (recencyScore * WEIGHT_RECENCY) + (graphScore * WEIGHT_GRAPH)
      : (effectiveImportance * 0.5) + (recencyScore * 0.3) + (graphScore * 0.2); // Browse mode

    scoredResults.push({
      id: mem.id,
      title: mem.title,
      summary: mem.summary,
      type: mem.type,
      mood: mem.mood,
      tags: mem.tags ?? [],
      importance: mem.importance,
      effectiveImportance,
      recallCount: mem.recallCount,
      score: Math.round(totalScore * 1000) / 1000,
      scores: {
        fts: Math.round(ftsScore * 1000) / 1000,
        importance: Math.round(effectiveImportance * 1000) / 1000,
        recency: Math.round(recencyScore * 1000) / 1000,
        graph: Math.round(graphScore * 1000) / 1000,
      },
      createdAt: mem.createdAt,
    });
  }

  // Sort by combined score
  scoredResults.sort((a, b) => b.score - a.score);

  // Take top N results
  const topResults = scoredResults.slice(0, limit);

  // Boost recall for returned results (Spacing Effect)
  if (shouldBoost) {
    for (const result of topResults) {
      await boostOnRecall(result.id);
    }
  }

  return topResults;
}

/**
 * Context-aware memory recall for injecting into system prompts.
 * Returns most relevant memories based on conversation context.
 */
export async function recallForContext(
  agentId: number,
  conversationContext: string,
  maxMemories: number = 5
): Promise<Array<{ title: string; summary: string; importance: number }>> {
  const results = await hybridSearch({
    agentId,
    query: conversationContext,
    limit: maxMemories,
    boostOnRecall: true,
  });

  return results.map(r => ({
    title: r.title,
    summary: r.summary,
    importance: r.effectiveImportance,
  }));
}
