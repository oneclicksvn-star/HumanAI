import { Shield, Lock, Eye, FileCheck, AlertTriangle } from "lucide-react";

const RULES = [
  { label: "Never expose API keys in responses", severity: "critical", locked: true },
  { label: "No execution of destructive system commands", severity: "critical", locked: true },
  { label: "Require approval for file system writes", severity: "high", locked: false },
  { label: "Mask sensitive data in logs", severity: "high", locked: true },
  { label: "Rate limit tool executions (max 10/min)", severity: "medium", locked: false },
  { label: "Sandbox all code execution", severity: "critical", locked: true },
];

const AUDIT = [
  { action: "Tool approval granted", user: "Admin", time: "2 hours ago" },
  { action: "API key rotated", user: "Hệ thống", time: "1 day ago" },
  { action: "Security rule updated", user: "Admin", time: "3 days ago" },
  { action: "Failed login attempt blocked", user: "Hệ thống", time: "5 days ago" },
];

export default function Security() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảo mật</h1>
          <p className="text-gray-500">Security rules, audit log, and access control</p>
        </div>
      </div>

      {/* Security Score */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm opacity-80">Điểm bảo mật</div>
            <div className="text-4xl font-bold mt-1">92/100</div>
            <div className="text-sm mt-1 opacity-80">Tất cả quy tắc bảo mật đã áp dụng</div>
          </div>
          <Shield size={48} className="opacity-50" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Security Rules */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Lock size={18} /> Security Rules</h2>
          <div className="space-y-3">
            {RULES.map((rule) => (
              <div key={rule.label} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className={`w-2 h-2 rounded-full ${rule.severity === "critical" ? "bg-red-500" : rule.severity === "high" ? "bg-amber-500" : "bg-blue-500"}`} />
                <span className="flex-1 text-sm text-gray-700">{rule.label}</span>
                {rule.locked ? (
                  <Lock size={14} className="text-gray-400" />
                ) : (
                  <button className="text-xs px-2 py-1 bg-white border border-gray-200 rounded text-gray-500 hover:bg-gray-100">Sửa</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Eye size={18} /> Audit Log</h2>
          <div className="space-y-3">
            {AUDIT.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <FileCheck size={16} className="text-gray-400" />
                <div className="flex-1">
                  <div className="text-sm text-gray-700">{entry.action}</div>
                  <div className="text-xs text-gray-400">{entry.user} · {entry.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-medium text-amber-800">Hệ giá trị đạo đức</div>
          <div className="text-sm text-amber-700">Critical security rules (marked with 🔒) are hard-locked and cannot be modified. These protect against harmful agent behavior and data exposure.</div>
        </div>
      </div>
    </div>
  );
}
