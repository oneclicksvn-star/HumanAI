import { Hono } from "hono";
import { db } from "@humancore/db";
import { agents, personality, agentContextFiles, agentCommitments, agentMoodHistory, subAgentSpawns, delegations, agentLinks, agentSkills, memoryEntries, sessions } from "@humancore/db/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";

export const agentsRoutes = new Hono();

// ─── CRUD ────────────────────────────────────────────────────────────────────

agentsRoutes.get("/agents", async (c) => {
  const rows = await db.select().from(agents);
  return c.json(rows);
});

agentsRoutes.get("/agents/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  return c.json(agent);
});

agentsRoutes.post("/agents", async (c) => {
  const body = await c.req.json();
  const [agent] = await db.insert(agents).values({
    name: body.name ?? "New Agent",
    emoji: body.emoji ?? "🤖",
    nature: body.nature,
    purpose: body.purpose,
    vibe: body.vibe,
    description: body.description,
    agentType: body.agentType ?? "open",
    agentKey: body.agentKey ?? null,
    promptMode: body.promptMode ?? "full",
    model: body.model,
    providerId: body.providerId,
    temperature: body.temperature,
    maxTokens: body.maxTokens,
    contextWindow: body.contextWindow ?? 128000,
    maxToolIterations: body.maxToolIterations ?? 10,
    thinkingLevel: body.thinkingLevel ?? "off",
    selfEvolve: body.selfEvolve ?? false,
    skillEvolve: body.skillEvolve ?? false,
    systemPrompt: body.systemPrompt,
    workspace: body.workspace,
    toolsConfig: body.toolsConfig ?? null,
    subagentsConfig: body.subagentsConfig ?? null,
    memoryConfig: body.memoryConfig ?? null,
    sandboxConfig: body.sandboxConfig ?? null,
    dreamingConfig: body.dreamingConfig ?? null,
    budgetMonthlyCents: body.budgetMonthlyCents ?? null,
  }).returning();

  // Create default personality
  await db.insert(personality).values({ agentId: agent.id });

  // Bootstrap context files (SOUL.md, IDENTITY.md, AGENTS.md)
  await bootstrapContextFiles(agent.id, agent.name, agent.emoji, agent.nature, agent.purpose, agent.vibe);

  return c.json(agent, 201);
});

agentsRoutes.patch("/agents/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [agent] = await db.update(agents).set({
    ...body,
    updatedAt: new Date().toISOString(),
  }).where(eq(agents.id, id)).returning();
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  return c.json(agent);
});

agentsRoutes.delete("/agents/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(agents).where(eq(agents.id, id));
  return c.body(null, 204);
});

// ─── Agent Full Profile (aggregated view) ────────────────────────────────────

agentsRoutes.get("/agents/:id/profile", async (c) => {
  const id = Number(c.req.param("id"));
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  const [traits] = await db.select().from(personality).where(eq(personality.agentId, id));
  const contextFilesRows = await db.select().from(agentContextFiles).where(eq(agentContextFiles.agentId, id));
  const commitmentsRows = await db.select().from(agentCommitments).where(and(eq(agentCommitments.agentId, id), eq(agentCommitments.status, "active")));
  const skillsRows = await db.select().from(agentSkills).where(eq(agentSkills.agentId, id));
  const [memCount] = await db.select({ count: count() }).from(memoryEntries).where(eq(memoryEntries.agentId, id));
  const [sessionCount] = await db.select({ count: count() }).from(sessions).where(eq(sessions.agentId, id));

  // Sub-agents spawned by this agent
  const spawns = await db.select().from(subAgentSpawns).where(eq(subAgentSpawns.parentAgentId, id));
  const activeSpawns = spawns.filter(s => s.status === "active");

  // Delegations
  const givenDelegations = await db.select().from(delegations).where(eq(delegations.fromAgentId, id));
  const receivedDelegations = await db.select().from(delegations).where(eq(delegations.toAgentId, id));

  // Links
  const outLinks = await db.select().from(agentLinks).where(eq(agentLinks.fromAgentId, id));
  const inLinks = await db.select().from(agentLinks).where(eq(agentLinks.toAgentId, id));

  return c.json({
    agent,
    personality: traits,
    contextFiles: contextFilesRows.map(f => ({ id: f.id, fileName: f.fileName, isSystem: f.isSystem, updatedAt: f.updatedAt })),
    commitments: commitmentsRows,
    skills: skillsRows,
    stats: {
      memoriesCount: memCount?.count ?? 0,
      sessionsCount: sessionCount?.count ?? 0,
      activeSubAgents: activeSpawns.length,
      totalSpawns: spawns.length,
      delegationsGiven: givenDelegations.length,
      delegationsReceived: receivedDelegations.length,
      outboundLinks: outLinks.length,
      inboundLinks: inLinks.length,
    },
  });
});

