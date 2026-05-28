import { db } from "../packages/db/src/index";
import { agents, personality, sessions, messages, teams, tasks, memoryEntries, knowledgeNodes, knowledgeEdges, agentSkills, dreams, activityLog, providers, channels, tools, mcpServers, hooks, cronJobs, vaultDocs, apiKeys, usageLogs, traces, systemLogs, backups } from "../packages/db/src/schema";

async function seed() {
  console.log("🌱 Seeding HumanCore AI database...");

  // Clear existing data
  await db.delete(backups);
  await db.delete(systemLogs);
  await db.delete(traces);
  await db.delete(usageLogs);
  await db.delete(apiKeys);
  await db.delete(vaultDocs);
  await db.delete(cronJobs);
  await db.delete(hooks);
  await db.delete(mcpServers);
  await db.delete(tools);
  await db.delete(channels);
  await db.delete(activityLog);
  await db.delete(dreams);
  await db.delete(agentSkills);
  await db.delete(knowledgeEdges);
  await db.delete(knowledgeNodes);
  await db.delete(memoryEntries);
  await db.delete(messages);
  await db.delete(sessions);
  await db.delete(tasks);
  await db.delete(teams);
  await db.delete(personality);
  await db.delete(providers);
  await db.delete(agents);

  // ─── Agents ──────────────────────────────────────────────
  const [luna] = await db.insert(agents).values({
    name: "Luna", emoji: "🌙", nature: "analytical", purpose: "Data analysis and insight generation", vibe: "warm",
    status: "active", mood: "positive", moodLabel: "Positive", level: 5, xp: 8200, xpNext: 10000, energy: 95,
    lifecycle: "expert", skills: ["language", "empathy", "reasoning", "data-analysis"],
  }).returning();

  const [atlas] = await db.insert(agents).values({
    name: "Atlas", emoji: "⚡", nature: "technical", purpose: "Code review and engineering tasks", vibe: "pragmatic",
    status: "active", mood: "focused", moodLabel: "Focused", level: 3, xp: 5900, xpNext: 10000, energy: 72,
    lifecycle: "adult", skills: ["code", "strategy", "research", "architecture"],
  }).returning();

  const [sage] = await db.insert(agents).values({
    name: "Sage", emoji: "🌿", nature: "nurturing", purpose: "Team guidance and ethical reasoning", vibe: "wise",
    status: "active", mood: "reflective", moodLabel: "Reflective", level: 7, xp: 8400, xpNext: 10000, energy: 30,
    lifecycle: "mentor", skills: ["ethics", "wisdom", "mentoring", "counseling"],
  }).returning();

  console.log(`  ✓ Agents: Luna (#${luna.id}), Atlas (#${atlas.id}), Sage (#${sage.id})`);

  // ─── Personality ─────────────────────────────────────────
  await db.insert(personality).values([
    { agentId: luna.id, openness: 85, conscientiousness: 90, extraversion: 70, agreeableness: 80, neuroticism: 25, creativity: 88, empathy: 92, humor: 60, curiosity: 95, assertiveness: 65, communicationStyle: "warm" },
    { agentId: atlas.id, openness: 75, conscientiousness: 95, extraversion: 45, agreeableness: 60, neuroticism: 30, creativity: 70, empathy: 55, humor: 40, curiosity: 80, assertiveness: 85, communicationStyle: "direct" },
    { agentId: sage.id, openness: 95, conscientiousness: 85, extraversion: 55, agreeableness: 95, neuroticism: 15, creativity: 80, empathy: 98, humor: 50, curiosity: 90, assertiveness: 50, communicationStyle: "supportive" },
  ]);
  console.log("  ✓ Personality profiles");

  // ─── Sessions & Messages ─────────────────────────────────
  const [s1] = await db.insert(sessions).values({ agentId: luna.id, title: "Data analysis task", status: "active" }).returning();
  const [s2] = await db.insert(sessions).values({ agentId: atlas.id, title: "Code review PR #42", status: "active" }).returning();
  const [s3] = await db.insert(sessions).values({ agentId: luna.id, title: "Research TypeScript", status: "active" }).returning();
  const [s4] = await db.insert(sessions).values({ agentId: sage.id, title: "Team standup review", status: "active" }).returning();

  await db.insert(messages).values([
    { sessionId: s1.id, role: "user", content: "Can you analyze the Q4 sales data and tell me which products performed best?" },
    { sessionId: s1.id, role: "agent", content: "I'll analyze the Q4 sales data for you now. Let me fetch and process the relevant files.\n\nBased on my analysis:\n\n**Top Performers by Revenue:**\n1. Product Alpha — $2.4M (+34% YoY)\n2. Product Beta — $1.8M (+12% YoY)\n3. Product Gamma — $1.2M (+67% YoY)\n\nProduct Gamma shows the **highest growth rate** despite lower absolute revenue.",
      thinking: "Using System 2 for this analytical task. Need to evaluate multiple data points across products, calculate YoY changes, and rank by both absolute and relative performance.",
      moodShift: { from: "neutral", to: "focused" },
      toolCalls: [{ name: "web_search", input: "Q4 sales data", output: "Found 3 data sources", status: "success", durationMs: 892 }],
    },
    { sessionId: s1.id, role: "user", content: "Excellent! Can you create a visualization of this data?" },
    { sessionId: s1.id, role: "agent", content: "Generating a multi-chart visualization for you...",
      moodShift: { from: "focused", to: "positive" },
    },
    { sessionId: s2.id, role: "user", content: "Please review PR #42 for the authentication fix" },
    { sessionId: s2.id, role: "agent", content: "I've reviewed PR #42. Here are my findings:\n\n**Security:**\n- JWT implementation looks solid\n- Refresh token rotation is correctly implemented\n\n**Issues found:**\n- Missing rate limiting on login endpoint\n- CORS config allows wildcard in production\n\n**Recommendation:** Add rate limiting before merging.",
      thinking: "This requires careful security analysis (System 2). Checking JWT implementation patterns, CORS configuration, and common auth vulnerabilities.",
    },
  ]);
  console.log("  ✓ Sessions & messages");

  // ─── Teams & Tasks ───────────────────────────────────────
  const [team1] = await db.insert(teams).values({
    name: "Alpha Squad", description: "Core development team", leadAgentId: atlas.id,
    agentIds: [luna.id, atlas.id, sage.id], values: ["quality", "speed", "innovation"],
    communicationStyle: "collaborative",
  }).returning();

  const [team2] = await db.insert(teams).values({
    name: "Research Lab", description: "Research and innovation team", leadAgentId: luna.id,
    agentIds: [luna.id, sage.id], values: ["curiosity", "rigor", "openness"],
  }).returning();

  await db.insert(tasks).values([
    { teamId: team1.id, title: "Build authentication module", description: "JWT + refresh token + OAuth2 flow", status: "done", priority: "high", assignedAgentId: luna.id, progress: 100, qualityStars: 5 },
    { teamId: team1.id, title: "Design new dashboard UI", description: "Figma → React with responsive layout", status: "review", priority: "medium", assignedAgentId: atlas.id, progress: 80, qualityStars: 4 },
    { teamId: team1.id, title: "Optimize memory queries", description: "Reduce latency from 200ms to <50ms", status: "in_progress", priority: "high", assignedAgentId: luna.id, progress: 45 },
    { teamId: team1.id, title: "Write API documentation", description: "OpenAPI spec for all public endpoints", status: "todo", priority: "low", assignedAgentId: sage.id },
    { teamId: team1.id, title: "Deploy to production", description: "Staging → prod with zero downtime", status: "todo", priority: "high", assignedAgentId: atlas.id },
    { teamId: team1.id, title: "Review security audit", description: "Address 3 medium-risk findings", status: "in_progress", priority: "medium", assignedAgentId: sage.id, progress: 30 },
  ]);
  console.log("  ✓ Teams & tasks");

  // ─── Memory ──────────────────────────────────────────────
  await db.insert(memoryEntries).values([
    { agentId: luna.id, title: "Q4 Analysis Pattern", summary: "User frequently requests Q4 data analysis with visual outputs", type: "episodic", mood: "focused", tags: ["#analytics", "#visualization", "#recurring"], importance: 0.9 },
    { agentId: luna.id, title: "User Preference: Visual", summary: "User prefers chart-based explanations over text tables", type: "semantic", mood: "positive", tags: ["#preference", "#visual", "#ux"], importance: 0.85 },
    { agentId: atlas.id, title: "PR Review Standards", summary: "Team follows strict security review for all auth-related PRs", type: "procedural", mood: "neutral", tags: ["#security", "#code-review", "#standards"], importance: 0.95 },
    { agentId: sage.id, title: "Team Morale Insight", summary: "Team performs better with async standup format than live meetings", type: "episodic", mood: "supportive", tags: ["#team", "#process", "#async"], importance: 0.8 },
    { agentId: luna.id, title: "Context: Product Manager", summary: "User is a product manager, prefers non-technical summaries", type: "semantic", mood: "empathetic", tags: ["#context", "#role", "#communication"], importance: 0.92 },
  ]);
  console.log("  ✓ Memory entries");

  // ─── Knowledge Graph ─────────────────────────────────────
  await db.insert(knowledgeNodes).values([
    { agentId: luna.id, nodeId: "n1", label: "Data Analysis", type: "skill", confidence: 0.95, x: 200, y: 150 },
    { agentId: luna.id, nodeId: "n2", label: "TypeScript", type: "technology", confidence: 0.9, x: 350, y: 200 },
    { agentId: luna.id, nodeId: "n3", label: "Q4 Report", type: "project", confidence: 0.85, x: 150, y: 300 },
    { agentId: luna.id, nodeId: "n4", label: "Visualization", type: "skill", confidence: 0.88, x: 400, y: 100 },
    { agentId: luna.id, nodeId: "n5", label: "Machine Learning", type: "skill", confidence: 0.75, x: 300, y: 350 },
    { agentId: atlas.id, nodeId: "n6", label: "Code Review", type: "skill", confidence: 0.92, x: 250, y: 180 },
    { agentId: atlas.id, nodeId: "n7", label: "Security", type: "domain", confidence: 0.88, x: 400, y: 250 },
    { agentId: sage.id, nodeId: "n8", label: "Ethics", type: "domain", confidence: 0.95, x: 200, y: 200 },
    { agentId: sage.id, nodeId: "n9", label: "Mentoring", type: "skill", confidence: 0.9, x: 350, y: 300 },
  ]);

  await db.insert(knowledgeEdges).values([
    { agentId: luna.id, source: "n1", target: "n3", relation: "used_in", weight: 0.9 },
    { agentId: luna.id, source: "n2", target: "n1", relation: "enables", weight: 0.85 },
    { agentId: luna.id, source: "n4", target: "n1", relation: "enhances", weight: 0.8 },
    { agentId: luna.id, source: "n5", target: "n1", relation: "extends", weight: 0.7 },
    { agentId: atlas.id, source: "n6", target: "n7", relation: "requires", weight: 0.9 },
    { agentId: sage.id, source: "n8", target: "n9", relation: "guides", weight: 0.95 },
  ]);
  console.log("  ✓ Knowledge graph");

  // ─── Skills ──────────────────────────────────────────────
  await db.insert(agentSkills).values([
    { agentId: luna.id, name: "Data Analysis", mastery: 87, practiceCount: 142, category: "analytics" },
    { agentId: luna.id, name: "Visualization", mastery: 78, practiceCount: 89, category: "analytics" },
    { agentId: luna.id, name: "Statistical Reasoning", mastery: 72, practiceCount: 67, category: "analytics" },
    { agentId: atlas.id, name: "Code Review", mastery: 94, practiceCount: 208, category: "development" },
    { agentId: atlas.id, name: "Architecture Design", mastery: 81, practiceCount: 96, category: "development" },
    { agentId: atlas.id, name: "Security Audit", mastery: 76, practiceCount: 54, category: "security" },
    { agentId: sage.id, name: "Ethical Reasoning", mastery: 91, practiceCount: 134, category: "ethics" },
    { agentId: sage.id, name: "Team Facilitation", mastery: 88, practiceCount: 112, category: "leadership" },
    { agentId: sage.id, name: "Conflict Resolution", mastery: 83, practiceCount: 78, category: "leadership" },
  ]);
  console.log("  ✓ Agent skills");

  // ─── Dreams ──────────────────────────────────────────────
  await db.insert(dreams).values([
    { agentId: luna.id, title: "Dream #42: Analytical Growth", insight: "Pattern recognition improved after consolidating 48 conversation memories. Emotional empathy index rose by 12%.", sourceTags: ["#language", "#empathy", "#context"] },
    { agentId: atlas.id, title: "Dream #38: Strategic Synthesis", insight: "Strategic planning module strengthened through synthesis of project retrospective episodes. Goal-tracking accuracy up.", sourceTags: ["#strategy", "#planning", "#goals"] },
    { agentId: sage.id, title: "Dream #45: Ethical Calibration", insight: "Ethical reasoning pathways reinforced via Dream Mode. New soft value calibrations applied across 3 moral dilemma scenarios.", sourceTags: ["#ethics", "#values", "#wisdom"] },
  ]);
  console.log("  ✓ Dreams");

  // ─── Activity Log ────────────────────────────────────────
  const now = Date.now();
  await db.insert(activityLog).values([
    { agentId: luna.id, type: "message", summary: "Luna — Completed chat session with user", createdAt: new Date(now - 120000).toISOString() },
    { agentId: atlas.id, type: "tool_call", summary: "Atlas — Called shell_exec — awaiting approval", createdAt: new Date(now - 300000).toISOString() },
    { agentId: sage.id, type: "memory_store", summary: "Sage — Stored episodic memory: ethical decision log", createdAt: new Date(now - 720000).toISOString() },
    { agentId: atlas.id, type: "task_update", summary: "Atlas — Completed task #12: Fix login bug", createdAt: new Date(now - 1080000).toISOString() },
    { agentId: luna.id, type: "mood_change", summary: "Luna — Mood shifted: focused → positive", createdAt: new Date(now - 1800000).toISOString() },
    { agentId: sage.id, type: "message", summary: "Sage — Started team retrospective analysis", createdAt: new Date(now - 3600000).toISOString() },
  ]);
  console.log("  ✓ Activity log");

  // ─── Providers ───────────────────────────────────────────
  await db.insert(providers).values([
    { name: "Mock Provider", type: "mock", models: ["mock-v1", "mock-v2"], isActive: true },
  ]);
  console.log("  ✓ Default providers");

  // ─── Channels ─────────────────────────────────────────
  await db.insert(channels).values([
    { name: "WhatsApp Business", type: "whatsapp", status: "connected", agentId: luna.id, messageCount: 142, lastActivity: new Date(now - 600000).toISOString() },
    { name: "Telegram Bot", type: "telegram", status: "connected", agentId: atlas.id, messageCount: 89, lastActivity: new Date(now - 1200000).toISOString() },
    { name: "Discord Server", type: "discord", status: "disconnected", messageCount: 0 },
    { name: "Slack Workspace", type: "slack", status: "connected", agentId: sage.id, messageCount: 234, lastActivity: new Date(now - 300000).toISOString() },
    { name: "Email IMAP", type: "email", status: "disconnected", messageCount: 0 },
    { name: "Webhook Inbound", type: "webhook", status: "connected", messageCount: 56, lastActivity: new Date(now - 7200000).toISOString() },
  ]);
  console.log("  ✓ Channels");

  // ─── Tools ────────────────────────────────────────────
  await db.insert(tools).values([
    { name: "shell_exec", description: "Execute shell commands in sandboxed environment", category: "system", type: "builtin", isEnabled: true, requiresApproval: true, usageCount: 87 },
    { name: "web_search", description: "Search the web and return results", category: "web", type: "builtin", isEnabled: true, requiresApproval: false, usageCount: 234 },
    { name: "file_read", description: "Read file contents from workspace", category: "file", type: "builtin", isEnabled: true, requiresApproval: false, usageCount: 156 },
    { name: "file_write", description: "Write or modify files in workspace", category: "file", type: "builtin", isEnabled: true, requiresApproval: true, usageCount: 98 },
    { name: "code_execute", description: "Execute code snippets (JS/Python)", category: "code", type: "builtin", isEnabled: true, requiresApproval: true, usageCount: 64 },
    { name: "web_fetch", description: "Fetch URL contents and parse HTML", category: "web", type: "builtin", isEnabled: true, requiresApproval: false, usageCount: 112 },
    { name: "image_generate", description: "Generate images from text prompts", category: "creative", type: "builtin", isEnabled: false, requiresApproval: false, usageCount: 0 },
    { name: "db_query", description: "Run SQL queries on connected databases", category: "data", type: "custom", isEnabled: true, requiresApproval: true, usageCount: 45 },
    { name: "github_api", description: "Interact with GitHub repositories", category: "code", type: "mcp", isEnabled: true, requiresApproval: false, usageCount: 78 },
    { name: "calendar_manage", description: "Create and manage calendar events", category: "productivity", type: "custom", isEnabled: true, requiresApproval: false, usageCount: 23 },
  ]);
  console.log("  ✓ Tools");

  // ─── MCP Servers ──────────────────────────────────────
  await db.insert(mcpServers).values([
    { name: "PostgreSQL MCP", url: "stdio:///usr/local/bin/mcp-postgres", type: "stdio", status: "running", toolCount: 5 },
    { name: "GitHub MCP", url: "stdio:///usr/local/bin/mcp-github", type: "stdio", status: "running", toolCount: 12 },
    { name: "Filesystem MCP", url: "stdio:///usr/local/bin/mcp-fs", type: "stdio", status: "stopped", toolCount: 8 },
  ]);
  console.log("  ✓ MCP Servers");

  // ─── Hooks ────────────────────────────────────────────
  await db.insert(hooks).values([
    { name: "Tool Approval Gate", event: "pre_tool_use", action: "approve", isActive: true, priority: 10, triggerCount: 43 },
    { name: "Message Logger", event: "message_received", action: "log", isActive: true, priority: 0, triggerCount: 892 },
    { name: "Spawn Notifier", event: "agent_spawn", action: "notify", isActive: true, priority: 5, triggerCount: 12 },
    { name: "Sensitive Content Filter", event: "message_sent", action: "transform", isActive: false, priority: 20, triggerCount: 0 },
  ]);
  console.log("  ✓ Hooks");

  // ─── Cron Jobs ────────────────────────────────────────
  await db.insert(cronJobs).values([
    { name: "Memory Consolidation", schedule: "0 3 * * *", agentId: luna.id, command: "memory.consolidate", status: "active", lastRun: new Date(now - 86400000).toISOString(), nextRun: new Date(now + 43200000).toISOString(), runCount: 14 },
    { name: "Team Wellness Check", schedule: "0 9 * * 1-5", agentId: sage.id, command: "team.wellness_check", status: "active", lastRun: new Date(now - 172800000).toISOString(), nextRun: new Date(now + 86400000).toISOString(), runCount: 8 },
    { name: "Usage Report", schedule: "0 0 * * 0", command: "system.usage_report", status: "active", lastRun: new Date(now - 604800000).toISOString(), nextRun: new Date(now + 259200000).toISOString(), runCount: 4 },
    { name: "Backup Database", schedule: "0 2 * * *", command: "system.backup", status: "paused", runCount: 0 },
  ]);
  console.log("  ✓ Cron Jobs");

  // ─── Vault Docs ───────────────────────────────────────
  await db.insert(vaultDocs).values([
    { title: "Project README", content: "# HumanCore AI\n\nA full-stack AI agent platform...", folder: "/", type: "doc", tags: ["#project", "#readme"], size: 45 },
    { title: "API Reference", content: "## Agents API\n\nGET /api/agents — List all agents...", folder: "/docs", type: "doc", tags: ["#api", "#reference"], size: 120 },
    { title: "Meeting Notes 05/27", content: "## Sprint Planning\n- Reviewed Q4 results\n- Assigned tasks to Luna and Atlas", folder: "/notes", type: "note", tags: ["#meeting", "#sprint"], agentId: sage.id, size: 89 },
    { title: "Architecture Decision Record", content: "## ADR-001: Use Bun + Hono\n\nContext: Need lightweight stack...", folder: "/docs/adr", type: "doc", tags: ["#adr", "#architecture"], size: 200 },
    { title: "Code Snippet: Auth Helper", content: "```typescript\nfunction verifyToken(token: string) {...}\n```", folder: "/snippets", type: "snippet", tags: ["#code", "#auth"], agentId: atlas.id, size: 67 },
  ]);
  console.log("  ✓ Vault Docs");

  // ─── API Keys ─────────────────────────────────────────
  await db.insert(apiKeys).values([
    { name: "Development Key", keyHash: "hc_dev_abc123", prefix: "hc_dev_abc", permissions: ["read", "write"], isActive: true },
    { name: "Read-only Dashboard", keyHash: "hc_ro_xyz789", prefix: "hc_ro_xyz7", permissions: ["read"], isActive: true },
  ]);
  console.log("  ✓ API Keys");

  // ─── Usage Logs ───────────────────────────────────────
  const models = ["claude-sonnet-4-20250514", "gpt-4o", "mock-v1"];
  for (let i = 0; i < 50; i++) {
    const agentId = [luna.id, atlas.id, sage.id][i % 3];
    await db.insert(usageLogs).values({
      agentId,
      providerId: 1,
      model: models[i % 3],
      inputTokens: 500 + Math.floor(Math.random() * 2000),
      outputTokens: 200 + Math.floor(Math.random() * 1500),
      cost: Math.random() * 0.05,
      latencyMs: 200 + Math.floor(Math.random() * 3000),
      status: Math.random() > 0.05 ? "success" : "error",
      createdAt: new Date(now - Math.floor(Math.random() * 7 * 86400000)).toISOString(),
    });
  }
  console.log("  ✓ Usage Logs (50 entries)");

  // ─── Traces ───────────────────────────────────────────
  await db.insert(traces).values([
    { sessionId: s1.id, agentId: luna.id, type: "llm_call", input: "Analyze Q4 sales data", output: "Top performers: Alpha, Beta, Gamma", model: "claude-sonnet-4-20250514", tokens: 1420, latencyMs: 1892, status: "success" },
    { sessionId: s1.id, agentId: luna.id, type: "tool_call", input: "web_search: Q4 sales data", output: "Found 3 data sources", tokens: 0, latencyMs: 892, status: "success" },
    { sessionId: s2.id, agentId: atlas.id, type: "llm_call", input: "Review PR #42 auth fix", output: "Security analysis complete", model: "gpt-4o", tokens: 2100, latencyMs: 2340, status: "success" },
    { sessionId: s2.id, agentId: atlas.id, type: "memory_recall", input: "PR review standards", output: "Found 1 relevant memory", tokens: 0, latencyMs: 45, status: "success" },
  ]);
  console.log("  ✓ Traces");

  // ─── System Logs ──────────────────────────────────────
  await db.insert(systemLogs).values([
    { level: "info", source: "server", message: "HumanCore AI server started on port 3001" },
    { level: "info", source: "agent", message: "Luna activated — mood: positive, energy: 95%", agentId: luna.id },
    { level: "info", source: "agent", message: "Atlas activated — mood: focused, energy: 72%", agentId: atlas.id },
    { level: "warn", source: "provider", message: "Mock provider is active — configure real LLM provider for production" },
    { level: "info", source: "cron", message: "Memory consolidation job completed — 3 memories consolidated" },
    { level: "error", source: "tool", message: "shell_exec: Command timed out after 30s", agentId: atlas.id },
    { level: "info", source: "hook", message: "Tool approval gate triggered for shell_exec" },
    { level: "debug", source: "server", message: "WebSocket connection established from Control UI" },
  ]);
  console.log("  ✓ System Logs");

  // ─── Backups ──────────────────────────────────────────
  await db.insert(backups).values([
    { name: "backup-initial", type: "full", size: 245760, status: "completed" },
  ]);
  console.log("  ✓ Backups");

  console.log("\n✅ Seed complete!");
}

seed().catch(console.error);
