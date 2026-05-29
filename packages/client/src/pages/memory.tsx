import { useState } from "react";
import { cn, timeAgo, MOOD_COLORS } from "@/lib/utils";
import { useMemories, useKnowledgeGraph, useSkills, useDreams, useAgents } from "@/hooks/useApi";
import { Brain, Network, Zap, Moon, Search, RefreshCw, TrendingDown, Sparkles, RotateCcw, Trash2 } from "lucide-react";
import { request } from "@/lib/api";

const TABS = [
  { id: "timeline", label: "Timeline", icon: Brain },
  { id: "search", label: "Search", icon: Search },
  { id: "graph", label: "Knowledge Graph", icon: Network },
  { id: "skills", label: "Kỹ năng", icon: Zap },
  { id: "dreams", label: "Dreams", icon: Moon },
  { id: "consolidation", label: "Consolidation", icon: RefreshCw },
];

const TYPE_COLORS: Record<string, string> = {
  episodic: "border-l-emerald-400 bg-emerald-50/50",
  semantic: "border-l-blue-400 bg-blue-50/50",
  procedural: "border-l-violet-400 bg-violet-50/50",
};

interface SearchResult {
  id: number;
  title: string;
  summary: string;
  type: string;
  mood: string;
  tags: string[];
  importance: number;
  effectiveImportance: number;
  recallCount: number;
  score: number;
  scores: { fts: number; importance: number; recency: number; graph: number };
  createdAt: string;
}

interface ConsolidationResult {
  jobId: number;
  status: string;
  episodic: { memoriesCreated: number };
  semantic: { entitiesExtracted: number; relationsCreated: number; memoriesMerged: number };
  dreaming: { dreamsGenerated: number; personalityUpdates: Array<{ trait: string; direction: string }>; xpGranted: number };
  decay: { totalProcessed: number; decayedBelow10: number };
  durationMs: number;
}