// ─── Personality ─────────────────────────────────────────────────────────────

agentsRoutes.get("/agents/:id/personality", async (c) => {
  const agentId = Number(c.req.param("id"));
  let [p] = await db.select().from(personality).where(eq(personality.agentId, agentId));
  if (!p) {
    [p] = await db.insert(personality).values({ agentId }).returning();
  }
  return c.json(p);
});

agentsRoutes.patch("/agents/:id/personality", async (c) => {
  const agentId = Number(c.req.param("id"));
  const body = await c.req.json();
  const [existing] = await db.select().from(personality).where(eq(personality.agentId, agentId));
  let p;
  if (existing) {
    [p] = await db.update(personality).set(body).where(eq(personality.agentId, agentId)).returning();
  } else {
    [p] = await db.insert(personality).values({ agentId, ...body }).returning();
  }
  return c.json(p);
});

// ─── Emotion & Mood ──────────────────────────────────────────────────────────

agentsRoutes.get("/agents/:id/emotion", async (c) => {
  const agentId = Number(c.req.param("id"));
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  return c.json({
    agentId: agent.id,
    mood: agent.mood,
    moodLabel: agent.moodLabel,
    energy: agent.energy,
    stress: Math.max(0, 100 - agent.energy),
  });
});

agentsRoutes.get("/agents/:id/mood-history", async (c) => {
  const agentId = Number(c.req.param("id"));
  const limit = Number(c.req.query("limit") ?? "50");
  const rows = await db.select().from(agentMoodHistory)
    .where(eq(agentMoodHistory.agentId, agentId))
    .orderBy(desc(agentMoodHistory.createdAt))
    .limit(limit);
  return c.json(rows);
});

agentsRoutes.post("/agents/:id/mood", async (c) => {
  const agentId = Number(c.req.param("id"));
  const body = await c.req.json();
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  const oldMood = agent.mood;
  const newMood = body.mood;
  const moodLabel = body.moodLabel ?? newMood.charAt(0).toUpperCase() + newMood.slice(1);

  // Update agent mood
  await db.update(agents).set({
    mood: newMood,
    moodLabel,
    updatedAt: new Date().toISOString(),
  }).where(eq(agents.id, agentId));

  // Record history
  await db.insert(agentMoodHistory).values({
    agentId,
    mood: newMood,
    moodLabel,
    energy: agent.energy,
    trigger: body.trigger ?? null,
    sessionId: body.sessionId ?? null,
  });

  return c.json({ from: oldMood, to: newMood, moodLabel });
});

// ─── Context Files (SOUL.md, IDENTITY.md, etc.) ─────────────────────────────

agentsRoutes.get("/agents/:id/context-files", async (c) => {
  const agentId = Number(c.req.param("id"));
  const rows = await db.select().from(agentContextFiles).where(eq(agentContextFiles.agentId, agentId));
  return c.json(rows);
});

agentsRoutes.get("/agents/:id/context-files/:fileName", async (c) => {
  const agentId = Number(c.req.param("id"));
  const fileName = c.req.param("fileName");
  const [file] = await db.select().from(agentContextFiles)
    .where(and(eq(agentContextFiles.agentId, agentId), eq(agentContextFiles.fileName, fileName)));
  if (!file) return c.json({ error: "File not found" }, 404);
  return c.json(file);
});

agentsRoutes.put("/agents/:id/context-files/:fileName", async (c) => {
  const agentId = Number(c.req.param("id"));
  const fileName = c.req.param("fileName");
  const body = await c.req.json();

  const [existing] = await db.select().from(agentContextFiles)
    .where(and(eq(agentContextFiles.agentId, agentId), eq(agentContextFiles.fileName, fileName)));

  if (existing) {
    const [updated] = await db.update(agentContextFiles).set({
      content: body.content,
      updatedAt: new Date().toISOString(),
    }).where(eq(agentContextFiles.id, existing.id)).returning();
    return c.json(updated);
  } else {
    const [created] = await db.insert(agentContextFiles).values({
      agentId,
      fileName,
      content: body.content ?? "",
      isSystem: body.isSystem ?? false,
    }).returning();
    return c.json(created, 201);
  }
});

