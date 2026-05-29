import { useTraces, useAgents } from "@/hooks/useApi";
import { Route, Zap, Brain, Search as SearchIcon } from "lucide-react";

const TYPE_ICONS: Record<string, any> = { llm_call: Brain, tool_call: Zap, memory_recall: SearchIcon, delegation: Route };
const TYPE_COLORS: Record<string, string> = { llm_call: "#6366f1", tool_call: "#f59e0b", memory_recall: "#22c55e", delegation: "#8b5cf6" };

export default function Traces() {
  const { data: traces = [] } = useTraces();
  const { data: agents = [] } = useAgents();
  const agentMap = Object.fromEntries(agents.map((a: any) => [a.id, a]));

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Traces</h1>
          <p className="text-gray-500">LLM call tracing — {traces.length} traces</p>
        </div>
      </div>

      <div className="space-y-3">
        {traces.map((trace: any) => {
          const agent = trace.agentId ? agentMap[trace.agentId] : null;
          const Icon = TYPE_ICONS[trace.type] ?? Route;
          const color = TYPE_COLORS[trace.type] ?? "#6b7280";
          return (
            <div key={trace.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                  <Icon size={20} style={{ color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 capitalize">{trace.type.replace(/_/g, " ")}</span>
                    {agent && <span className="text-sm text-gray-500">{agent.emoji} {agent.name}</span>}
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${trace.status === "success" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>{trace.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {trace.input && (
                      <div className="bg-gray-50 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-gray-400">Input:</span>
                        <div className="text-gray-700 truncate">{trace.input}</div>
                      </div>
                    )}
                    {trace.output && (
                      <div className="bg-gray-50 rounded-lg px-3 py-1.5">
                        <span className="text-xs text-gray-400">Output:</span>
                        <div className="text-gray-700 truncate">{trace.output}</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {trace.model && <div className="text-xs text-gray-500 font-mono">{trace.model}</div>}
                  {trace.tokens > 0 && <div className="text-xs text-gray-400">{trace.tokens} tokens</div>}
                  {trace.latencyMs && <div className="text-xs text-gray-400">{trace.latencyMs}ms</div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
