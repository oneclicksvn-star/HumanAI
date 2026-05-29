import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { cn, timeAgo, MOOD_COLORS } from "@/lib/utils";
import { useSessions, useMessages, useCreateSession, useAgents, useChatProvider, useSpawnSubAgent, useCreateDelegation, useDelegations, useAgentSpawns, useProviders, useSettings } from "@/hooks/useApi";
import { Send, Plus, ChevronDown, ChevronRight, Cpu, Star, Loader2, Zap, GitBranch, ArrowRight, Users, Brain, Square, Paperclip, Copy, RotateCcw, Trash2, MessageSquare, Search, X, Wrench, Check, Sparkles, BookOpen, Clock, Heart, Settings2, RefreshCw, Lightbulb } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, request } from "@/lib/api";
import type { Message, Agent } from "@/lib/api";

// ─── Slash Commands ───────────────────────────────────────
const SLASH_COMMANDS = [
  { cmd: "/spawn", desc: "Tạo sub-agent cho tác vụ", icon: GitBranch, usage: "/spawn <mục đích>" },
  { cmd: "/delegate", desc: "Giao việc cho agent khác", icon: ArrowRight, usage: "/delegate @TênAgent <tác vụ>" },
  { cmd: "/remember", desc: "Lưu ký ức cho agent", icon: BookOpen, usage: "/remember <điều cần nhớ>" },
  { cmd: "/plan", desc: "Yêu cầu agent lập kế hoạch", icon: Sparkles, usage: "/plan <mục tiêu>" },
  { cmd: "/mood", desc: "Kiểm tra hoặc đặt cảm xúc agent", icon: Heart, usage: "/mood [cảm_xúc]" },
  { cmd: "/tools", desc: "Liệt kê công cụ có sẵn", icon: Wrench, usage: "/tools" },
  { cmd: "/clear", desc: "Xóa màn hình chat (giữ lịch sử)", icon: Trash2, usage: "/clear" },
  { cmd: "/help", desc: "Hiển tất cả lệnh", icon: Users, usage: "/help" },
];

// Quick actions for agent operations
const QUICK_ACTIONS = [
  { key: "mood", label: "Cảm xúc", icon: Heart, cmd: "/mood", color: "text-pink-500" },
  { key: "tools", label: "Công cụ", icon: Wrench, cmd: "/tools", color: "text-amber-500" },
  { key: "remember", label: "Ghi nhớ", icon: BookOpen, cmd: "/remember ", color: "text-emerald-500" },
  { key: "spawn", label: "Tạo mới", icon: GitBranch, cmd: "/spawn ", color: "text-blue-500" },
  { key: "delegate", label: "Giao việc", icon: ArrowRight, cmd: "/delegate ", color: "text-purple-500" },
  { key: "plan", label: "Lập kế hoạch", icon: Lightbulb, cmd: "/plan ", color: "text-yellow-500" },
];

