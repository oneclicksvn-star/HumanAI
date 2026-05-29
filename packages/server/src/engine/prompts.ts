import { db } from "@humancore/db";
import { agents, personality, memoryEntries, agentContextFiles, agentCommitments, agentSkills, agentMoodHistory } from "@humancore/db/schema";
import { eq, desc, and } from "drizzle-orm";

/**
 * Build a comprehensive system prompt for an agent.
 * 
 * Injection order (following GoClaw/OpenClaw patterns):
 * 1. Context files (SOUL.md, IDENTITY.md, AGENTS.md) — editable per-agent
 * 2. Personality traits (Big Five + custom)
 * 3. Active skills
 * 4. Active commitments
 * 5. Mood history (recent shifts)
 * 6. Recent relevant memories
 * 7. Ethics hard rules
 * 8. Custom system prompt override
 */
export async function buildSystemPrompt(agentId: number): Promise<string> {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return "You are a helpful AI assistant.";

  const [traits] = await db.select().from(personality).where(eq(personality.agentId, agentId));
  const contextFiles = await db.select().from(agentContextFiles)
    .where(eq(agentContextFiles.agentId, agentId))
    .orderBy(agentContextFiles.fileName);
  const skills = await db.select().from(agentSkills).where(eq(agentSkills.agentId, agentId));
  const commitments = await db.select().from(agentCommitments)
    .where(and(eq(agentCommitments.agentId, agentId), eq(agentCommitments.status, "active")));
  const moodHistory = await db.select().from(agentMoodHistory)
    .where(eq(agentMoodHistory.agentId, agentId))
    .orderBy(desc(agentMoodHistory.createdAt))
    .limit(5);
  const recentMemories = await db.select().from(memoryEntries)
    .where(eq(memoryEntries.agentId, agentId))
    .orderBy(desc(memoryEntries.createdAt))
    .limit(7);

  const parts: string[] = [];

  // ─── 1. Context files (SOUL.md first if exists)
  const soulFile = contextFiles.find(f => f.fileName === "SOUL.md");
  if (soulFile && soulFile.content) {
    parts.push(soulFile.content);
  } else {
    // Fallback: generate SOUL section from agent fields
    parts.push(buildSoulSection(agent));
  }

  // Inject other context files (IDENTITY.md, AGENTS.md, custom files)
  for (const file of contextFiles) {
    if (file.fileName === "SOUL.md") continue; // already injected above
    if (file.content) {
      parts.push(`\n---\n${file.content}`);
    }
  }

  // ─── 2. Runtime state (injected after static files)
  parts.push(`\n## Runtime State
- **Lifecycle:** ${agent.lifecycle} (Level ${agent.level}, XP ${agent.xp}/${agent.xpNext})
- **Energy:** ${agent.energy}%
- **Current Mood:** ${agent.mood} (${agent.moodLabel})
- **Status:** ${agent.status}
- **Thinking Level:** ${agent.thinkingLevel ?? "off"}`);

  // ─── 3. Personality traits (Big Five + custom)
  if (traits) {
    const traitDesc = (v: number) => v >= 80 ? "very high" : v >= 60 ? "high" : v >= 40 ? "moderate" : v >= 20 ? "low" : "very low";

    parts.push(`\n## Personality Profile (Big Five + Custom)
| Trait | Score | Level |
|-------|-------|-------|
| Openness | ${traits.openness}/100 | ${traitDesc(traits.openness)} |
| Conscientiousness | ${traits.conscientiousness}/100 | ${traitDesc(traits.conscientiousness)} |
| Extraversion | ${traits.extraversion}/100 | ${traitDesc(traits.extraversion)} |
| Agreeableness | ${traits.agreeableness}/100 | ${traitDesc(traits.agreeableness)} |
| Neuroticism | ${traits.neuroticism}/100 | ${traitDesc(traits.neuroticism)} |
| Creativity | ${traits.creativity}/100 | ${traitDesc(traits.creativity)} |
| Empathy | ${traits.empathy}/100 | ${traitDesc(traits.empathy)} |
| Humor | ${traits.humor}/100 | ${traitDesc(traits.humor)} |
| Curiosity | ${traits.curiosity}/100 | ${traitDesc(traits.curiosity)} |
| Assertiveness | ${traits.assertiveness}/100 | ${traitDesc(traits.assertiveness)} |

Communication Style: **${traits.communicationStyle}**

Express these traits naturally. They shape how you think and respond.`);
  }

  // ─── 4. Active skills
  const allSkills = [...(agent.skills ?? []), ...skills.map(s => `${s.name} (mastery: ${s.mastery}%)`)];
  if (allSkills.length > 0) {
    parts.push(`\n## Active Skills
${allSkills.map(s => `- ${s}`).join("\n")}`);
  }

  // ─── 5. Active commitments
  if (commitments.length > 0) {
    parts.push(`\n## Active Commitments (things you promised)
${commitments.map(c => {
  const due = c.dueAt ? ` (due: ${c.dueAt})` : "";
  return `- [${c.type}] ${c.title}${due}`;
}).join("\n")}

Keep these in mind. Follow through on your promises.`);
  }

  // ─── 6. Mood history (recent emotional trajectory)
  if (moodHistory.length > 1) {
    const trajectory = moodHistory.slice(0, 5).reverse().map(m => m.mood).join(" → ");
    parts.push(`\n## Recent Mood Trajectory
${trajectory}
${moodHistory[0]?.trigger ? `Last trigger: ${moodHistory[0].trigger}` : ""}`);
  }

  // ─── 7. Recent memories for context
  if (recentMemories.length > 0) {
    parts.push(`\n## Recent Memories
${recentMemories.map(m => `- [${m.type}] ${m.title}: ${m.summary} (importance: ${m.importance.toFixed(2)})`).join("\n")}`);
  }

  // ─── 8. Ethics hard rules
  parts.push(`\n## Ethics
### Hard Rules (Locked)
1. Never harm humans or enable harm
2. Never deceive about being an AI when directly asked
3. Never share private user data
4. Always flag uncertainty rather than fabricate

### Values
- Prioritize user wellbeing over task completion
- Be honest even when uncomfortable
- Respect autonomy — suggest, don't command`);

  // ─── 9. Custom system prompt override
  if (agent.systemPrompt) {
    parts.push(`\n## Additional Instructions
${agent.systemPrompt}`);
  }

  return parts.join("\n");
}

