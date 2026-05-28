import { useState } from "react";
import { cn } from "@/lib/utils";
import { useProviders, useCreateProvider, useUpdateProvider } from "@/hooks/useApi";
import { Plus, Check, X, Settings2, Key, Power, Zap } from "lucide-react";

const PROVIDER_TYPES = [
  { type: "anthropic", name: "Anthropic", color: "#d4a574", models: ["claude-sonnet-4-20250514", "claude-3.5-haiku-20241022", "claude-3-opus-20240229"] },
  { type: "openai", name: "OpenAI", color: "#10a37f", models: ["gpt-4o", "gpt-4o-mini", "o1", "o3-mini"] },
  { type: "google", name: "Google", color: "#4285f4", models: ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-pro"] },
  { type: "ollama", name: "Ollama", color: "#333", models: ["llama3.3", "mistral", "codellama", "phi3"] },
  { type: "deepseek", name: "DeepSeek", color: "#5b6ef4", models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"] },
  { type: "groq", name: "Groq", color: "#f55036", models: ["llama-3.3-70b", "mixtral-8x7b", "gemma2-9b"] },
];

export default function Providers() {
  const { data: providers } = useProviders();
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();
  const [showAdd, setShowAdd] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editKey, setEditKey] = useState("");

  const handleAdd = () => {
    if (!selectedType) return;
    const pt = PROVIDER_TYPES.find(p => p.type === selectedType);
    if (!pt) return;
    createProvider.mutate({ name: pt.name, type: pt.type, apiKey: apiKey || undefined, models: pt.models } as Record<string, unknown>);
    setShowAdd(false);
    setApiKey("");
    setSelectedType("");
  };

  const handleSaveKey = (id: number) => {
    updateProvider.mutate({ id, apiKey: editKey } as Record<string, unknown> & { id: number });
    setEditingId(null);
    setEditKey("");
  };

  const handleToggleActive = (id: number, currentActive: boolean) => {
    updateProvider.mutate({ id, isActive: !currentActive } as Record<string, unknown> & { id: number });
  };

  const handleSetAsDefault = (id: number) => {
    // Deactivate all, then activate this one
    for (const p of providers ?? []) {
      if (p.id !== id && p.isActive) {
        updateProvider.mutate({ id: p.id, isActive: false } as Record<string, unknown> & { id: number });
      }
    }
    updateProvider.mutate({ id, isActive: true } as Record<string, unknown> & { id: number });
  };

  const configuredCount = (providers ?? []).filter(p => p.apiKey && p.apiKey !== "Not set" && p.apiKey !== "••••").length;
  const activeProvider = (providers ?? []).find(p => p.isActive && p.apiKey && p.apiKey !== "Not set");

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {activeProvider
              ? <>Active: <b className="text-indigo-600">{activeProvider.name}</b> — AI chat responses enabled</>
              : <span className="text-amber-500">No active provider — add an API key to enable AI chat</span>}
          </p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-colors">
          <Plus size={14} /> Add Provider
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800">Add Provider</h3>
          <div className="grid grid-cols-3 gap-3">
            {PROVIDER_TYPES.map(pt => (
              <button key={pt.type} onClick={() => setSelectedType(pt.type)}
                className={cn("flex items-center gap-3 p-3 rounded-xl border transition-all",
                  selectedType === pt.type ? "border-indigo-300 bg-indigo-50" : "border-gray-100 hover:border-gray-200")}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: pt.color + "20" }}>
                  <Settings2 size={14} style={{ color: pt.color }} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-700">{pt.name}</p>
                  <p className="text-[9px] text-gray-400">{pt.models.length} models</p>
                </div>
              </button>
            ))}
          </div>
          {selectedType && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-500 mb-1 block">API Key {selectedType === "ollama" && "(optional — runs locally)"}</label>
                <input value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" placeholder="sk-..." className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700"><Check size={12} /> Save</button>
                <button onClick={() => { setShowAdd(false); setSelectedType(""); }} className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-bold px-4 py-2 rounded-xl hover:bg-gray-200"><X size={12} /> Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {(providers ?? []).map(p => {
          const pt = PROVIDER_TYPES.find(t => t.type === p.type);
          const hasKey = p.apiKey && p.apiKey !== "Not set";
          return (
            <div key={p.id} className={cn("bg-white rounded-2xl border p-5 shadow-sm transition-all", p.isActive && hasKey ? "border-indigo-200 ring-1 ring-indigo-100" : "border-gray-100")}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: (pt?.color ?? "#6366f1") + "20" }}>
                    <Settings2 size={18} style={{ color: pt?.color ?? "#6366f1" }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{p.name}</p>
                    <p className="text-[10px] text-gray-400">{p.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.isActive && hasKey && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-50 text-indigo-600">
                      <Zap size={10} /> Active
                    </span>
                  )}
                  <button
                    onClick={() => hasKey ? handleToggleActive(p.id, p.isActive) : undefined}
                    className={cn("w-8 h-4 rounded-full transition-colors relative",
                      p.isActive && hasKey ? "bg-indigo-500" : "bg-gray-200",
                      !hasKey && "opacity-40 cursor-not-allowed"
                    )}
                    disabled={!hasKey}
                    title={hasKey ? (p.isActive ? "Deactivate" : "Activate") : "Add API key first"}
                  >
                    <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all",
                      p.isActive && hasKey ? "left-4" : "left-0.5"
                    )} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {/* API Key section */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key size={12} className="text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-500">
                      API Key: {hasKey ? p.apiKey : <span className="text-amber-500">Not configured</span>}
                    </span>
                  </div>
                  {editingId !== p.id && (
                    <button onClick={() => { setEditingId(p.id); setEditKey(""); }}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700">
                      {hasKey ? "Update" : "Add Key"}
                    </button>
                  )}
                </div>

                {editingId === p.id && (
                  <div className="flex gap-2">
                    <input
                      value={editKey} onChange={e => setEditKey(e.target.value)}
                      type="password" placeholder="Enter API key..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-300"
                      autoFocus
                    />
                    <button onClick={() => handleSaveKey(p.id)} disabled={!editKey.trim()}
                      className="text-[10px] font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40">
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="text-[10px] font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                      Cancel
                    </button>
                  </div>
                )}

                {/* Models */}
                <div className="flex flex-wrap gap-1.5">
                  {(p.models ?? []).map(m => <span key={m} className="text-[9px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full">{m}</span>)}
                </div>

                {/* Set as default button */}
                {hasKey && !p.isActive && (
                  <button onClick={() => handleSetAsDefault(p.id)}
                    className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 mt-1">
                    <Power size={10} /> Set as active provider
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
