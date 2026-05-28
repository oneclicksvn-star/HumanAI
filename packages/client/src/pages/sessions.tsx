import { useState } from "react";
import { cn, timeAgo, MOOD_COLORS } from "@/lib/utils";
import { useSessions, useAgents } from "@/hooks/useApi";
import { Link } from "wouter";
import { MessageSquare, Clock, Archive, Plus, Search, Trash2, ArrowRight, Filter } from "lucide-react";
import { request } from "@/lib/api";

export default function Sessions() {
  const { data: sessions, refetch } = useSessions();
  const { data: agents } = useAgents();
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState<number | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const filtered = (sessions ?? [])
    .filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.agent?.name.toLowerCase().includes(search.toLowerCase()))
    .filter(s => !agentFilter || s.agent?.id === agentFilter);

  const active = filtered.filter(s => s.status === "active");
  const archived = filtered.filter(s => s.status === "archived");

  const handleDelete = async (id: number) => {
    await request(`/sessions/${id}`, { method: "DELETE" });
    refetch();
  };

  const handleArchive = async (id: number) => {
    await request(`/sessions/${id}`, { method: "PATCH", body: JSON.stringify({ status: "archived" }) });
    refetch();
  };

  const totalMessages = (sessions ?? []).reduce((sum, s) => sum + s.messageCount, 0);
  const todaySessions = (sessions ?? []).filter(s => {
    const diff = Date.now() - new Date(s.createdAt).getTime();
    return diff < 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
          <p className="text-sm text-gray-400 mt-0.5">{(sessions ?? []).length} total · {totalMessages} messages · {todaySessions} today</p>
        </div>
        <Link href="/chat">
          <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-colors">
            <Plus size={14} /> New Session
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sessions..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-300" />
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setAgentFilter(null)} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold", !agentFilter ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600")}>All</button>
          {(agents ?? []).map(a => (
            <button key={a.id} onClick={() => setAgentFilter(a.id)} className={cn("px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1", agentFilter === a.id ? "bg-indigo-600 text-white" : "bg-white border border-gray-200 text-gray-600")}>
              {a.emoji} {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Active", value: active.length, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Archived", value: archived.length, color: "text-gray-500 bg-gray-50 border-gray-100" },
          { label: "Messages", value: totalMessages, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Today", value: todaySessions, color: "text-amber-600 bg-amber-50 border-amber-100" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-xl border p-3", s.color)}>
            <p className="text-xl font-bold">{s.value}</p>
            <p className="text-[10px] font-semibold opacity-60">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active sessions */}
      <div className="space-y-2">
        <h2 className="text-xs font-bold tracking-wider text-gray-400 flex items-center gap-2"><Clock size={12} /> ACTIVE ({active.length})</h2>
        {active.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <MessageSquare size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No active sessions</p>
            <p className="text-xs text-gray-300 mt-1">Start a new chat to create a session</p>
          </div>
        )}
        {active.map(s => (
          <div key={s.id} className="group bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ border: `2px solid ${MOOD_COLORS[s.agent?.mood ?? "neutral"] ?? "#6366f1"}` }}>
              {s.agent?.emoji ?? "🤖"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{s.title}</p>
              <p className="text-[11px] text-gray-400">{s.agent?.name ?? "Agent"} · {timeAgo(s.updatedAt)} · {s.messageCount} messages</p>
            </div>
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleArchive(s.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-amber-500 hover:bg-amber-50" title="Archive">
                <Archive size={13} />
              </button>
              <button onClick={() => handleDelete(s.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50" title="Delete">
                <Trash2 size={13} />
              </button>
            </div>
            <Link href="/chat">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors">
                Open <ArrowRight size={11} />
              </button>
            </Link>
          </div>
        ))}
      </div>

      {/* Archived sessions */}
      {archived.length > 0 && (
        <div className="space-y-2">
          <button onClick={() => setShowArchived(!showArchived)} className="text-xs font-bold tracking-wider text-gray-400 flex items-center gap-2 hover:text-gray-600">
            <Archive size={12} /> ARCHIVED ({archived.length}) {showArchived ? "▾" : "▸"}
          </button>
          {showArchived && archived.map(s => (
            <div key={s.id} className="group bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center gap-4 opacity-70 hover:opacity-100 transition-opacity">
              <span className="text-xl">{s.agent?.emoji ?? "🤖"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-600 truncate">{s.title}</p>
                <p className="text-[11px] text-gray-400">{s.agent?.name ?? "Agent"} · {timeAgo(s.updatedAt)} · {s.messageCount} msgs</p>
              </div>
              <button onClick={() => handleDelete(s.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100" title="Delete">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