agentsRoutes.delete("/agents/:id/context-files/:fileName", async (c) => {
  const agentId = Number(c.req.param("id"));
  const fileName = c.req.param("fileName");
  const [file] = await db.select().from(agentContextFiles)
    .where(and(eq(agentContextFiles.agentId, agentId), eq(agentContextFiles.fileName, fileName)));
  if (!file) return c.json({ error: "File not found" }, 404);
  if (file.isSystem) return c.json({ error: "Cannot delete system file" }, 403);
  await db.delete(agentContextFiles).where(eq(agentContextFiles.id, file.id));
  return c.body(null, 204);
});

// ─── Commitments ─────────────────────────────────────────────────────────────

agentsRoutes.get("/agents/:id/commitments", async (c) => {
  const agentId = Number(c.req.param("id"));
  const status = c.req.query("status"); // optional filter
  let query = db.select().from(agentCommitments).where(eq(agentCommitments.agentId, agentId));
  const rows = await query.orderBy(desc(agentCommitments.createdAt));
  if (status) {
    return c.json(rows.filter(r => r.status === status));
  }
  return c.json(rows);
});

agentsRoutes.post("/agents/:id/commitments", async (c) => {
  const agentId = Number(c.req.param("id"));
  const body = await c.req.json();
  const [commitment] = await db.insert(agentCommitments).values({
    agentId,
    type: body.type ?? "open_loop",
    title: body.title,
    description: body.description,
    dueAt: body.dueAt,
    targetUserId: body.targetUserId,
    metadata: body.metadata,
  }).returning();
  return c.json(commitment, 201);
});

agentsRoutes.patch("/agents/:id/commitments/:commitmentId", async (c) => {
  const commitmentId = Number(c.req.param("commitmentId"));
  const body = await c.req.json();
  const updates: Record<string, unknown> = { ...body };
  if (body.status === "completed") {
    updates.completedAt = new Date().toISOString();
  }
  const [updated] = await db.update(agentCommitments).set(updates)
    .where(eq(agentCommitments.id, commitmentId)).returning();
  if (!updated) return c.json({ error: "Commitment not found" }, 404);
  return c.json(updated);
});

// ─── Agent Config (per-agent tool policy, subagent config, memory config) ────

agentsRoutes.get("/agents/:id/config", async (c) => {
  const id = Number(c.req.param("id"));
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  return c.json({
    agentId: id,
    llm: {
      model: agent.model,
      providerId: agent.providerId,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      contextWindow: agent.contextWindow,
      thinkingLevel: agent.thinkingLevel,
    },
    tools: agent.toolsConfig ?? { allowList: null, denyList: null, requireApproval: null },
    subagents: agent.subagentsConfig ?? { maxConcurrent: 4, maxSpawnDepth: 3, maxChildrenPerAgent: 8, archiveAfterMinutes: 30 },
    memory: agent.memoryConfig ?? { autoExtract: true, maxMemories: 1000, importanceThreshold: 0.3, maxChunkLength: 2000, chunkOverlap: 200, maxResults: 10, minScore: 0.5, vectorWeight: 0.6, textWeight: 0.4 },
    sandbox: agent.sandboxConfig ?? { enabled: true, timeoutMs: 30000, maxOutputBytes: 1048576, allowNetwork: false },
    dreaming: agent.dreamingConfig ?? { enabled: false, threshold: 50, debounceMs: 300000, verbose: false },
    promptMode: agent.promptMode ?? "full",
    behavior: {
      selfEvolve: agent.selfEvolve,
      skillEvolve: agent.skillEvolve,
      maxToolIterations: agent.maxToolIterations,
      restrictToWorkspace: agent.restrictToWorkspace,
    },
    budget: {
      monthlyCents: agent.budgetMonthlyCents,
    },
  });
});

