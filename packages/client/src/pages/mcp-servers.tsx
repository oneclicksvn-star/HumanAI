import { useMcpServers } from "@/hooks/useApi";
import { Server, Plus, Play, Square, AlertCircle, Wrench } from "lucide-react";

const STATUS_STYLES: Record<string, { color: string; bg: string; icon: any }> = {
  running: { color: "#22c55e", bg: "#22c55e15", icon: Play },
  stopped: { color: "#9ca3af", bg: "#9ca3af15", icon: Square },
  error: { color: "#ef4444", bg: "#ef444415", icon: AlertCircle },
};

export default function McpServers() {
  const { data: servers = [] } = useMcpServers();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MCP Servers</h1>
          <p className="text-gray-500">Model Context Protocol — {servers.filter((s: any) => s.status === "running").length} running</p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2">
          <Plus size={18} /> Add Server
        </button>
      </div>

      <div className="space-y-4">
        {servers.map((srv: any) => {
          const style = STATUS_STYLES[srv.status] ?? STATUS_STYLES.stopped;
          const StatusIcon = style.icon;
          return (
            <div key={srv.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: style.bg }}>
                  <Server size={24} style={{ color: style.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{srv.name}</h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full" style={{ background: style.bg, color: style.color }}>
                      <StatusIcon size={10} /> {srv.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5 font-mono">{srv.url}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="capitalize">{srv.type} transport</span>
                    <span className="flex items-center gap-1"><Wrench size={12} /> {srv.toolCount} tools</span>
                  </div>
                </div>
                <button className={`px-3 py-1.5 text-sm rounded-lg ${srv.status === "running" ? "bg-red-50 text-red-500 hover:bg-red-100" : "bg-green-50 text-green-500 hover:bg-green-100"}`}>
                  {srv.status === "running" ? "Stop" : "Start"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
