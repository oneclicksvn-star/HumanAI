import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Agents ──────────────────────────────────────────────────────────────────

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🤖"),
  nature: text("nature"),
  purpose: text("purpose"),
  vibe: text("vibe"),
  description: text("description"), // frontmatter / short expertise summary
  agentType: text("agent_type", { enum: ["open", "predefined"] }).notNull().default("open"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["active", "sleeping", "archived", "summoning"] }).notNull().default("active"),
  mood: text("mood", { enum: ["neutral", "positive", "empathetic", "calming", "supportive", "focused", "reflective", "satisfied"] }).notNull().default("neutral"),
  moodLabel: text("mood_label").notNull().default("Neutral"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  xpNext: integer("xp_next").notNull().default(1000),
  energy: integer("energy").notNull().default(100),
  lifecycle: text("lifecycle", { enum: ["infant", "child", "teen", "adult", "expert", "mentor"] }).notNull().default("infant"),
  // LLM config
  model: text("model"),
  providerId: text("provider_id"),
  temperature: real("temperature"),
  maxTokens: integer("max_tokens"),
  contextWindow: integer("context_window").notNull().default(128000),
  maxToolIterations: integer("max_tool_iterations").notNull().default(10),
  // Prompt & behavior
  systemPrompt: text("system_prompt"),
  thinkingLevel: text("thinking_level", { enum: ["off", "low", "medium", "high"] }).notNull().default("off"),
  selfEvolve: integer("self_evolve", { mode: "boolean" }).notNull().default(false),
  skillEvolve: integer("skill_evolve", { mode: "boolean" }).notNull().default(false),
  // Per-agent JSONB configs (nullable — nil means use global defaults)
  toolsConfig: text("tools_config", { mode: "json" }).$type<AgentToolsConfig | null>(),
  subagentsConfig: text("subagents_config", { mode: "json" }).$type<AgentSubagentsConfig | null>(),
  memoryConfig: text("memory_config", { mode: "json" }).$type<AgentMemoryConfig | null>(),
  sandboxConfig: text("sandbox_config", { mode: "json" }).$type<AgentSandboxConfig | null>(),
  // Workspace
  workspace: text("workspace"),
  restrictToWorkspace: integer("restrict_to_workspace", { mode: "boolean" }).notNull().default(false),
  // Agent key (slug identifier)
  agentKey: text("agent_key"),
  // System prompt mode
  promptMode: text("prompt_mode", { enum: ["full", "task", "minimal", "none"] }).notNull().default("full"),
  // Dreaming config
  dreamingConfig: text("dreaming_config", { mode: "json" }).$type<AgentDreamingConfig | null>(),
  // Budget
  budgetMonthlyCents: integer("budget_monthly_cents"),
  // Legacy
  skills: text("skills", { mode: "json" }).$type<string[]>().default([]),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Agent Config Types ──────────────────────────────────────────────────────

export interface AgentToolsConfig {
  allowList?: string[];
  denyList?: string[];
  requireApproval?: string[];
  toolCallPrefix?: string;
}

export interface AgentSubagentsConfig {
  maxConcurrent?: number;      // default 4
  maxSpawnDepth?: number;      // default 3
  maxChildrenPerAgent?: number; // default 8
  archiveAfterMinutes?: number; // default 30
  model?: string;              // model override for subagents
}

export interface AgentMemoryConfig {
  enabled?: boolean;           // memory enabled for this agent
  autoExtract?: boolean;       // auto-extract memories from chat
  maxMemories?: number;        // max memories to store
  consolidationInterval?: string; // e.g. "every 24h"
  importanceThreshold?: number; // min importance to persist (0-1)
  maxChunkLength?: number;     // max chunk length for memory extraction
  chunkOverlap?: number;       // overlap between chunks
  maxResults?: number;         // max results for memory search
  minScore?: number;           // min similarity score for retrieval
  vectorWeight?: number;       // weight for vector similarity (0-1)
  textWeight?: number;         // weight for text match (0-1)
}

export interface AgentDreamingConfig {
  enabled?: boolean;           // dreaming enabled
  threshold?: number;          // min memories before consolidation
  debounceMs?: number;         // debounce between runs
  verbose?: boolean;           // verbose logging
}

export interface AgentSandboxConfig {
  enabled?: boolean;
  timeoutMs?: number;
  maxOutputBytes?: number;
  allowNetwork?: boolean;
}

// ─── Personality (Big Five + custom traits) ──────────────────────────────────

export const personality = sqliteTable("personality", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  openness: integer("openness").notNull().default(50),
  conscientiousness: integer("conscientiousness").notNull().default(50),
  extraversion: integer("extraversion").notNull().default(50),
  agreeableness: integer("agreeableness").notNull().default(50),
  neuroticism: integer("neuroticism").notNull().default(50),
  creativity: integer("creativity").notNull().default(50),
  empathy: integer("empathy").notNull().default(50),
  humor: integer("humor").notNull().default(50),
  curiosity: integer("curiosity").notNull().default(50),
  assertiveness: integer("assertiveness").notNull().default(50),
  communicationStyle: text("communication_style").notNull().default("balanced"),
  culture: text("culture"),
});

