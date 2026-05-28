import { useHooks } from "@/hooks/useApi";
import { Webhook, Plus, ToggleLeft, ToggleRight, Zap } from "lucide-react";

const EVENT_COLORS: Record<string, string> = {
  pre_tool_use: "#ef4444", post_tool_use: "#f59e0b", message_received: "#3b82f6", message_sent: "#22c55e", agent_spawn: "#8b5cf6",
};

export default function HooksPage() {
  const { data: hooks = [] } = useHooks();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hooks</h1>
          <p className="text-gray-500">{hooks.length} event hooks configured</p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2">
          <Plus size={18} /> Create Hook
        </button>
      </div>

      <div className="space-y-3">
        {hooks.map((hook: any) => (
          <div key={hook.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Webhook size={20} className="text-indigo-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{hook.name}</span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full text-white" style={{ background: EVENT_COLORS[hook.event] ?? "#6b7280" }}>{hook.event}</span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-600">{hook.action}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Zap size={12} /> {hook.triggerCount} triggers</span>
                  <span>Priority: {hook.priority}</span>
                </div>
              </div>
              {hook.isActive ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
