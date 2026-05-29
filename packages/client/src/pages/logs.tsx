import { useLogs } from "@/hooks/useApi";
import { Terminal, Filter } from "lucide-react";
import { useState } from "react";

const LEVELS = ["all", "debug", "info", "warn", "error", "fatal"];
const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
  debug: { bg: "bg-gray-100", text: "text-gray-500" },
  info: { bg: "bg-blue-100", text: "text-blue-600" },
  warn: { bg: "bg-amber-100", text: "text-amber-600" },
  error: { bg: "bg-red-100", text: "text-red-600" },
  fatal: { bg: "bg-red-200", text: "text-red-800" },
};
const SOURCE_COLORS: Record<string, string> = {
  server: "#6366f1", agent: "#22c55e", provider: "#f59e0b", tool: "#ef4444", hook: "#8b5cf6", cron: "#06b6d4",
};

export default function Logs() {
  const [level, setLevel] = useState("all");
  const { data: logs = [] } = useLogs(level === "all" ? undefined : level);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhật ký</h1>
          <p className="text-gray-500">{logs.length} log entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          {LEVELS.map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`px-3 py-1.5 text-sm rounded-lg capitalize ${level === l ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg">
        <div className="px-4 py-2 bg-gray-800 flex items-center gap-2 border-b border-gray-700">
          <Terminal size={14} className="text-gray-400" />
          <span className="text-sm text-gray-400 font-mono">humancore-ai.log</span>
        </div>
        <div className="p-4 font-mono text-sm space-y-1 max-h-[600px] overflow-y-auto">
          {logs.map((log: any) => {
            const lc = LEVEL_COLORS[log.level] ?? LEVEL_COLORS.info;
            const sc = SOURCE_COLORS[log.source] ?? "#6b7280";
            return (
              <div key={log.id} className="flex items-start gap-2 py-0.5 hover:bg-gray-800/50 px-2 -mx-2 rounded">
                <span className="text-gray-600 flex-shrink-0 w-20">{new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold flex-shrink-0 ${lc.bg} ${lc.text}`}>{log.level.toUpperCase()}</span>
                <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded" style={{ color: sc, background: `${sc}20` }}>{log.source}</span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            );
          })}
          {logs.length === 0 && <div className="text-gray-600 text-center py-8">Không tìm thấy nhật ký</div>}
        </div>
      </div>
    </div>
  );
}
