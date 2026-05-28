import { Hono } from "hono";
import { db } from "@humancore/db";
import { providers } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const providersRoutes = new Hono();

type ModelInfo = { id: string; name: string; contextWindow: number; maxTokens: number; reasoning: boolean; vision: boolean };

// Comprehensive model catalog per provider type
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
    { id: "gpt-4", name: "GPT-4", contextWindow: 8192, maxTokens: 4096, reasoning: false, vision: false },
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
    { id: "llama3.2:1b", name: "Llama 3.2 1B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "llama3.2-vision:11b", name: "Llama 3.2 Vision 11B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: true },
    { id: "llama3.2-vision:90b", name: "Llama 3.2 Vision 90B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: true },
    { id: "qwen3:32b", name: "Qwen 3 32B", contextWindow: 128000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "qwen3:14b", name: "Qwen 3 14B", contextWindow: 128000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "qwen3:8b", name: "Qwen 3 8B", contextWindow: 128000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "qwen3:4b", name: "Qwen 3 4B", contextWindow: 128000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "qwen2.5-coder:32b", name: "Qwen 2.5 Coder 32B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "qwen2.5-coder:14b", name: "Qwen 2.5 Coder 14B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder 7B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "gemma3:27b", name: "Gemma 3 27B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "gemma3:12b", name: "Gemma 3 12B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "gemma3:4b", name: "Gemma 3 4B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "gemma3:1b", name: "Gemma 3 1B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "deepseek-r1:70b", name: "DeepSeek R1 70B", contextWindow: 64000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "deepseek-r1:32b", name: "DeepSeek R1 32B", contextWindow: 64000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "deepseek-r1:14b", name: "DeepSeek R1 14B", contextWindow: 64000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "deepseek-r1:8b", name: "DeepSeek R1 8B", contextWindow: 64000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "deepseek-r1:1.5b", name: "DeepSeek R1 1.5B", contextWindow: 64000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "mistral:7b", name: "Mistral 7B", contextWindow: 32000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "mistral-small:24b", name: "Mistral Small 24B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "mistral-nemo:12b", name: "Mistral Nemo 12B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "codellama:34b", name: "Code Llama 34B", contextWindow: 16000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "codellama:13b", name: "Code Llama 13B", contextWindow: 16000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "codellama:7b", name: "Code Llama 7B", contextWindow: 16000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "phi4:14b", name: "Phi 4 14B", contextWindow: 16000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "phi3:14b", name: "Phi 3 14B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "phi3:3.8b", name: "Phi 3 3.8B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "command-r:35b", name: "Command R 35B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "command-r-plus:104b", name: "Command R+ 104B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "nomic-embed-text", name: "Nomic Embed Text", contextWindow: 8192, maxTokens: 0, reasoning: false, vision: false },
    { id: "mxbai-embed-large", name: "MxBAI Embed Large", contextWindow: 512, maxTokens: 0, reasoning: false, vision: false },
    { id: "starcoder2:15b", name: "StarCoder2 15B", contextWindow: 16000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "starcoder2:7b", name: "StarCoder2 7B", contextWindow: 16000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "yi:34b", name: "Yi 34B", contextWindow: 32000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "solar:10.7b", name: "Solar 10.7B", contextWindow: 4096, maxTokens: 4096, reasoning: false, vision: false },
    { id: "dolphin-mixtral:8x7b", name: "Dolphin Mixtral 8x7B", contextWindow: 32000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "nous-hermes2:34b", name: "Nous Hermes 2 34B", contextWindow: 4096, maxTokens: 4096, reasoning: false, vision: false },
    { id: "vicuna:33b", name: "Vicuna 33B", contextWindow: 2048, maxTokens: 2048, reasoning: false, vision: false },
    { id: "llava:34b", name: "LLaVA 34B", contextWindow: 4096, maxTokens: 4096, reasoning: false, vision: true },
    { id: "llava:13b", name: "LLaVA 13B", contextWindow: 4096, maxTokens: 4096, reasoning: false, vision: true },
    { id: "llava:7b", name: "LLaVA 7B", contextWindow: 4096, maxTokens: 4096, reasoning: false, vision: true },
    { id: "bakllava:7b", name: "BakLLaVA 7B", contextWindow: 4096, maxTokens: 4096, reasoning: false, vision: true },
  ],
  deepseek: [
    { id: "deepseek-chat", name: "DeepSeek V3", contextWindow: 64000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "deepseek-reasoner", name: "DeepSeek R1", contextWindow: 64000, maxTokens: 8192, reasoning: true, vision: false },
    { id: "deepseek-coder", name: "DeepSeek Coder", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", contextWindow: 128000, maxTokens: 32768, reasoning: false, vision: false },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "llama-3.2-90b-vision-preview", name: "Llama 3.2 90B Vision", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "llama-3.2-11b-vision-preview", name: "Llama 3.2 11B Vision", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "llama-3.2-3b-preview", name: "Llama 3.2 3B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "llama-3.2-1b-preview", name: "Llama 3.2 1B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "gemma2-9b-it", name: "Gemma 2 9B IT", contextWindow: 8192, maxTokens: 8192, reasoning: false, vision: false },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", contextWindow: 32768, maxTokens: 32768, reasoning: false, vision: false },
    { id: "qwen-qwq-32b", name: "Qwen QwQ 32B", contextWindow: 128000, maxTokens: 32768, reasoning: true, vision: false },
    { id: "deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B", contextWindow: 128000, maxTokens: 16384, reasoning: true, vision: false },
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama 4 Scout 17B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "meta-llama/llama-4-maverick-17b-128e-instruct", name: "Llama 4 Maverick 17B", contextWindow: 128000, maxTokens: 8192, reasoning: false, vision: true },
  ],
  openrouter: [
    { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", contextWindow: 200000, maxTokens: 16000, reasoning: true, vision: true },
    { id: "anthropic/claude-opus-4", name: "Claude Opus 4", contextWindow: 200000, maxTokens: 32000, reasoning: true, vision: true },
    { id: "anthropic/claude-3.7-sonnet", name: "Claude 3.7 Sonnet", contextWindow: 200000, maxTokens: 16000, reasoning: true, vision: true },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", contextWindow: 200000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", contextWindow: 200000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "openai/gpt-4.1", name: "GPT-4.1", contextWindow: 1000000, maxTokens: 32768, reasoning: false, vision: true },
    { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini", contextWindow: 1000000, maxTokens: 32768, reasoning: false, vision: true },
    { id: "openai/gpt-4o", name: "GPT-4o", contextWindow: 128000, maxTokens: 16384, reasoning: false, vision: true },
    { id: "openai/o3", name: "O3", contextWindow: 200000, maxTokens: 100000, reasoning: true, vision: true },
    { id: "openai/o3-mini", name: "O3 Mini", contextWindow: 200000, maxTokens: 100000, reasoning: true, vision: true },
    { id: "openai/o4-mini", name: "O4 Mini", contextWindow: 200000, maxTokens: 100000, reasoning: true, vision: true },
    { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", contextWindow: 1000000, maxTokens: 65536, reasoning: true, vision: true },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", contextWindow: 1000000, maxTokens: 65536, reasoning: true, vision: true },
    { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", contextWindow: 1000000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "meta-llama/llama-4-scout", name: "Llama 4 Scout", contextWindow: 512000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", contextWindow: 1000000, maxTokens: 8192, reasoning: false, vision: true },
    { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3 0324", contextWindow: 64000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "deepseek/deepseek-r1", name: "DeepSeek R1", contextWindow: 64000, maxTokens: 8192, reasoning: true, vision: false },
    { id: "qwen/qwen3-235b-a22b", name: "Qwen 3 235B", contextWindow: 128000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "qwen/qwen3-32b", name: "Qwen 3 32B", contextWindow: 128000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "qwen/qwq-32b", name: "QwQ 32B", contextWindow: 128000, maxTokens: 32768, reasoning: true, vision: false },
    { id: "mistralai/mistral-large-2411", name: "Mistral Large", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "mistralai/codestral-2501", name: "Codestral", contextWindow: 256000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "nvidia/llama-3.1-nemotron-ultra-253b", name: "Nemotron Ultra 253B", contextWindow: 128000, maxTokens: 4096, reasoning: true, vision: false },
    { id: "cohere/command-r-plus-08-2024", name: "Command R+", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "microsoft/phi-4", name: "Phi 4", contextWindow: 16000, maxTokens: 4096, reasoning: false, vision: false },
  ],
  mistral: [
    { id: "mistral-large-latest", name: "Mistral Large", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "mistral-medium-latest", name: "Mistral Medium", contextWindow: 32000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "mistral-small-latest", name: "Mistral Small", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "codestral-latest", name: "Codestral", contextWindow: 256000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "pixtral-large-latest", name: "Pixtral Large", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: true },
    { id: "open-mistral-nemo", name: "Mistral Nemo", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
  ],
  together: [
    { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B Turbo", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B Turbo", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", name: "Llama 3.1 70B Turbo", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", name: "Llama 3.1 8B Turbo", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen 2.5 72B Turbo", contextWindow: 128000, maxTokens: 4096, reasoning: false, vision: false },
    { id: "deepseek-ai/DeepSeek-R1", name: "DeepSeek R1", contextWindow: 64000, maxTokens: 8192, reasoning: true, vision: false },
    { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3", contextWindow: 64000, maxTokens: 8192, reasoning: false, vision: false },
    { id: "google/gemma-2-27b-it", name: "Gemma 2 27B", contextWindow: 8192, maxTokens: 4096, reasoning: false, vision: false },
    { id: "mistralai/Mixtral-8x22B-Instruct-v0.1", name: "Mixtral 8x22B", contextWindow: 65536, maxTokens: 4096, reasoning: false, vision: false },
  ],
  xai: [
    { id: "grok-3", name: "Grok 3", contextWindow: 131072, maxTokens: 16384, reasoning: false, vision: false },
    { id: "grok-3-mini", name: "Grok 3 Mini", contextWindow: 131072, maxTokens: 16384, reasoning: true, vision: false },
    { id: "grok-2-vision-1212", name: "Grok 2 Vision", contextWindow: 32768, maxTokens: 4096, reasoning: false, vision: true },
    { id: "grok-2-1212", name: "Grok 2", contextWindow: 131072, maxTokens: 4096, reasoning: false, vision: false },
  ],
};

// Dynamic model fetching from real provider APIs
async function fetchModelsFromProvider(provider: { type: string; baseUrl: string | null; apiKey: string | null }): Promise<ModelInfo[]> {
  const timeout = 5000;
  try {
    switch (provider.type) {
      case "ollama": {
        // Ollama: GET /api/tags
        const baseUrl = provider.baseUrl || "http://localhost:11434";
        const resp = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(timeout) });
        if (!resp.ok) return [];
        const data = await resp.json() as { models?: Array<{ name: string; details?: { parameter_size?: string; family?: string }; size?: number }> };
        return (data.models ?? []).map(m => ({
          id: m.name,
          name: m.name,
          contextWindow: 0,
          maxTokens: 0,
          reasoning: false,
          vision: m.name.includes("vision") || m.name.includes("llava"),
        }));
      }
      case "openai": {
        // OpenAI: GET /v1/models
        const baseUrl = provider.baseUrl || "https://api.openai.com";
        if (!provider.apiKey) return [];
        const resp = await fetch(`${baseUrl}/v1/models`, {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(timeout),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { data?: Array<{ id: string; owned_by?: string }> };
        return (data.data ?? [])
          .filter(m => m.id.startsWith("gpt-") || m.id.startsWith("o1") || m.id.startsWith("o3") || m.id.startsWith("o4") || m.id.includes("chatgpt"))
          .map(m => ({ id: m.id, name: m.id, contextWindow: 0, maxTokens: 0, reasoning: m.id.startsWith("o"), vision: m.id.includes("4o") || m.id.includes("vision") }));
      }
      case "anthropic": {
        // Anthropic: GET /v1/models
        const baseUrl = provider.baseUrl || "https://api.anthropic.com";
        if (!provider.apiKey) return [];
        const resp = await fetch(`${baseUrl}/v1/models`, {
          headers: { "x-api-key": provider.apiKey, "anthropic-version": "2023-06-01" },
          signal: AbortSignal.timeout(timeout),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { data?: Array<{ id: string; display_name?: string }> };
        return (data.data ?? []).map(m => ({
          id: m.id,
          name: m.display_name || m.id,
          contextWindow: 0, maxTokens: 0,
          reasoning: m.id.includes("sonnet-4") || m.id.includes("opus-4") || m.id.includes("3-7"),
          vision: true,
        }));
      }
      case "google": {
        // Google: GET /v1beta/models
        if (!provider.apiKey) return [];
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${provider.apiKey}`, {
          signal: AbortSignal.timeout(timeout),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { models?: Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }> };
        return (data.models ?? [])
          .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
          .map(m => ({
            id: m.name?.replace("models/", "") ?? "",
            name: m.displayName || m.name?.replace("models/", "") || "",
            contextWindow: 0, maxTokens: 0, reasoning: (m.displayName || "").includes("2.5"), vision: true,
          }));
      }
      case "groq": {
        // Groq: GET /openai/v1/models
        const baseUrl = provider.baseUrl || "https://api.groq.com";
        if (!provider.apiKey) return [];
        const resp = await fetch(`${baseUrl}/openai/v1/models`, {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(timeout),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { data?: Array<{ id: string; owned_by?: string }> };
        return (data.data ?? []).map(m => ({
          id: m.id, name: m.id, contextWindow: 0, maxTokens: 0,
          reasoning: m.id.includes("qwq") || m.id.includes("r1"),
          vision: m.id.includes("vision") || m.id.includes("scout") || m.id.includes("maverick"),
        }));
      }
      case "deepseek": {
        // DeepSeek: GET /models (OpenAI compatible)
        const baseUrl = provider.baseUrl || "https://api.deepseek.com";
        if (!provider.apiKey) return [];
        const resp = await fetch(`${baseUrl}/models`, {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(timeout),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { data?: Array<{ id: string }> };
        return (data.data ?? []).map(m => ({
          id: m.id, name: m.id, contextWindow: 0, maxTokens: 0,
          reasoning: m.id.includes("reasoner") || m.id.includes("r1"),
          vision: false,
        }));
      }
      case "openrouter": {
        // OpenRouter: GET /api/v1/models
        if (!provider.apiKey) return [];
        const resp = await fetch("https://openrouter.ai/api/v1/models", {
          headers: { Authorization: `Bearer ${provider.apiKey}` },
          signal: AbortSignal.timeout(timeout),
        });
        if (!resp.ok) return [];
        const data = await resp.json() as { data?: Array<{ id: string; name?: string; context_length?: number }> };
        return (data.data ?? []).slice(0, 100).map(m => ({
          id: m.id, name: m.name || m.id, contextWindow: m.context_length || 0, maxTokens: 0,
          reasoning: m.id.includes("r1") || m.id.includes("qwq") || m.id.includes("o3") || m.id.includes("o4"),
          vision: m.id.includes("vision") || m.id.includes("4o") || m.id.includes("gemini") || m.id.includes("claude"),
        }));
      }
      default:
        return [];
    }
  } catch {
    return [];
  }
}

// Enrich dynamic models with catalog metadata
function enrichModels(dynamicModels: ModelInfo[], catalogModels: ModelInfo[]): ModelInfo[] {
  const catalogMap = new Map(catalogModels.map(m => [m.id, m]));
  return dynamicModels.map(m => {
    const catalogEntry = catalogMap.get(m.id);
    if (catalogEntry) {
      return {
        ...m,
        name: catalogEntry.name || m.name,
        contextWindow: catalogEntry.contextWindow || m.contextWindow,
        maxTokens: catalogEntry.maxTokens || m.maxTokens,
        reasoning: catalogEntry.reasoning || m.reasoning,
        vision: catalogEntry.vision || m.vision,
      };
    }
    return m;
  });
}

providersRoutes.get("/providers", async (c) => {
  const rows = await db.select().from(providers);
  return c.json(rows.map(p => ({
    ...p,
    apiKey: p.apiKey ? "••••" + p.apiKey.slice(-4) : null,
  })));
});

// Get models for a specific provider (dynamic fetch + catalog + DB)
providersRoutes.get("/providers/:id/models", async (c) => {
  const id = Number(c.req.param("id"));
  const [provider] = await db.select().from(providers).where(eq(providers.id, id));
  if (!provider) return c.json({ error: "Provider not found" }, 404);

  const catalogModels = MODEL_CATALOG[provider.type] ?? [];

  // Try dynamic fetch from real provider API
  let dynamicModels: ModelInfo[] = [];
  try {
    dynamicModels = await fetchModelsFromProvider({
      type: provider.type,
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
    });
  } catch { /* ignore */ }

  // Enrich dynamic models with catalog metadata
  const enrichedDynamic = enrichModels(dynamicModels, catalogModels);

  // DB-stored models
  const dbModels: ModelInfo[] = (provider.models ?? []).map((m: string) => ({
    id: m, name: m, contextWindow: 0, maxTokens: 0, reasoning: false, vision: false,
  }));

  // Merge: catalog first (known good metadata), then enriched dynamic, then DB fallback
  // Dedup by id, catalog takes priority for metadata
  const seen = new Set<string>();
  const merged: ModelInfo[] = [];

  // Add catalog models first (best metadata)
  for (const m of catalogModels) {
    if (!seen.has(m.id)) { seen.add(m.id); merged.push(m); }
  }
  // Add dynamic models not in catalog
  for (const m of enrichedDynamic) {
    if (!seen.has(m.id)) { seen.add(m.id); merged.push(m); }
  }
  // Add DB models not yet seen
  for (const m of dbModels) {
    if (!seen.has(m.id)) { seen.add(m.id); merged.push(m); }
  }

  return c.json({
    provider: { id: provider.id, name: provider.name, type: provider.type },
    models: merged,
    source: dynamicModels.length > 0 ? "dynamic+catalog" : "catalog+db",
  });
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

// Test provider connection
providersRoutes.post("/providers/:id/test", async (c) => {
  const id = Number(c.req.param("id"));
  const [provider] = await db.select().from(providers).where(eq(providers.id, id));
  if (!provider) return c.json({ ok: false, error: "Provider not found" }, 404);
  if (!provider.apiKey) return c.json({ ok: false, error: "No API key configured" });

  try {
    const baseUrl = provider.baseUrl || getDefaultBaseUrl(provider.type);
    const testUrl = getTestEndpoint(provider.type, baseUrl);
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (provider.type === "anthropic") {
      headers["x-api-key"] = provider.apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else if (provider.type !== "ollama") {
      headers["Authorization"] = `Bearer ${provider.apiKey}`;
    }

    const res = await fetch(testUrl, { headers, signal: AbortSignal.timeout(10000) });
    return c.json({ ok: res.ok, status: res.status, provider: provider.type });
  } catch (e: any) {
    return c.json({ ok: false, error: e.message ?? "Connection failed" });
  }
});

function getDefaultBaseUrl(type: string): string {
  const urls: Record<string, string> = {
    anthropic: "https://api.anthropic.com",
    openai: "https://api.openai.com",
    google: "https://generativelanguage.googleapis.com",
    ollama: "http://localhost:11434",
    deepseek: "https://api.deepseek.com",
    groq: "https://api.groq.com",
    openrouter: "https://openrouter.ai",
    together: "https://api.together.xyz",
    mistral: "https://api.mistral.ai",
    xai: "https://api.x.ai",
  };
  return urls[type] ?? "http://localhost:11434";
}

function getTestEndpoint(type: string, baseUrl: string): string {
  if (type === "anthropic") return `${baseUrl}/v1/models`;
  if (type === "google") return `${baseUrl}/v1beta/models`;
  if (type === "ollama") return `${baseUrl}/api/tags`;
  return `${baseUrl}/v1/models`;
}
