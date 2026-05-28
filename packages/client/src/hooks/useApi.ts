import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Agents
export const useAgents = () => useQuery({ queryKey: ["agents"], queryFn: api.listAgents });
export const useAgent = (id: number) => useQuery({ queryKey: ["agents", id], queryFn: () => api.getAgent(id), enabled: id > 0 });
export const usePersonality = (id: number) => useQuery({ queryKey: ["personality", id], queryFn: () => api.getPersonality(id), enabled: id > 0 });

export const useCreateAgent = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createAgent, onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }) });
};

export const useUpdateAgent = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) => api.updateAgent(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }) });
};

export const useDeleteAgent = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteAgent, onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }) });
};

// Sessions
export const useSessions = () => useQuery({ queryKey: ["sessions"], queryFn: api.listSessions });
export const useSession = (id: number) => useQuery({ queryKey: ["sessions", id], queryFn: () => api.getSession(id), enabled: id > 0 });

export const useCreateSession = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createSession, onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }) });
};

// Messages
export const useMessages = (sessionId: number) => useQuery({ queryKey: ["messages", sessionId], queryFn: () => api.listMessages(sessionId), enabled: sessionId > 0 });

export const useSendMessage = (sessionId: number) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { content: string; role?: string }) => api.sendMessage(sessionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages", sessionId] });
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
};

// Teams
export const useTeams = () => useQuery({ queryKey: ["teams"], queryFn: api.listTeams });

export const useCreateTeam = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createTeam, onSuccess: () => qc.invalidateQueries({ queryKey: ["teams"] }) });
};

// Tasks
export const useTasks = (teamId?: number) => useQuery({ queryKey: ["tasks", teamId], queryFn: () => api.listTasks(teamId) });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createTask, onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }) });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) => api.updateTask(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }) });
};

// Memory
export const useMemories = (agentId?: number) => useQuery({ queryKey: ["memories", agentId], queryFn: () => api.listMemories(agentId) });
export const useKnowledgeGraph = (agentId?: number) => useQuery({ queryKey: ["knowledge-graph", agentId], queryFn: () => api.getKnowledgeGraph(agentId) });
export const useSkills = (agentId?: number) => useQuery({ queryKey: ["skills", agentId], queryFn: () => api.listSkills(agentId) });
export const useDreams = (agentId?: number) => useQuery({ queryKey: ["dreams", agentId], queryFn: () => api.listDreams(agentId) });

// Dashboard
export const useDashboardStats = () => useQuery({ queryKey: ["dashboard-stats"], queryFn: api.getDashboardStats });
export const useDashboardActivity = () => useQuery({ queryKey: ["dashboard-activity"], queryFn: api.getDashboardActivity });
export const useDashboardDreams = () => useQuery({ queryKey: ["dashboard-dreams"], queryFn: api.getDashboardDreams });

// Providers
export const useProviders = () => useQuery({ queryKey: ["providers"], queryFn: api.listProviders });

export const useCreateProvider = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createProvider, onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }) });
};

export const useUpdateProvider = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, ...data }: { id: number } & Record<string, unknown>) => api.updateProvider(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }) });
};

export const useChatProvider = () => useQuery({ queryKey: ["chat-provider"], queryFn: api.getChatProvider });

// Settings
export const useSettings = () => {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const list = await api.listSettings();
      const obj: Record<string, unknown> = {};
      for (const s of list) {
        try { obj[s.key] = JSON.parse(s.value); } catch { obj[s.key] = s.value; }
      }
      return obj;
    },
  });
};

// Channels
export const useChannels = () => useQuery({ queryKey: ["channels"], queryFn: api.listChannels });
export const useCreateChannel = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.createChannel, onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }) }); };
export const useUpdateChannel = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, ...d }: { id: number } & Record<string, unknown>) => api.updateChannel(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }) }); };
export const useDeleteChannel = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.deleteChannel, onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }) }); };

// Tools
export const useTools = () => useQuery({ queryKey: ["tools"], queryFn: api.listTools });
export const useCreateTool = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.createTool, onSuccess: () => qc.invalidateQueries({ queryKey: ["tools"] }) }); };
export const useUpdateTool = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, ...d }: { id: number } & Record<string, unknown>) => api.updateTool(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["tools"] }) }); };

