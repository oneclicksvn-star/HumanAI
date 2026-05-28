import { db } from "@humancore/db";
import { memoryEntries, messages, sessions, agents } from "@humancore/db/schema";
import { eq, desc, and, gt } from "drizzle-orm";
import { getActiveModel } from "../providers";
import { generateText } from "ai";

// ─── Importance Scoring ──────────────────────────────────────────────────────

const EMOTIONAL_MOODS = ["empathetic", "positive", "satisfied", "supportive"];
const BASE_IMPORTANCE = 30;
const EMOTIONAL_BOOST = 20;
const LONG_MESSAGE_BOOST = 10;
const DECISION_BOOST = 15;
const QUESTION_BOOST = 5;

function scoreImportance(content: string, mood: string, role: string): number {
  let score = BASE_IMPORTANCE;

  // Emotional context boost
  if (EMOTIONAL_MOODS.includes(mood)) score += EMOTIONAL_BOOST;

  // Long messages often contain more valuable info
  if (content.length > 300) score += LONG_MESSAGE_BOOST;

  // Decision/action patterns boost
  if (/\b(decided|chose|will|plan|commit|promise|agree|implement|build|create)\b/i.test(content)) {
    score += DECISION_BOOST;
  }

  // Questions indicate learning/exploration
  if (/\?/.test(content) && role === "user") score += QUESTION_BOOST;

  // Code-related content
  if (/```/.test(content) || /\b(function|class|import|export|const|let)\b/.test(content)) {
    score += 10;
  }

  // Personal/relational content
  if (/\b(feel|believe|think|love|hate|wish|hope|dream|remember)\b/i.test(content)) {
    score += 10;
  }

  return Math.min(score, 100);
}

// ─── Tag Extraction ──────────────────────────────────────────────────────────

function extractTags(content: string): string[] {
  const tags: string[] = [];
  const lower = content.toLowerCase();

  // Topic detection
  if (/\b(code|program|develop|bug|error|function|api)\b/.test(lower)) tags.push("coding");
  if (/\b(design|ui|ux|layout|color|style)\b/.test(lower)) tags.push("design");
  if (/\b(feel|emotion|happy|sad|angry|love|care)\b/.test(lower)) tags.push("emotional");
  if (/\b(plan|strategy|goal|milestone|deadline)\b/.test(lower)) tags.push("planning");
  if (/\b(learn|study|understand|explain|teach)\b/.test(lower)) tags.push("learning");
  if (/\b(team|collaborate|together|group|meeting)\b/.test(lower)) tags.push("collaboration");
  if (/\b(decision|choose|pick|option|alternative)\b/.test(lower)) tags.push("decision");
  if (/\b(problem|issue|fix|solve|debug|error)\b/.test(lower)) tags.push("problem-solving");
  if (/\b(memory|remember|recall|forget|past)\b/.test(lower)) tags.push("meta-memory");
  if (/\b(creative|idea|brainstorm|imagine|invent)\b/.test(lower)) tags.push("creative");

  return [...new Set(tags)].slice(0, 5);
}

// ─── Mood Detection for Memory ───────────────────────────────────────────────

function detectMemoryMood(content: string, agentMood: string): string {
  const lower = content.toLowerCase();
  if (/\b(sad|upset|angry|frustrated|worried|anxious)\b/.test(lower)) return "empathetic";
  if (/\b(happy|excited|great|awesome|wonderful|amazing)\b/.test(lower)) return "positive";
  if (/\b(help|please|need|urgent)\b/.test(lower)) return "supportive";
  if (/\b(think|analyze|explain|complex)\b/.test(lower)) return "focused";
  if (/\b(calm|peace|relax|breathe)\b/.test(lower)) return "calming";
  return agentMood;
}

// ─── LLM-Based Memory Extraction ─────────────────────────────────────────────

interface ExtractedMemory {
  title: string;
  summary: string;
  type: "episodic" | "semantic" | "procedural";
}

async function extractMemoriesWithLLM(
  conversationChunk: Array<{ role: string; content: string }>,
  agentName: string
): Promise<ExtractedMemory[]> {
  const model = await getActiveModel();
  if (!model) return extractMemoriesFallback(conversationChunk, agentName);

  try {
    const conversationText = conversationChunk
      .map(m => `${m.role}: ${m.content}`)
      .join("\n");

    const { text } = await generateText({
      model,
      temperature: 0.3,
      maxTokens: 1000,
      system: `You are a memory extraction system. Extract key memories from conversations.
Return JSON array of memories. Each memory has: title (short, descriptive), summary (1-2 sentences), type (episodic/semantic/procedural).
- episodic: events, interactions, experiences
- semantic: facts, concepts, knowledge learned
- procedural: skills, how-to, processes discussed
Extract 1-3 memories max. Only extract genuinely important/memorable content. Skip greetings and filler.
Return ONLY valid JSON array, no markdown.`,
      prompt: `Extract memories from this conversation between user and ${agentName}:\n\n${conversationText}`,
    });

    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter(m => m.title && m.summary && m.type).slice(0, 3);
    }
    return [];
  } catch {
    return extractMemoriesFallback(conversationChunk, agentName);
  }
}

// ─── Fallback: Rule-Based Memory Extraction ──────────────────────────────────

function extractMemoriesFallback(
  conversationChunk: Array<{ role: string; content: string }>,
  agentName: string
): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];
  const combined = conversationChunk.map(m => m.content).join(" ");

  // Extract decisions
  const decisionMatch = combined.match(/(?:decided|will|plan to|going to|let's)\s+(.{10,80})/i);
  if (decisionMatch) {
    memories.push({
      title: "Decision Made",
      summary: decisionMatch[0].slice(0, 150),
      type: "episodic",
    });
  }

  // Extract learnings
  const learnMatch = combined.match(/(?:learned|understood|realized|discovered|found out)\s+(.{10,80})/i);
  if (learnMatch) {
    memories.push({
      title: "Knowledge Gained",
      summary: learnMatch[0].slice(0, 150),
      type: "semantic",
    });
  }

  // Extract how-to / procedural
  const howtoMatch = combined.match(/(?:to do this|steps?(?:\s+\d)?|first.*then|you need to)\s*(.{10,80})/i);
  if (howtoMatch) {
    memories.push({
      title: "Process Learned",
      summary: howtoMatch[0].slice(0, 150),
      type: "procedural",
    });
  }

  // Generic: if conversation is substantial but nothing specific matched
  if (memories.length === 0 && combined.length > 200) {
    const firstUserMsg = conversationChunk.find(m => m.role === "user");
    if (firstUserMsg) {
      memories.push({
        title: `Conversation about ${firstUserMsg.content.slice(0, 40)}...`,
        summary: `${agentName} discussed: ${firstUserMsg.content.slice(0, 120)}`,
        type: "episodic",
      });
    }
  }

  return memories.slice(0, 3);
}

// ─── Main Episodic Worker ────────────────────────────────────────────────────

export interface EpisodicResult {
  memoriesCreated: number;
  memories: Array<{ id: number; title: string; importance: number }>;
}

/**
 * Process recent messages in a session and extract episodic memories.
 * Called after each meaningful conversation exchange or during consolidation.
 */
export async function runEpisodicWorker(
  agentId: number,
  sessionId?: number,
  options?: { forceAll?: boolean; minMessages?: number }
): Promise<EpisodicResult> {
  const minMessages = options?.minMessages ?? 4;
  const result: EpisodicResult = { memoriesCreated: 0, memories: [] };

  // Get the agent
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return result;

  // Get sessions to process
  let sessionsToProcess: Array<{ id: number }>;
  if (sessionId) {
    sessionsToProcess = [{ id: sessionId }];
  } else {
    sessionsToProcess = await db.select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.agentId, agentId));
  }

  for (const sess of sessionsToProcess) {
    // Get unprocessed messages (those not yet turned into memories)
    const recentMessages = await db.select()
      .from(messages)
      .where(eq(messages.sessionId, sess.id))
      .orderBy(desc(messages.createdAt))
      .limit(20);

    if (recentMessages.length < minMessages) continue;

    // Check if we already have a recent memory from this session
    if (!options?.forceAll) {
      const existingMemories = await db.select()
        .from(memoryEntries)
        .where(and(
          eq(memoryEntries.agentId, agentId),
          eq(memoryEntries.sourceSessionId, sess.id)
        ))
        .orderBy(desc(memoryEntries.createdAt))
        .limit(1);

      if (existingMemories.length > 0) {
        const lastMemTime = new Date(existingMemories[0].createdAt).getTime();
        const oldestMsg = new Date(recentMessages[recentMessages.length - 1].createdAt).getTime();
        // Skip if last memory is newer than oldest unprocessed message
        if (lastMemTime > oldestMsg && !options?.forceAll) continue;
      }
    }

    // Prepare conversation chunk (reverse to chronological order)
    const chunk = recentMessages.reverse().map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Extract memories using LLM (or fallback)
    const extracted = await extractMemoriesWithLLM(chunk, agent.name);

    for (const mem of extracted) {
      const lastMsg = recentMessages[recentMessages.length - 1];
      const mood = detectMemoryMood(
        chunk.map(m => m.content).join(" "),
        agent.mood
      );
      const importance = scoreImportance(
        chunk.map(m => m.content).join(" "),
        mood,
        "mixed"
      );

      const [created] = await db.insert(memoryEntries).values({
        agentId,
        title: mem.title,
        summary: mem.summary,
        type: mem.type,
        mood,
        tags: extractTags(chunk.map(m => m.content).join(" ")),
        importance: importance / 100,
        sourceSessionId: sess.id,
        decayFactor: EMOTIONAL_MOODS.includes(mood) ? 0.5 : 1.0,
      }).returning();

      result.memoriesCreated++;
      result.memories.push({ id: created.id, title: created.title, importance });
    }
  }

  return result;
}

/**
 * Quick memory creation from a single message exchange (called after each chat response).
 * Only creates memory if the exchange is deemed important enough.
 */
export async function createQuickMemory(
  agentId: number,
  sessionId: number,
  userContent: string,
  agentContent: string,
  mood: string
): Promise<{ created: boolean; memoryId?: number }> {
  const importance = scoreImportance(userContent + " " + agentContent, mood, "user");

  // Only create memory if importance >= 50
  if (importance < 50) return { created: false };

  const tags = extractTags(userContent + " " + agentContent);
  const title = userContent.length > 60
    ? userContent.slice(0, 57) + "..."
    : userContent;

  const [memory] = await db.insert(memoryEntries).values({
    agentId,
    title,
    summary: `User: ${userContent.slice(0, 100)}. Response: ${agentContent.slice(0, 100)}`,
    type: "episodic",
    mood,
    tags,
    importance: importance / 100,
    sourceSessionId: sessionId,
    decayFactor: EMOTIONAL_MOODS.includes(mood) ? 0.5 : 1.0,
  }).returning();

  return { created: true, memoryId: memory.id };
}