// ─── Sessions ────────────────────────────────────────────────────────────────

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New Chat"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Messages ────────────────────────────────────────────────────────────────

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "agent", "system", "tool"] }).notNull(),
  content: text("content").notNull(),
  mood: text("mood"),
  thinking: text("thinking"),
  toolCalls: text("tool_calls", { mode: "json" }).$type<Array<{ name: string; input: string | null; output: string | null; status: string; durationMs: number }>>(),
  moodShift: text("mood_shift", { mode: "json" }).$type<{ from: string; to: string }>(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Teams ───────────────────────────────────────────────────────────────────

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  leadAgentId: integer("lead_agent_id"),
  agentIds: text("agent_ids", { mode: "json" }).$type<number[]>().default([]),
  values: text("values", { mode: "json" }).$type<string[]>().default([]),
  communicationStyle: text("communication_style").notNull().default("collaborative"),
  status: text("status", { enum: ["active", "archived"] }).notNull().default("active"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["todo", "in_progress", "review", "done", "blocked", "cancelled"] }).notNull().default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high"] }).notNull().default("medium"),
  assignedAgentId: integer("assigned_agent_id"),
  progress: integer("progress").notNull().default(0),
  qualityStars: integer("quality_stars"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Memory ──────────────────────────────────────────────────────────────────

export const memoryEntries = sqliteTable("memory_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  type: text("type", { enum: ["episodic", "semantic", "procedural"] }).notNull().default("episodic"),
  mood: text("mood").notNull().default("neutral"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  importance: real("importance").notNull().default(0.5),
  recallCount: integer("recall_count").notNull().default(0),
  decayFactor: real("decay_factor").notNull().default(1.0),
  sourceSessionId: integer("source_session_id"),
  lastRecalledAt: text("last_recalled_at"),
  consolidated: integer("consolidated", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Knowledge Graph ─────────────────────────────────────────────────────────

export const knowledgeNodes = sqliteTable("knowledge_nodes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull().default("concept"),
  confidence: real("confidence").notNull().default(0.8),
  x: real("x"),
  y: real("y"),
});

export const knowledgeEdges = sqliteTable("knowledge_edges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  target: text("target").notNull(),
  relation: text("relation").notNull(),
  weight: real("weight").notNull().default(1.0),
});

// ─── Agent Skills ────────────────────────────────────────────────────────────

export const agentSkills = sqliteTable("agent_skills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  mastery: integer("mastery").notNull().default(0),
  practiceCount: integer("practice_count").notNull().default(0),
  category: text("category").notNull().default("general"),
});

// ─── Dreams ──────────────────────────────────────────────────────────────────

export const dreams = sqliteTable("dreams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  insight: text("insight").notNull(),
  sourceTags: text("source_tags", { mode: "json" }).$type<string[]>().default([]),
  consolidatedAt: text("consolidated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Providers ───────────────────────────────────────────────────────────────

export const providers = sqliteTable("providers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // anthropic, openai, google, ollama, etc.
  apiKey: text("api_key"),
  baseUrl: text("base_url"),
  models: text("models", { mode: "json" }).$type<string[]>().default([]),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Settings ────────────────────────────────────────────────────────────────

export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  category: text("category").notNull().default("general"),
});

// ─── Activity Log ────────────────────────────────────────────────────────────

export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id"),
  type: text("type").notNull(),
  summary: text("summary").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Channels ────────────────────────────────────────────────────────────────

export const channels = sqliteTable("channels", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // whatsapp, telegram, discord, slack, email, webhook
  status: text("status", { enum: ["connected", "disconnected", "error"] }).notNull().default("disconnected"),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  agentId: integer("agent_id"),
  messageCount: integer("message_count").notNull().default(0),
  lastActivity: text("last_activity"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Tools ───────────────────────────────────────────────────────────────────

export const tools = sqliteTable("tools", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("general"), // code, web, file, system, custom
  type: text("type", { enum: ["builtin", "custom", "mcp"] }).notNull().default("builtin"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  requiresApproval: integer("requires_approval", { mode: "boolean" }).notNull().default(false),
  usageCount: integer("usage_count").notNull().default(0),
  schema: text("schema", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── MCP Servers ─────────────────────────────────────────────────────────────

export const mcpServers = sqliteTable("mcp_servers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  type: text("type").notNull().default("stdio"), // stdio, http
  status: text("status", { enum: ["running", "stopped", "error"] }).notNull().default("stopped"),
  toolCount: integer("tool_count").notNull().default(0),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Hooks ───────────────────────────────────────────────────────────────────

export const hooks = sqliteTable("hooks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  event: text("event").notNull(), // pre_tool_use, post_tool_use, message_received, agent_spawn, etc.
  action: text("action").notNull(), // approve, log, notify, block, transform
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  priority: integer("priority").notNull().default(0),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  triggerCount: integer("trigger_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Cron Jobs ───────────────────────────────────────────────────────────────

export const cronJobs = sqliteTable("cron_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  schedule: text("schedule").notNull(), // "every 5m", "every 1h", "every 24h"
  type: text("type").notNull().default("custom"), // memory_consolidation, health_check, cleanup_old_logs, custom_script
  handler: text("handler"), // handler function name
  agentId: integer("agent_id"),
  command: text("command").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  config: text("config", { mode: "json" }).$type<Record<string, unknown>>().default({}),
  lastRunAt: text("last_run_at"),
  lastStatus: text("last_status"), // success, error
  lastOutput: text("last_output"),
  nextRunAt: text("next_run_at").notNull().$defaultFn(() => new Date().toISOString()),
  runCount: integer("run_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Vault (Documents) ──────────────────────────────────────────────────────

export const vaultDocs = sqliteTable("vault_docs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  folder: text("folder").notNull().default("/"),
  type: text("type").notNull().default("note"), // note, doc, snippet, wikilink
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  agentId: integer("agent_id"),
  size: integer("size").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── API Keys ────────────────────────────────────────────────────────────────

export const apiKeys = sqliteTable("api_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull(),
  prefix: text("prefix").notNull(), // first 8 chars for display
  permissions: text("permissions", { mode: "json" }).$type<string[]>().default(["read"]),
  lastUsed: text("last_used"),
  expiresAt: text("expires_at"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Usage Logs ──────────────────────────────────────────────────────────────

export const usageLogs = sqliteTable("usage_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id"),
  providerId: integer("provider_id"),
  model: text("model"),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cost: real("cost").notNull().default(0),
  latencyMs: integer("latency_ms"),
  status: text("status").notNull().default("success"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Traces ──────────────────────────────────────────────────────────────────

export const traces = sqliteTable("traces", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id"),
  agentId: integer("agent_id"),
  type: text("type").notNull(), // llm_call, tool_call, memory_recall, delegation
  input: text("input"),
  output: text("output"),
  model: text("model"),
  tokens: integer("tokens"),
  latencyMs: integer("latency_ms"),
  status: text("status").notNull().default("success"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── System Logs ─────────────────────────────────────────────────────────────

export const systemLogs = sqliteTable("system_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  level: text("level", { enum: ["debug", "info", "warn", "error", "fatal"] }).notNull().default("info"),
  source: text("source").notNull(), // server, agent, provider, tool, hook, cron
  message: text("message").notNull(),
  agentId: integer("agent_id"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Agent Context Files (per-agent editable documents: SOUL.md, USER.md, etc.)

export const agentContextFiles = sqliteTable("agent_context_files", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(), // e.g. "SOUL.md", "IDENTITY.md", "MEMORY.md", "AGENTS.md"
  content: text("content").notNull().default(""),
  isSystem: integer("is_system", { mode: "boolean" }).notNull().default(false), // system files can't be deleted
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Agent Commitments (promises/goals the agent tracks) ─────────────────────

export const agentCommitments = sqliteTable("agent_commitments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["event_check_in", "deadline_check", "care_check_in", "open_loop", "follow_up", "reminder"] }).notNull().default("open_loop"),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["active", "completed", "broken", "expired"] }).notNull().default("active"),
  dueAt: text("due_at"),
  targetUserId: text("target_user_id"),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Agent Mood History ──────────────────────────────────────────────────────

export const agentMoodHistory = sqliteTable("agent_mood_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  mood: text("mood").notNull(),
  moodLabel: text("mood_label").notNull(),
  energy: integer("energy").notNull(),
  trigger: text("trigger"), // what caused the mood change
  sessionId: integer("session_id"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Agent Links (directional relationships between agents) ──────────────────

export const agentLinks = sqliteTable("agent_links", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromAgentId: integer("from_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  toAgentId: integer("to_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["delegation", "supervision", "collaboration", "mentorship"] }).notNull().default("delegation"),
  strength: real("strength").notNull().default(1.0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Delegations ─────────────────────────────────────────────────────────────

export const delegations = sqliteTable("delegations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromAgentId: integer("from_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  toAgentId: integer("to_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => sessions.id, { onDelete: "set null" }),
  taskDescription: text("task_description").notNull(),
  context: text("context"),
  status: text("status", { enum: ["pending", "accepted", "in_progress", "completed", "rejected", "failed"] }).notNull().default("pending"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  result: text("result"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Sub-Agent Spawns ────────────────────────────────────────────────────────

export const subAgentSpawns = sqliteTable("sub_agent_spawns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  parentAgentId: integer("parent_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  childAgentId: integer("child_agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  sessionId: integer("session_id").references(() => sessions.id, { onDelete: "set null" }),
  purpose: text("purpose").notNull(),
  mode: text("mode", { enum: ["isolated", "fork", "shared"] }).notNull().default("isolated"),
  status: text("status", { enum: ["active", "completed", "terminated", "error"] }).notNull().default("active"),
  depth: integer("depth").notNull().default(1),
  result: text("result"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  completedAt: text("completed_at"),
});

// ─── Consolidation Jobs ──────────────────────────────────────────────────────

export const consolidationJobs = sqliteTable("consolidation_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  agentId: integer("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["episodic", "semantic", "dreaming", "full"] }).notNull().default("full"),
  status: text("status", { enum: ["pending", "running", "completed", "failed"] }).notNull().default("pending"),
  memoriesProcessed: integer("memories_processed").notNull().default(0),
  entitiesExtracted: integer("entities_extracted").notNull().default(0),
  dreamsGenerated: integer("dreams_generated").notNull().default(0),
  memoriesMerged: integer("memories_merged").notNull().default(0),
  error: text("error"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─── Backups ─────────────────────────────────────────────────────────────────

export const backups = sqliteTable("backups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", { enum: ["full", "agents", "settings", "memory"] }).notNull().default("full"),
  size: integer("size").notNull().default(0),
  status: text("status", { enum: ["completed", "in_progress", "failed"] }).notNull().default("completed"),
  path: text("path"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
