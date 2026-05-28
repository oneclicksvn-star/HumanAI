import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Agents ──────────────────────────────────────────────────────────────────

export const agents = sqliteTable("agents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("🤖"),
  nature: text("nature"),
  purpose: text("purpose"),
  vibe: text("vibe"),
  status: text("status", { enum: ["active", "sleeping", "archived"] }).notNull().default("active"),
  mood: text("mood", { enum: ["neutral", "positive", "empathetic", "calming", "supportive", "focused", "reflective", "satisfied"] }).notNull().default("neutral"),
  moodLabel: text("mood_label").notNull().default("Neutral"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  xpNext: integer("xp_next").notNull().default(1000),
  energy: integer("energy").notNull().default(100),
  lifecycle: text("lifecycle", { enum: ["infant", "child", "teen", "adult", "expert", "mentor"] }).notNull().default("infant"),
  model: text("model"),
  providerId: text("provider_id"),
  temperature: real("temperature"),
  systemPrompt: text("system_prompt"),
  skills: text("skills", { mode: "json" }).$type<string[]>().default([]),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

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
  type: text("type").notNull(), // message, tool_call, memory_store, task_update, mood_change, etc.
  summary: text("summary").notNull(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});