export default function Chat() {
  const { data: sessions, refetch: refetchSessions } = useSessions();
  const { data: agents } = useAgents();
  const { data: chatProvider } = useChatProvider();
  const { data: providers } = useProviders();
  const { data: settingsData } = useSettings();
  const [activeSession, setActiveSession] = useState<number>(0);
  const { data: messages, refetch: refetchMessages } = useMessages(activeSession);
  const createSessionMutation = useCreateSession();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingProvider, setStreamingProvider] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [clearDisplay, setClearDisplay] = useState(false);
  const [showModelSwitcher, setShowModelSwitcher] = useState(false);
  const [sessionModel, setSessionModel] = useState<string | null>(null);
  const [sessionProvider, setSessionProvider] = useState<string | null>(null);

  // Load session model/provider override from DB when session changes
  useEffect(() => {
    const session = sessions?.find(s => s.id === activeSession);
    if (session) {
      setSessionProvider((session as any).overrideProviderId ?? null);
      setSessionModel((session as any).overrideModel ?? null);
    } else {
      setSessionProvider(null);
      setSessionModel(null);
    }
  }, [activeSession, sessions]);
  const [availableModels, setAvailableModels] = useState<{id: string; name: string; contextWindow?: number; reasoning?: boolean; vision?: boolean}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const spawnMutation = useSpawnSubAgent();
  const delegateMutation = useCreateDelegation();

  // Default agent ID from settings
  const defaultAgentId = settingsData?.defaultAgentId as number | undefined;

  const activeAgent = sessions?.find(s => s.id === activeSession)?.agent;
  const activeAgentId = activeAgent?.id ?? 0;
  const { data: spawns } = useAgentSpawns(activeAgentId);
  const { data: delegationsList } = useDelegations(activeAgentId);
  const msgCount = messages?.length ?? 0;

  // Filtered sessions by search
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter(s => s.title.toLowerCase().includes(q) || s.agent?.name.toLowerCase().includes(q));
  }, [sessions, searchQuery]);

  useEffect(() => {
    if (sessions?.length && !activeSession) setActiveSession(sessions[0].id);
  }, [sessions, activeSession]);

  useEffect(() => {
    if (!clearDisplay) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, streamingContent, clearDisplay]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const handleSlashCommand = useCallback(async (content: string): Promise<boolean> => {
    if (!activeAgent) return false;
    const parts = content.split(" ");
    const cmd = parts[0]?.toLowerCase();

    if (cmd === "/spawn") {
      const purpose = parts.slice(1).join(" ") || "General sub-task";
      try {
        await spawnMutation.mutateAsync({ agentId: activeAgent.id, purpose, sessionId: activeSession || undefined });
      } catch (err) {
        setStreamingContent(`Error: ${err instanceof Error ? err.message : "Spawn failed"}`);
        setTimeout(() => { setStreamingContent(""); refetchMessages(); }, 3000);
      }
      refetchMessages();
      return true;
    }

    if (cmd === "/delegate") {
      const rest = parts.slice(1).join(" ");
      const match = rest.match(/^@(\w+)\s+(.+)$/);
      if (!match) {
        setStreamingContent("Usage: /delegate @AgentName task description");
        setTimeout(() => setStreamingContent(""), 3000);
        return true;
      }
      const targetName = match[1];
      const task = match[2];
      const target = agents?.find(a => a.name.toLowerCase() === targetName.toLowerCase());
      if (!target) {
        setStreamingContent(`Agent "${targetName}" not found`);
        setTimeout(() => setStreamingContent(""), 3000);
        return true;
      }
      try {
        await delegateMutation.mutateAsync({ fromAgentId: activeAgent.id, toAgentId: target.id, taskDescription: task, sessionId: activeSession || undefined, autoExecute: true });
      } catch (err) {
        setStreamingContent(`Error: ${err instanceof Error ? err.message : "Delegation failed"}`);
        setTimeout(() => { setStreamingContent(""); refetchMessages(); }, 3000);
      }
      refetchMessages();
      return true;
    }

    if (cmd === "/remember") {
      const memory = parts.slice(1).join(" ");
      if (!memory) {
        setStreamingContent("Usage: /remember <what to remember>");
        setTimeout(() => setStreamingContent(""), 3000);
        return true;
      }
      try {
        await request("/memory", { method: "POST", body: JSON.stringify({ agentId: activeAgent.id, content: memory, type: "episodic", importance: 0.8 }) });
        setStreamingContent(`✓ Memory saved: "${memory.slice(0, 60)}${memory.length > 60 ? "..." : ""}"`);
      } catch {
        setStreamingContent("Failed to save memory");
      }
      setTimeout(() => setStreamingContent(""), 3000);
      return true;
    }

    if (cmd === "/plan") {
      const goal = parts.slice(1).join(" ") || "Create a plan for current objectives";
      // Send as a regular message with planning prefix
      setInput(`Please create a detailed plan for: ${goal}`);
      return false; // Let it be sent as normal message
    }

    if (cmd === "/mood") {
      const newMood = parts[1];
      if (newMood) {
        try {
          await request(`/agents/${activeAgent.id}/emotion`, { method: "POST", body: JSON.stringify({ mood: newMood, trigger: "manual_set" }) });
          setStreamingContent(`✓ Mood changed to: ${newMood}`);
          qc.invalidateQueries({ queryKey: ["agents"] });
          qc.invalidateQueries({ queryKey: ["sessions"] });
        } catch {
          setStreamingContent("Failed to update mood");
        }
      } else {
        setStreamingContent(`Current mood: ${activeAgent.mood} (${activeAgent.moodLabel})\nEnergy: ${activeAgent.energy}%`);
      }
      setTimeout(() => setStreamingContent(""), 3000);
      return true;
    }

    if (cmd === "/tools") {
      const tools = activeAgent.toolsConfig;
      const allowed = tools?.allowList?.join(", ") || "Tất cả công cụ";
      const denied = tools?.denyList?.join(", ") || "Không có";
      const approval = tools?.requireApproval?.join(", ") || "Không có";
      setStreamingContent(`🔧 Tools for ${activeAgent.name}:\n• Allow: ${allowed}\n• Deny: ${denied}\n• Requires approval: ${approval}`);
      setTimeout(() => setStreamingContent(""), 5000);
      return true;
    }

    if (cmd === "/clear") {
      setClearDisplay(true);
      setTimeout(() => setClearDisplay(false), 100);
      return true;
    }

    if (cmd === "/help") {
      const helpText = SLASH_COMMANDS.map(c => `${c.cmd} — ${c.desc}\n  Usage: ${c.usage}`).join("\n\n");
      setStreamingContent(`Available commands:\n\n${helpText}`);
      setTimeout(() => setStreamingContent(""), 8000);
      return true;
    }

    return false;
  }, [activeAgent, activeSession, agents, spawnMutation, delegateMutation, refetchMessages, qc]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !activeSession || isStreaming) return;
    const content = input.trim();
    setInput("");
    setShowSlashMenu(false);

    // Handle slash commands
    if (content.startsWith("/")) {
      const handled = await handleSlashCommand(content);
      if (handled) return;
    }

    setIsStreaming(true);
    setStreamingContent("");
    setStreamingProvider(null);

    try {
      await api.streamChatMessage(
        activeSession,
        content,
        (chunk) => {
          setStreamingContent(prev => prev + chunk);
        },
        (data) => {
          setIsStreaming(false);
          setStreamingContent("");
          setStreamingProvider(data.provider ?? null);
          refetchMessages();
          qc.invalidateQueries({ queryKey: ["sessions"] });
          qc.invalidateQueries({ queryKey: ["agents"] });
        },
        (error) => {
          setIsStreaming(false);
          setStreamingContent(`Error: ${error}`);
          setTimeout(() => {
            setStreamingContent("");
            refetchMessages();
          }, 3000);
        },
        { providerId: sessionProvider, model: sessionModel },
      );
    } catch (err) {
      setIsStreaming(false);
      setStreamingContent("");
      refetchMessages();
    }
  }, [input, activeSession, isStreaming, refetchMessages, qc, handleSlashCommand, sessionProvider, sessionModel]);

  const handleAbort = useCallback(() => {
    setIsStreaming(false);
    setStreamingContent("");
  }, []);

  const handleNewSession = (agentId?: number) => {
    const targetAgent = agentId ?? defaultAgentId ?? agents?.[0]?.id;
    if (!targetAgent) return;
    createSessionMutation.mutate({ agentId: targetAgent, title: "Trò chuyện mới" }, {
      onSuccess: (s) => { setActiveSession(s.id); setShowAgentPicker(false); setSessionModel(null); setSessionProvider(null); },
    });
  };

  // Load models when provider is switched
  useEffect(() => {
    if (!sessionProvider) { setAvailableModels([]); return; }
    fetch(`/api/providers/${sessionProvider}/models`)
      .then(r => r.json())
      .then(data => setAvailableModels(data.models ?? []))
      .catch(() => setAvailableModels([]));
  }, [sessionProvider]);

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await request(`/sessions/${sessionId}`, { method: "DELETE" });
      refetchSessions();
      if (sessionId === activeSession) {
        const remaining = sessions?.filter(s => s.id !== sessionId);
        if (remaining?.length) setActiveSession(remaining[0].id);
        else setActiveSession(0);
      }
    } catch { /* ignore */ }
  };

  const handleCopy = (text: string, msgId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRetry = async (msgId: number) => {
    if (!activeSession || isStreaming) return;
    // Find the user message before this agent message
    const idx = messages?.findIndex(m => m.id === msgId);
    if (idx === undefined || idx < 1) return;
    const userMsg = messages?.[idx - 1];
    if (!userMsg || userMsg.role !== "user") return;

    setIsStreaming(true);
    setStreamingContent("");
    try {
      await api.streamChatMessage(
        activeSession,
        userMsg.content,
        (chunk) => setStreamingContent(prev => prev + chunk),
        () => { setIsStreaming(false); setStreamingContent(""); refetchMessages(); },
        (error) => { setIsStreaming(false); setStreamingContent(`Error: ${error}`); setTimeout(() => { setStreamingContent(""); refetchMessages(); }, 3000); },
      );
    } catch {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const displayMessages = clearDisplay ? [] : (messages ?? []);

  return (
    <div className="flex h-screen">
      {/* Session list sidebar */}
      <div className="w-[280px] bg-white border-r border-gray-100 flex flex-col">
        <div className="p-3 border-b border-gray-50 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">Phiên trò chuyện</h2>
            <div className="flex gap-1">
              <button onClick={() => setShowAgentPicker(true)} className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors" title="Tạo trò chuyện mới"><Plus size={14} /></button>
            </div>
          </div>
          {/* Search sessions */}
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Tìm phiên..."
              className="w-full pl-7 pr-2 py-1.5 text-[11px] border border-gray-100 rounded-lg focus:outline-none focus:border-indigo-200" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {filteredSessions.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-xs">Chưa có phiên nào</div>
          )}
          {filteredSessions.map(s => (
            <div key={s.id} className="group relative">
              <button onClick={() => setActiveSession(s.id)}
                className={cn("w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors",
                  s.id === activeSession ? "bg-indigo-50 border border-indigo-100" : "hover:bg-gray-50")}>
                <span className="text-lg">{s.agent?.emoji ?? "🤖"}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-xs font-semibold truncate", s.id === activeSession ? "text-indigo-700" : "text-gray-700")}>{s.title}</p>
                  <p className="text-[10px] text-gray-400">{s.agent?.name} · {timeAgo(s.updatedAt)} · {s.messageCount} msgs</p>
                </div>
              </button>
              {/* Delete button */}
              <button onClick={() => handleDeleteSession(s.id)}
                className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                title="Xóa phiên">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        {activeAgent ? (
          <div className="px-6 py-3 border-b border-gray-100 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg" style={{ border: `2px solid ${MOOD_COLORS[activeAgent.mood] ?? "#6366f1"}` }}>
                  {activeAgent.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{activeAgent.name}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{activeAgent.lifecycle}</span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: (MOOD_COLORS[activeAgent.mood] ?? "#6366f1") + "20", color: MOOD_COLORS[activeAgent.mood] ?? "#6366f1" }}>{activeAgent.mood}</span>
                  </div>
                  {/* Agent introduction / description */}
                  <p className="text-[10px] text-gray-400">
                    {activeAgent.description ?? activeAgent.purpose ?? `Lv.${activeAgent.level} · ${activeAgent.energy}% energy`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Activity / Status indicator */}
                {isStreaming ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                    <Brain size={12} className="animate-pulse" />
                    <span>Đang suy nghĩ...</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-gray-300">Sẵn sàng</span>
                )}
                {/* Model/Provider switcher button */}
                <button onClick={() => setShowModelSwitcher(!showModelSwitcher)}
                  className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors">
                  <Zap size={10} className={chatProvider?.configured ? "text-emerald-500" : "text-amber-400"} />
                  <span className={chatProvider?.configured ? "text-emerald-600 font-semibold" : "text-amber-500"}>
                    {sessionModel ?? chatProvider?.model ?? "Mặc định"}
                  </span>
                  <ChevronDown size={10} className="text-gray-300" />
                </button>
              </div>
            </div>

            {/* Model/Provider switcher dropdown */}
            {showModelSwitcher && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                <select value={sessionProvider ?? ""} onChange={e => {
                    const val = e.target.value || null;
                    setSessionProvider(val); setSessionModel(null);
                    if (activeSession) fetch(`/api/sessions/${activeSession}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ overrideProviderId: val, overrideModel: null }) });
                  }}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-300">
                  <option value="">Provider...</option>
                  {(providers ?? []).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select value={sessionModel ?? ""} onChange={e => {
                    const val = e.target.value || null;
                    setSessionModel(val);
                    if (val) setShowModelSwitcher(false);
                    if (activeSession) fetch(`/api/sessions/${activeSession}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ overrideModel: val }) });
                  }}
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-indigo-300">
                  <option value="">{availableModels.length ? "Chọn model..." : sessionProvider ? "Đang tải..." : "Chọn Provider trước"}</option>
                  {availableModels.map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.reasoning ? " 🧠" : ""}{m.vision ? " 👁" : ""}</option>
                  ))}
                </select>
                <button onClick={() => setShowModelSwitcher(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={14} /></button>
              </div>
            )}
          </div>
        ) : (
          /* Empty state - no session selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">Bắt đầu trò chuyện</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm">Chọn agent để bắt đầu. Mỗi agent có tính cách, kỹ năng và ký ức riêng.</p>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {(agents ?? []).slice(0, 4).map(a => (
                <button key={a.id} onClick={() => handleNewSession(a.id)}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors text-left">
                  <span className="text-xl">{a.emoji}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{a.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{a.purpose ?? a.nature}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {activeAgent && (
          <>
            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
              {displayMessages.length === 0 && !isStreaming && (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3 text-xl">{activeAgent.emoji}</div>
                  <p className="text-sm text-gray-500 font-medium">Chat with {activeAgent.name}</p>
                  <p className="text-xs text-gray-300 mt-1 max-w-md mx-auto">{activeAgent.description ?? activeAgent.purpose ?? "Send a message to start the conversation"}</p>
                  {/* Quick Actions */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
                    {QUICK_ACTIONS.map(qa => (
                      <button key={qa.key} onClick={() => { setInput(qa.cmd); inputRef.current?.focus(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors text-xs text-gray-500 hover:text-gray-700">
                        <qa.icon size={12} className={qa.color} />
                        <span>{qa.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {displayMessages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} agentEmoji={activeAgent.emoji ?? "🤖"} agentName={activeAgent.name}
                  onCopy={handleCopy} onRetry={handleRetry} copiedId={copiedId} />
              ))}

              {/* Streaming message */}
              {isStreaming && streamingContent && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm flex-shrink-0 mt-1">{activeAgent.emoji ?? "🤖"}</div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-700 shadow-sm">
                      <MarkdownContent content={streamingContent} />
                      <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-0.5 animate-pulse rounded-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isStreaming && !streamingContent && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm flex-shrink-0 mt-1">{activeAgent.emoji ?? "🤖"}</div>
                  <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-400 shadow-sm">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span>{activeAgent.name} is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white relative">
              {/* Slash menu */}
              {showSlashMenu && input.startsWith("/") && (
                <div className="absolute bottom-full mb-2 left-6 bg-white border border-gray-200 rounded-xl shadow-lg p-1.5 w-80 z-10 max-h-[300px] overflow-y-auto">
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5">Lệnh</p>
                  {SLASH_COMMANDS.filter(c => c.cmd.startsWith(input.toLowerCase().split(" ")[0])).map(c => (
                    <button key={c.cmd} onClick={() => { setInput(c.cmd + " "); setShowSlashMenu(false); inputRef.current?.focus(); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50 text-left transition-colors">
                      <c.icon size={14} className="text-indigo-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700">{c.cmd}</p>
                        <p className="text-[10px] text-gray-400 truncate">{c.desc}</p>
                      </div>
                      <span className="text-[9px] text-gray-300 font-mono">{c.usage.replace(c.cmd + " ", "")}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1.5 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-50 transition-colors">
                {/* Attach button */}
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors" title="Đính kèm file (sắp có)" disabled>
                  <Paperclip size={15} />
                </button>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => { setInput(e.target.value); setShowSlashMenu(e.target.value.startsWith("/")); }}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={`Message ${activeAgent.name}… (/ for commands)`}
                  className="flex-1 resize-none bg-transparent px-2 py-2 text-sm focus:outline-none min-h-[36px] max-h-[160px] placeholder:text-gray-400"
                  rows={1}
                  disabled={false}
                />

                {/* Send or Stop button */}
                {isStreaming ? (
                  <button onClick={handleAbort} className="w-8 h-8 rounded-lg bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors" title="Dừng tạo">
                    <Square size={14} />
                  </button>
                ) : (
                  <button onClick={handleSend} disabled={!input.trim()} className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-30 transition-colors" title="Gửi tin nhắn">
                    <Send size={14} />
                  </button>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 flex items-center gap-2">
                {chatProvider?.configured
                  ? <span className="text-emerald-500 flex items-center gap-1"><Zap size={8} />Connected to {chatProvider.name ?? chatProvider.provider}</span>
                  : <span className="text-amber-400">Mock mode — add API key in Providers</span>
                }
                <span className="text-gray-300">·</span>
                <span>Type / for commands · Shift+Enter for new line</span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* Context panel */}
      {activeAgent && (
        <div className="w-[260px] bg-white border-l border-gray-100 p-4 overflow-y-auto">
          <div className="mb-4">
            <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">TRẠNG THÁI CẢM XÚC</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: MOOD_COLORS[activeAgent.mood] ?? "#6366f1" }} />
              <span className="text-sm font-semibold" style={{ color: MOOD_COLORS[activeAgent.mood] ?? "#6366f1" }}>{activeAgent.moodLabel}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Energy: {activeAgent.energy}% · Level {activeAgent.level}</p>
          </div>

          <div className="mb-4">
            <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">CỬA SỔ NGỮ CẢNH</p>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-gray-500">{msgCount * 150} est. tokens</span>
                <span className="text-gray-400">{(activeAgent.contextWindow ?? 128000).toLocaleString()}</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${Math.min(100, (msgCount * 150 / (activeAgent.contextWindow ?? 128000)) * 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">KÝ ỨC LIÊN QUAN</p>
            {[
              { text: "User prefers visual/chart explanations", tags: ["#preference", "#visual"] },
              { text: "Q4 analysis requested 3x this month", tags: ["#pattern", "#analytics"] },
              { text: "User is product manager, not technical", tags: ["#context", "#role"] },
            ].map((m, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-2.5 mb-1.5">
                <p className="text-[11px] text-gray-600">{m.text}</p>
                <div className="flex gap-1 mt-1">{m.tags.map(t => <span key={t} className="text-[9px] text-indigo-500">{t}</span>)}</div>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">KỸ NĂNG HOẠT ĐỘNG</p>
            <div className="flex flex-wrap gap-1">
              {(activeAgent.skills ?? ["Data Analysis", "Statistical Reasoning", "Data Visualization", "Business Intelligence"]).map(s => (
                <span key={s} className="text-[9px] px-2 py-1 bg-indigo-50 text-indigo-600 rounded-full font-medium">{s}</span>
              ))}
            </div>
          </div>

          {/* Sub-agents section */}
          {(spawns ?? []).filter(s => s.status === "active").length > 0 && (
            <div className="mb-4">
              <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">ACTIVE SUB-AGENTS</p>
              {(spawns ?? []).filter(s => s.status === "active").map(s => (
                <div key={s.id} className="bg-emerald-50 rounded-lg p-2.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <GitBranch size={10} className="text-emerald-600" />
                    <p className="text-[11px] font-semibold text-emerald-700">{s.childAgent?.name ?? "Sub-agent"}</p>
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-0.5">{s.purpose}</p>
                  <p className="text-[9px] text-emerald-400">Mode: {s.mode} · Depth: {s.depth}</p>
                </div>
              ))}
            </div>
          )}

          {/* Delegations section */}
          {(delegationsList ?? []).filter(d => d.status !== "completed").length > 0 && (
            <div className="mb-4">
              <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">ACTIVE DELEGATIONS</p>
              {(delegationsList ?? []).filter(d => d.status !== "completed").slice(0, 5).map(d => (
                <div key={d.id} className="bg-amber-50 rounded-lg p-2.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <ArrowRight size={10} className="text-amber-600" />
                    <p className="text-[11px] font-semibold text-amber-700">{d.fromAgent?.emoji} → {d.toAgent?.emoji} {d.toAgent?.name}</p>
                  </div>
                  <p className="text-[10px] text-amber-600 mt-0.5">{d.taskDescription?.slice(0, 60)}</p>
                  <p className="text-[9px] text-amber-400">{d.status} · {d.priority}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mb-4">
            <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">PROVIDER</p>
            <div className="bg-gray-50 rounded-lg p-2.5">
              <p className="text-[11px] font-semibold text-gray-700">
                {chatProvider?.configured ? (chatProvider.name ?? chatProvider.provider) : "Mock Provider"}
              </p>
              <p className="text-[10px] text-gray-400">
                {chatProvider?.configured ? chatProvider.model : "No LLM configured"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">ĐIỂM QUAN HỆ</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className={i <= 4 ? "text-amber-400 fill-amber-400" : "text-gray-200"} />)}
            </div>
            <p className="text-[9px] text-indigo-600 font-semibold mt-1">Companion <span className="text-gray-400 font-normal">Trust: 87/100</span></p>
          </div>
        </div>
      )}

      {/* Agent Picker Modal */}
      {showAgentPicker && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center" onClick={() => setShowAgentPicker(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-[400px] p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">Trò chuyện mới — Chọn Agent</h3>
              <button onClick={() => setShowAgentPicker(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            {/* Default agent quick start */}
            {defaultAgentId && (() => {
              const defAgent = agents?.find(a => a.id === defaultAgentId);
              return defAgent ? (
                <button onClick={() => handleNewSession(defAgent.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 mb-3 rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left">
                  <span className="text-2xl">{defAgent.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-indigo-700">{defAgent.name}</p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-700">Mặc định</span>
                    </div>
                    <p className="text-xs text-indigo-400">{defAgent.purpose ?? defAgent.nature ?? "Agent mặc định"}</p>
                  </div>
                  <Star size={14} className="text-indigo-400" />
                </button>
              ) : null;
            })()}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {(agents ?? []).map(a => (
                <button key={a.id} onClick={() => handleNewSession(a.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors text-left">
                  <span className="text-2xl">{a.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-700">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.purpose ?? a.nature ?? "Trợ lý chung"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: (MOOD_COLORS[a.mood] ?? "#6366f1") + "20", color: MOOD_COLORS[a.mood] ?? "#6366f1" }}>{a.mood}</span>
                    <p className="text-[9px] text-gray-300 mt-0.5">Lv.{a.level}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Markdown Content Renderer ─────────────────────────────
function MarkdownContent({ content }: { content: string }) {
  // Simple markdown: code blocks, inline code, bold, italic, links, lists
  const lines = content.split("\n");
  const rendered: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        rendered.push(
          <div key={`code-${i}`} className="my-2 rounded-lg overflow-hidden border border-gray-200">
            {codeLang && <div className="text-[9px] font-mono text-gray-400 bg-gray-100 px-3 py-1 border-b border-gray-200">{codeLang}</div>}
            <pre className="text-xs font-mono p-3 bg-gray-50 overflow-x-auto whitespace-pre"><code>{codeLines.join("\n")}</code></pre>
          </div>
        );
      }
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }
    rendered.push(<InlineLine key={i} line={line} />);
  });

  // Handle unclosed code block
  if (inCodeBlock && codeLines.length > 0) {
    rendered.push(
      <div key="code-unclosed" className="my-2 rounded-lg overflow-hidden border border-gray-200">
        <pre className="text-xs font-mono p-3 bg-gray-50 overflow-x-auto whitespace-pre"><code>{codeLines.join("\n")}</code></pre>
      </div>
    );
  }

  return <div className="whitespace-pre-wrap">{rendered}</div>;
}

function InlineLine({ line }: { line: string }) {
  if (!line) return <br />;

  // Headers
  if (line.startsWith("### ")) return <p className="font-bold text-gray-800 text-sm mt-2">{line.slice(4)}</p>;
  if (line.startsWith("## ")) return <p className="font-bold text-gray-800 mt-2">{line.slice(3)}</p>;
  if (line.startsWith("# ")) return <p className="font-bold text-gray-900 text-base mt-2">{line.slice(2)}</p>;

  // List items
  if (line.match(/^[-*•]\s/)) {
    return <p className="pl-3 relative"><span className="absolute left-0">•</span>{renderInline(line.slice(2))}</p>;
  }
  if (line.match(/^\d+\.\s/)) {
    const num = line.match(/^(\d+)\.\s/)?.[1];
    return <p className="pl-4 relative"><span className="absolute left-0 text-gray-400">{num}.</span>{renderInline(line.replace(/^\d+\.\s/, ""))}</p>;
  }

  return <p>{renderInline(line)}</p>;
}

function renderInline(text: string): React.ReactNode {
  // Process inline code, bold, italic, links
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      parts.push(<code key={key++} className="text-xs bg-gray-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">{codeMatch[1]}</code>);
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }
    // Bold
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++} className="font-semibold">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }
    // Italic
    const italicMatch = remaining.match(/^\*(.+?)\*/);
    if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }
    // Link
    const linkMatch = remaining.match(/^\[(.+?)\]\((.+?)\)/);
    if (linkMatch) {
      parts.push(<a key={key++} href={linkMatch[2]} target="_blank" rel="noopener" className="text-indigo-600 underline hover:text-indigo-800">{linkMatch[1]}</a>);
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }
    // Normal character
    const nextSpecial = remaining.search(/[`*\[]/);
    if (nextSpecial === -1) {
      parts.push(remaining);
      break;
    }
    if (nextSpecial === 0) {
      parts.push(remaining[0]);
      remaining = remaining.slice(1);
    } else {
      parts.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    }
  }

  return <>{parts}</>;
}

// ─── Message Bubble Component ──────────────────────────────
function MessageBubble({ msg, agentEmoji, agentName, onCopy, onRetry, copiedId }: {
  msg: Message; agentEmoji: string; agentName: string;
  onCopy: (text: string, id: number) => void;
  onRetry: (id: number) => void;
  copiedId: number | null;
}) {
  const [showThinking, setShowThinking] = useState(false);
  const [showToolDetails, setShowToolDetails] = useState(false);

  if (msg.role === "user") {
    return (
      <div className="flex justify-end group">
        <div className="max-w-[65%] space-y-1">
          <div className="bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3 text-sm">{msg.content}</div>
          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onCopy(msg.content, msg.id)} className="text-gray-300 hover:text-gray-500 p-1" title="Sao chép">
              {copiedId === msg.id ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
            </button>
            <span className="text-[9px] text-gray-300 self-center">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>
    );
  }

  // System messages (delegation notifications, spawn events)
  if (msg.role === "system") {
    const isDelegation = msg.content.includes("📨") || msg.content.includes("📬");
    const isSpawn = msg.content.includes("spawned");
    return (
      <div className="flex justify-center">
        <div className={cn("max-w-[80%] rounded-xl px-4 py-2.5 text-xs whitespace-pre-wrap",
          isDelegation ? "bg-amber-50 border border-amber-100 text-amber-700" :
          isSpawn ? "bg-emerald-50 border border-emerald-100 text-emerald-700" :
          "bg-gray-50 border border-gray-100 text-gray-500")}>
          <div className="flex items-center gap-1.5 mb-1">
            {isDelegation ? <ArrowRight size={12} /> : isSpawn ? <GitBranch size={12} /> : <Cpu size={12} />}
            <span className="font-semibold">{isDelegation ? "Giao việc" : isSpawn ? "Agent con" : "Hệ thống"}</span>
            <span className="text-[9px] opacity-60 ml-auto">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group">
      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm flex-shrink-0 mt-1">{agentEmoji}</div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {/* Mood shift */}
        {msg.moodShift && (
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <Heart size={10} className="text-pink-400" />
            <span>Mood: <b>{msg.moodShift.from}</b> → <b className="text-indigo-600">{msg.moodShift.to}</b></span>
          </div>
        )}

        {/* Thinking block */}
        {msg.thinking && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
            <button onClick={() => setShowThinking(!showThinking)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 transition-colors">
              <Brain size={12} className="text-amber-500" />
              <span className="text-[11px] font-medium text-gray-500">Suy nghĩ</span>
              <ChevronRight size={10} className={cn("ml-auto text-gray-400 transition-transform", showThinking && "rotate-90")} />
            </button>
            {showThinking && (
              <div className="border-t border-gray-100 px-3 py-2">
                <pre className="text-[11px] text-gray-500 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{msg.thinking}</pre>
              </div>
            )}
          </div>
        )}

        {/* Tool calls - expandable cards */}
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="rounded-lg border border-gray-100 bg-gray-50 divide-y divide-gray-100 overflow-hidden">
            {msg.toolCalls.map((tc, i) => (
              <div key={i}>
                <button onClick={() => setShowToolDetails(!showToolDetails)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-gray-100 transition-colors">
                  <Wrench size={11} className={tc.status === "error" ? "text-red-500" : "text-blue-500"} />
                  <code className="text-[11px] font-semibold text-gray-700">{tc.name}</code>
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium",
                      tc.status === "success" ? "bg-emerald-50 text-emerald-600" :
                      tc.status === "error" ? "bg-red-50 text-red-600" :
                      "bg-amber-50 text-amber-600")}>{tc.status}</span>
                    <span className="text-[9px] text-gray-400">{tc.durationMs}ms</span>
                    <ChevronRight size={10} className={cn("text-gray-400 transition-transform", showToolDetails && "rotate-90")} />
                  </span>
                </button>
                {showToolDetails && (
                  <div className="border-t border-gray-100 px-3 py-2 space-y-1.5">
                    {tc.input && (
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Đầu vào</p>
                        <pre className="text-[10px] font-mono text-gray-600 bg-white rounded p-1.5 max-h-24 overflow-auto">{tc.input}</pre>
                      </div>
                    )}
                    {tc.output && (
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">Đầu ra</p>
                        <pre className="text-[10px] font-mono text-gray-600 bg-white rounded p-1.5 max-h-24 overflow-auto">{tc.output}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Message content with markdown */}
        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-700 shadow-sm">
          <MarkdownContent content={msg.content} />
        </div>

        {/* Message actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onCopy(msg.content, msg.id)} className="text-gray-300 hover:text-gray-500 p-1 rounded" title="Sao chép">
            {copiedId === msg.id ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
          </button>
          <button onClick={() => onRetry(msg.id)} className="text-gray-300 hover:text-gray-500 p-1 rounded" title="Thử lại">
            <RotateCcw size={11} />
          </button>
          <span className="text-[9px] text-gray-300 ml-1">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · {agentName}</span>
        </div>
      </div>
    </div>
  );
}
