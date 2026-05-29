import { useVaultDocs, useAgents } from "@/hooks/useApi";
import { FileText, FolderOpen, Plus, Search, Code, StickyNote, Link } from "lucide-react";
import { useState } from "react";

const TYPE_ICONS: Record<string, any> = { doc: FileText, note: StickyNote, snippet: Code, wikilink: Link };
const TYPE_COLORS: Record<string, string> = { doc: "#3b82f6", note: "#22c55e", snippet: "#8b5cf6", wikilink: "#f59e0b" };

export default function Vault() {
  const { data: docs = [] } = useVaultDocs();
  const { data: agents = [] } = useAgents();
  const agentMap = Object.fromEntries(agents.map((a: any) => [a.id, a]));
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<string | null>(null);

  const folders = [...new Set(docs.map((d: any) => d.folder))].sort();
  const filtered = docs
    .filter((d: any) => !folder || d.folder === folder)
    .filter((d: any) => d.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kho lưu trữ</h1>
          <p className="text-gray-500">{docs.length} documents stored</p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2">
          <Plus size={18} /> New Document
        </button>
      </div>

      <div className="flex gap-6">
        {/* Folder Sidebar */}
        <div className="w-48 flex-shrink-0">
          <h3 className="text-xs font-medium text-gray-400 uppercase mb-2">Thư mục</h3>
          <div className="space-y-1">
            <button onClick={() => setFolder(null)} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${!folder ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"}`}>
              <FolderOpen size={16} /> All Files
            </button>
            {folders.map((f: string) => (
              <button key={f} onClick={() => setFolder(f)} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${folder === f ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"}`}>
                <FolderOpen size={16} /> {f}
              </button>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="flex-1">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>

          <div className="space-y-2">
            {filtered.map((doc: any) => {
              const Icon = TYPE_ICONS[doc.type] ?? FileText;
              const color = TYPE_COLORS[doc.type] ?? "#6b7280";
              const agent = doc.agentId ? agentMap[doc.agentId] : null;
              return (
                <div key={doc.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Icon size={20} style={{ color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{doc.title}</span>
                        <span className="px-1.5 py-0.5 text-[10px] rounded-full" style={{ background: `${color}20`, color }}>{doc.type}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        <span>{doc.folder}</span>
                        <span>{doc.size} chars</span>
                        {agent && <span>{agent.emoji} {agent.name}</span>}
                        <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap max-w-[200px]">
                      {(doc.tags ?? []).map((tag: string) => (
                        <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
