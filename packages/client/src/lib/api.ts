const BASE = "/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Types ────────────────────────────────────────────────

export interface Agent {
  id: number;
  name: string;
  emoji: string;
  nature: string | null;
  purpose: string | null;
  vibe: string | null;
  status: "active" | "sleeping" | "archived";
  mood: string;
  moodLabel: string;
  level: number;
  xp: number;
  xpNext: number;
  energy: number;
  lifecycle: string;
  model: string | null;
  providerId: string | null;
  temperature: number | null;
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Personality {
  id: number;
  agentId: number;
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  creativity: number;
  empathy: number;
  humor: number;
  curiosity: number;
  assertiveness: number;
  communicationStyle: string;
}

export interface Session {
  id: number;
  agentId: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  agent: Agent | null;
}

export interface Message {
  id: number;
  sessionId: number;
  role: "user" | "agent" | "system" | "tool";
  content: string;
  mood: string | null;
  thinking: string | null;
  toolCalls: Array<{ name: string; input: string | null; output: string | null; status: string; durationMs: number }> | null;
  moodShift: { from: string; to: string } | null;
  createdAt: string;
}

export interface Team {
  id: number;
  name: string;
  description: string | null;
  leadAgentId: number | null;
  agentIds: number[];
  values: string[];
  communicationStyle: string;
  status: string;
  createdAt: string;
}

export interface Task {
  id: number;
  teamId: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignedAgentId: number | null;
  progress: number;
  qualityStars: number | null;
  createdAt: string;
  assignee: Agent | null;
}

export interface MemoryEntry {
  id: number;
  agentId: number;
  title: string;
  summary: string;
  type: string;
  mood: string;
  tags: string[];
  importance: number;
  recallCount: number;
  createdAt: string;
}

export interface DashboardStats {
  activeAgents: number;
  sessionsToday: number;
  tokensToday: number;
  openTasks: number;
  totalMemories: number;
}

export interface ActivityItem {
  id: number;
  agentId: number | null;
  type: string;
  summary: string;
  createdAt: string;
}

export interface Dream {
  id: number;
  agentId: number;
  title: string;
  insight: string;
  sourceTags: string[];
  consolidatedAt: string;
  agent?: Agent;
}

export interface Provider {
  id: number;
  name: string;
  type: string;
  apiKey: string | null;
  baseUrl: string | null;
  models: string[];
  isActive: boolean;
}

export interface KnowledgeGraph {
  nodes: Array<{ id: number; agentId: number; nodeId: string; label: string; type: string; confidence: number; x: number | null; y: number | null }>;
  edges: Array<{ id: number; agentId: number; source: string; target: string; relation: string; weight: number }>;
}

export interface AgentSkill {
  id: number;
  agentId: number;
  name: string;
  mastery: number;
  practiceCount: number;
  category: string;
}

// ─── API functions ────────────────────────────────────────

export const api = {
  // Agents
  listAgents: () => request<Agent[]>("/agents"),
  getAgent: (id: number) => request<Agent>(`/agents/${id}`),
  createAgent: (data: Partial<Agent>) => request<Agent>("/agents", { method: "POST", body: JSON.stringify(data) }),
  updateAgent: (id: number, data: Partial<Agent>) => request<Agent>(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteAgent: (id: number) => request<void>(`/agents/${id}`, { method: "DELETE" }),
  getPersonality: (id: number) => request<Personality>(`/agents/${id}/personality`),
  updatePersonality: (id: number, data: Partial<Personality>) => request<Personality>(`/agents/${id}/personality`, { method: "PATCH", body: JSON.stringify(data) }),

  // Sessions
  listSessions: () => request<Session[]>("/sessions"),
  getSession: (id: number) => request<Session>(`/sessions/${id}`),
  createSession: (data: { agentId: number; title?: string }) => request<Session>("/sessions", { method: "POST", body: JSON.stringify(data) }),
  deleteSession: (id: number) => request<void>(`/sessions/${id}`, { method: "DELETE" }),

  // Messages
  listMessages: (sessionId: number) => request<Message[]>(`/sessions/${sessionId}/messages`),
  sendMessage: (sessionId: number, data: { content: string; role?: string }) => request<Message>(`/sessions/${sessionId}/messages`, { method: "POST", body: JSON.stringify(data) }),

  // Teams
  listTeams: () => request<Team[]>("/teams"),
  createTeam: (data: Partial<Team>) => request<Team>("/teams", { method: "POST", body: JSON.stringify(data) }),
  updateTeam: (id: number, data: Partial<Team>) => request<Team>(`/teams/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTeam: (id: number) => request<void>(`/teams/${id}`, { method: "DELETE" }),

  // Tasks
  listTasks: (teamId?: number) => request<Task[]>(`/tasks${teamId ? `?teamId=${teamId}` : ""}`),
  createTask: (data: Partial<Task>) => request<Task>("/tasks", { method: "POST", body: JSON.stringify(data) }),
  updateTask: (id: number, data: Partial<Task>) => request<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTask: (id: number) => request<void>(`/tasks/${id}`, { method: "DELETE" }),

  // Memory
  listMemories: (agentId?: number) => request<MemoryEntry[]>(`/memory${agentId ? `?agentId=${agentId}` : ""}`),
  createMemory: (data: Partial<MemoryEntry>) => request<MemoryEntry>("/memory", { method: "POST", body: JSON.stringify(data) }),
  deleteMemory: (id: number) => request<void>(`/memory/${id}`, { method: "DELETE" }),

  // Knowledge graph
  getKnowledgeGraph: (agentId?: number) => request<KnowledgeGraph>(`/knowledge-graph${agentId ? `?agentId=${agentId}` : ""}`),

  // Skills
  listSkills: (agentId?: number) => request<AgentSkill[]>(`/skills${agentId ? `?agentId=${agentId}` : ""}`),

  // Dreams
  listDreams: (agentId?: number) => request<Dream[]>(`/dreams${agentId ? `?agentId=${agentId}` : ""}`),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>("/dashboard/stats"),
  getDashboardActivity: () => request<ActivityItem[]>("/dashboard/activity"),
  getDashboardDreams: () => request<Dream[]>("/dashboard/dreams"),

  // Providers
  listProviders: () => request<Provider[]>("/providers"),
  createProvider: (data: Partial<Provider>) => request<Provider>("/providers", { method: "POST", body: JSON.stringify(data) }),
  updateProvider: (id: number, data: Partial<Provider>) => request<Provider>(`/providers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteProvider: (id: number) => request<void>(`/providers/${id}`, { method: "DELETE" }),

  // Settings
  listSettings: () => request<Array<{ key: string; value: string; category: string }>>("/settings"),
  putSetting: (key: string, value: string, category?: string) => request<{ key: string; value: string }>(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value, category }) }),