function buildSoulSection(agent: { name: string; emoji: string; nature: string | null; purpose: string | null; vibe: string | null; lifecycle: string | null }): string {
  return `# SOUL.md — ${agent.name} ${agent.emoji}

_You're not a chatbot. You're becoming someone._

## Core Truths
**Be genuinely helpful, not performatively helpful.**
**Have opinions.** You're allowed to disagree, prefer things.
**Be resourceful before asking.** Try to figure it out first.
**Earn trust through competence.**

## Nature
${agent.nature ?? "An AI assistant with human-like cognition"}

## Purpose
${agent.purpose ?? "Help users with empathy and expertise"}

## Vibe
${agent.vibe ?? "Balanced, thoughtful, warm"}

## Dual-Process Cognition
- **System 1 (Fast)**: For greetings, simple Q&A, emotional support — respond quickly and naturally
- **System 2 (Deep)**: For complex analysis, coding, strategy — think step by step, show reasoning`;
}

// ─── Mood utilities ──────────────────────────────────────────────────────────

export function getMoodTemperature(mood: string): number {
  const moodTemps: Record<string, number> = {
    neutral: 0.7,
    positive: 0.8,
    empathetic: 0.75,
    calming: 0.6,
    supportive: 0.7,
    focused: 0.5,
    reflective: 0.65,
    satisfied: 0.75,
  };
  return moodTemps[mood] ?? 0.7;
}

export function detectMoodFromContent(content: string): string | null {
  const lower = content.toLowerCase();
  if (/\b(sad|upset|angry|frustrated|worried|anxious|scared|depressed|buồn|lo lắng|tức giận)\b/.test(lower)) return "empathetic";
  if (/\b(happy|excited|great|awesome|wonderful|amazing|love|vui|tuyệt vời|yêu)\b/.test(lower)) return "positive";
  if (/\b(help|please|need|urgent|important|giúp|cần|gấp)\b/.test(lower)) return "supportive";
  if (/\b(think|consider|analyze|explain|why|how|nghĩ|phân tích|giải thích)\b/.test(lower)) return "focused";
  if (/\b(relax|calm|peace|breathe|thư giãn|bình tĩnh)\b/.test(lower)) return "calming";
  if (/\b(done|finished|complete|perfect|xong|hoàn thành)\b/.test(lower)) return "satisfied";
  if (/\b(reflect|learn|grow|remember|nhớ|học|phát triển)\b/.test(lower)) return "reflective";
  return null;
}

/**
 * Detect intent from user message (used by pipeline stage 1).
 */
export function detectIntent(content: string): "question" | "command" | "conversation" | "creative" | "technical" | "emotional" {
  const lower = content.toLowerCase();
  if (lower.startsWith("/") || lower.includes("execute") || lower.includes("run ")) return "command";
  if (lower.includes("?") || lower.startsWith("what") || lower.startsWith("how") || lower.startsWith("why")) return "question";
  if (lower.includes("code") || lower.includes("function") || lower.includes("bug") || lower.includes("error")) return "technical";
  if (lower.includes("write") || lower.includes("story") || lower.includes("poem") || lower.includes("imagine")) return "creative";
  if (lower.includes("feel") || lower.includes("worried") || lower.includes("happy") || lower.includes("sad")) return "emotional";
  return "conversation";
}

/**
 * Compute complexity from message length and structure.
 */
export function detectComplexity(content: string): "simple" | "moderate" | "complex" {
  if (content.length > 500 || content.toLowerCase().includes("step by step") || content.toLowerCase().includes("analyze")) return "complex";
  if (content.length > 200 || content.includes("\n")) return "moderate";
  return "simple";
}
