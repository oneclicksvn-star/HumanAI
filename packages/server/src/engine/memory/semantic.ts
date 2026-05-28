import { db } from "@humancore/db";
import { memoryEntries, knowledgeNodes, knowledgeEdges } from "@humancore/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getActiveModel } from "../providers";
import { generateText } from "ai";

// ─── Entity Types ────────────────────────────────────────────────────────────

const ENTITY_TYPES = ["person", "concept", "tool", "skill", "place", "event", "topic", "emotion"] as const;
type EntityType = typeof ENTITY_TYPES[number];

interface ExtractedEntity {
  label: string;
  type: EntityType;
  confidence: number;
}

interface ExtractedRelation {
  source: string;
  target: string;
  relation: string;
  weight: number;
}

// ─── LLM Entity Extraction ───────────────────────────────────────────────────

async function extractEntitiesWithLLM(
  memories: Array<{ title: string; summary: string; tags: string[] }>
): Promise<{ entities: ExtractedEntity[]; relations: ExtractedRelation[] }> {
  const model = await getActiveModel();
  if (!model) return extractEntitiesFallback(memories);

  try {
    const memoriesText = memories
      .map((m, i) => `${i + 1}. [${m.title}] ${m.summary} (tags: ${m.tags.join(", ")})`)
      .join("\n");

    const { text } = await generateText({
      model,
      temperature: 0.2,
      maxTokens: 1500,
      system: `You are a knowledge graph extraction system. Extract entities and relationships from memories.
Return JSON with two arrays:
- entities: [{label, type, confidence}] where type is one of: person, concept, tool, skill, place, event, topic, emotion
- relations: [{source, target, relation, weight}] where source/target are entity labels and relation describes the connection
Extract 3-8 entities and 2-6 relations. Focus on meaningful connections.
Return ONLY valid JSON, no markdown.`,
      prompt: `Extract knowledge graph from these memories:\n\n${memoriesText}`,
    });

    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      entities: (parsed.entities || []).filter((e: ExtractedEntity) => e.label && e.type),
      relations: (parsed.relations || []).filter((r: ExtractedRelation) => r.source && r.target && r.relation),
    };
  } catch {
    return extractEntitiesFallback(memories);
  }
}

// ─── Fallback Entity Extraction ──────────────────────────────────────────────

function extractEntitiesFallback(
  memories: Array<{ title: string; summary: string; tags: string[] }>
): { entities: ExtractedEntity[]; relations: ExtractedRelation[] } {
  const entities: ExtractedEntity[] = [];
  const relations: ExtractedRelation[] = [];
  const seenLabels = new Set<string>();

  for (const mem of memories) {
    const combined = `${mem.title} ${mem.summary}`;

    // Extract topics from tags
    for (const tag of mem.tags) {
      if (!seenLabels.has(tag)) {
        entities.push({ label: tag, type: "topic", confidence: 0.7 });
        seenLabels.add(tag);
      }
    }

    // Extract capitalized words as potential entities (person/concept)
    const capitalWords = combined.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) || [];
    for (const word of capitalWords) {
      if (word.length > 2 && !seenLabels.has(word.toLowerCase())) {
        entities.push({ label: word, type: "concept", confidence: 0.5 });
        seenLabels.add(word.toLowerCase());
      }
    }

    // Extract tool/technology mentions
    const toolPatterns = combined.match(/\b(?:React|TypeScript|Python|JavaScript|SQL|API|Docker|Git|Node|Bun|Hono|SQLite|AI|LLM)\b/gi) || [];
    for (const tool of toolPatterns) {
      const normalized = tool.charAt(0).toUpperCase() + tool.slice(1).toLowerCase();
      if (!seenLabels.has(normalized.toLowerCase())) {
        entities.push({ label: normalized, type: "tool", confidence: 0.8 });
        seenLabels.add(normalized.toLowerCase());
      }
    }
  }

  // Create relations between co-occurring entities
  if (entities.length >= 2) {
    for (let i = 0; i < Math.min(entities.length - 1, 4); i++) {
      relations.push({
        source: entities[i].label,
        target: entities[i + 1].label,
        relation: "related_to",
        weight: 0.6,
      });
    }
  }

  return { entities: entities.slice(0, 10), relations: relations.slice(0, 6) };
}

// ─── Deduplication ───────────────────────────────────────────────────────────

function normalizeLabel(label: string): string {
  return label.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "");
}