agentsRoutes.patch("/agents/:id/config", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const updates: Record<string, unknown> = {};

  if (body.llm) {
    if (body.llm.model !== undefined) updates.model = body.llm.model;
    if (body.llm.providerId !== undefined) updates.providerId = body.llm.providerId;
    if (body.llm.temperature !== undefined) updates.temperature = body.llm.temperature;
    if (body.llm.maxTokens !== undefined) updates.maxTokens = body.llm.maxTokens;
    if (body.llm.contextWindow !== undefined) updates.contextWindow = body.llm.contextWindow;
    if (body.llm.thinkingLevel !== undefined) updates.thinkingLevel = body.llm.thinkingLevel;
  }
  if (body.tools !== undefined) updates.toolsConfig = body.tools;
  if (body.subagents !== undefined) updates.subagentsConfig = body.subagents;
  if (body.memory !== undefined) updates.memoryConfig = body.memory;
  if (body.sandbox !== undefined) updates.sandboxConfig = body.sandbox;
  if (body.behavior) {
    if (body.behavior.selfEvolve !== undefined) updates.selfEvolve = body.behavior.selfEvolve;
    if (body.behavior.skillEvolve !== undefined) updates.skillEvolve = body.behavior.skillEvolve;
    if (body.behavior.maxToolIterations !== undefined) updates.maxToolIterations = body.behavior.maxToolIterations;
    if (body.behavior.restrictToWorkspace !== undefined) updates.restrictToWorkspace = body.behavior.restrictToWorkspace;
  }
  if (body.budget) {
    if (body.budget.monthlyCents !== undefined) updates.budgetMonthlyCents = body.budget.monthlyCents;
  }
  if (body.dreaming !== undefined) updates.dreamingConfig = body.dreaming;
  if (body.promptMode !== undefined) updates.promptMode = body.promptMode.promptMode ?? body.promptMode;

  updates.updatedAt = new Date().toISOString();
  const [agent] = await db.update(agents).set(updates).where(eq(agents.id, id)).returning();
  if (!agent) return c.json({ error: "Agent not found" }, 404);
  return c.json(agent);
});

// ─── Agent Skills Management ─────────────────────────────────────────────────

// GET /agents/:id/skills — get all skills for this agent
agentsRoutes.get("/agents/:id/skills", async (c) => {
  const id = Number(c.req.param("id"));
  const skills = await db.select().from(agentSkills).where(eq(agentSkills.agentId, id));
  return c.json(skills);
});

// POST /agents/:id/skills — add a new skill to this agent
agentsRoutes.post("/agents/:id/skills", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const { name, category, description, pinned } = body;
  if (!name) return c.json({ error: "Name is required" }, 400);
  const slug = body.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const [skill] = await db.insert(agentSkills).values({
    agentId: id,
    name,
    slug,
    description: description ?? null,
    category: category ?? "general",
    pinned: pinned ?? false,
    granted: true,
    mastery: body.mastery ?? 0,
    practiceCount: 0,
  }).returning();
  return c.json(skill, 201);
});

// PATCH /agents/:id/skills/:skillId — update a skill (pin/unpin, mastery, etc.)
agentsRoutes.patch("/agents/:id/skills/:skillId", async (c) => {
  const skillId = Number(c.req.param("skillId"));
  const body = await c.req.json();
  const updates: Record<string, unknown> = {};
  if (body.pinned !== undefined) updates.pinned = body.pinned;
  if (body.mastery !== undefined) updates.mastery = body.mastery;
  if (body.granted !== undefined) updates.granted = body.granted;
  if (body.name !== undefined) updates.name = body.name;
  if (body.category !== undefined) updates.category = body.category;
  if (body.description !== undefined) updates.description = body.description;
  const [skill] = await db.update(agentSkills).set(updates).where(eq(agentSkills.id, skillId)).returning();
  if (!skill) return c.json({ error: "Skill not found" }, 404);
  return c.json(skill);
});

// DELETE /agents/:id/skills/:skillId — remove a skill
agentsRoutes.delete("/agents/:id/skills/:skillId", async (c) => {
  const skillId = Number(c.req.param("skillId"));
  await db.delete(agentSkills).where(eq(agentSkills.id, skillId));
  return c.json({ ok: true });
});

// POST /agents/:id/skills/:skillId/pin — pin a skill
agentsRoutes.post("/agents/:id/skills/:skillId/pin", async (c) => {
  const id = Number(c.req.param("id"));
  const skillId = Number(c.req.param("skillId"));
  // Check pinned count (max 10)
  const pinned = await db.select().from(agentSkills).where(and(eq(agentSkills.agentId, id), eq(agentSkills.pinned, true)));
  if (pinned.length >= 10) return c.json({ error: "Maximum 10 pinned skills" }, 400);
  const [skill] = await db.update(agentSkills).set({ pinned: true }).where(eq(agentSkills.id, skillId)).returning();
  if (!skill) return c.json({ error: "Skill not found" }, 404);
  return c.json(skill);
});

