import { useState } from "react";
import { cn, MOOD_COLORS } from "@/lib/utils";
import { useAgents, useCreateAgent, useDeleteAgent } from "@/hooks/useApi";
import { Plus, Trash2, Zap, Brain, Shield, Code, Search } from "lucide-react";
import { motion } from "framer-motion";

const STAGE_COLORS: Record<string, string> = { infant: "#60a5fa", child: "#34d399", teen: "#f59e0b", adult: "#f97316", expert: "#ef4444", mentor: "#8b5cf6" };
const MOOD_BG: Record<string, string> = { positive: "bg-emerald-50 text-emerald-700", focused: "bg-blue-50 text-blue-700", reflective: "bg-violet-50 text-violet-700", calming: "bg-sky-50 text-sky-700", supportive: "bg-amber-50 text-amber-700", neutral: "bg-indigo-50 text-indigo-700", satisfied: "bg-emerald-50 text-emerald-700", empathetic: "bg-violet-50 text-violet-700" };

const TEMPLATES = [
  { name: "Data Analyst", emoji: "📊", icon: Brain, nature: "analytical", purpose: "Data analysis and insight generation", vibe: "warm" },
  { name: "AI Engineer", emoji: "⚡", icon: Code, nature: "technical", purpose: "Code review and engineering tasks", vibe: "pragmatic" },
  { name: "Strategist", emoji: "🎯", icon: Zap, nature: "strategic", purpose: "Strategic planning and decision support", vibe: "confident" },
  { name: "Mentor", emoji: "🌿", icon: Shield, nature: "nurturing", purpose: "Team guidance and ethical reasoning", vibe: "wise" },
];

export default function Agents() {
  const { data: agents } = useAgents();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered = (agents ?? []).filter(a => !filter || a.name.toLowerCase().includes(filter.toLowerCase()));

  const handleCreate = (template: typeof TEMPLATES[number]) => {
    createAgent.mutate({ name: template.name, emoji: template.emoji, nature: template.nature, purpose: template.purpose, vibe: template.vibe } as Record<string, unknown>);
    setShowCreate(false);
  };

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-sm text-gray-400 mt-0.5">{(agents ?? []).length} agents registered</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-colors">
          <Plus size={14} /> Create Agent
        </button>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4">Choose a template</h3>
          <div className="grid grid-cols-4 gap-3">
            {TEMPLATES.map(t => (
              <button key={t.name} onClick={() => handleCreate(t)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all">
                <span className="text-3xl">{t.emoji}</span>
                <span className="text-xs font-semibold text-gray-700">{t.name}</span>
                <span className="text-[10px] text-gray-400 text-center">{t.purpose}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-gray-400" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search agents..." className="text-sm outline-none flex-1 bg-transparent" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map(a => (
          <motion.div key={a.id} layout className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl relative" style={{ border: `3px solid ${MOOD_COLORS[a.mood] ?? "#6366f1"}` }}>
                  {a.emoji}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: a.status === "active" ? "#22c55e" : "#9ca3af" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{a.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: (STAGE_COLORS[a.lifecycle] ?? "#6366f1") + "20", color: STAGE_COLORS[a.lifecycle] ?? "#6366f1" }}>{a.lifecycle}</span>
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", MOOD_BG[a.mood] ?? "bg-gray-50 text-gray-600")}>{a.mood}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => deleteAgent.mutate(a.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all">
                <Trash2 size={14} />
              </button>
            </div>

            <p className="text-[11px] text-gray-500 mb-3">{a.purpose ?? "AI Agent"}</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Level {a.level}</span>
                <span className="text-gray-400">{a.xp}/{a.xpNext} XP</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(a.xp / Math.max(a.xpNext, 1)) * 100}%`, background: MOOD_COLORS[a.mood] ?? "#6366f1" }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Energy</span>
                <span className="font-semibold text-gray-600">{a.energy}%</span>
              </div>
            </div>

            <div className="flex gap-1.5 mt-3 flex-wrap">
              {(a.skills || []).map(s => <span key={s} className="text-[9px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full">{s}</span>)}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
