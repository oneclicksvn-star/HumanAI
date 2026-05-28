import { useActivityFeed, useAgents } from "@/hooks/useApi";
import { Activity, Filter } from "lucide-react";
import { useState } from "react";

const TYPE_ICONS: Record<string, string> = {
  message: "💬", tool_call: "⚡", memory_store: "🧠", task_update: "✅", mood_change: "🎭", system: "⚙️", approval: "🔒", spawn: "🤖",
};

export default function ActivityPage() {
  const { data: items = [] } = useActivityFeed();
  const { data: agents = [] } = useAgents();
  const [filterAgent, setFilterAgent] = useState<number | null>(null);

  const filtered = filterAgent ? items.filter((i: any) => i.agentId === filterAgent) : items;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
          <p className="text-gray-500">Real-time activity feed — {items.length} events</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select value={filterAgent ?? ""} onChange={(e) => setFilterAgent(e.target.value ? Number(e.target.value) : null)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="">All Agents</option>
            {agents.map((a: any) => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
        {filtered.map((item: any) => {
          const agent = item.agent;
          return (
            <div key={item.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
              <span className="text-lg flex-shrink-0">{TYPE_ICONS[item.type] ?? "📌"}</span>
              {agent && <span className="text-lg flex-shrink-0">{agent.emoji}</span>}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900">
                  {agent && <span className="font-medium">{agent.name}</span>}
                  {agent && " — "}
                  {item.summary}
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-500 flex-shrink-0">{item.type}</span>
              <span className="text-xs text-gray-400 flex-shrink-0 w-20 text-right">
                {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-5 py-12 text-center text-gray-400">
            <Activity size={32} className="mx-auto mb-2 opacity-50" />
            No activity recorded yet
          </div>
        )}
      </div>
    </div>
  );
}
