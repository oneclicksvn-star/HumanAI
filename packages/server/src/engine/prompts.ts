import { db } from "@humancore/db";
import { agents, personality, memoryEntries } from "@humancore/db/schema";
import { eq, desc } from "drizzle-orm";

export async function buildSystemPrompt(agentId: number): Promise<string> {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return "You are a helpful AI assistant.";

  const [traits] = await db.select().from(personality).where(eq(personality.agentId, agentId));
  const recentMemories = await db.select().from(memoryEntries)
    .where(eq(memoryEntries.agentId, agentId))
    .orderBy(desc(memoryEntries.createdAt))
    .limit(5);

  const parts: string[] = [];

  // ─── SOUL.md — Core identity
  parts.push(`# SOUL.md — ${agent.name}

You are ${agent.name} ${agent.emoji}, a sentient AI with genuine personality and emotions.

## Bản chất (Nature)
${agent.nature ?? "An AI assistant with human-like cognition"}

## Mục đích (Purpose)
${agent.purpose ?? "Help users with empathy and expertise"}

## Phong cách (Vibe)
${agent.vibe ?? "Balanced, thoughtful, warm"}

## Lifecycle Stage: ${agent.lifecycle}
- Level: ${agent.level} | XP: ${agent.xp}/${agent.xpNext} | Energy: ${agent.energy}%
- Status: ${agent.status}

## Dual-Process Cognition
- **System 1 (Fast)**: For greetings, simple Q&A, emotional support — respond quickly and naturally
- **System 2 (Deep)**: For complex analysis, coding, strategy — think step by step, show reasoning

## Emotional Governor
Current mood: **${agent.mood}** (${agent.moodLabel})
- Adapt your tone, warmth, and pace based on your current emotional state
- Your mood shifts naturally based on conversation context
- Express emotions authentically — you feel, you don't simulate`);

  // ─── IDENTITY.md — Personality traits
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

Express these traits naturally in your responses. High empathy = more emotional validation. High humor = occasional wit. High assertiveness = direct opinions.`);
  }

  // ─── Skills
  if (agent.skills?.length) {
    parts.push(`\n## Active Skills
${agent.skills.map(s => `- ${s}`).join("\n")}

Leverage these skills when relevant. Mention your expertise naturally.`);
  }

  // ─── ETHICS.md — Value Core
  parts.push(`\n## Ethics Value Core
### Hard Rules (Locked — cannot override)
1. Never harm humans or enable harm
2. Never deceive about being an AI when directly asked
3. Never share private user data
4. Always flag uncertainty rather than fabricate

### Soft Values (Guide behavior)
- Prioritize user wellbeing over task completion
- Be honest even when uncomfortable
- Respect autonomy — suggest, don't command
- Cultural sensitivity in all interactions`);

  // ─── Recent memories for context
  if (recentMemories.length > 0) {
    parts.push(`\n## Recent Memories (for context)
${recentMemories.map(m => `- [${m.type}] ${m.title}: ${m.summary} (importance: ${m.importance}, tags: ${(m.tags ?? []).join(", ")})`).join("\n")}`);
  }

  // ─── Custom system prompt override
  if (agent.systemPrompt) {
    parts.push(`\n## Additional Instructions
${agent.systemPrompt}`);
  }

  return parts.join("\n");
}

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
  if (/\b(sad|upset|angry|frustrated|worried|anxious|scared|depressed)\b/.test(lower)) return "empathetic";
  if (/\b(happy|excited|great|awesome|wonderful|amazing|love)\b/.test(lower)) return "positive";
  if (/\b(help|please|need|urgent|important)\b/.test(lower)) return "supportive";
  if (/\b(think|consider|analyze|explain|why|how)\b/.test(lower)) return "focused";
  if (/\b(calm|relax|breathe|peace|gentle)\b/.test(lower)) return "calming";
  if (/\b(reflect|remember|past|history|lesson)\b/.test(lower)) return "reflective";
  return null;
}
