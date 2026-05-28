import { useState } from "react";
import { useTools } from "@/hooks/useApi";
import { Wrench, Shield, ToggleLeft, ToggleRight, Terminal, Globe, FileText, Code, Database, Puzzle, Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { request } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_ICONS: Record<string, any> = {
  system: Terminal, web: Globe, file: FileText, code: Code, data: Database, custom: Puzzle, creative: Puzzle, productivity: Puzzle, general: Wrench,
};
const CATEGORY_COLORS: Record<string, string> = {
  system: "#ef4444", web: "#3b82f6", file: "#22c55e", code: "#8b5cf6", data: "#f59e0b", custom: "#ec4899", creative: "#06b6d4", productivity: "#14b8a6", general: "#6b7280",
};

export default function ToolsPage() {
  const { data: tools = [] } = useTools();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "approval">("all");

  const filteredTools = tools.filter((t: any) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filteredTools.reduce((acc: Record<string, any[]>, t: any) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  const approvalQueue = tools.filter((t: any) => t.requiresApproval);

  const handleToggle = async (id: number, currentEnabled: boolean) => {
    await request(`/tools/${id}`, { method: "PATCH", body: JSON.stringify({ isEnabled: !currentEnabled }) });
    qc.invalidateQueries({ queryKey: ["tools"] });
  };

  const handleApprove = async (id: number) => {
    await request(`/tools/${id}/approve`, { method: "POST" });
    qc.invalidateQueries({ queryKey: ["tools"] });
  };

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
          <p className="text-sm text-gray-400 mt-0.5">{tools.length} tools · {tools.filter((t: any) => t.isEnabled).length} enabled · {approvalQueue.length} require approval</p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab("all")} className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors", tab === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>All Tools</button>
          <button onClick={() => setTab("approval")} className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1", tab === "approval" ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>
            <Shield size={11} /> Approval Queue ({approvalQueue.length})
          </button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tools..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-300" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Builtin", value: tools.filter((t: any) => t.type === "builtin").length, color: "#6366f1" },
          { label: "Custom", value: tools.filter((t: any) => t.type === "custom").length, color: "#ec4899" },
          { label: "MCP", value: tools.filter((t: any) => t.type === "mcp").length, color: "#22c55e" },
          { label: "Approval Required", value: approvalQueue.length, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-gray-500 font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Approval Queue Tab */}
      {tab === "approval" && (
        <div className="space-y-3">
          {approvalQueue.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <CheckCircle size={28} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No pending approvals</p>
            </div>
          )}
          {approvalQueue.map((tool: any) => {
            const Icon = CATEGORY_ICONS[tool.category] ?? Wrench;
            const color = CATEGORY_COLORS[tool.category] ?? "#6b7280";
            return (
              <div key={tool.id} className="bg-white rounded-xl border border-amber-100 shadow-sm p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{tool.name}</span>
                    <Shield size={12} className="text-amber-500" />
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">Requires Approval</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{tool.description}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{tool.usageCount} uses · Category: {tool.category}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleApprove(tool.id)} className="px-3 py-1.5 bg-green-50 text-green-600 text-xs font-semibold rounded-lg hover:bg-green-100 flex items-center gap-1">
                    <CheckCircle size={12} /> Approve
                  </button>
                  <button className="px-3 py-1.5 bg-red-50 text-red-500 text-xs font-semibold rounded-lg hover:bg-red-100 flex items-center gap-1">
                    <XCircle size={12} /> Deny
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All Tools Tab */}
      {tab === "all" && Object.entries(grouped).map(([cat, catTools]) => {
        const Icon = CATEGORY_ICONS[cat] ?? Wrench;
        const color = CATEGORY_COLORS[cat] ?? "#6b7280";
        return (
          <div key={cat} className="space-y-2">
            <div className="flex items-center gap-2">
              <Icon size={16} style={{ color }} />
              <h2 className="text-sm font-bold text-gray-700 capitalize">{cat}</h2>
              <span className="text-[10px] text-gray-400">({catTools.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {catTools.map((tool: any) => (
                <div key={tool.id} className={cn("bg-white rounded-xl border shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow", tool.isEnabled ? "border-gray-100" : "border-gray-100 opacity-60")}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{tool.name}</span>
                      <span className={cn("px-1.5 py-0.5 text-[9px] rounded-full font-semibold",
                        tool.type === "builtin" ? "bg-indigo-50 text-indigo-600" : tool.type === "mcp" ? "bg-green-50 text-green-600" : "bg-pink-50 text-pink-600"
                      )}>{tool.type}</span>
                      {tool.requiresApproval && <Shield size={11} className="text-amber-500" />}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{tool.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1">
                      <span>{tool.usageCount} uses</span>
                      {tool.lastUsed && <span className="flex items-center gap-0.5"><Clock size={9} /> {new Date(tool.lastUsed).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleToggle(tool.id, tool.isEnabled)} className="flex-shrink-0">
                    {tool.isEnabled ? <ToggleRight size={26} className="text-green-500" /> : <ToggleLeft size={26} className="text-gray-300" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