// MCP Servers
export const useMcpServers = () => useQuery({ queryKey: ["mcp-servers"], queryFn: api.listMcpServers });
export const useCreateMcpServer = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.createMcpServer, onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp-servers"] }) }); };
export const useUpdateMcpServer = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, ...d }: { id: number } & Record<string, unknown>) => api.updateMcpServer(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp-servers"] }) }); };

// Hooks
export const useHooks = () => useQuery({ queryKey: ["hooks"], queryFn: api.listHooks });
export const useCreateHook = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.createHook, onSuccess: () => qc.invalidateQueries({ queryKey: ["hooks"] }) }); };
export const useUpdateHook = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, ...d }: { id: number } & Record<string, unknown>) => api.updateHook(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["hooks"] }) }); };

// Cron Jobs
export const useCronJobs = () => useQuery({ queryKey: ["cron-jobs"], queryFn: api.listCronJobs });
export const useCreateCronJob = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.createCronJob, onSuccess: () => qc.invalidateQueries({ queryKey: ["cron-jobs"] }) }); };
export const useUpdateCronJob = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, ...d }: { id: number } & Record<string, unknown>) => api.updateCronJob(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["cron-jobs"] }) }); };

// Vault
export const useVaultDocs = () => useQuery({ queryKey: ["vault"], queryFn: api.listVaultDocs });
export const useCreateVaultDoc = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.createVaultDoc, onSuccess: () => qc.invalidateQueries({ queryKey: ["vault"] }) }); };
export const useUpdateVaultDoc = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, ...d }: { id: number } & Record<string, unknown>) => api.updateVaultDoc(id, d), onSuccess: () => qc.invalidateQueries({ queryKey: ["vault"] }) }); };
export const useDeleteVaultDoc = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.deleteVaultDoc, onSuccess: () => qc.invalidateQueries({ queryKey: ["vault"] }) }); };

// System
export const useApiKeys = () => useQuery({ queryKey: ["api-keys"], queryFn: api.listApiKeys });
export const useCreateApiKey = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.createApiKey, onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }) }); };
export const useDeleteApiKey = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.deleteApiKey, onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }) }); };
export const useUsage = () => useQuery({ queryKey: ["usage"], queryFn: api.getUsage });
export const useUsageSummary = () => useQuery({ queryKey: ["usage-summary"], queryFn: api.getUsageSummary });
export const useTraces = () => useQuery({ queryKey: ["traces"], queryFn: api.getTraces });
export const useLogs = (level?: string) => useQuery({ queryKey: ["logs", level], queryFn: () => api.getLogs(level) });
export const useActivityFeed = () => useQuery({ queryKey: ["activity"], queryFn: api.getActivity });
export const useBackups = () => useQuery({ queryKey: ["backups"], queryFn: api.getBackups });
export const useCreateBackup = () => { const qc = useQueryClient(); return useMutation({ mutationFn: api.createBackup, onSuccess: () => qc.invalidateQueries({ queryKey: ["backups"] }) }); };
export const useDoctor = () => useQuery({ queryKey: ["doctor"], queryFn: api.getDoctor });
export const useHeartbeat = () => useQuery({ queryKey: ["heartbeat"], queryFn: api.getHeartbeat, refetchInterval: 10000 });

// Sub-Agent Spawns
export const useAgentSpawns = (agentId: number) => useQuery({ queryKey: ["spawns", agentId], queryFn: () => api.getAgentSpawns(agentId), enabled: agentId > 0 });
export const useSpawnSubAgent = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ agentId, ...data }: { agentId: number } & { purpose: string; mode?: string; name?: string; emoji?: string; sessionId?: number }) => api.spawnSubAgent(agentId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["spawns"] }); qc.invalidateQueries({ queryKey: ["agents"] }); qc.invalidateQueries({ queryKey: ["sessions"] }); },
  });
};

// Delegations
export const useDelegations = (agentId?: number) => useQuery({ queryKey: ["delegations", agentId], queryFn: () => api.listDelegations(agentId) });
export const useCreateDelegation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createDelegation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["delegations"] }); qc.invalidateQueries({ queryKey: ["messages"] }); qc.invalidateQueries({ queryKey: ["sessions"] }); },
  });
};
export const useExecuteDelegation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.executeDelegation,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["delegations"] }); qc.invalidateQueries({ queryKey: ["messages"] }); },
  });
};

// Agent Links
export const useAgentLinks = (agentId?: number) => useQuery({ queryKey: ["agent-links", agentId], queryFn: () => api.listAgentLinks(agentId) });

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(data)) {
        await api.putSetting(key, JSON.stringify(value), "general");
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
};