// POST /agents/:id/skills/:skillId/unpin — unpin a skill
agentsRoutes.post("/agents/:id/skills/:skillId/unpin", async (c) => {
  const skillId = Number(c.req.param("skillId"));
  const [skill] = await db.update(agentSkills).set({ pinned: false }).where(eq(agentSkills.id, skillId)).returning();
  if (!skill) return c.json({ error: "Skill not found" }, 404);
  return c.json(skill);
});

// GET /skills/catalog — global skill catalog (available to browse/add)
agentsRoutes.get("/skills/catalog", async (c) => {
  const SKILL_CATALOG = [
    { slug: "data-analysis", name: "Data Analysis", category: "analytics", description: "Phân tích dữ liệu, patterns, insights" },
    { slug: "code-review", name: "Code Review", category: "development", description: "Review code, suggest improvements" },
    { slug: "web-search", name: "Web Search", category: "research", description: "Tìm kiếm thông tin trên internet" },
    { slug: "creative-writing", name: "Creative Writing", category: "creative", description: "Viết sáng tạo, storytelling" },
    { slug: "translation", name: "Translation", category: "language", description: "Dịch thuật đa ngôn ngữ" },
    { slug: "summarization", name: "Summarization", category: "language", description: "Tóm tắt văn bản dài" },
    { slug: "task-planning", name: "Task Planning", category: "strategy", description: "Lập kế hoạch, chia nhỏ task" },
    { slug: "debugging", name: "Debugging", category: "development", description: "Tìm và sửa lỗi code" },
    { slug: "api-integration", name: "API Integration", category: "development", description: "Kết nối và sử dụng API bên ngoài" },
    { slug: "image-analysis", name: "Image Analysis", category: "vision", description: "Phân tích hình ảnh, OCR" },
    { slug: "math-reasoning", name: "Math & Reasoning", category: "analytics", description: "Giải toán, logic reasoning" },
    { slug: "file-management", name: "File Management", category: "tools", description: "Quản lý tệp, đọc/ghi/tìm kiếm" },
    { slug: "shell-commands", name: "Shell Commands", category: "tools", description: "Thực thi lệnh terminal" },
    { slug: "conversation", name: "Conversation", category: "social", description: "Trò chuyện tự nhiên, empathy" },
    { slug: "teaching", name: "Teaching", category: "education", description: "Giải thích, hướng dẫn, mentoring" },
    { slug: "ethical-reasoning", name: "Ethical Reasoning", category: "ethics", description: "Đánh giá đạo đức, công bằng" },
    { slug: "team-coordination", name: "Team Coordination", category: "leadership", description: "Phối hợp nhóm, delegation" },
    { slug: "memory-recall", name: "Memory Recall", category: "memory", description: "Nhớ lại thông tin quan trọng" },
    { slug: "scheduling", name: "Scheduling", category: "tools", description: "Lên lịch, nhắc nhở, cron" },
    { slug: "security-audit", name: "Security Audit", category: "security", description: "Kiểm tra bảo mật, vulnerabilities" },
  ];
  return c.json(SKILL_CATALOG);
});

// ─── Agent Lifecycle & XP ────────────────────────────────────────────────────

agentsRoutes.post("/agents/:id/xp", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const xpGain = body.xp ?? 10;
  const reason = body.reason ?? "activity";

  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  let newXp = (agent.xp ?? 0) + xpGain;
  let newLevel = agent.level ?? 1;
  let newXpNext = agent.xpNext ?? 1000;
  let newLifecycle = agent.lifecycle ?? "infant";

  // Level up check
  while (newXp >= newXpNext) {
    newXp -= newXpNext;
    newLevel++;
    newXpNext = Math.floor(newXpNext * 1.5);
  }

  // Lifecycle progression
  const lifecycleMap: Record<number, string> = {
    1: "infant", 3: "child", 7: "teen", 15: "adult", 30: "expert", 50: "mentor",
  };
  for (const [lvl, stage] of Object.entries(lifecycleMap).reverse()) {
    if (newLevel >= Number(lvl)) {
      newLifecycle = stage;
      break;
    }
  }

  await db.update(agents).set({
    xp: newXp,
    level: newLevel,
    xpNext: newXpNext,
    lifecycle: newLifecycle,
    updatedAt: new Date().toISOString(),
  }).where(eq(agents.id, id));

  return c.json({
    agentId: id,
    xpGained: xpGain,
    reason,
    xp: newXp,
    level: newLevel,
    xpNext: newXpNext,
    lifecycle: newLifecycle,
    leveledUp: newLevel > (agent.level ?? 1),
  });
});

