import { Hono } from "hono";
import { db } from "@humancore/db";
import { providers } from "@humancore/db/schema";
import { eq } from "drizzle-orm";
import { invalidateProviderRegistry, getProviderBaseUrl, getDefaultModel, isOpenAICompatible } from "../engine/providers";

export const providersRoutes = new Hono();

// ─── Types ───────────────────────────────────────────────────────────────────

type ModelInfo = {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
  reasoning: boolean;
  vision: boolean;
  imageGen?: boolean;
  embedding?: boolean;
  costInput?: number;
  costOutput?: number;
};

// ─── Provider Type Registry ──────────────────────────────────────────────────

const PROVIDER_TYPES = [
  { type: "anthropic", name: "Anthropic", authType: "x-api-key", color: "#d4a574" },
  { type: "openai", name: "OpenAI", authType: "bearer", color: "#10a37f" },
  { type: "google", name: "Google Gemini", authType: "bearer", color: "#4285f4" },
  { type: "ollama", name: "Ollama (Local)", authType: "none", color: "#333333" },
  { type: "ollama_cloud", name: "Ollama Cloud", authType: "bearer", color: "#444444" },
  { type: "deepseek", name: "DeepSeek", authType: "bearer", color: "#5b6ef4" },
  { type: "groq", name: "Groq", authType: "bearer", color: "#f55036" },
  { type: "mistral", name: "Mistral AI", authType: "bearer", color: "#ff7000" },
  { type: "xai", name: "xAI (Grok)", authType: "bearer", color: "#1a1a2e" },
  { type: "openrouter", name: "OpenRouter", authType: "bearer", color: "#6366f1" },
  { type: "together", name: "Together AI", authType: "bearer", color: "#0ea5e9" },
  { type: "cohere", name: "Cohere", authType: "bearer", color: "#39594d" },
  { type: "perplexity", name: "Perplexity", authType: "bearer", color: "#20808d" },
  { type: "novita", name: "Novita AI", authType: "bearer", color: "#7c3aed" },
  { type: "minimax", name: "MiniMax", authType: "bearer", color: "#059669" },
  { type: "byteplus", name: "BytePlus (Seed)", authType: "bearer", color: "#3b82f6" },
  { type: "custom_openai", name: "Custom (OpenAI-Compatible)", authType: "bearer", color: "#64748b" },
] as const;

// ─── Static Model Catalog ────────────────────────────────────────────────────

