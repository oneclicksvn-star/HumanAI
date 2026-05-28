import { useTools } from "@/hooks/useApi";
import { Wrench, Shield, ToggleLeft, ToggleRight, Terminal, Globe, FileText, Code, Database, Puzzle } from "lucide-react";

const CATEGORY_ICONS: Record<string, any> = {
  system: Terminal, web: Globe, file: FileText, code: Code, data: Database, custom: Puzzle, creative: Puzzle, productivity: Puzzle, general: Wrench,
};
const CATEGORY_COLORS: Record<string, string> = {
  system: "#ef4444", web: "#3b82f6", file: "#22c55e", code: "#8b5cf6", data: "#f59e0b", custom: "#ec4899", creative: "#06b6d4", productivity: "#14b8a6", general: "#6b7280",
};

export default function ToolsPage() {
  const { data: tools = [] } = useTools();

  const grouped = tools.reduce((acc: Record<string, any[]>, t: any) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
          <p className="text-gray-500">{tools.length} tools available — {tools.filter((t: any) => t.isEnabled).length} enabled</p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2">
          <Wrench size={18} /> Add Tool
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Builtin", value: tools.filter((t: any) => t.type === "builtin").length, color: "#6366f1" },
          { label: "Custom", value: tools.filter((t: any) => t.type === "custom").length, color: "#ec4899" },
          { label: "MCP", value: tools.filter((t: any) => t.type === "mcp").length, color: "#22c55e" },
          { label: "Approval Required", value: tools.filter((t: any) => t.requiresApproval).length, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tools by Category */}
      {Object.entries(grouped).map(([cat, catTools]) => {
        const Icon = CATEGORY_ICONS[cat] ?? Wrench;
        const color = CATEGORY_COLORS[cat] ?? "#6b7280";
        return (
          <div key={cat} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={18} style={{ color }} />
              <h2 className="text-lg font-semibold text-gray-900 capitalize">{cat}</h2>
              <span className="text-sm text-gray-400">({catTools.length})</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {catTools.map((tool: any) => (
                <div key={tool.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                    <Icon size={20} style={{ color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{tool.name}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${tool.type === "builtin" ? "bg-indigo-100 text-indigo-600" : tool.type === "mcp" ? "bg-green-100 text-green-600" : "bg-pink-100 text-pink-600"}`}>{tool.type}</span>
                      {tool.requiresApproval && <Shield size={14} className="text-amber-500" />}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{tool.description}</p>
                    <div className="text-xs text-gray-400 mt-1">{tool.usageCount} uses</div>
                  </div>
                  <div className="flex-shrink-0">
                    {tool.isEnabled ? <ToggleRight size={28} className="text-green-500" /> : <ToggleLeft size={28} className="text-gray-300" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