async function deduplicateNodes(
  agentId: number,
  newEntities: ExtractedEntity[]
): Promise<ExtractedEntity[]> {
  const existingNodes = await db.select().from(knowledgeNodes)
    .where(eq(knowledgeNodes.agentId, agentId));

  const existingLabels = new Set(existingNodes.map(n => normalizeLabel(n.label)));
  return newEntities.filter(e => !existingLabels.has(normalizeLabel(e.label)));
}

// ─── Memory Similarity & Merge ───────────────────────────────────────────────

function computeTextSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

export interface SemanticResult {
  entitiesExtracted: number;
  relationsCreated: number;
  memoriesMerged: number;
}

/**
 * Process unconsolidated episodic memories:
 * 1. Extract entities and relations → build KG
 * 2. Deduplicate similar memories
 * 3. Mark memories as consolidated
 */
export async function runSemanticWorker(agentId: number): Promise<SemanticResult> {
  const result: SemanticResult = { entitiesExtracted: 0, relationsCreated: 0, memoriesMerged: 0 };

  // Get unconsolidated memories
  const unconsolidated = await db.select()
    .from(memoryEntries)
    .where(and(
      eq(memoryEntries.agentId, agentId),
      eq(memoryEntries.consolidated, false)
    ))
    .orderBy(desc(memoryEntries.createdAt))
    .limit(20);

  if (unconsolidated.length === 0) return result;

  // Step 1: Extract entities and relations
  const memoriesForExtraction = unconsolidated.map(m => ({
    title: m.title,
    summary: m.summary,
    tags: m.tags ?? [],
  }));

  const { entities, relations } = await extractEntitiesWithLLM(memoriesForExtraction);

  // Deduplicate against existing nodes
  const newEntities = await deduplicateNodes(agentId, entities);

  // Insert new nodes
  for (const entity of newEntities) {
    const nodeId = `${entity.type}_${normalizeLabel(entity.label).replace(/\s+/g, "_")}`;
    await db.insert(knowledgeNodes).values({
      agentId,
      nodeId,
      label: entity.label,
      type: entity.type,
      confidence: entity.confidence,
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
    });
    result.entitiesExtracted++;
  }

  // Insert relations (only if both source and target exist)
  const allNodes = await db.select().from(knowledgeNodes)
    .where(eq(knowledgeNodes.agentId, agentId));
  const nodeLabels = new Set(allNodes.map(n => normalizeLabel(n.label)));

  for (const rel of relations) {
    const srcExists = nodeLabels.has(normalizeLabel(rel.source));
    const tgtExists = nodeLabels.has(normalizeLabel(rel.target));
    if (srcExists && tgtExists) {
      const srcNode = allNodes.find(n => normalizeLabel(n.label) === normalizeLabel(rel.source));
      const tgtNode = allNodes.find(n => normalizeLabel(n.label) === normalizeLabel(rel.target));
      if (srcNode && tgtNode) {
        await db.insert(knowledgeEdges).values({
          agentId,
          source: srcNode.nodeId,
          target: tgtNode.nodeId,
          relation: rel.relation,
          weight: rel.weight,
        });
        result.relationsCreated++;
      }
    }
  }

  // Step 2: Merge similar memories
  const merged = new Set<number>();
  for (let i = 0; i < unconsolidated.length; i++) {
    if (merged.has(unconsolidated[i].id)) continue;
    for (let j = i + 1; j < unconsolidated.length; j++) {
      if (merged.has(unconsolidated[j].id)) continue;
      const sim = computeTextSimilarity(
        unconsolidated[i].summary,
        unconsolidated[j].summary
      );
      if (sim > 0.6) {
        // Merge: keep the more important one, boost its importance
        const keeper = unconsolidated[i].importance >= unconsolidated[j].importance
          ? unconsolidated[i] : unconsolidated[j];
        const merged_one = keeper === unconsolidated[i] ? unconsolidated[j] : unconsolidated[i];

        await db.update(memoryEntries).set({
          importance: Math.min(1.0, keeper.importance + 0.1),
          summary: `${keeper.summary} [merged: ${merged_one.title}]`,
          consolidated: true,
        }).where(eq(memoryEntries.id, keeper.id));

        await db.delete(memoryEntries).where(eq(memoryEntries.id, merged_one.id));
        merged.add(merged_one.id);
        result.memoriesMerged++;
      }
    }
  }

  // Step 3: Mark remaining as consolidated
  for (const mem of unconsolidated) {
    if (!merged.has(mem.id)) {
      await db.update(memoryEntries).set({ consolidated: true })
        .where(eq(memoryEntries.id, mem.id));
    }
  }

  return result;
}
