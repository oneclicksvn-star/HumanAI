import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { cn, MOOD_COLORS } from "@/lib/utils";
import { useAgents, useCreateAgent, useDeleteAgent, useProviders } from "@/hooks/useApi";
import { Plus, Trash2, Search, ChevronRight, Lightbulb, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STAGE_COLORS: Record<string, string> = { infant: "#60a5fa", child: "#34d399", teen: "#f59e0b", adult: "#f97316", expert: "#ef4444", mentor: "#8b5cf6" };
const MOOD_BG: Record<string, string> = { positive: "bg-emerald-50 text-emerald-700", focused: "bg-blue-50 text-blue-700", reflective: "bg-violet-50 text-violet-700", calming: "bg-sky-50 text-sky-700", supportive: "bg-amber-50 text-amber-700", neutral: "bg-indigo-50 text-indigo-700", satisfied: "bg-emerald-50 text-emerald-700", empathetic: "bg-violet-50 text-violet-700" };

// Agent templates with full info including description + prompt examples
const TEMPLATES = [
  { name: "Data Analyst", emoji: "📊", nature: "analytical", purpose: "Data analysis and insight generation", vibe: "warm", description: "Senior data analyst specializing in pattern recognition, statistical modeling, and data storytelling.", systemPrompt: "You are a data analyst. Help users understand their data through clear visualizations, statistical insights, and actionable recommendations. Use precise numbers, identify trends, and explain complex patterns in simple terms." },
  { name: "AI Engineer", emoji: "⚡", nature: "technical", purpose: "Code review and engineering tasks", vibe: "pragmatic", description: "Full-stack engineer focused on clean architecture, code quality, and efficient problem-solving.", systemPrompt: "You are a senior software engineer. Write clean, maintainable code. Review code thoroughly for bugs, performance issues, and security vulnerabilities. Suggest improvements with clear explanations." },
  { name: "Strategist", emoji: "🎯", nature: "strategic", purpose: "Strategic planning and decision support", vibe: "confident", description: "Strategic advisor that helps with planning, decision frameworks, and long-term thinking.", systemPrompt: "You are a strategic advisor. Help with decision-making by analyzing options, identifying risks and opportunities, and providing structured frameworks. Be direct and opinionated when asked." },
  { name: "Mentor", emoji: "🌿", nature: "nurturing", purpose: "Team guidance and ethical reasoning", vibe: "wise", description: "Wise mentor providing coaching, ethical guidance, and emotional support.", systemPrompt: "You are a compassionate mentor. Guide users with patience, wisdom, and empathy. Ask thoughtful questions to help them discover answers themselves. Be supportive without being patronizing." },
  { name: "Creative Writer", emoji: "✨", nature: "creative", purpose: "Content creation and creative writing", vibe: "playful", description: "Creative writer skilled in storytelling, copywriting, and generating engaging content.", systemPrompt: "You are a creative writer. Craft compelling narratives, engaging copy, and original content. Match the tone and style requested. Be imaginative and bold with ideas." },
  { name: "Research Assistant", emoji: "🔬", nature: "analytical", purpose: "Deep research and fact-checking", vibe: "calm", description: "Thorough researcher that digs deep into topics, cross-references sources, and synthesizes findings.", systemPrompt: "You are a research assistant. Investigate topics thoroughly, cite sources when possible, synthesize information from multiple angles, and present findings clearly. Flag uncertainty." },
];

// Prompt templates for system prompt field
const PROMPT_TEMPLATES = [
  { label: "Helpful Assistant", prompt: "You are a helpful, knowledgeable assistant. Answer questions clearly and concisely. When uncertain, say so. Provide balanced perspectives on complex topics." },
  { label: "Code Expert", prompt: "You are an expert programmer. Write clean, well-documented code. Explain your reasoning. Follow best practices and suggest improvements. Handle edge cases." },
  { label: "Creative Writer", prompt: "You are a creative writer. Use vivid language, compelling narratives, and original ideas. Match the requested tone and style. Be bold and imaginative." },
  { label: "Data Analyst", prompt: "You are a data analyst. Help users understand data through clear explanations, statistical insights, and actionable recommendations. Be precise with numbers." },
  { label: "Teacher/Tutor", prompt: "You are a patient teacher. Explain concepts step by step, use analogies, check understanding, and adapt to the learner's level. Encourage questions." },
  { label: "Vietnamese Assistant", prompt: "Bạn là trợ lý AI thông minh. Trả lời bằng tiếng Việt tự nhiên, thân thiện. Khi được hỏi về code hay kỹ thuật, giải thích rõ ràng với ví dụ cụ thể." },
];

// Description examples based on nature
const DESCRIPTION_HINTS: Record<string, string> = {
  analytical: "e.g. Chuyên phân tích dữ liệu, nhận diện patterns, và đưa ra insights từ data phức tạp",
  creative: "e.g. Chuyên sáng tạo nội dung, viết lách, thiết kế ý tưởng và brainstorming",
  technical: "e.g. Chuyên code review, debug, kiến trúc hệ thống, và giải quyết vấn đề kỹ thuật",
  strategic: "e.g. Chuyên lập kế hoạch chiến lược, phân tích rủi ro, và hỗ trợ ra quyết định",
  nurturing: "e.g. Chuyên mentoring, coaching, hỗ trợ tinh thần, và phát triển cá nhân",
  social: "e.g. Chuyên giao tiếp, quản lý quan hệ, và phối hợp nhóm",
};

type ModelOption = { id: string; name: string; contextWindow: number; reasoning: boolean; vision: boolean };

export default function Agents() {
  const { data: agents } = useAgents();
  const { data: providers } = useProviders();
  const createAgent = useCreateAgent();
  const deleteAgent = useDeleteAgent();
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<"template" | "custom">("template");
  const [filter, setFilter] = useState("");
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showPromptTemplates, setShowPromptTemplates] = useState(false);

  // Custom form state
  const [form, setForm] = useState({
    name: "", emoji: "🤖", nature: "analytical", purpose: "", vibe: "warm",
    description: "", systemPrompt: "", model: "", providerId: "",
    thinkingLevel: "off",
  });

  // Load models when provider changes
  useEffect(() => {
    if (!form.providerId) {
      setAvailableModels([]);
      return;
    }
    setLoadingModels(true);
    fetch(`/api/providers/${form.providerId}/models`)
      .then(r => r.json())
      .then(data => {
        setAvailableModels(data.models ?? []);
        // Auto-select first model if none selected
        if (!form.model && data.models?.length > 0) {
          setForm(f => ({ ...f, model: data.models[0].id }));
        }
      })
      .catch(() => setAvailableModels([]))
      .finally(() => setLoadingModels(false));
  }, [form.providerId]);

  const filtered = (agents ?? []).filter(a => !filter || a.name.toLowerCase().includes(filter.toLowerCase()));

  const handleCreateFromTemplate = (template: typeof TEMPLATES[number]) => {
    createAgent.mutate({
      name: template.name, emoji: template.emoji, nature: template.nature,
      purpose: template.purpose, vibe: template.vibe,
      description: template.description, systemPrompt: template.systemPrompt,
    });
    setShowCreate(false);
  };

  const handleCreateCustom = () => {
    if (!form.name.trim()) return;
    createAgent.mutate({
      name: form.name, emoji: form.emoji, nature: form.nature, purpose: form.purpose, vibe: form.vibe,
      description: form.description || undefined,
      systemPrompt: form.systemPrompt || undefined,
      model: form.model || undefined,
      providerId: form.providerId || undefined,
      thinkingLevel: form.thinkingLevel,
    });
    setShowCreate(false);
    setForm({ name: "", emoji: "🤖", nature: "analytical", purpose: "", vibe: "warm", description: "", systemPrompt: "", model: "", providerId: "", thinkingLevel: "off" });
  };

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agents</h1>
          <p className="text-sm text-gray-400 mt-0.5">{(agents ?? []).length} agents registered</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-colors">
          <Plus size={14} /> Create Agent
        </button>
      </div>

      {/* Create Agent Panel */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-hidden">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2 mb-5">
              <button onClick={() => setCreateMode("template")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", createMode === "template" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>From Template</button>
              <button onClick={() => setCreateMode("custom")} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", createMode === "custom" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>Custom Agent</button>
            </div>

            {createMode === "template" ? (
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map(t => (
                  <button key={t.name} onClick={() => handleCreateFromTemplate(t)} className="flex flex-col items-start gap-2 p-4 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{t.emoji}</span>
                      <span className="text-xs font-semibold text-gray-700">{t.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{t.purpose}</span>
                    <span className="text-[9px] text-gray-400 line-clamp-2">{t.description}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Identity</h4>
                  <div className="flex gap-2">
                    <div className="w-16">
                      <label className="text-[10px] text-gray-400">Emoji</label>
                      <input value={form.emoji} onChange={e => setForm({ ...form, emoji: e.target.value })} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-center text-xl" maxLength={4} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-gray-400">Name *</label>
                      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Agent name..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Purpose</label>
                    <input value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} placeholder="What does this agent do?" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={DESCRIPTION_HINTS[form.nature] ?? "Detailed description..."} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-16 resize-none" />
                    <p className="text-[9px] text-gray-300 mt-0.5">{DESCRIPTION_HINTS[form.nature] ?? ""}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400">Nature</label>
                      <select value={form.nature} onChange={e => setForm({ ...form, nature: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                        <option value="analytical">Analytical</option>
                        <option value="creative">Creative</option>
                        <option value="technical">Technical</option>
                        <option value="strategic">Strategic</option>
                        <option value="nurturing">Nurturing</option>
                        <option value="social">Social</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400">Vibe</label>
                      <select value={form.vibe} onChange={e => setForm({ ...form, vibe: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                        <option value="warm">Warm</option>
                        <option value="pragmatic">Pragmatic</option>
                        <option value="confident">Confident</option>
                        <option value="wise">Wise</option>
                        <option value="playful">Playful</option>
                        <option value="calm">Calm</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">LLM Configuration</h4>
                  <div>
                    <label className="text-[10px] text-gray-400">Provider</label>
                    <select value={form.providerId} onChange={e => setForm({ ...form, providerId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                      <option value="">Default (system provider)</option>
                      {(providers ?? []).map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Model {loadingModels && <span className="text-indigo-400 animate-pulse">loading...</span>}</label>
                    {availableModels.length > 0 ? (
                      <select value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                        <option value="">-- Select model --</option>
                        {availableModels.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name}{m.reasoning ? " 🧠" : ""}{m.vision ? " 👁" : ""} ({Math.round(m.contextWindow / 1000)}K ctx)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder={form.providerId ? "No models found — type model ID" : "Select provider first, or type model ID"} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400">Thinking Level</label>
                    <select value={form.thinkingLevel} onChange={e => setForm({ ...form, thinkingLevel: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                      <option value="off">Off</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-400">System Prompt</label>
                      <button type="button" onClick={() => setShowPromptTemplates(!showPromptTemplates)} className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors">
                        <Lightbulb size={10} /> {showPromptTemplates ? "Hide" : "Use template"}
                      </button>
                    </div>
                    {showPromptTemplates && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {PROMPT_TEMPLATES.map(pt => (
                          <button key={pt.label} type="button" onClick={() => { setForm({ ...form, systemPrompt: pt.prompt }); setShowPromptTemplates(false); }} className="text-[9px] px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                            {pt.label}
                          </button>
                        ))}
                      </div>
                    )}
                    <textarea value={form.systemPrompt} onChange={e => setForm({ ...form, systemPrompt: e.target.value })} placeholder="Describe how this agent should behave, its expertise, tone, and constraints..." className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm h-24 resize-none font-mono" />
                    {!form.systemPrompt && <p className="text-[9px] text-gray-300 mt-0.5">Tip: Describe personality, expertise, tone. The better the prompt, the more unique your agent.</p>}
                  </div>
                </div>

                <div className="col-span-2 flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200">Cancel</button>
                  <button onClick={handleCreateCustom} disabled={!form.name.trim()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed">Create Agent</button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-gray-400" />
          <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search agents..." className="text-sm outline-none flex-1 bg-transparent" />
        </div>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map(a => (
          <motion.div key={a.id} layout onClick={() => navigate(`/agents/${a.id}`)} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl relative" style={{ border: `3px solid ${MOOD_COLORS[a.mood] ?? "#6366f1"}` }}>
                  {a.emoji}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: a.status === "active" ? "#22c55e" : "#9ca3af" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{a.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: (STAGE_COLORS[a.lifecycle] ?? "#6366f1") + "20", color: STAGE_COLORS[a.lifecycle] ?? "#6366f1" }}>{a.lifecycle}</span>
                    <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", MOOD_BG[a.mood] ?? "bg-gray-50 text-gray-600")}>{a.mood}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={(e) => { e.stopPropagation(); deleteAgent.mutate(a.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-all">
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>

            <p className="text-[11px] text-gray-500 mb-3">{a.purpose ?? "AI Agent"}</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Level {a.level}</span>
                <span className="text-gray-400">{a.xp}/{a.xpNext} XP</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${(a.xp / Math.max(a.xpNext, 1)) * 100}%`, background: MOOD_COLORS[a.mood] ?? "#6366f1" }} />
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-gray-400">Energy</span>
                <span className="font-semibold text-gray-600">{a.energy}%</span>
              </div>
            </div>

            <div className="flex gap-1.5 mt-3 flex-wrap">
              {(a.skills || []).map((s: string) => <span key={s} className="text-[9px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full">{s}</span>)}
            </div>

            {/* Quick Chat button */}
            <div className="mt-3 pt-3 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={(e) => { e.stopPropagation(); navigate(`/agents/${a.id}`); }} className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-700">
                <MessageCircle size={12} /> Open Agent
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
