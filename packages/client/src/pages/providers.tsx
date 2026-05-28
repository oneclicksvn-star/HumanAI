import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useProviders, useCreateProvider, useUpdateProvider } from "@/hooks/useApi";
import { request } from "@/lib/api";
import {
  Plus, Check, X, Settings2, Key, Power, Zap, Loader2, CheckCircle2, XCircle,
  RefreshCw, Trash2, Search, Globe, Server, ChevronRight, Brain, Eye, Shield,
  ArrowUpDown, ExternalLink, Database, Activity, Wifi, WifiOff
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ProviderTypeInfo = {
  type: string;
  name: string;
  authType: string;
  color: string;
  defaultModel: string;
  baseUrl: string;
  isOpenAICompatible: boolean;
};

type ModelInfo = {
  id: string;
  name: string;
  contextWindow?: number;
  maxTokens?: number;
  reasoning?: boolean;
  vision?: boolean;
  embedding?: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Providers() {
  const { data: providers, refetch } = useProviders();
  const createProvider = useCreateProvider();
  const updateProvider = useUpdateProvider();

  const [providerTypes, setProviderTypes] = useState<ProviderTypeInfo[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "custom">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [addTab, setAddTab] = useState<"popular" | "custom">("popular");
  const [search, setSearch] = useState("");

  // Add form state
  const [selectedType, setSelectedType] = useState("");
  const [formName, setFormName] = useState("");
  const [formApiKey, setFormApiKey] = useState("");
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formDefaultModel, setFormDefaultModel] = useState("");
  const [formAuthType, setFormAuthType] = useState("bearer");

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editKey, setEditKey] = useState("");

  // Test state
  const [testing, setTesting] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<Record<number, { ok: boolean; latencyMs?: number }>>({});

  // Models drawer
  const [modelsDrawer, setModelsDrawer] = useState<number | null>(null);
  const [drawerModels, setDrawerModels] = useState<ModelInfo[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState("");

  // Fetch provider types from API
  useEffect(() => {
    request("/providers/types").then((data: any) => setProviderTypes(data ?? [])).catch(() => {});
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!selectedType && addTab === "popular") return;
    const pt = providerTypes.find(p => p.type === selectedType);
    const name = formName || pt?.name || "Custom Provider";
    const type = addTab === "custom" ? "custom_openai" : selectedType;

    createProvider.mutate({
      name,
      displayName: formName || null,
      type,
      apiKey: formApiKey || undefined,
      baseUrl: formBaseUrl || undefined,
      authType: formAuthType,
      defaultModel: formDefaultModel || undefined,
    } as Record<string, unknown>);

    resetAddForm();
  };

  const resetAddForm = () => {
    setShowAdd(false);
    setSelectedType("");
    setFormName("");
    setFormApiKey("");
    setFormBaseUrl("");
    setFormDefaultModel("");
    setFormAuthType("bearer");
    setAddTab("popular");
  };

  const handleSaveKey = (id: number) => {
    updateProvider.mutate({ id, apiKey: editKey } as Record<string, unknown> & { id: number });
    setEditingId(null);
    setEditKey("");
  };

  const handleToggleActive = (id: number, currentActive: boolean) => {
    updateProvider.mutate({ id, isActive: !currentActive } as Record<string, unknown> & { id: number });
  };

  const handleDelete = async (id: number) => {
    await request(`/providers/${id}`, { method: "DELETE" });
    refetch();
  };

  const handleTestConnection = async (id: number) => {
    setTesting(id);
    setTestResult(prev => { const n = { ...prev }; delete n[id]; return n; });
    try {
      const res = await request(`/providers/${id}/test`, { method: "POST" }) as any;
      setTestResult(prev => ({ ...prev, [id]: { ok: res?.ok ?? false, latencyMs: res?.latencyMs } }));
    } catch {
      setTestResult(prev => ({ ...prev, [id]: { ok: false } }));
    }
    setTesting(null);
  };

  const handleVerify = async (id: number) => {
    setTesting(id);
    try {
      const res = await request(`/providers/${id}/verify`, { method: "POST", body: JSON.stringify({}) }) as any;
      setTestResult(prev => ({ ...prev, [id]: { ok: res?.valid ?? false, latencyMs: res?.latencyMs } }));
    } catch {
      setTestResult(prev => ({ ...prev, [id]: { ok: false } }));
    }
    setTesting(null);
  };

  const handleOpenModels = async (id: number) => {
    setModelsDrawer(id);
    setDrawerLoading(true);
    setModelSearch("");
    try {
      const res = await request(`/providers/${id}/models?refresh=true`) as any;
      setDrawerModels(res?.models ?? []);
    } catch {
      setDrawerModels([]);
    }
    setDrawerLoading(false);
  };

  const handleRefreshModels = async (id: number) => {
    setDrawerLoading(true);
    try {
      const res = await request(`/providers/${id}/models?refresh=true`) as any;
      setDrawerModels(res?.models ?? []);
    } catch {}
    setDrawerLoading(false);
  };

  const handleSetPriority = (id: number, priority: number) => {
    updateProvider.mutate({ id, priority } as Record<string, unknown> & { id: number });
  };

  // ─── Filters ─────────────────────────────────────────────────────────────────

  const filteredProviders = (providers ?? []).filter(p => {
    if (activeTab === "active") return p.isActive;
    if (activeTab === "custom") return p.type === "custom_openai";
    return true;
  }).filter(p => {
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase()) || p.type.toLowerCase().includes(search.toLowerCase());
  });

  const configuredCount = (providers ?? []).filter(p => p.apiKey && p.apiKey !== "Not set").length;
  const activeCount = (providers ?? []).filter(p => p.isActive).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-7 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Providers</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {configuredCount} configured • {activeCount} active • 17 provider types supported
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-colors">
          <Plus size={14} /> Add Provider
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {[
            { key: "all", label: "All", count: (providers ?? []).length },
            { key: "active", label: "Active", count: activeCount },
            { key: "custom", label: "Custom", count: (providers ?? []).filter(p => p.type === "custom_openai").length },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-colors",
                activeTab === tab.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
              {tab.label} <span className="text-[9px] text-gray-400 ml-1">{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-300 w-56" />
        </div>
      </div>

      {/* Add Provider Modal */}
      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Add Provider</h3>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setAddTab("popular")} className={cn("px-3 py-1 rounded-md text-xs font-bold", addTab === "popular" ? "bg-white shadow-sm" : "text-gray-500")}>Popular</button>
              <button onClick={() => setAddTab("custom")} className={cn("px-3 py-1 rounded-md text-xs font-bold", addTab === "custom" ? "bg-white shadow-sm" : "text-gray-500")}>Custom</button>
            </div>
          </div>

          {addTab === "popular" ? (
            <>
              <div className="grid grid-cols-4 gap-2.5">
                {providerTypes.filter(pt => pt.type !== "custom_openai").map(pt => (
                  <button key={pt.type} onClick={() => { setSelectedType(pt.type); setFormAuthType(pt.authType); setFormBaseUrl(pt.baseUrl); }}
                    className={cn("flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left",
                      selectedType === pt.type ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-100" : "border-gray-100 hover:border-gray-200")}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: pt.color + "20" }}>
                      <Server size={12} style={{ color: pt.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-gray-700 truncate">{pt.name}</p>
                      <p className="text-[9px] text-gray-400 truncate">{pt.defaultModel}</p>
                    </div>
                  </button>
                ))}
              </div>
              {selectedType && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Display Name (optional)</label>
                      <input value={formName} onChange={e => setFormName(e.target.value)} placeholder={providerTypes.find(p => p.type === selectedType)?.name}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Default Model (optional)</label>
                      <input value={formDefaultModel} onChange={e => setFormDefaultModel(e.target.value)}
                        placeholder={providerTypes.find(p => p.type === selectedType)?.defaultModel}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 mb-1 block">
                      API Key {selectedType === "ollama" && <span className="text-gray-400">(optional — local)</span>}
                    </label>
                    <input value={formApiKey} onChange={e => setFormApiKey(e.target.value)} type="password" placeholder="sk-..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Base URL (optional override)</label>
                    <input value={formBaseUrl} onChange={e => setFormBaseUrl(e.target.value)}
                      placeholder={providerTypes.find(p => p.type === selectedType)?.baseUrl || "https://..."}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300" />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleAdd} className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700"><Check size={12} /> Add Provider</button>
                    <button onClick={resetAddForm} className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-gray-200"><X size={12} /> Cancel</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Custom provider tab */
            <div className="space-y-3">
              <p className="text-[11px] text-gray-500">Add any OpenAI-compatible endpoint (LM Studio, vLLM, LocalAI, TabbyAPI, text-gen-webui, etc.)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Provider Name *</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="My Local Server"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Default Model</label>
                  <input value={formDefaultModel} onChange={e => setFormDefaultModel(e.target.value)} placeholder="model-name"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Base URL *</label>
                <input value={formBaseUrl} onChange={e => setFormBaseUrl(e.target.value)} placeholder="http://192.168.1.100:8080/v1"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">API Key (optional)</label>
                  <input value={formApiKey} onChange={e => setFormApiKey(e.target.value)} type="password" placeholder="sk-..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 mb-1 block">Auth Type</label>
                  <select value={formAuthType} onChange={e => setFormAuthType(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-300">
                    <option value="bearer">Bearer Token</option>
                    <option value="x-api-key">x-api-key Header</option>
                    <option value="none">No Auth</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => { setSelectedType("custom_openai"); handleAdd(); }}
                  disabled={!formName || !formBaseUrl}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Check size={12} /> Add Custom Provider
                </button>
                <button onClick={resetAddForm} className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-gray-200"><X size={12} /> Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredProviders.map(p => {
          const pt = providerTypes.find(t => t.type === p.type);
          const hasKey = p.apiKey && p.apiKey !== "Not set" && p.apiKey !== "••••";
          const color = pt?.color ?? "#6366f1";
          const result = testResult[p.id];
          const isTestOk = p.lastTestStatus === "ok" || result?.ok;
          const isTestFail = p.lastTestStatus === "fail" || (result && !result.ok);

          return (
            <div key={p.id} className={cn(
              "bg-white rounded-2xl border p-5 shadow-sm transition-all group",
              p.isActive && hasKey ? "border-indigo-200 ring-1 ring-indigo-100" : "border-gray-100"
            )}>
              {/* Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: color + "20" }}>
                    <Server size={16} style={{ color }} />
                    {/* Status dot */}
                    <div className={cn("absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                      isTestOk ? "bg-emerald-400" : isTestFail ? "bg-red-400" : hasKey ? "bg-amber-400" : "bg-gray-300"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{p.displayName || p.name}</p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1.5">
                      {p.type}
                      {p.priority !== undefined && p.priority > 0 && (
                        <span className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">priority: {p.priority}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.isActive && hasKey && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600">
                      <Zap size={9} /> Active
                    </span>
                  )}
                  <button onClick={() => handleToggleActive(p.id, p.isActive)}
                    className={cn("w-9 h-5 rounded-full transition-colors relative",
                      p.isActive && hasKey ? "bg-indigo-500" : "bg-gray-200",
                      !hasKey && "opacity-40 cursor-not-allowed"
                    )} disabled={!hasKey} title={hasKey ? (p.isActive ? "Deactivate" : "Activate") : "Add API key first"}>
                    <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                      p.isActive && hasKey ? "left-[18px]" : "left-0.5")} />
                  </button>
                </div>
              </div>

              {/* API Key Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key size={11} className="text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-500">
                      {hasKey ? <span className="text-emerald-600">{p.apiKey}</span> : <span className="text-amber-500">Not configured</span>}
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
                    <input value={editKey} onChange={e => setEditKey(e.target.value)} type="password" placeholder="Enter API key..."
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-300" />
                    <button onClick={() => handleSaveKey(p.id)} className="text-xs font-bold text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700"><Check size={11} /></button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg hover:bg-gray-200"><X size={11} /></button>
                  </div>
                )}

                {/* Last tested info */}
                {(p.lastTestedAt || result) && (
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
                    {isTestOk ? <Wifi size={9} className="text-emerald-500" /> : <WifiOff size={9} className="text-red-400" />}
                    {result?.latencyMs ? `${result.latencyMs}ms` : p.lastTestedAt ? `Tested ${new Date(p.lastTestedAt).toLocaleDateString()}` : ""}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50">
                  <button onClick={() => handleTestConnection(p.id)} disabled={testing === p.id}
                    className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-indigo-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                    {testing === p.id ? <Loader2 size={10} className="animate-spin" /> : <Activity size={10} />}
                    Ping
                  </button>
                  <button onClick={() => handleVerify(p.id)} disabled={testing === p.id || !hasKey}
                    className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-emerald-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
                    <Shield size={10} /> Verify
                  </button>
                  <button onClick={() => handleOpenModels(p.id)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                    <Database size={10} /> Models
                  </button>
                  <button onClick={() => handleSetPriority(p.id, (p.priority ?? 0) + 1)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-amber-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                    <ArrowUpDown size={10} />
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-gray-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors ml-auto opacity-0 group-hover:opacity-100">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Models Drawer */}
      {modelsDrawer !== null && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setModelsDrawer(null)} />
          <div className="relative w-[480px] bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-right">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-800">
                  Available Models — {filteredProviders.find(p => p.id === modelsDrawer)?.name}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRefreshModels(modelsDrawer)} disabled={drawerLoading}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <RefreshCw size={10} className={drawerLoading ? "animate-spin" : ""} /> Refresh
                  </button>
                  <button onClick={() => setModelsDrawer(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
              </div>
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={modelSearch} onChange={e => setModelSearch(e.target.value)} placeholder="Search models..."
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-300" />
              </div>
              <p className="text-[10px] text-gray-400 mt-2">{drawerModels.length} models available</p>
            </div>

            <div className="p-4 space-y-1.5">
              {drawerLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-indigo-400" /></div>
              ) : (
                drawerModels
                  .filter(m => !modelSearch || m.id.toLowerCase().includes(modelSearch.toLowerCase()) || m.name.toLowerCase().includes(modelSearch.toLowerCase()))
                  .map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{m.name || m.id}</p>
                        <p className="text-[9px] text-gray-400 truncate">{m.id}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        {m.reasoning && <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5"><Brain size={8} />Reasoning</span>}
                        {m.vision && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5"><Eye size={8} />Vision</span>}
                        {m.contextWindow ? <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{m.contextWindow >= 1000000 ? `${(m.contextWindow/1000000).toFixed(0)}M` : `${(m.contextWindow/1000).toFixed(0)}K`}</span> : null}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredProviders.length === 0 && (
        <div className="text-center py-16">
          <Globe size={40} className="mx-auto text-gray-200 mb-4" />
          <p className="text-sm text-gray-400">No providers found</p>
          <button onClick={() => setShowAdd(true)} className="text-xs text-indigo-600 font-bold mt-2 hover:text-indigo-700">+ Add your first provider</button>
        </div>
      )}
    </div>
  );
}