export default function Memory() {
  const [tab, setTab] = useState("timeline");
  const [agentFilter, setAgentFilter] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState<ConsolidationResult | null>(null);
  const { data: agents } = useAgents();
  const { data: memories, refetch: refetchMemories } = useMemories(agentFilter);
  const { data: kg, refetch: refetchKG } = useKnowledgeGraph(agentFilter);
  const { data: skills } = useSkills(agentFilter);
  const { data: dreams, refetch: refetchDreams } = useDreams(agentFilter);

  const handleSearch = async () => {
    if (!agentFilter) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/memory/search?agentId=${agentFilter}&q=${encodeURIComponent(searchQuery)}&limit=15`);
      const data = await res.json();
      setSearchResults(data.results);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  const handleRecall = async (memoryId: number) => {
    try {
      await request(`/memory/${memoryId}/recall`, { method: "POST" });
      refetchMemories();
    } catch { /* ignore */ }
  };

  const handleDeleteMemory = async (memoryId: number) => {
    try {
      await request(`/memory/${memoryId}`, { method: "DELETE" });
      refetchMemories();
    } catch { /* ignore */ }
  };

  const handleConsolidate = async (type: string = "full") => {
    if (!agentFilter) return;
    setConsolidating(true);
    setConsolidationResult(null);
    try {
      const res = await fetch(`/api/consolidation/${agentFilter}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setConsolidationResult(data);
      refetchMemories();
      refetchKG();
      refetchDreams();
    } catch { /* ignore */ }
    setConsolidating(false);
  };

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kho ký ức</h1>
          <p className="text-sm text-gray-400 mt-0.5">{(memories ?? []).length} memories stored</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAgentFilter(undefined)} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold transition-all", !agentFilter ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600")}>Tất cả</button>
          {(agents ?? []).map(a => (
            <button key={a.id} onClick={() => setAgentFilter(a.id)} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all", agentFilter === a.id ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600")}>
              {a.emoji} {a.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn("flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all flex-1 justify-center", tab === t.id ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* Timeline Tab */}
      {tab === "timeline" && (
        <div className="space-y-3">
          {(memories ?? []).map(m => {
            const agent = agents?.find(a => a.id === m.agentId);
            const effectiveImp = (m as { effectiveImportance?: number }).effectiveImportance ?? m.importance;
            return (
              <div key={m.id} className={cn("bg-white rounded-xl border-l-4 p-4 shadow-sm", TYPE_COLORS[m.type] ?? "border-l-gray-300")}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{agent?.emoji ?? "🤖"}</span>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{m.title}</p>
                      <p className="text-[10px] text-gray-400">{m.type} · {timeAgo(m.createdAt)} · recalled {m.recallCount}x</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: MOOD_COLORS[m.mood] ?? "#6366f1" }} />
                    <div className="text-right">
                      <span className="text-[9px] text-gray-400 block">importance: {(m.importance * 100).toFixed(0)}%</span>
                      {effectiveImp !== m.importance && (
                        <span className="text-[9px] text-orange-400 flex items-center gap-0.5">
                          <TrendingDown size={8} /> effective: {(effectiveImp * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 mb-2">{m.summary}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">{(m.tags ?? []).map(t => <span key={t} className="text-[9px] text-indigo-500 font-semibold">{t}</span>)}</div>
                  <div className="flex gap-1">
                    <button onClick={() => handleRecall(m.id)} className="text-[9px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1" title="Recall (boost importance +10%)">
                      <RotateCcw size={9} /> Recall
                    </button>
                    <button onClick={() => handleDeleteMemory(m.id)} className="text-[9px] px-2 py-0.5 rounded bg-red-50 text-red-400 hover:bg-red-100 flex items-center gap-1" title="Xóa">
                      <Trash2 size={9} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search Tab — Hybrid Search */}
      {tab === "search" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Search size={14} className="text-indigo-500" /> Hybrid Memory Search
            </h3>
            <p className="text-[10px] text-gray-400 mb-3">
              Score = FTS(0.3) + Importance(0.3) + Recency(0.2) + Graph(0.2) — Ebbinghaus decay applied
            </p>
            {!agentFilter && <p className="text-xs text-orange-500">Select an agent first to search their memories.</p>}
            {agentFilter && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search memories (e.g. 'coding decisions', 'emotional patterns')"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button onClick={handleSearch} disabled={searching} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>
            )}
          </div>

          {searchResults && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">{searchResults.length} results found</p>
              {searchResults.map(r => (
                <div key={r.id} className={cn("bg-white rounded-xl border-l-4 p-4 shadow-sm", TYPE_COLORS[r.type] ?? "border-l-gray-300")}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{r.title}</p>
                      <p className="text-[10px] text-gray-400">{r.type} · {timeAgo(r.createdAt)} · recalled {r.recallCount}x</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-indigo-600">{(r.score * 100).toFixed(0)}%</span>
                      <div className="flex gap-1 mt-0.5">
                        <span className="text-[8px] bg-green-50 text-green-600 px-1 rounded">FTS {(r.scores.fts * 100).toFixed(0)}</span>
                        <span className="text-[8px] bg-blue-50 text-blue-600 px-1 rounded">IMP {(r.scores.importance * 100).toFixed(0)}</span>
                        <span className="text-[8px] bg-orange-50 text-orange-600 px-1 rounded">REC {(r.scores.recency * 100).toFixed(0)}</span>
                        <span className="text-[8px] bg-purple-50 text-purple-600 px-1 rounded">GRP {(r.scores.graph * 100).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-600 mb-2">{r.summary}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">{r.tags.map(t => <span key={t} className="text-[9px] text-indigo-500 font-semibold">{t}</span>)}</div>
                    <span className="text-[9px] text-gray-400">
                      effective: {(r.effectiveImportance * 100).toFixed(0)}% (base: {(r.importance * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Knowledge Graph Tab */}
      {tab === "graph" && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm min-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-700">Đồ thị tri thức</h3>
            <span className="text-[10px] text-gray-400">{(kg?.nodes ?? []).length} nodes · {(kg?.edges ?? []).length} edges</span>
          </div>
          <div className="relative w-full h-[350px]">
            <svg width="100%" height="100%" viewBox="0 0 800 500">
              {(kg?.edges ?? []).map((e, i) => {
                const s = kg?.nodes.find(n => n.nodeId === e.source);
                const t = kg?.nodes.find(n => n.nodeId === e.target);
                if (!s || !t) return null;
                return <line key={i} x1={(s.x ?? 0) + 400} y1={(s.y ?? 0) + 250} x2={(t.x ?? 0) + 400} y2={(t.y ?? 0) + 250} stroke="#c4b5fd" strokeWidth={Math.max(1, e.weight * 2)} opacity={0.5} />;
              })}
              {(kg?.nodes ?? []).map(n => (
                <g key={n.nodeId}>
                  <circle cx={(n.x ?? 0) + 400} cy={(n.y ?? 0) + 250} r={15 + n.confidence * 10} fill={n.type === "skill" ? "#818cf8" : n.type === "technology" || n.type === "tool" ? "#34d399" : n.type === "topic" ? "#f59e0b" : n.type === "person" ? "#f472b6" : "#60a5fa"} opacity={0.8} />
                  <text x={(n.x ?? 0) + 400} y={(n.y ?? 0) + 250 + 30} textAnchor="middle" fontSize={9} fill="#64748b">{n.label}</text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {/* Skills Tab */}
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
                    <span className="text-gray-400">Thành thạo</span>
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

      {/* Dreams Tab */}
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
                  <span className="text-[9px] text-gray-400 ml-auto">{timeAgo(d.consolidatedAt)}</span>
                </div>
                <p className="text-[11px] text-gray-600 mb-2">{d.insight}</p>
                <div className="flex gap-1.5">{(d.sourceTags ?? []).map(t => <span key={t} className="text-[9px] text-indigo-500 font-semibold">{t}</span>)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Consolidation Tab */}
      {tab === "consolidation" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-500" /> Memory Consolidation Pipeline
            </h3>
            <p className="text-[10px] text-gray-400 mb-4">
              3-stage pipeline: Episodic (extract) → Semantic (KG) → Dreaming (insights) + Ebbinghaus decay
            </p>

            {!agentFilter && <p className="text-xs text-orange-500">Select an agent to run consolidation.</p>}
            {agentFilter && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleConsolidate("full")} disabled={consolidating} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5">
                  <RefreshCw size={12} className={consolidating ? "animate-spin" : ""} /> {consolidating ? "Running..." : "Full Consolidation"}
                </button>
                <button onClick={() => handleConsolidate("episodic")} disabled={consolidating} className="px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold disabled:opacity-50">
                  Episodic Only
                </button>
                <button onClick={() => handleConsolidate("semantic")} disabled={consolidating} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold disabled:opacity-50">
                  Semantic Only
                </button>
                <button onClick={() => handleConsolidate("dreaming")} disabled={consolidating} className="px-3 py-2 bg-violet-100 text-violet-700 rounded-lg text-xs font-semibold disabled:opacity-50">
                  Dreaming Only
                </button>
              </div>
            )}
          </div>

          {consolidationResult && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold text-gray-700">Kết quả tổng hợp</h4>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", consolidationResult.status === "completed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                  {consolidationResult.status}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-emerald-700">{consolidationResult.episodic.memoriesCreated}</p>
                  <p className="text-[9px] text-emerald-500">Ký ức đã tạo</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-700">{consolidationResult.semantic.entitiesExtracted}</p>
                  <p className="text-[9px] text-blue-500">Thực thể đã trích xuất</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-violet-700">{consolidationResult.dreaming.dreamsGenerated}</p>
                  <p className="text-[9px] text-violet-500">Giấc mơ đã tạo</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-orange-700">{consolidationResult.dreaming.xpGranted}</p>
                  <p className="text-[9px] text-orange-500">XP Granted</p>
                </div>
              </div>

              {consolidationResult.dreaming.personalityUpdates.length > 0 && (
                <div className="mt-3 p-3 bg-indigo-50 rounded-lg">
                  <p className="text-[10px] font-bold text-indigo-700 mb-1">Tiến hóa tính cách</p>
                  {consolidationResult.dreaming.personalityUpdates.map((u, i) => (
                    <p key={i} className="text-[10px] text-indigo-600">
                      {u.trait} → {u.direction === "increase" ? "↑" : "↓"} ({u.direction})
                    </p>
                  ))}
                </div>
              )}

              <div className="mt-3 flex items-center gap-3 text-[10px] text-gray-400">
                <span>Job #{consolidationResult.jobId}</span>
                <span>Duration: {consolidationResult.durationMs}ms</span>
                <span>Merged: {consolidationResult.semantic.memoriesMerged}</span>
                <span>Relations: {consolidationResult.semantic.relationsCreated}</span>
              </div>
            </div>
          )}

          {/* Pipeline Explanation */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-gray-600">Cách hoạt động</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[9px] font-bold text-emerald-700">1</div>
                  <span className="text-[10px] font-bold text-gray-700">Bộ xử lý sự kiện</span>
                </div>
                <p className="text-[9px] text-gray-500">Extracts memories from chat. Tags emotions, scores importance (decisions/code/personal = high).</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[9px] font-bold text-blue-700">2</div>
                  <span className="text-[10px] font-bold text-gray-700">Bộ xử lý ngữ nghĩa</span>
                </div>
                <p className="text-[9px] text-gray-500">Builds knowledge graph from entities. Deduplicates similar memories. Creates relations.</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-violet-200 flex items-center justify-center text-[9px] font-bold text-violet-700">3</div>
                  <span className="text-[10px] font-bold text-gray-700">Bộ xử lý mơ</span>
                </div>
                <p className="text-[9px] text-gray-500">Consolidates insights into dreams. Evolves personality traits. Grants XP for growth.</p>
              </div>
            </div>
            <div className="mt-2 p-2 bg-white rounded-lg">
              <p className="text-[9px] text-gray-500">
                <strong>Ebbinghaus Decay:</strong> importance = base * e^(-t/halfLife). Emotional memories: 60d halfLife. Normal: 30d. Recall boosts +10%.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
