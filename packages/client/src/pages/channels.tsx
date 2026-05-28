import { useChannels, useAgents } from "@/hooks/useApi";
import { MessageCircle, Plus } from "lucide-react";

const TYPE_INFO: Record<string, { icon: string; color: string; bg: string }> = {
  whatsapp: { icon: "💬", color: "#25D366", bg: "#25D36615" },
  telegram: { icon: "✈️", color: "#0088cc", bg: "#0088cc15" },
  discord: { icon: "🎮", color: "#5865F2", bg: "#5865F215" },
  slack: { icon: "💼", color: "#4A154B", bg: "#4A154B15" },
  email: { icon: "📧", color: "#EA4335", bg: "#EA433515" },
  webhook: { icon: "🔗", color: "#6366f1", bg: "#6366f115" },
};
const STATUS_COLORS: Record<string, string> = { connected: "#22c55e", disconnected: "#9ca3af", error: "#ef4444" };

export default function Channels() {
  const { data: channels = [] } = useChannels();
  const { data: agents = [] } = useAgents();
  const agentMap = Object.fromEntries(agents.map((a: any) => [a.id, a]));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Channels</h1>
          <p className="text-gray-500">{channels.filter((c: any) => c.status === "connected").length} of {channels.length} connected</p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2">
          <Plus size={18} /> Add Channel
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-green-500">{channels.filter((c: any) => c.status === "connected").length}</div>
          <div className="text-sm text-gray-500">Connected</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-gray-400">{channels.filter((c: any) => c.status === "disconnected").length}</div>
          <div className="text-sm text-gray-500">Disconnected</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-indigo-500">{channels.reduce((sum: number, c: any) => sum + c.messageCount, 0)}</div>
          <div className="text-sm text-gray-500">Total Messages</div>
        </div>
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-2 gap-4">
        {channels.map((ch: any) => {
          const info = TYPE_INFO[ch.type] ?? TYPE_INFO.webhook;
          const agent = ch.agentId ? agentMap[ch.agentId] : null;
          return (
            <div key={ch.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl" style={{ background: info.bg }}>
                  {info.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{ch.name}</h3>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[ch.status] }} />
                      <span className="text-xs text-gray-500 capitalize">{ch.status}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 capitalize">{ch.type}</div>
                </div>
                <button className={`px-3 py-1.5 text-sm rounded-lg ${ch.status === "connected" ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-green-50 text-green-500 hover:bg-green-100"}`}>
                  {ch.status === "connected" ? "Disconnect" : "Connect"}
                </button>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-500">
                  <MessageCircle size={14} /> {ch.messageCount} messages
                </div>
                {agent ? (
                  <div className="flex items-center gap-1 text-gray-500">
                    <span>{agent.emoji}</span> <span>{agent.name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs">No agent assigned</span>
                )}
                {ch.lastActivity && (
                  <span className="text-xs text-gray-400">Last: {new Date(ch.lastActivity).toLocaleTimeString()}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