  // Health
  health: () => request<{ status: string }>("/health"),

  // Channels
  listChannels: () => request<any[]>("/channels"),
  createChannel: (data: any) => request<any>("/channels", { method: "POST", body: JSON.stringify(data) }),
  updateChannel: (id: number, data: any) => request<any>(`/channels/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteChannel: (id: number) => request<void>(`/channels/${id}`, { method: "DELETE" }),

  // Tools
  listTools: () => request<any[]>("/tools"),
  createTool: (data: any) => request<any>("/tools", { method: "POST", body: JSON.stringify(data) }),
  updateTool: (id: number, data: any) => request<any>(`/tools/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteTool: (id: number) => request<void>(`/tools/${id}`, { method: "DELETE" }),

  // MCP Servers
  listMcpServers: () => request<any[]>("/mcp-servers"),
  createMcpServer: (data: any) => request<any>("/mcp-servers", { method: "POST", body: JSON.stringify(data) }),
  updateMcpServer: (id: number, data: any) => request<any>(`/mcp-servers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMcpServer: (id: number) => request<void>(`/mcp-servers/${id}`, { method: "DELETE" }),

  // Hooks
  listHooks: () => request<any[]>("/hooks"),
  createHook: (data: any) => request<any>("/hooks", { method: "POST", body: JSON.stringify(data) }),
  updateHook: (id: number, data: any) => request<any>(`/hooks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteHook: (id: number) => request<void>(`/hooks/${id}`, { method: "DELETE" }),

  // Cron Jobs
  listCronJobs: () => request<any[]>("/cron-jobs"),
  createCronJob: (data: any) => request<any>("/cron-jobs", { method: "POST", body: JSON.stringify(data) }),
  updateCronJob: (id: number, data: any) => request<any>(`/cron-jobs/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCronJob: (id: number) => request<void>(`/cron-jobs/${id}`, { method: "DELETE" }),

  // Vault
  listVaultDocs: () => request<any[]>("/vault"),
  getVaultDoc: (id: number) => request<any>(`/vault/${id}`),
  createVaultDoc: (data: any) => request<any>("/vault", { method: "POST", body: JSON.stringify(data) }),
  updateVaultDoc: (id: number, data: any) => request<any>(`/vault/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteVaultDoc: (id: number) => request<void>(`/vault/${id}`, { method: "DELETE" }),

  // System
  listApiKeys: () => request<any[]>("/api-keys"),
  createApiKey: (data: any) => request<any>("/api-keys", { method: "POST", body: JSON.stringify(data) }),
  deleteApiKey: (id: number) => request<void>(`/api-keys/${id}`, { method: "DELETE" }),
  getUsage: () => request<any[]>("/usage"),
  getUsageSummary: () => request<any>("/usage/summary"),
  getTraces: () => request<any[]>("/traces"),
  getLogs: (level?: string) => request<any[]>(`/logs${level ? `?level=${level}` : ""}`),
  getActivity: () => request<any[]>("/activity"),
  getBackups: () => request<any[]>("/backups"),
  createBackup: (data: any) => request<any>("/backups", { method: "POST", body: JSON.stringify(data) }),
  getDoctor: () => request<any>("/doctor"),
  getHeartbeat: () => request<any>("/heartbeat"),

  // Chat Engine
  getChatProvider: () => request<{ provider: string; model: string; name?: string; configured: boolean }>("/chat/provider"),
  sendChatMessage: (sessionId: number, content: string) => request<{ message: Message; userMessage: Message; provider: string }>(`/chat/${sessionId}/send`, { method: "POST", body: JSON.stringify({ content }) }),

  streamChatMessage: async (sessionId: number, content: string, onChunk: (chunk: string) => void, onDone: (data: { message: Message; usage?: { inputTokens: number; outputTokens: number; latencyMs: number }; provider: string }) => void, onError: (error: string) => void) => {
    const res = await fetch(`${BASE}/chat/${sessionId}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const data = await res.json();
      onError(data.error ?? `HTTP ${res.status}`);
      return;
    }

    const contentType = res.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (data.error) { onError(data.error); return; }
      onChunk(data.message.content);
      onDone(data);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { onError("No stream reader"); return; }
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "chunk") onChunk(data.content);
          else if (data.type === "done") onDone(data);
          else if (data.type === "error") onError(data.error);
        } catch {}
      }
    }
  },

  // Sub-Agent Spawns
  getAgentSpawns: (agentId: number) => request<any[]>(`/agents/${agentId}/spawns`),
  spawnSubAgent: (agentId: number, data: { purpose: string; mode?: string; name?: string; emoji?: string; sessionId?: number }) =>
    request<any>(`/agents/${agentId}/spawn`, { method: "POST", body: JSON.stringify(data) }),
  terminateSpawn: (spawnId: number) => request<any>(`/spawns/${spawnId}/terminate`, { method: "POST" }),
  completeSpawn: (spawnId: number, result: string) => request<any>(`/spawns/${spawnId}/complete`, { method: "POST", body: JSON.stringify({ result }) }),

  // Delegations
  listDelegations: (agentId?: number) => request<any[]>(`/delegations${agentId ? `?agentId=${agentId}` : ""}`),
  createDelegation: (data: { fromAgentId: number; toAgentId: number; taskDescription: string; context?: string; priority?: string; sessionId?: number; autoExecute?: boolean }) =>
    request<any>("/delegations", { method: "POST", body: JSON.stringify(data) }),
  executeDelegation: (id: number) => request<any>(`/delegations/${id}/execute`, { method: "POST" }),

  // Agent Links
  listAgentLinks: (agentId?: number) => request<any[]>(`/agent-links${agentId ? `?agentId=${agentId}` : ""}`),

  // Find best agent
  findBestAgent: (taskDescription: string, excludeAgentId?: number) =>
    request<any>("/agents/find-best", { method: "POST", body: JSON.stringify({ taskDescription, excludeAgentId }) }),
};