const MODEL_CATALOG: Record<string, ModelInfo[]> = {
  anthropic: [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000, maxTokens: 16000, reasoning: true, vision: true },
    { id: "claude-opus-4-20250514", name: "Claude Opus 4", contextWindow: 200000, maxTokens: 32000, reasoning: true, vision: true },
    { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet", contextWindow: 200000, maxTokens: 16000, reasoning: true, vision: true },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet v2", contextWindow: 200000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", contextWindow: 200000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", contextWindow: 200000, maxTokens: 4096, reasoning: false, vision: true },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", contextWindow: 200000, maxTokens: 4096, reasoning: false, vision: true },
  ],
  openai: [
    { id: "gpt-4.1", name: "GPT-4.1", contextWindow: 1000000, maxTokens: 32768, reasoning: false, vision: true },
    { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", contextWindow: 1000000, maxTokens: 32768, reasoning: false, vision: true },
    { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", contextWindow: 1000000, maxTokens: 32768, reasoning: false, vision: true },
    { id: "gpt-4o", name: "GPT-4o", contextWindow: 128000, maxTokens: 16384, reasoning: false, vision: true },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", contextWindow: 128000, maxTokens: 16384, reasoning: false, vision: true },
    { id: "o3", name: "O3", contextWindow: 200000, maxTokens: 100000, reasoning: true, vision: true },
    { id: "o3-mini", name: "O3 Mini", contextWindow: 200000, maxTokens: 100000, reasoning: true, vision: true },
    { id: "o4-mini", name: "O4 Mini", contextWindow: 200000, maxTokens: 100000, reasoning: true, vision: true },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: true },
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", contextWindow: 16385, maxTokens: 4096, reasoning: false, vision: false },
  ],
  google: [
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000, maxTokens: 65536, reasoning: true, vision: true },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000, maxTokens: 65536, reasoning: true, vision: true },
    { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", contextWindow: 1000000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", contextWindow: 2000000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", contextWindow: 1000000, maxTokens: 8192, reasoning: false, vision: true },
  ],
  ollama: [
    { id: "llama3.3:70b", name: "Llama 3.3 70B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "llama3.3:8b", name: "Llama 3.3 8B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "llama3.2:3b", name: "Llama 3.2 3B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "qwen3:32b", name: "Qwen 3 32B", contextWindow: 128000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "qwen3:8b", name: "Qwen 3 8B", contextWindow: 128000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "gemma3:27b", name: "Gemma 3 27B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "gemma3:12b", name: "Gemma 3 12B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "deepseek-r1:32b", name: "DeepSeek R1 32B", contextWindow: 64000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "mistral:7b", name: "Mistral 7B", contextWindow: 32000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "codellama:13b", name: "Code Llama 13B", contextWindow: 16000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "phi4:14b", name: "Phi 4 14B", contextWindow: 16000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "llava:13b", name: "LLaVA 13B", contextWindow: 4096, maxTokens: 4096, reasoning: false, vision: true },
  ],
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek V3", contextWindow: 64000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 64000, maxTokens: 8192, reasoning: true, vision: false },
    { id: "deepseek-coder", name: "DeepSeek Coder", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", contextWindow: 128000, maxTokens: 32768, reasoning: false, vision: false },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "gemma2-9b-it", name: "Gemma 2 9B", contextWindow: 8192, maxTokens: 4096, reasoning: false, vision: false },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextWindow: 32768, maxTokens: 4096, reasoning: false, vision: false },
    { id: "qwq-32b", name: "QWQ 32B", contextWindow: 128000, maxTokens: 32768, reasoning: true, vision: false },
    { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 70B", contextWindow: 128000, maxTokens: 16384, reasoning: true, vision: false },
    { id: "llama-3.2-90b-vision-preview", name: "Llama 3.2 90B Vision", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B", contextWindow: 512000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick", contextWindow: 512000, maxTokens: 8192, reasoning: false, vision: true },
  ],
  mistral: [
    { id: "mistral-large-latest", name: "Mistral Large", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "mistral-medium-latest", name: "Mistral Medium", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "mistral-small-latest", name: "Mistral Small", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "codestral-latest", name: "Codestral", contextWindow: 32000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "pixtral-large-latest", name: "Pixtral Large", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "mistral-embed", name: "Mistral Embed", contextWindow: 8192, maxTokens: 0, reasoning: false, vision: false, embedding: true },
  ],
  xai: [
    { id: "grok-3", name: "Grok 3", contextWindow: 131072, maxTokens: 16384, reasoning: false, vision: false },
    { id: "grok-3-mini", name: "Grok 3 Mini", contextWindow: 131072, maxTokens: 16384, reasoning: true, vision: false },
    { id: "grok-2-vision-1212", name: "Grok 2 Vision", contextWindow: 32768, maxTokens: 4096, reasoning: false, vision: true },
    { id: "grok-2-1212", name: "Grok 2", contextWindow: 131072, maxTokens: 4096, reasoning: false, vision: false },
  ],
  openrouter: [
    { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextWindow: 200000, maxTokens: 16000, reasoning: true, vision: true },
    { id: "openai/gpt-4o", name: "GPT-4o", contextWindow: 128000, maxTokens: 16384, reasoning: false, vision: true },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000, maxTokens: 65536, reasoning: true, vision: true },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1", contextWindow: 64000, maxTokens: 8192, reasoning: true, vision: false },
    { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
  ],
  together: [
    { id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", name: "Llama 3.1 70B Turbo", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", name: "Llama 3.1 8B Turbo", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen 2.5 72B Turbo", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", contextWindow: 64000, maxTokens: 8192, reasoning: true, vision: false },
    { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3", contextWindow: 64000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "mistralai/Mixtral-8x22B-Instruct-v0.1", name: "Mixtral 8x22B", contextWindow: 65536, maxTokens: 4096, reasoning: false, vision: false },
  ],
  cohere: [
    { id: "command-a", name: "Command A", contextWindow: 256000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "command-r-plus", name: "Command R+", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "command-r", name: "Command R", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
  ],
  perplexity: [
    { id: "sonar-pro", name: "Sonar Pro", contextWindow: 200000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "sonar", name: "Sonar", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "sonar-reasoning-pro", name: "Sonar Reasoning Pro", contextWindow: 128000, maxTokens: 8192, reasoning: true, vision: false },
    { id: "sonar-reasoning", name: "Sonar Reasoning", contextWindow: 128000, maxTokens: 8192, reasoning: true, vision: false },
  ],
};

// ─── Dynamic Model Fetching ──────────────────────────────────────────────────

const FETCH_TIMEOUT = 10000;

async function fetchModelsFromProvider(provider: { type: string; baseUrl: string | null; apiKey: string | null }): Promise<ModelInfo[]> {
  try {
    switch (provider.type) {
      case "ollama":
      case "ollama_cloud": {
        const base = provider.baseUrl?.replace(/\/v1\/?$/, "") || "http://localhost:11434";
        const resp = await fetch(`${base}/api/tags`, {
          headers: provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {},
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { models?: Array<{ name: string; details?: { parameter_size?: string; family?: string } }> };
        return (data.models ?? []).map(m => ({
          id: m.name, name: m.name, contextWindow: 0, maxTokens: 0,
          reasoning: m.name.includes("r1") || m.name.includes("qwen3") || m.name.includes("qwq"),
          vision: m.name.includes("vision") || m.name.includes("llava") || m.name.includes("gemma3"),
        }));
      }
      case "anthropic": {
        if (!provider.apiKey) return [];
        const base = provider.baseUrl || "https://api.anthropic.com";
        const resp = await fetch(`${base}/v1/models`, {
          headers: { "x-api-key": provider.apiKey, "anthropic-version": "2023-06-01" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { data?: Array<{ id: string; display_name?: string }> };
        return (data.data ?? []).map(m => ({
          id: m.id, name: m.display_name || m.id, contextWindow: 200000, maxTokens: 8192,
          reasoning: m.id.includes("sonnet-4") || m.id.includes("opus-4") || m.id.includes("3-7"),
          vision: true,
        }));
      }
      case "google": {
        if (!provider.apiKey) return [];
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${provider.apiKey}`, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> };
        return (data.models ?? [])
          .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
          .map(m => ({
            id: m.name?.replace("models/", "") ?? "",
            name: m.displayName || m.name?.replace("models/", "") || "",
            contextWindow: 0, maxTokens: 0,
            reasoning: (m.displayName || "").includes("2.5"),
            vision: true,
          }));
      }
      default: {
        // OpenAI-compatible: GET /v1/models
        if (!provider.apiKey && provider.type !== "ollama") return [];
        const base = provider.baseUrl?.replace(/\/$/, "") || getProviderBaseUrl(provider.type) || "https://api.openai.com/v1";
        const modelsUrl = base.endsWith("/v1") ? `${base}/models` : `${base}/v1/models`;
        const headers: Record<string, string> = {};
        if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`;
        const resp = await fetch(modelsUrl, { headers, signal: AbortSignal.timeout(FETCH_TIMEOUT) });
        if (!resp.ok) return [];
        const data = await resp.json() as { data?: Array<{ id: string; name?: string; context_length?: number; owned_by?: string }> };
        return (data.data ?? []).slice(0, 200).map(m => ({
          id: m.id, name: m.name || m.id, contextWindow: m.context_length || 0, maxTokens: 0,
          reasoning: m.id.includes("r1") || m.id.includes("qwq") || m.id.includes("o3") || m.id.includes("o4") || m.id.includes("reasoning"),
          vision: m.id.includes("vision") || m.id.includes("4o") || m.id.includes("gemini") || m.id.includes("claude") || m.id.includes("scout") || m.id.includes("maverick"),
        }));
      }
    }
  } catch {
    return [];
  }
}

// Enrich dynamic models with catalog metadata
function enrichModels(dynamicModels: ModelInfo[], catalogModels: ModelInfo[]): ModelInfo[] {
  const catalogMap = new Map(catalogModels.map(m => [m.id, m]));
  return dynamicModels.map(m => {
    const c = catalogMap.get(m.id);
    if (c) return { ...m, name: c.name || m.name, contextWindow: c.contextWindow || m.contextWindow, maxTokens: c.maxTokens || m.maxTokens, reasoning: c.reasoning || m.reasoning, vision: c.vision || m.vision };
    return m;
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// List all provider type definitions
providersRoutes.get("/providers/types", (c) => {
  return c.json(PROVIDER_TYPES.map(pt => ({
    ...pt,
    defaultModel: getDefaultModel(pt.type),
    baseUrl: getProviderBaseUrl(pt.type),
    isOpenAICompatible: isOpenAICompatible(pt.type),
  })));
});

// Get full model catalog (all providers)
providersRoutes.get("/providers/catalog", (c) => {
  return c.json(MODEL_CATALOG);
});

// List all configured providers
providersRoutes.get("/providers", async (c) => {
  const rows = await db.select().from(providers);
  return c.json(rows.map(p => ({
    ...p,
    apiKey: p.apiKey ? "••••" + p.apiKey.slice(-4) : null,
  })));
});

// Get models for a specific provider (dynamic fetch + cache + catalog)
providersRoutes.get("/providers/:id/models", async (c) => {
  const id = Number(c.req.param("id"));
  const refresh = c.req.query("refresh") === "true";
  const [provider] = await db.select().from(providers).where(eq(providers.id, id));
  if (!provider) return c.json({ error: "Provider not found" }, 404);

  const catalogModels = MODEL_CATALOG[provider.type] ?? [];
  const CACHE_TTL = 3600_000; // 1 hour

  // Check cache first (unless refresh requested)
  if (!refresh && provider.cachedModels && provider.modelsCachedAt) {
    const cachedAge = Date.now() - new Date(provider.modelsCachedAt).getTime();
    if (cachedAge < CACHE_TTL) {
      return c.json({
        provider: { id: provider.id, name: provider.name, type: provider.type },
        models: provider.cachedModels as ModelInfo[],
        source: "cache",
        cachedAt: provider.modelsCachedAt,
      });
    }
  }

  // Try dynamic fetch
  let dynamicModels: ModelInfo[] = [];
  try {
    dynamicModels = await fetchModelsFromProvider({
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
    });
  } catch { /* ignore */ }

  const enrichedDynamic = enrichModels(dynamicModels, catalogModels);

  // Merge: catalog first, then enriched dynamic, dedup by id
  const seen = new Set<string>();
  const merged: ModelInfo[] = [];
  for (const m of catalogModels) {
    if (!seen.has(m.id)) { seen.add(m.id); merged.push(m); }
  }
  for (const m of enrichedDynamic) {
    if (!seen.has(m.id)) { seen.add(m.id); merged.push(m); }
  }
  // DB-stored models as fallback
  for (const m of (provider.models ?? []) as string[]) {
    if (!seen.has(m)) { seen.add(m); merged.push({ id: m, name: m, contextWindow: 0, maxTokens: 0, reasoning: false, vision: false }); }
  }

  // Update cache in DB
  if (merged.length > 0) {
    await db.update(providers).set({
      cachedModels: merged as any,
      modelsCachedAt: new Date().toISOString(),
    }).where(eq(providers.id, id));
  }

  return c.json({
    provider: { id: provider.id, name: provider.name, type: provider.type },
    models: merged,
    source: dynamicModels.length > 0 ? "dynamic+catalog" : "catalog+db",
    cachedAt: new Date().toISOString(),
  });
});

// Create provider
providersRoutes.post("/providers", async (c) => {
  const body = await c.req.json();
  const [provider] = await db.insert(providers).values({
    name: body.name,
    displayName: body.displayName || null,
    type: body.type,
    apiKey: body.apiKey || null,
    baseUrl: body.baseUrl || null,
    authType: body.authType || "bearer",
    models: body.models ?? [],
    defaultModel: body.defaultModel || null,
    priority: body.priority ?? 0,
    settings: body.settings ?? {},
  }).returning();

  invalidateProviderRegistry();
  return c.json({ ...provider, apiKey: provider.apiKey ? "••••" + provider.apiKey.slice(-4) : null }, 201);
});

// Update provider
providersRoutes.patch("/providers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [provider] = await db.update(providers).set(body).where(eq(providers.id, id)).returning();
  if (!provider) return c.json({ error: "Provider not found" }, 404);

  invalidateProviderRegistry();
  return c.json({ ...provider, apiKey: provider.apiKey ? "••••" + provider.apiKey.slice(-4) : null });
});

// Delete provider
providersRoutes.delete("/providers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(providers).where(eq(providers.id, id));
  invalidateProviderRegistry();
  return c.body(null, 204);
});

// Test provider connection (ping mode)
providersRoutes.post("/providers/:id/test", async (c) => {
  const id = Number(c.req.param("id"));
  const [provider] = await db.select().from(providers).where(eq(providers.id, id));
  if (!provider) return c.json({ ok: false, error: "Provider not found" }, 404);
  if (!provider.apiKey && provider.type !== "ollama") return c.json({ ok: false, error: "No API key configured" });

  const startMs = Date.now();
  try {
    const testUrl = getTestEndpoint(provider.type, provider.baseUrl);
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (provider.authType === "x-api-key" || provider.type === "anthropic") {
      headers["x-api-key"] = provider.apiKey!;
      headers["anthropic-version"] = "2023-06-01";
    } else if (provider.apiKey && provider.authType !== "none") {
      headers["Authorization"] = `Bearer ${provider.apiKey}`;
    }

    const res = await fetch(testUrl, { headers, signal: AbortSignal.timeout(10000) });
    const latencyMs = Date.now() - startMs;
    const ok = res.ok;

    // Update test status in DB
    await db.update(providers).set({
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: ok ? "ok" : "fail",
    }).where(eq(providers.id, id));

    return c.json({ ok, status: res.status, latencyMs, provider: provider.type });
  } catch (e: any) {
    await db.update(providers).set({
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: "fail",
    }).where(eq(providers.id, id));
    return c.json({ ok: false, error: e.message ?? "Connection failed", latencyMs: Date.now() - startMs });
  }
});

// Verify provider with actual LLM call
providersRoutes.post("/providers/:id/verify", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const [provider] = await db.select().from(providers).where(eq(providers.id, id));
  if (!provider) return c.json({ valid: false, error: "Provider not found" }, 404);
  if (!provider.apiKey && provider.type !== "ollama") return c.json({ valid: false, error: "No API key configured" });

  const modelId = (body as any)?.model || provider.defaultModel || provider.models?.[0] || getDefaultModel(provider.type);

  const startMs = Date.now();
  try {
    const { createModel } = await import("../engine/providers");
    const model = createModel(provider.type as any, provider.apiKey ?? "ollama", modelId, provider.baseUrl);
    const { generateText } = await import("ai");
    const result = await generateText({ model, prompt: "Say 'ok'", maxTokens: 10 });
    const latencyMs = Date.now() - startMs;

    await db.update(providers).set({
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: "ok",
    }).where(eq(providers.id, id));

    return c.json({ valid: true, latencyMs, model: modelId, response: result.text?.slice(0, 50) });
  } catch (e: any) {
    await db.update(providers).set({
      lastTestedAt: new Date().toISOString(),
      lastTestStatus: "fail",
    }).where(eq(providers.id, id));
    return c.json({ valid: false, error: e.message ?? "Verification failed", latencyMs: Date.now() - startMs, model: modelId });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTestEndpoint(type: string, baseUrl: string | null): string {
  const defaultUrls: Record<string, string> = {
    anthropic: "https://api.anthropic.com",
    openai: "https://api.openai.com",
    google: "https://generativelanguage.googleapis.com",
    ollama: "http://localhost:11434",
    ollama_cloud: "https://api.ollama.com",
    deepseek: "https://api.deepseek.com",
    groq: "https://api.groq.com",
    openrouter: "https://openrouter.ai",
    together: "https://api.together.xyz",
    mistral: "https://api.mistral.ai",
    xai: "https://api.x.ai",
    cohere: "https://api.cohere.ai",
    perplexity: "https://api.perplexity.ai",
    novita: "https://api.novita.ai",
    minimax: "https://api.minimax.io",
    byteplus: "https://ark.ap-southeast.bytepluses.com",
  };

  const base = baseUrl?.replace(/\/$/, "") || defaultUrls[type] || "http://localhost:11434";

  if (type === "anthropic") return `${base}/v1/models`;
  if (type === "google") return `${base}/v1beta/models`;
  if (type === "ollama" || type === "ollama_cloud") {
    const ollamaBase = base.replace(/\/v1\/?$/, "");
    return `${ollamaBase}/api/tags`;
  }
  return `${base}/v1/models`;
}
