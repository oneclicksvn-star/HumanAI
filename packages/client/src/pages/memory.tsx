import { useState } from "react";
import { cn, timeAgo, MOOD_COLORS } from "@/lib/utils";
import { useMemories, useKnowledgeGraph, useSkills, useDreams, useAgents } from "@/hooks/useApi";
import { Brain, Network, Zap, Moon, Search } from "lucide-react";

const TABS = [
  { id: "timeline", label: "Timeline", icon: Brain },
  { id: "graph", label: "Knowledge Graph", icon: Network },
  { id: "skills", label: "Skills", icon: Zap },
  { id: "dreams", label: "Dreams", icon: Moon },
];

const TYPE_COLORS: Record<string, string> = {
  episodic: "border-l-emerald-400 bg-emerald-50/50",
  semantic: "border-l-blue-400 bg-blue-50/50",
  procedural: "border-l-violet-400 bg-violet-50/50",
};

export default function Memory() {
  const [tab, setTab] = useState("timeline");
  const [agentFilter, setAgentFilter] = useState<number | undefined>(undefined);
  const { data: agents } = useAgents();
  const { data: memories } = useMemories(agentFilter);
  const { data: kg } = useKnowledgeGraph(agentFilter);
  const { data: skills } = useSkills(agentFilter);
  const { data: dreams } = useDreams(agentFilter);

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Memory Palace</h1>
          <p className="text-sm text-gray-400 mt-0.5">{(memories ?? []).length} memories stored</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAgentFilter(undefined)} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", !agentFilter ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600")}>All</button>
          {(agents ?? []).map(a => (
            <button key={a.id} onClick={() => setAgentFilter(a.id)} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all", agentFilter === a.id ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600")}>
              {a.emoji} {a.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center", tab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === "timeline" && (
        <div className="space-y-3">
          {(memories ?? []).map(m => {
            const agent = agents?.find(a => a.id === m.agentId);
            return (
              <div key={m.id} className={cn("bg-white rounded-xl border-l-4 p-4 shadow-sm", TYPE_COLORS[m.type] ?? "border-l-gray-300")}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{agent?.emoji ?? "🤖"}</span>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{m.title}</p>
                      <p className="text-[10px] text-gray-400">{m.type} · {timeAgo(m.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: MOOD_COLORS[m.mood] ?? "#6366f1" }} />
                    <span className="text-[9px] text-gray-400">importance: {(m.importance * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 mb-2">{m.summary}</p>
                <div className="flex gap-1.5">{(m.tags ?? []).map(t => <span key={t} className="text-[9px] text-indigo-500 font-semibold">{t}</span>)}</div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "graph" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm min-h-[400px]">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Knowledge Graph</h3>
          <div className="relative w-full h-[350px]">
            <svg width="100%" height="100%" viewBox="0 0 600 400">
              {(kg?.edges ?? []).map((e, i) => {
                const s = kg?.nodes.find(n => n.nodeId === e.source);
                const t = kg?.nodes.find(n => n.nodeId === e.target);
                if (!s || !t) return null;
                return <line key={i} x1={s.x ?? 0} y1={s.y ?? 0} x2={t.x ?? 0} y2={t.y ?? 0} stroke="#c4b5fd" strokeWidth={2} opacity={0.5} />;
              })}
              {(kg?.nodes ?? []).map(n => (
                <g key={n.nodeId}>
                  <circle cx={n.x ?? 0} cy={n.y ?? 0} r={20 + n.confidence * 10} fill={n.type === "skill" ? "#818cf8" : n.type === "technology" ? "#34d399" : n.type === "domain" ? "#f59e0b" : "#60a5fa"} opacity={0.8} />
                  <text x={n.x ?? 0} y={(n.y ?? 0) + 35} textAnchor="middle" fontSize={10} fill="#64748b">{n.label}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {tab === "skills" && (
        <div className="grid grid-cols-3 gap-4">
          {(skills ?? []).map(s => {
            const agent = agents?.find(a => a.id === s.agentId);
            return (
              <div key={s.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">{agent?.emoji ?? "🤖"}</span>
                  <div>
                    <p className="text-xs font-bold text-gray-800">{s.name}</p>
                    <p className="text-[10px] text-gray-400">{s.category} · {s.practiceCount} practices</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Mastery</span>
                    <span className="font-bold text-indigo-600">{s.mastery}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${s.mastery}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "dreams" && (
        <div className="space-y-3">
          {(dreams ?? []).map(d => {
            const agent = agents?.find(a => a.id === d.agentId);
            return (
              <div key={d.id} className="bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl border border-indigo-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Moon size={14} className="text-indigo-500" />
                  <span className="text-sm">{agent?.emoji ?? "🤖"}</span>
                  <p className="text-xs font-bold text-gray-700">{d.title}</p>
                </div>
                <p className="text-[11px] text-gray-600 mb-2">{d.insight}</p>
                <div className="flex gap-1.5">{(d.sourceTags ?? []).map(t => <span key={t} className="text-[9px] text-indigo-500 font-semibold">{t}</span>)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
