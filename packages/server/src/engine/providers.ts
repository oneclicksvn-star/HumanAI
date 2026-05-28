import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModelV1 } from "ai";
import { db } from "@humancore/db";
import { providers } from "@humancore/db/schema";
import { eq, asc } from "drizzle-orm";

// ─── Provider Types ──────────────────────────────────────────────────────────

export type ProviderType =
  | "anthropic" | "openai" | "google"
  | "ollama" | "ollama_cloud"
  | "deepseek" | "groq" | "mistral" | "xai"
  | "openrouter" | "together" | "cohere" | "perplexity"
  | "novita" | "minimax" | "byteplus"
  | "custom_openai"
  | "mock";

// Provider base URLs for OpenAI-compatible endpoints
const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  ollama: "http://localhost:11434/v1",
  ollama_cloud: "https://api.ollama.com/v1",
  deepseek: "https://api.deepseek.com",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  xai: "https://api.x.ai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  together: "https://api.together.xyz/v1",
  cohere: "https://api.cohere.ai/compatibility/v1",
  perplexity: "https://api.perplexity.ai",
  novita: "https://api.novita.ai/openai",
  minimax: "https://api.minimax.io/v1",
  byteplus: "https://ark.ap-southeast.bytepluses.com/api/v3",
};

const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
  google: "gemini-2.0-flash",
  ollama: "llama3.2",
  ollama_cloud: "llama3.2",
  deepseek: "deepseek-chat",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-large-latest",
  xai: "grok-3-mini",
  openrouter: "anthropic/claude-sonnet-4-20250514",
  together: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
  cohere: "command-a",
  perplexity: "sonar-pro",
  novita: "moonshotai/kimi-k2.5",
  minimax: "MiniMax-M2.5",
  byteplus: "seed-2-0-lite-260228",
  custom_openai: "gpt-4o",
};

// ─── Model Creation ──────────────────────────────────────────────────────────

export function createModel(type: ProviderType, apiKey: string, model: string, baseUrl?: string | null): LanguageModelV1 {
  switch (type) {
    case "anthropic":
      return createAnthropic({ apiKey, baseURL: baseUrl ?? undefined })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
    case "openai":
    case "ollama":
    case "ollama_cloud":
    case "deepseek":
    case "groq":
    case "mistral":
    case "xai":
    case "openrouter":
    case "together":
    case "cohere":
    case "perplexity":
    case "novita":
    case "minimax":
    case "byteplus":
    case "custom_openai":
      return createOpenAI({
        apiKey: apiKey || "ollama",
        baseURL: baseUrl ?? PROVIDER_BASE_URLS[type] ?? "http://localhost:11434/v1",
      })(model);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

// ─── Provider Registry (in-memory cache) ─────────────────────────────────────

let registryCache: Array<typeof providers.$inferSelect> | null = null;
let registryCacheAt = 0;
const REGISTRY_TTL = 30_000; // 30s

async function getProviderRegistry(): Promise<Array<typeof providers.$inferSelect>> {
  if (registryCache && Date.now() - registryCacheAt < REGISTRY_TTL) {
    return registryCache;
  }
  registryCache = await db.select().from(providers).where(eq(providers.isActive, true)).orderBy(asc(providers.priority));
  registryCacheAt = Date.now();
  return registryCache;
}

export function invalidateProviderRegistry() {
  registryCache = null;
  registryCacheAt = 0;
}

// ─── Active Model Resolution with Fallback ───────────────────────────────────

export async function getActiveModel(
  overrideProviderId?: string | null,
  overrideModel?: string | null
): Promise<{ model: LanguageModelV1; provider: typeof providers.$inferSelect } | null> {
  // If override provider/model specified, use those
  if (overrideProviderId) {
    const [p] = await db.select().from(providers).where(eq(providers.id, Number(overrideProviderId)));
    if (p && p.apiKey) {
      const modelName = overrideModel ?? p.defaultModel ?? p.models?.[0] ?? getDefaultModel(p.type as ProviderType);
      return { model: createModel(p.type as ProviderType, p.apiKey, modelName, p.baseUrl), provider: p };
    }
  }

  // Fallback chain: iterate by priority
  const activeProviders = await getProviderRegistry();
  for (const p of activeProviders) {
    if (!p.apiKey && p.type !== "ollama") continue;
    if (p.type === "mock") continue;
    const modelName = overrideModel ?? p.defaultModel ?? p.models?.[0] ?? getDefaultModel(p.type as ProviderType);
    try {
      const model = createModel(p.type as ProviderType, p.apiKey ?? "ollama", modelName, p.baseUrl);
      return { model, provider: p };
    } catch {
      continue; // Try next provider in fallback chain
    }
  }

  return null;
}

// ─── Retry Logic ─────────────────────────────────────────────────────────────

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { attempts?: number; minDelay?: number; maxDelay?: number } = {}
): Promise<T> {
  const { attempts = 3, minDelay = 300, maxDelay = 30000 } = options;
  let lastError: Error | undefined;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      // Non-retryable errors
      const status = err?.status ?? err?.statusCode;
      if (status && [400, 401, 403, 404].includes(status)) throw err;
      // Exponential backoff with jitter
      if (i < attempts - 1) {
        const delay = Math.min(minDelay * Math.pow(2, i) * (1 + Math.random() * 0.1), maxDelay);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError ?? new Error("Retry failed");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getDefaultModel(type: ProviderType | string): string {
  return DEFAULT_MODELS[type] ?? "gpt-4o-mini";
}

export function getProviderBaseUrl(type: string): string {
  return PROVIDER_BASE_URLS[type] ?? "";
}

export function isOpenAICompatible(type: string): boolean {
  return type !== "anthropic" && type !== "google" && type !== "mock";
}