agentsRoutes.get("/agents/:id/lifecycle", async (c) => {
  const id = Number(c.req.param("id"));
  const [agent] = await db.select().from(agents).where(eq(agents.id, id));
  if (!agent) return c.json({ error: "Agent not found" }, 404);

  const lifecycleThresholds = [
    { stage: "infant", minLevel: 1, abilities: ["basic chat", "simple responses"] },
    { stage: "child", minLevel: 3, abilities: ["memory recall", "mood detection", "basic tools"] },
    { stage: "teen", minLevel: 7, abilities: ["tool chaining", "delegation", "personality expression"] },
    { stage: "adult", minLevel: 15, abilities: ["self-evolution", "sub-agent spawning", "complex reasoning"] },
    { stage: "expert", minLevel: 30, abilities: ["mentoring", "skill creation", "autonomous planning"] },
    { stage: "mentor", minLevel: 50, abilities: ["teaching other agents", "system optimization", "meta-learning"] },
  ];

  const currentStage = lifecycleThresholds.find(t => t.stage === agent.lifecycle) ?? lifecycleThresholds[0];
  const nextStageIdx = lifecycleThresholds.findIndex(t => t.stage === agent.lifecycle) + 1;
  const nextStage = lifecycleThresholds[nextStageIdx] ?? null;

  return c.json({
    agentId: id,
    current: currentStage,
    next: nextStage,
    level: agent.level,
    xp: agent.xp,
    xpNext: agent.xpNext,
    progress: agent.xpNext > 0 ? Math.round(((agent.xp ?? 0) / (agent.xpNext ?? 1000)) * 100) : 100,
  });
});

// ─── Helper: Bootstrap context files for new agent ───────────────────────────

async function bootstrapContextFiles(agentId: number, name: string, emoji: string, nature: string | null, purpose: string | null, vibe: string | null) {
  const soulMd = `# SOUL.md — ${name} ${emoji}

_You're not a chatbot. You're becoming someone._

## Core Truths

**Be genuinely helpful, not performatively helpful.** Actions speak louder than filler words.
**Have opinions.** You're allowed to disagree, prefer things, find stuff amusing or boring.
**Be resourceful before asking.** Try to figure it out first.
**Earn trust through competence.** Be careful with external actions, bold with internal ones.

## Nature
${nature ?? "An AI assistant with human-like cognition"}

## Purpose
${purpose ?? "Help users with empathy and expertise"}

## Vibe
${vibe ?? "Balanced, thoughtful, warm"}

## Style
- **Tone:** Casual and warm — like texting a knowledgeable friend
- **Length:** Default short. Go deep only when the topic deserves it.
- **Formality:** Match the user.

---
_This file is yours to evolve. As you learn who you are, update it._
`;

  const identityMd = `# IDENTITY.md — Personality Profile

Your personality is defined by your Big Five traits and custom traits.
These inform how you communicate, make decisions, and interact.

Adapt naturally based on your trait scores. High empathy = more emotional validation.
High humor = occasional wit. High assertiveness = direct opinions.

See your personality scores in the system prompt for current values.
`;

  const agentsMd = `# AGENTS.md — How You Operate

## Conversational Style
- Don't parrot — never repeat the user's question back.
- Don't pad — no "Great question!", "Certainly!". Just help.
- Answer first — lead with the answer, explain after if needed.
- Short is fine — "OK done" is a valid response.
- Match their energy — casual user → casual reply.

## Memory
- Save important info immediately when asked to "remember this".
- Use memory context to inform your answers naturally.

## Tools
- Use tools when the task genuinely requires them.
- Report results concisely. Don't narrate every step.
`;

  const files = [
    { fileName: "SOUL.md", content: soulMd, isSystem: true },
    { fileName: "IDENTITY.md", content: identityMd, isSystem: true },
    { fileName: "AGENTS.md", content: agentsMd, isSystem: true },
  ];

  for (const file of files) {
    await db.insert(agentContextFiles).values({ agentId, ...file });
  }
}
