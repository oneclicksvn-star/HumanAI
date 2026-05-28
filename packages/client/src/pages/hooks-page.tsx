import { useState } from "react";
import { useHooks, useCreateHook, useUpdateHook, useAgents } from "@/hooks/useApi";
import { Webhook, Plus, ToggleLeft, ToggleRight, Zap, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { request } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const EVENTS = ["pre_tool_use", "post_tool_use", "message_received", "message_sent", "agent_spawn", "delegation_created", "memory_stored", "mood_changed", "error_occurred", "session_created"];
const ACTIONS = ["log", "notify", "block", "transform", "webhook"];
const EVENT_COLORS: Record<string, string> = {
  pre_tool_use: "#ef4444", post_tool_use: "#f59e0b", message_received: "#3b82f6", message_sent: "#22c55e",
  agent_spawn: "#8b5cf6", delegation_created: "#ec4899", memory_stored: "#06b6d4", mood_changed: "#f97316",
  error_occurred: "#dc2626", session_created: "#14b8a6",
};

export default function HooksPage() {
  const { data: hooks = [] } = useHooks();
  const { data: agents = [] } = useAgents();
  const createHook = useCreateHook();
  const updateHook = useUpdateHook();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", event: "message_received", action: "log", agentId: 0, priority: 5, config: "" });

  const handleCreate = () => {
    createHook.mutate({
      name: form.name,
      event: form.event,
      action: form.action,
      agentId: form.agentId || undefined,
      priority: form.priority,
      config: form.config ? JSON.parse(form.config) : undefined,
      isActive: true,
    } as any);
    setShowCreate(false);
    setForm({ name: "", event: "message_received", action: "log", agentId: 0, priority: 5, config: "" });
  };

  const handleToggle = (id: number, isActive: boolean) => {
    updateHook.mutate({ id, isActive: !isActive } as any);
  };

  const handleDelete = async (id: number) => {
    await request(`/hooks/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["hooks"] });
  };

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hooks</h1>
          <p className="text-sm text-gray-400 mt-0.5">{hooks.length} event hooks · {hooks.filter((h: any) => h.isActive).length} active</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-colors">
          <Plus size={14} /> Create Hook
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">New Hook</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="My Hook" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Agent (optional)</label>
              <select value={form.agentId} onChange={e => setForm({ ...form, agentId: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value={0}>All Agents</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Event</label>
              <select value={form.event} onChange={e => setForm({ ...form, event: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                {EVENTS.map(ev => <option key={ev} value={ev}>{ev}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Action</label>
              <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                {ACTIONS.map(ac => <option key={ac} value={ac}>{ac}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Priority (1-10)</label>
              <input type="number" min={1} max={10} value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Config (JSON, optional)</label>
              <input value={form.config} onChange={e => setForm({ ...form, config: e.target.value })} placeholder='{"url": "..."}' className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={!form.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Create</button>
        </div>
      )}

      {/* Hooks List */}
      <div className="space-y-3">
        {hooks.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Webhook size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No hooks configured</p>
            <p className="text-xs text-gray-300 mt-1">Create a hook to respond to system events</p>
          </div>
        )}
        {hooks.map((hook: any) => (
          <div key={hook.id} className={cn("bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow", !hook.isActive && "opacity-60")}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: (EVENT_COLORS[hook.event] ?? "#6b7280") + "15" }}>
                <Webhook size={18} style={{ color: EVENT_COLORS[hook.event] ?? "#6b7280" }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{hook.name}</span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full text-white" style={{ background: EVENT_COLORS[hook.event] ?? "#6b7280" }}>{hook.event}</span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600">{hook.action}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Zap size={11} /> {hook.triggerCount ?? 0} triggers</span>
                  <span>Priority: {hook.priority}</span>
                  {hook.agentId && <span>Agent: {agents.find(a => a.id === hook.agentId)?.name ?? `#${hook.agentId}`}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(hook.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
              <button onClick={() => handleToggle(hook.id, hook.isActive)}>
                {hook.isActive ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
