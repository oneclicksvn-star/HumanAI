import { Hono } from "hono";
import { db } from "@humancore/db";
import { providers } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const providersRoutes = new Hono();

// Built-in model catalog per provider type (like GoClaw's SeedDefaultModels)
const MODEL_CATALOG: Record<string, Array<{ id: string; name: string; contextWindow: number; maxTokens: number; reasoning: boolean; vision: boolean }>> = {
  anthropic: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000, maxTokens: 16000, reasoning: true, vision: true },
    { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: 200000, maxTokens: 32000, reasoning: true, vision: true },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextWindow: 200000, maxTokens: 8192, reasoning: false, vision: true },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, maxTokens: 16384, reasoning: false, vision: true },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, maxTokens: 16384, reasoning: false, vision: true },
    { id: "o3", name: "O3", contextWindow: 200000, maxTokens: 100000, reasoning: true, vision: true },
    { id: "o4-mini", name: "O4 Mini", contextWindow: 200000, maxTokens: 100000, reasoning: true, vision: true },
  ],
  google: [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000, maxTokens: 65536, reasoning: true, vision: true },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000, maxTokens: 65536, reasoning: true, vision: true },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000, maxTokens: 8192, reasoning: false, vision: true },
  ],
  ollama: [
    { id: "llama3.3:70b", name: "Llama 3.3 70B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "qwen3:32b", name: "Qwen 3 32B", contextWindow: 128000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "gemma3:27b", name: "Gemma 3 27B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "deepseek-r1:32b", name: "DeepSeek R1 32B", contextWindow: 64000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "mistral:7b", name: "Mistral 7B", contextWindow: 32000, maxTokens: 4096, reasoning: false, vision: false },
  ],
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek V3", contextWindow: 64000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 64000, maxTokens: 8192, reasoning: true, vision: false },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", contextWindow: 128000, maxTokens: 32768, reasoning: false, vision: false },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextWindow: 32768, maxTokens: 32768, reasoning: false, vision: false },
  ],
  openrouter: [
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", contextWindow: 200000, maxTokens: 16000, reasoning: true, vision: true },
    { id: "openai/gpt-4o", name: "GPT-4o", contextWindow: 128000, maxTokens: 16384, reasoning: false, vision: true },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000, maxTokens: 65536, reasoning: true, vision: true },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
  ],
};

providersRoutes.get("/providers", async (c) => {
  const rows = await db.select().from(providers);
  return c.json(rows.map(p => ({
    ...p,
    apiKey: p.apiKey ? "••••" + p.apiKey.slice(-4) : null,
  })));
});

// Get models for a specific provider (from DB + built-in catalog)
providersRoutes.get("/providers/:id/models", async (c) => {
  const id = Number(c.req.param("id"));
  const [provider] = await db.select().from(providers).where(eq(providers.id, id));
  if (!provider) return c.json({ error: "Provider not found" }, 404);

  // Merge: DB-stored models + catalog models for this provider type
  const catalogModels = MODEL_CATALOG[provider.type] ?? [];
  const dbModels = (provider.models ?? []).map((m: string) => ({ id: m, name: m, contextWindow: 0, maxTokens: 0, reasoning: false, vision: false }));

  // Dedup by id
  const seen = new Set<string>();
  const merged = [...catalogModels, ...dbModels].filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  return c.json({ provider: { id: provider.id, name: provider.name, type: provider.type }, models: merged });
});

// Get full model catalog (all providers)
providersRoutes.get("/providers/catalog", async (c) => {
  return c.json(MODEL_CATALOG);
});

providersRoutes.post("/providers", async (c) => {
  const body = await c.req.json();
  const [provider] = await db.insert(providers).values({
    name: body.name,
    type: body.type,
    apiKey: body.apiKey,
    baseUrl: body.baseUrl,
    models: body.models ?? [],
  }).returning();
  return c.json({ ...provider, apiKey: provider.apiKey ? "••••" + provider.apiKey.slice(-4) : null }, 201);
});

providersRoutes.patch("/providers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [provider] = await db.update(providers).set(body).where(eq(providers.id, id)).returning();
  if (!provider) return c.json({ error: "Provider not found" }, 404);
  return c.json({ ...provider, apiKey: provider.apiKey ? "••••" + provider.apiKey.slice(-4) : null });
});

providersRoutes.delete("/providers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(providers).where(eq(providers.id, id));
  return c.body(null, 204);
});
