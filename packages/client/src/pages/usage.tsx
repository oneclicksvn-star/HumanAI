import { useUsageSummary, useAgents } from "@/hooks/useApi";
import { BarChart3, DollarSign, Zap, Activity } from "lucide-react";

export default function Usage() {
  const { data: summary } = useUsageSummary();
  const { data: agents = [] } = useAgents();
  const agentMap = Object.fromEntries(agents.map((a: any) => [a.id, a]));

  const totalTokens = summary?.total ?? 0;
  const totalCost = summary?.totalCost ?? 0;
  const totalCalls = summary?.count ?? 0;
  const byAgent = summary?.byAgent ?? [];
  const byModel = summary?.byModel ?? [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usage & Costs</h1>
          <p className="text-gray-500">Phân tích token và chi phí theo provider và agent</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Tokens", value: totalTokens.toLocaleString(), icon: Zap, color: "text-indigo-500" },
          { label: "Total Cost", value: `$${totalCost.toFixed(4)}`, icon: DollarSign, color: "text-green-500" },
          { label: "Số lần gọi API", value: totalCalls.toLocaleString(), icon: Activity, color: "text-blue-500" },
          { label: "Avg Cost/Call", value: totalCalls > 0 ? `$${(totalCost / totalCalls).toFixed(4)}` : "$0", icon: BarChart3, color: "text-amber-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <s.icon size={20} className={s.color + " mb-2"} />
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* By Agent */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sử dụng theo Agent</h2>
          <div className="space-y-4">
            {byAgent.map((row: any) => {
              const agent = agentMap[row.agentId];
              const pct = totalTokens > 0 ? (row.tokens / totalTokens) * 100 : 0;
              return (
                <div key={row.agentId}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{agent?.emoji ?? "🤖"}</span>
                      <span className="font-medium text-gray-900">{agent?.name ?? `Agent #${row.agentId}`}</span>
                    </div>
                    <div className="text-sm text-gray-500">{row.tokens.toLocaleString()} tokens · ${row.cost.toFixed(4)}</div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{row.calls} calls</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Model */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Sử dụng theo Model</h2>
          <div className="space-y-4">
            {byModel.map((row: any, i: number) => {
              const colors = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];
              const pct = totalTokens > 0 ? (row.tokens / totalTokens) * 100 : 0;
              return (
                <div key={row.model ?? i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{row.model ?? "unknown"}</span>
                    <div className="text-sm text-gray-500">{row.tokens.toLocaleString()} tokens · ${row.cost.toFixed(4)}</div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{row.calls} calls</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
