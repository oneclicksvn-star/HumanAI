import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModelV1 } from "ai";
import { db } from "@humancore/db";
import { providers } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export type ProviderType = "openai" | "anthropic" | "google" | "ollama" | "deepseek" | "groq" | "mock";

export function createModel(type: ProviderType, apiKey: string, model: string, baseUrl?: string | null): LanguageModelV1 {
  switch (type) {
    case "openai":
      return createOpenAI({ apiKey, baseURL: baseUrl ?? undefined })(model);
    case "anthropic":
      return createAnthropic({ apiKey })(model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(model);
    case "ollama":
      return createOpenAI({ apiKey, baseURL: baseUrl ?? "http://localhost:11434/v1" })(model);
    case "deepseek":
      return createOpenAI({ apiKey, baseURL: baseUrl ?? "https://api.deepseek.com" })(model);
    case "groq":
      return createOpenAI({ apiKey, baseURL: baseUrl ?? "https://api.groq.com/openai/v1" })(model);
    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}

export async function getActiveModel(overrideProviderId?: string | null, overrideModel?: string | null): Promise<{ model: LanguageModelV1; provider: typeof providers.$inferSelect } | null> {
  // If override provider/model specified, use those
  if (overrideProviderId) {
    const [p] = await db.select().from(providers).where(eq(providers.id, Number(overrideProviderId)));
    if (p && p.apiKey) {
      const modelName = overrideModel ?? p.models?.[0] ?? getDefaultModel(p.type as ProviderType);
      return { model: createModel(p.type as ProviderType, p.apiKey, modelName, p.baseUrl), provider: p };
    }
  }

  const rows = await db.select().from(providers).where(eq(providers.isActive, true));
  const active = rows.find(p => p.apiKey && p.type !== "mock");
  if (!active || !active.apiKey) return null;

  const modelName = overrideModel ?? active.models?.[0] ?? getDefaultModel(active.type as ProviderType);
  return {
    model: createModel(active.type as ProviderType, active.apiKey, modelName, active.baseUrl),
    provider: active,
  };
}

function getDefaultModel(type: ProviderType): string {
  switch (type) {
    case "openai": return "gpt-4o-mini";
    case "anthropic": return "claude-sonnet-4-20250514";
    case "google": return "gemini-2.0-flash";
    case "ollama": return "llama3.2";
    case "deepseek": return "deepseek-chat";
    case "groq": return "llama-3.3-70b-versatile";
    default: return "gpt-4o-mini";
  }
}
