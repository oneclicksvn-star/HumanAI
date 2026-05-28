import { useBackups } from "@/hooks/useApi";
import { Database, Download, Upload, Plus, HardDrive, Clock } from "lucide-react";

const TYPE_COLORS: Record<string, string> = { full: "#6366f1", agents: "#22c55e", settings: "#f59e0b", memory: "#8b5cf6" };

export default function Backup() {
  const { data: backups = [] } = useBackups();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Backup & Restore</h1>
          <p className="text-gray-500">{backups.length} backups stored</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Upload size={18} /> Import
          </button>
          <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2">
            <Plus size={18} /> Create Backup
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <HardDrive size={20} className="text-indigo-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{(backups.reduce((s: number, b: any) => s + b.size, 0) / 1024).toFixed(0)} KB</div>
          <div className="text-sm text-gray-500">Total Backup Size</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <Database size={20} className="text-green-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{backups.length}</div>
          <div className="text-sm text-gray-500">Total Backups</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <Clock size={20} className="text-amber-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900">{backups[0] ? new Date(backups[0].createdAt).toLocaleDateString() : "Never"}</div>
          <div className="text-sm text-gray-500">Last Backup</div>
        </div>
      </div>

      {/* Backup List */}
      <div className="space-y-3">
        {backups.map((backup: any) => (
          <div key={backup.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Database size={20} className="text-indigo-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{backup.name}</span>
                  <span className="px-2 py-0.5 text-[10px] rounded-full text-white" style={{ background: TYPE_COLORS[backup.type] ?? "#6b7280" }}>{backup.type}</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full ${backup.status === "completed" ? "bg-green-100 text-green-600" : backup.status === "in_progress" ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"}`}>
                    {backup.status}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(backup.createdAt).toLocaleString()} · {(backup.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 flex items-center gap-1"><Download size={14} /> Download</button>
                <button className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">Restore</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
