import { useDoctor } from "@/hooks/useApi";
import { Stethoscope, CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

const STATUS_ICONS: Record<string, any> = { pass: CheckCircle, warn: AlertTriangle, fail: XCircle };
const STATUS_COLORS: Record<string, { icon: string; bg: string; text: string }> = {
  pass: { icon: "text-green-500", bg: "bg-green-50", text: "text-green-700" },
  warn: { icon: "text-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  fail: { icon: "text-red-500", bg: "bg-red-50", text: "text-red-700" },
};

export default function Doctor() {
  const { data, refetch, isRefetching } = useDoctor();
  const checks = data?.checks ?? [];
  const overall = data?.overall ?? "unknown";

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chẩn đoán</h1>
          <p className="text-gray-500">Kiểm tra sức khỏe hệ thống</p>
        </div>
        <button onClick={() => refetch()} disabled={isRefetching} className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2 disabled:opacity-50">
          <RefreshCw size={18} className={isRefetching ? "animate-spin" : ""} /> Run Checks
        </button>
      </div>

      {/* Overall Status */}
      <div className={`rounded-xl p-6 mb-8 ${overall === "healthy" ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
        <div className="flex items-center gap-3">
          {overall === "healthy" ? <CheckCircle size={32} className="text-green-500" /> : <AlertTriangle size={32} className="text-amber-500" />}
          <div>
            <div className="text-xl font-bold capitalize">{overall === "healthy" ? "All Systems Healthy" : "Degraded — Attention Required"}</div>
            <div className="text-sm opacity-70">{checks.filter((c: any) => c.status === "pass").length} of {checks.length} checks passed</div>
          </div>
        </div>
      </div>

      {/* Checks */}
      <div className="space-y-3">
        {checks.map((check: any, i: number) => {
          const style = STATUS_COLORS[check.status] ?? STATUS_COLORS.pass;
          const Icon = STATUS_ICONS[check.status] ?? CheckCircle;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <Icon size={22} className={style.icon} />
              <div className="flex-1">
                <div className="font-medium text-gray-900">{check.name}</div>
                <div className="text-sm text-gray-500">{check.message}</div>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full font-medium ${style.bg} ${style.text}`}>{check.status.toUpperCase()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
