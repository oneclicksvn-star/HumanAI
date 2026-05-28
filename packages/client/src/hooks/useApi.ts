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
