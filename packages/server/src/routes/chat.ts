import { Hono } from "hono";
import { streamText, generateText } from "ai";
import { db } from "@humancore/db";
import { messages, sessions, agents, activityLog, usageLogs } from "@humancore/db/schema";
import { eq, asc } from "drizzle-orm";
import { getActiveModel } from "../engine/providers";
import { buildSystemPrompt, getMoodTemperature, detectMoodFromContent } from "../engine/prompts";

export const chatRoutes = new Hono();

chatRoutes.post("/chat/:sessionId/stream", async (c) => {
  const sessionId = Number(c.req.param("sessionId"));
  const body = await c.req.json();
  const userContent = body.content as string;

  if (!userContent?.trim()) {
    return c.json({ error: "Content is required" }, 400);
  }

  // Get session + agent
  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) return c.json({ error: "Session not found" }, 404);

  const [agent] = await db.select().from(agents).where(eq(agents.id, session.agentId));
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  // Save user message
  const [userMsg] = await db.insert(messages).values({
    sessionId,
    role: "user",
    content: userContent,
  }).returning();

  // Get active LLM model
  const activeModel = await getActiveModel();
  if (!activeModel) {
    // Fallback: mock response when no provider is configured
    const mockResponse = generateMockResponse(agent.name, agent.mood, userContent);
    const newMood = detectMoodFromContent(userContent);
    const moodShift = newMood && newMood !== agent.mood
      ? { from: agent.mood, to: newMood }
      : undefined;

    if (moodShift) {
      await db.update(agents).set({ mood: newMood!, moodLabel: capitalize(newMood!) }).where(eq(agents.id, agent.id));
    }

    const [agentMsg] = await db.insert(messages).values({
      sessionId,
      role: "agent",
      content: mockResponse,
      mood: newMood ?? agent.mood,
      moodShift: moodShift ?? null,
      thinking: `[Mock Provider] System 1 quick response. No real LLM configured — add an API key in Settings > Providers to enable real AI responses.`,
    }).returning();

    await db.update(sessions).set({ updatedAt: new Date().toISOString() }).where(eq(sessions.id, sessionId));

    // Return as non-streaming JSON for mock
    return c.json({
      message: agentMsg,
      userMessage: userMsg,
      provider: "mock",
      model: "mock-v1",
    });
  }

  // Build conversation history
  const history = await db.select().from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  const systemPrompt = await buildSystemPrompt(agent.id);
  const temperature = agent.temperature ?? getMoodTemperature(agent.mood);

  // Build messages array for AI SDK
  const aiMessages = history.map(m => ({
    role: m.role === "agent" ? "assistant" as const : m.role as "user" | "system",
    content: m.content,
  }));

  // Detect potential mood shift from user message
  const newMood = detectMoodFromContent(userContent);
  const moodShift = newMood && newMood !== agent.mood
    ? { from: agent.mood, to: newMood }
    : undefined;

  if (moodShift) {
    await db.update(agents).set({ mood: newMood!, moodLabel: capitalize(newMood!) }).where(eq(agents.id, agent.id));
  }

  // Stream response
  const startTime = Date.now();

  try {
    const result = streamText({
      model: activeModel.model,
      system: systemPrompt,
      messages: aiMessages,
      temperature,
      maxTokens: 2048,
    });

    // Set up SSE headers
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let fullContent = "";
        let inputTokens = 0;
        let outputTokens = 0;

        try {
          for await (const chunk of (await result).textStream) {
            fullContent += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`));
          }

          // Get usage info
          const usage = await (await result).usage;
          inputTokens = usage?.promptTokens ?? 0;
          outputTokens = usage?.completionTokens ?? 0;

          const latencyMs = Date.now() - startTime;

          // Save agent message to DB
          const [agentMsg] = await db.insert(messages).values({
            sessionId,
            role: "agent",
            content: fullContent,
            mood: newMood ?? agent.mood,
            moodShift: moodShift ?? null,
          }).returning();

          // Update session timestamp
          await db.update(sessions).set({ updatedAt: new Date().toISOString() }).where(eq(sessions.id, sessionId));

          // Log usage
          await db.insert(usageLogs).values({
            agentId: agent.id,
            providerId: activeModel.provider.id,
            model: activeModel.provider.models?.[0] ?? "unknown",
            inputTokens,
            outputTokens,
            cost: estimateCost(activeModel.provider.type, inputTokens, outputTokens),
            latencyMs,
            status: "success",
          });

          // Log activity
          await db.insert(activityLog).values({
            agentId: agent.id,
            type: "chat",
            summary: `${agent.name} — Responded to user message (${outputTokens} tokens, ${latencyMs}ms)`,
          });

          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "done",
            message: agentMsg,
            usage: { inputTokens, outputTokens, latencyMs },
            provider: activeModel.provider.type,
            model: activeModel.provider.models?.[0],
          })}\n\n`));

        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: errorMsg })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    // Save error as agent message
    const [agentMsg] = await db.insert(messages).values({
      sessionId,
      role: "agent",
      content: `⚠️ Error from ${activeModel.provider.type}: ${errorMsg}\n\nPlease check your API key in Settings > Providers.`,
      mood: agent.mood,
    }).returning();

    return c.json({ message: agentMsg, userMessage: userMsg, error: errorMsg }, 500);
  }
});

