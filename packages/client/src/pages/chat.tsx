import { useState, useRef, useEffect, useCallback } from "react";
import { cn, timeAgo, MOOD_COLORS } from "@/lib/utils";
import { useSessions, useMessages, useCreateSession, useAgents, useChatProvider, useSpawnSubAgent, useCreateDelegation, useDelegations, useAgentSpawns } from "@/hooks/useApi";
import { Send, Plus, ChevronDown, ChevronRight, Cpu, Star, Loader2, Zap, GitBranch, ArrowRight, Users } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Message } from "@/lib/api";

export default function Chat() {
  const { data: sessions } = useSessions();
  const { data: agents } = useAgents();
  const { data: chatProvider } = useChatProvider();
  const [activeSession, setActiveSession] = useState<number>(0);
  const { data: messages, refetch: refetchMessages } = useMessages(activeSession);
  const createSessionMutation = useCreateSession();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [streamingProvider, setStreamingProvider] = useState<string | null>(null);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const spawnMutation = useSpawnSubAgent();
  const delegateMutation = useCreateDelegation();

  const activeAgent = sessions?.find(s => s.id === activeSession)?.agent;
  const activeAgentId = activeAgent?.id ?? 0;
  const { data: spawns } = useAgentSpawns(activeAgentId);
  const { data: delegationsList } = useDelegations(activeAgentId);
  const msgCount = messages?.length ?? 0;

  useEffect(() => {
    if (sessions?.length && !activeSession) setActiveSession(sessions[0].id);
  }, [sessions, activeSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamingContent]);

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

    if (cmd === "/help") {
      setStreamingContent(`Available commands:\n/spawn <purpose> — Create a sub-agent for a task\n/delegate @AgentName <task> — Delegate task to another agent\n/help — Show this help`);
      setTimeout(() => setStreamingContent(""), 5000);
      return true;
    }

    return false;
  }, [activeAgent, activeSession, agents, spawnMutation, delegateMutation, refetchMessages]);

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
      );
    } catch (err) {
      setIsStreaming(false);
      setStreamingContent("");
      refetchMessages();
    }
  }, [input, activeSession, isStreaming, refetchMessages, qc, handleSlashCommand]);

  const handleNewSession = () => {
    if (!agents?.length) return;
    createSessionMutation.mutate({ agentId: agents[0].id, title: "New Chat" }, {
      onSuccess: (s) => setActiveSession(s.id),
    });
  };

  return (
    <div className="flex h-screen">
      {/* Session list */}
      <div className="w-[260px] bg-white border-r border-gray-100 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-800">Sessions</h2>
          <button onClick={handleNewSession} className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors"><Plus size={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(sessions ?? []).map(s => (
            <button key={s.id} onClick={() => setActiveSession(s.id)}
              className={cn("w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors",
                s.id === activeSession ? "bg-indigo-50 border border-indigo-100" : "hover:bg-gray-50")}>
              <span className="text-lg">{s.agent?.emoji ?? "🤖"}</span>
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-semibold truncate", s.id === activeSession ? "text-indigo-700" : "text-gray-700")}>{s.title}</p>
                <p className="text-[10px] text-gray-400">{timeAgo(s.updatedAt)} · <span>{s.messageCount} msgs</span></p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {activeAgent && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white">
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
                <p className="text-[10px] text-gray-400">Lv.{activeAgent.level} · {activeAgent.energy}% energy · {msgCount} messages</p>
              </div>
            </div>
            {/* Provider indicator */}
            <div className="flex items-center gap-1.5 text-[10px]">
              <Zap size={10} className={chatProvider?.configured ? "text-emerald-500" : "text-amber-400"} />
              <span className={chatProvider?.configured ? "text-emerald-600 font-semibold" : "text-amber-500"}>
                {chatProvider?.configured ? `${chatProvider.name ?? chatProvider.provider} · ${chatProvider.model}` : "Mock Provider"}
              </span>
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {(messages ?? []).map(msg => <MessageBubble key={msg.id} msg={msg} agentEmoji={activeAgent?.emoji ?? "🤖"} />)}

          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm flex-shrink-0 mt-1">{activeAgent?.emoji ?? "🤖"}</div>
              <div className="flex-1 space-y-2">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap shadow-sm">
                  {streamingContent}
                  <span className="inline-block w-1 h-4 bg-indigo-500 ml-0.5 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* Loading indicator */}
          {isStreaming && !streamingContent && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm flex-shrink-0 mt-1">{activeAgent?.emoji ?? "🤖"}</div>
              <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-400 shadow-sm">
                <Loader2 size={14} className="animate-spin" />
                <span>{activeAgent?.name ?? "Agent"} is thinking...</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-white relative">
          <div className="flex items-end gap-3">
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setShowSlashMenu(e.target.value.startsWith("/")); }}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Message ${activeAgent?.name ?? "agent"}… (Enter to send)`}
              className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 min-h-[44px] max-h-[120px]"
              rows={1}
              disabled={isStreaming}
            />
            <button onClick={handleSend} disabled={!input.trim() || isStreaming} className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-colors">
              {isStreaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
          {showSlashMenu && input.startsWith("/") && (
            <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg p-1 w-72 z-10">
              {[
                { cmd: "/spawn", desc: "Create a sub-agent for a task", icon: GitBranch },
                { cmd: "/delegate", desc: "Delegate task to another agent", icon: ArrowRight },
                { cmd: "/help", desc: "Show all available commands", icon: Users },
              ].filter(c => c.cmd.startsWith(input.toLowerCase())).map(c => (
                <button key={c.cmd} onClick={() => { setInput(c.cmd + " "); setShowSlashMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-indigo-50 text-left transition-colors">
                  <c.icon size={14} className="text-indigo-500" />
                  <div><p className="text-xs font-semibold text-gray-700">{c.cmd}</p><p className="text-[10px] text-gray-400">{c.desc}</p></div>
                </button>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-400 mt-1.5">
            {chatProvider?.configured
              ? <span className="text-emerald-500">Connected to {chatProvider.name ?? chatProvider.provider}</span>
              : <span className="text-amber-400">Mock mode — configure a provider in Settings for real AI</span>
            }
            {" · "}/spawn · /delegate · /help · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Context panel */}
      {activeAgent && (
        <div className="w-[260px] bg-white border-l border-gray-100 p-4 overflow-y-auto">
          <div className="mb-4">
            <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">EMOTIONAL STATE</p>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ background: MOOD_COLORS[activeAgent.mood] ?? "#6366f1" }} />
              <span className="text-sm font-semibold" style={{ color: MOOD_COLORS[activeAgent.mood] ?? "#6366f1" }}>{activeAgent.moodLabel}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Emotional arc today</p>
          </div>

          <div className="mb-4">
            <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">RELEVANT MEMORIES</p>
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
            <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">ACTIVE SKILLS</p>
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
            <p className="text-[9px] font-bold tracking-wider text-gray-400 mb-2">RELATIONSHIP SCORE</p>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} size={14} className={i <= 4 ? "text-amber-400 fill-amber-400" : "text-gray-200"} />)}
            </div>
            <p className="text-[9px] text-indigo-600 font-semibold mt-1">Companion <span className="text-gray-400 font-normal">Trust: 87/100</span></p>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg, agentEmoji }: { msg: Message; agentEmoji: string }) {
  const [showThinking, setShowThinking] = useState(false);

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[65%] bg-indigo-600 text-white rounded-2xl rounded-br-md px-4 py-3 text-sm">{msg.content}</div>
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
            <span className="font-semibold">{isDelegation ? "Delegation" : isSpawn ? "Sub-Agent" : "System"}</span>
          </div>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-sm flex-shrink-0 mt-1">{agentEmoji}</div>
      <div className="flex-1 space-y-2">
        {msg.moodShift && (
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <span>{agentEmoji}</span>
            <span>Mood shifted: <b>{msg.moodShift.from}</b> → <b className="text-indigo-600">{msg.moodShift.to}</b></span>
          </div>
        )}
        {msg.thinking && (
          <button onClick={() => setShowThinking(!showThinking)} className="flex items-center gap-1.5 text-[11px] text-indigo-500 hover:text-indigo-700">
            <Cpu size={12} />Show thinking {showThinking ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          </button>
        )}
        {showThinking && msg.thinking && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-[11px] text-indigo-700 italic">{msg.thinking}</div>
        )}
        {msg.toolCalls?.map((tc, i) => (
          <div key={i} className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-3 py-1.5 text-[11px] text-violet-700">
            <Cpu size={12} /><code>{tc.name}</code><span className="text-violet-400">{tc.durationMs}ms</span>
          </div>
        ))}
        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap shadow-sm">{msg.content}</div>
      </div>
    </div>
  );
}
