import { useHeartbeat } from "@/hooks/useApi";
import { HeartPulse, Cpu, HardDrive, Clock, Activity } from "lucide-react";

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function Heartbeat() {
  const { data } = useHeartbeat();

  const status = data?.status ?? "unknown";
  const uptime = data?.uptime ?? 0;
  const memory = data?.memory ?? { rss: 0, heapUsed: 0 };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Heartbeat</h1>
          <p className="text-gray-500">Real-time system monitoring (updates every 10s)</p>
        </div>
      </div>

      {/* Status Pulse */}
      <div className={`rounded-xl p-8 mb-8 text-center ${status === "alive" ? "bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
        <div className="relative inline-block">
          <HeartPulse size={64} className={`${status === "alive" ? "text-green-500" : "text-red-500"}`} />
          {status === "alive" && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-ping" />
          )}
        </div>
        <div className="text-2xl font-bold text-gray-900 mt-4 capitalize">{status}</div>
        <div className="text-sm text-gray-500">Server is responding</div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} className="text-indigo-500" />
            <h2 className="font-semibold text-gray-900">Uptime</h2>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatUptime(uptime)}</div>
          <div className="text-sm text-gray-500 mt-1">Since server start</div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Total Seconds</span><span className="font-mono">{uptime.toLocaleString()}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={20} className="text-purple-500" />
            <h2 className="font-semibold text-gray-900">Memory</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">RSS</span>
                <span className="font-medium">{memory.rss} MB</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-purple-500" style={{ width: `${Math.min(memory.rss / 5.12, 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Heap Used</span>
                <span className="font-medium">{memory.heapUsed} MB</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.min(memory.heapUsed / 5.12, 100)}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Update */}
      {data?.timestamp && (
        <div className="mt-6 text-center text-sm text-gray-400 flex items-center justify-center gap-1">
          <Activity size={14} /> Last updated: {new Date(data.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