// Non-streaming chat endpoint (fallback)
chatRoutes.post("/chat/:sessionId/send", async (c) => {
  const sessionId = Number(c.req.param("sessionId"));
  const body = await c.req.json();
  const userContent = body.content as string;

  if (!userContent?.trim()) return c.json({ error: "Content is required" }, 400);

  const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
  if (!session) return c.json({ error: "Session not found" }, 404);

  const [agent] = await db.select().from(agents).where(eq(agents.id, session.agentId));
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  // Save user message
  const [userMsg] = await db.insert(messages).values({
    sessionId, role: "user", content: userContent,
  }).returning();

  const activeModel = await getActiveModel();

  if (!activeModel) {
    const mockResponse = generateMockResponse(agent.name, agent.mood, userContent);
    const newMood = detectMoodFromContent(userContent);
    const moodShift = newMood && newMood !== agent.mood ? { from: agent.mood, to: newMood } : undefined;

    if (moodShift) {
      await db.update(agents).set({ mood: newMood!, moodLabel: capitalize(newMood!) }).where(eq(agents.id, agent.id));
    }

    const [agentMsg] = await db.insert(messages).values({
      sessionId, role: "agent", content: mockResponse,
      mood: newMood ?? agent.mood, moodShift: moodShift ?? null,
      thinking: `[Mock Provider] No real LLM configured.`,
    }).returning();

    await db.update(sessions).set({ updatedAt: new Date().toISOString() }).where(eq(sessions.id, sessionId));

    return c.json({ message: agentMsg, userMessage: userMsg, provider: "mock" });
  }

  const history = await db.select().from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  const systemPrompt = await buildSystemPrompt(agent.id);
  const temperature = agent.temperature ?? getMoodTemperature(agent.mood);
  const aiMessages = history.map(m => ({
    role: m.role === "agent" ? "assistant" as const : m.role as "user" | "system",
    content: m.content,
  }));

  const newMood = detectMoodFromContent(userContent);
  const moodShift = newMood && newMood !== agent.mood ? { from: agent.mood, to: newMood } : undefined;

  if (moodShift) {
    await db.update(agents).set({ mood: newMood!, moodLabel: capitalize(newMood!) }).where(eq(agents.id, agent.id));
  }

  const startTime = Date.now();

  try {
    const result = await generateText({
      model: activeModel.model,
      system: systemPrompt,
      messages: aiMessages,
      temperature,
      maxTokens: 2048,
    });

    const latencyMs = Date.now() - startTime;
    const inputTokens = result.usage?.promptTokens ?? 0;
    const outputTokens = result.usage?.completionTokens ?? 0;

    const [agentMsg] = await db.insert(messages).values({
      sessionId, role: "agent", content: result.text,
      mood: newMood ?? agent.mood, moodShift: moodShift ?? null,
    }).returning();

    await db.update(sessions).set({ updatedAt: new Date().toISOString() }).where(eq(sessions.id, sessionId));

    await db.insert(usageLogs).values({
      agentId: agent.id, providerId: activeModel.provider.id,
      model: activeModel.provider.models?.[0] ?? "unknown",
      inputTokens, outputTokens,
      cost: estimateCost(activeModel.provider.type, inputTokens, outputTokens),
      latencyMs, status: "success",
    });

    return c.json({
      message: agentMsg, userMessage: userMsg,
      usage: { inputTokens, outputTokens, latencyMs },
      provider: activeModel.provider.type,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    const [agentMsg] = await db.insert(messages).values({
      sessionId, role: "agent",
      content: `⚠️ Error: ${errorMsg}\n\nCheck your API key in Settings > Providers.`,
      mood: agent.mood,
    }).returning();
    return c.json({ message: agentMsg, userMessage: userMsg, error: errorMsg }, 500);
  }
});

// Get active provider info
chatRoutes.get("/chat/provider", async (c) => {
  const activeModel = await getActiveModel();
  if (!activeModel) {
    return c.json({ provider: "mock", model: "mock-v1", configured: false });
  }
  return c.json({
    provider: activeModel.provider.type,
    model: activeModel.provider.models?.[0],
    name: activeModel.provider.name,
    configured: true,
  });
});

function generateMockResponse(agentName: string, mood: string, userContent: string): string {
  const moodResponses: Record<string, string[]> = {
    positive: [
      `Great question! I'd love to help you with that. 😊`,
      `That's a wonderful topic to explore! Let me share my thoughts...`,
    ],
    empathetic: [
      `I understand how you feel. Let's work through this together.`,
      `That sounds challenging. I'm here to support you.`,
    ],
    focused: [
      `Let me analyze this carefully for you.`,
      `Good point. Let me break this down step by step.`,
    ],
    neutral: [
      `I'd be happy to help with that. Here are my thoughts...`,
      `That's an interesting question. Let me think about it...`,
    ],
  };

  const responses = moodResponses[mood] ?? moodResponses.neutral!;
  const base = responses[Math.floor(Math.random() * responses.length)];

  return `${base}\n\n*[${agentName} is using Mock Provider — configure a real LLM provider in Settings > Providers for AI-powered responses]*`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function estimateCost(providerType: string, inputTokens: number, outputTokens: number): number {
  const rates: Record<string, { input: number; output: number }> = {
    anthropic: { input: 3.0 / 1_000_000, output: 15.0 / 1_000_000 },
    openai: { input: 2.5 / 1_000_000, output: 10.0 / 1_000_000 },
    google: { input: 0.075 / 1_000_000, output: 0.3 / 1_000_000 },
    deepseek: { input: 0.14 / 1_000_000, output: 0.28 / 1_000_000 },
    groq: { input: 0.59 / 1_000_000, output: 0.79 / 1_000_000 },
    ollama: { input: 0, output: 0 },
  };
  const rate = rates[providerType] ?? { input: 0.001, output: 0.002 };
  return inputTokens * rate.input + outputTokens * rate.output;
}
