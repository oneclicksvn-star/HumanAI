import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAgentProfile, useAgentConfig, useProviders, useContextFiles, useCommitments, useMoodHistory } from "@/hooks/useApi";
import { api, request, AgentContextFile } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { cn, MOOD_COLORS } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageCircle, Settings2, Brain, FileText, Heart, Clock, Zap, Shield, Star,
  Save, X, ChevronRight, Pencil, Check, AlertCircle, BookOpen, Target, Sparkles, BarChart3,
  Pin, PinOff, Plus, Trash2, Search
} from "lucide-react";

const STAGE_COLORS: Record<string, string> = { infant: "#60a5fa", child: "#34d399", teen: "#f59e0b", adult: "#f97316", expert: "#ef4444", mentor: "#8b5cf6" };
const TABS = ["Overview", "Configuration", "Personality", "Context Files", "Commitments", "Mood History"] as const;
type Tab = typeof TABS[number];

export default function AgentDetail() {
  const [, params] = useRoute("/agents/:id");
  const [, navigate] = useLocation();
  const agentId = Number(params?.id ?? 0);

  const { data: profile, isLoading } = useAgentProfile(agentId);
  const { data: config } = useAgentConfig(agentId);
  const { data: providers } = useProviders();
  const { data: contextFiles } = useContextFiles(agentId);
  const { data: commitments } = useCommitments(agentId);
  const { data: moodHistory } = useMoodHistory(agentId);
  const qc = useQueryClient();

  const [tab, setTab] = useState<Tab>("Overview");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, unknown>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");

  const agent = profile?.agent;
  const personality = profile?.personality;

  useEffect(() => {
    if (agent && editing) {
      setEditForm({
        name: agent.name, emoji: agent.emoji, nature: agent.nature ?? "",
        purpose: agent.purpose ?? "", vibe: agent.vibe ?? "", description: agent.description ?? "",
        systemPrompt: agent.systemPrompt ?? "",
      });
    }
  }, [agent, editing]);

  if (isLoading) return <div className="p-7 text-gray-400">Loading agent...</div>;
  if (!agent) return <div className="p-7 text-red-500">Agent not found</div>;

  const handleSaveIdentity = async () => {
    await api.updateAgent(agentId, editForm as any);
    qc.invalidateQueries({ queryKey: ["agent-profile", agentId] });
    qc.invalidateQueries({ queryKey: ["agents"] });
    setEditing(false);
  };

  const handleSaveConfig = async (section: string, data: Record<string, unknown>) => {
    setSavingConfig(true);
    await api.updateAgentConfig(agentId, { [section]: data });
    qc.invalidateQueries({ queryKey: ["agent-config", agentId] });
    qc.invalidateQueries({ queryKey: ["agent-profile", agentId] });
    setSavingConfig(false);
  };

  const handleSavePersonality = async (data: Record<string, unknown>) => {
    await api.updatePersonality(agentId, data);
    qc.invalidateQueries({ queryKey: ["agent-profile", agentId] });
  };

  const handleOpenFile = async (fileName: string) => {
    const file = await api.getContextFile(agentId, fileName);
    setFileContent(file.content);
    setEditingFile(fileName);
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    await api.updateContextFile(agentId, editingFile, fileContent);
    qc.invalidateQueries({ queryKey: ["context-files", agentId] });
    setEditingFile(null);
  };

  const handleStartChat = async () => {
    const session = await api.createSession({ agentId, title: `Chat with ${agent.name}` });
    navigate(`/chat?session=${session.id}`);
  };

  return (
    <div className="p-7 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/agents")} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-500" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-4xl relative" style={{ border: `3px solid ${MOOD_COLORS[agent.mood] ?? "#6366f1"}` }}>
            {agent.emoji}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white" style={{ background: agent.status === "active" ? "#22c55e" : "#9ca3af" }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: (STAGE_COLORS[agent.lifecycle] ?? "#6366f1") + "20", color: STAGE_COLORS[agent.lifecycle] ?? "#6366f1" }}>{agent.lifecycle}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{agent.mood}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{agent.purpose ?? "AI Agent"}</p>
            {agent.description && <p className="text-xs text-gray-400 mt-0.5">{agent.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(!editing)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm hover:bg-gray-50 transition-colors">
            <Pencil size={14} /> Edit
          </button>
          <button onClick={handleStartChat} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-[0_4px_12px_rgba(99,102,241,0.3)] hover:bg-indigo-700 transition-colors">
            <MessageCircle size={14} /> Chat
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Level" value={`${agent.level}`} sub={`${agent.xp}/${agent.xpNext} XP`} icon={<Star size={14} />} />
        <StatCard label="Energy" value={`${agent.energy}%`} icon={<Zap size={14} />} />
        <StatCard label="Memories" value={`${profile?.stats.memoriesCount ?? 0}`} icon={<Brain size={14} />} />
        <StatCard label="Sessions" value={`${profile?.stats.sessionsCount ?? 0}`} icon={<MessageCircle size={14} />} />
        <StatCard label="Sub-Agents" value={`${profile?.stats.activeSubAgents ?? 0}`} sub={`${profile?.stats.totalSpawns ?? 0} total`} icon={<Sparkles size={14} />} />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all", tab === t ? "bg-white text-indigo-700 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
          {tab === "Overview" && <OverviewTab agent={agent} profile={profile!} editing={editing} editForm={editForm} setEditForm={setEditForm} onSave={handleSaveIdentity} onCancel={() => setEditing(false)} />}
          {tab === "Configuration" && <ConfigTab config={config} providers={providers ?? []} onSave={handleSaveConfig} saving={savingConfig} />}
          {tab === "Personality" && <PersonalityTab personality={personality} onSave={handleSavePersonality} />}
          {tab === "Context Files" && <ContextFilesTab files={contextFiles ?? []} editingFile={editingFile} fileContent={fileContent} onOpen={handleOpenFile} onContentChange={setFileContent} onSave={handleSaveFile} onCancel={() => setEditingFile(null)} />}
          {tab === "Commitments" && <CommitmentsTab commitments={commitments ?? []} agentId={agentId} onRefresh={() => qc.invalidateQueries({ queryKey: ["commitments", agentId] })} />}
          {tab === "Mood History" && <MoodHistoryTab history={moodHistory ?? []} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-gray-400 mb-1">{icon}<span className="text-xs font-medium">{label}</span></div>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

function OverviewTab({ agent, profile, editing, editForm, setEditForm, onSave, onCancel }: any) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* ─── LEFT COLUMN: Nhân vật (Personality/Identity) ─── */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><BookOpen size={14} /> Nhân vật & Identity</h3>
            {editing && <div className="flex gap-1"><button onClick={onSave} className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"><Check size={12} /></button><button onClick={onCancel} className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"><X size={12} /></button></div>}
          </div>
          {editing ? (
            <div className="space-y-3">
              <Field label="Name" value={editForm.name as string} onChange={v => setEditForm({ ...editForm, name: v })} />
              <Field label="Emoji" value={editForm.emoji as string} onChange={v => setEditForm({ ...editForm, emoji: v })} />
              <Field label="Nature" value={editForm.nature as string} onChange={v => setEditForm({ ...editForm, nature: v })} />
              <Field label="Purpose" value={editForm.purpose as string} onChange={v => setEditForm({ ...editForm, purpose: v })} />
              <Field label="Vibe" value={editForm.vibe as string} onChange={v => setEditForm({ ...editForm, vibe: v })} />
              <Field label="Description" value={editForm.description as string} onChange={v => setEditForm({ ...editForm, description: v })} multiline />
              <Field label="System Prompt" value={editForm.systemPrompt as string} onChange={v => setEditForm({ ...editForm, systemPrompt: v })} multiline />
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <InfoRow label="Name" value={`${agent.emoji} ${agent.name}`} />
              <InfoRow label="Nature" value={agent.nature ?? "—"} />
              <InfoRow label="Purpose" value={agent.purpose ?? "—"} />
              <InfoRow label="Vibe" value={agent.vibe ?? "—"} />
              <InfoRow label="Type" value={agent.agentType} />
              <InfoRow label="Status" value={agent.status} />
              {agent.agentKey && <InfoRow label="Agent Key" value={agent.agentKey} />}
              {agent.description && <InfoRow label="Description" value={agent.description} />}
              {agent.systemPrompt && <InfoRow label="System Prompt" value={agent.systemPrompt.slice(0, 200) + (agent.systemPrompt.length > 200 ? "..." : "")} />}
            </div>
          )}
        </div>

        {/* System Prompt Mode */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3"><Zap size={14} /> Prompt Mode</h3>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-bold px-3 py-1.5 rounded-lg", agent.promptMode === "full" ? "bg-amber-50 text-amber-700" : agent.promptMode === "task" ? "bg-blue-50 text-blue-700" : agent.promptMode === "minimal" ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-600")}>
              {agent.promptMode === "full" ? "Đầy đủ ~4.8K tokens" : agent.promptMode === "task" ? "Tác vụ ~1.3K tokens" : agent.promptMode === "minimal" ? "Tối giản ~570 tokens" : "Không ~640 tokens"}
            </span>
          </div>
        </div>

        {/* Skills with Pin/Browse */}
        <SkillsSection agentId={agent.id} skills={profile.skills ?? []} />
      </div>

      {/* ─── RIGHT COLUMN: Thông số (Parameters/Config) ─── */}
      <div className="space-y-4">
        {/* Model & Budget */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3"><Brain size={14} /> Model & Budget</h3>
          <div className="space-y-2 text-xs">
            <InfoRow label="Provider" value={agent.providerId ?? "Default"} />
            <InfoRow label="Model" value={agent.model ?? "Default"} />
            <InfoRow label="Context Window" value={`${(agent.contextWindow ?? 128000).toLocaleString()} tokens`} />
            <InfoRow label="Max Tool Iterations" value={`${agent.maxToolIterations ?? 10}`} />
            <InfoRow label="Thinking Level" value={agent.thinkingLevel ?? "off"} />
            <InfoRow label="Budget" value={agent.budgetMonthlyCents ? `$${(agent.budgetMonthlyCents / 100).toFixed(2)}/month` : "Unlimited"} />
          </div>
        </div>

        {/* Evolution & Learning */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3"><Sparkles size={14} /> Evolution & Learning</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Self Evolution</span>
              <span className={cn("font-bold px-2 py-0.5 rounded-full text-[10px]", agent.selfEvolve ? "bg-orange-50 text-orange-600" : "bg-gray-50 text-gray-400")}>{agent.selfEvolve ? "Enabled" : "Disabled"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Skill Learning</span>
              <span className={cn("font-bold px-2 py-0.5 rounded-full text-[10px]", agent.skillEvolve ? "bg-amber-50 text-amber-600" : "bg-gray-50 text-gray-400")}>{agent.skillEvolve ? "Enabled" : "Disabled"}</span>
            </div>
          </div>
        </div>

        {/* Tool Policy */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3"><Shield size={14} /> Tool Policy</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2"><span className="text-gray-400 w-24">Allow List</span><span className="text-gray-700">{agent.toolsConfig?.allowList?.join(", ") ?? "All tools"}</span></div>
            <div className="flex items-center gap-2"><span className="text-gray-400 w-24">Deny List</span><span className="text-red-600">{agent.toolsConfig?.denyList?.join(", ") ?? "None"}</span></div>
            <div className="flex items-center gap-2"><span className="text-gray-400 w-24">Approval</span><span className="text-amber-600">{agent.toolsConfig?.requireApproval?.join(", ") ?? "None"}</span></div>
          </div>
        </div>

        {/* Delegation Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3"><Target size={14} /> Delegation & Orchestration</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-gray-400">Given</span> <span className="font-bold text-gray-700">{profile.stats.delegationsGiven}</span></div>
            <div><span className="text-gray-400">Received</span> <span className="font-bold text-gray-700">{profile.stats.delegationsReceived}</span></div>
            <div><span className="text-gray-400">Outbound Links</span> <span className="font-bold text-gray-700">{profile.stats.outboundLinks}</span></div>
            <div><span className="text-gray-400">Inbound Links</span> <span className="font-bold text-gray-700">{profile.stats.inboundLinks}</span></div>
          </div>
          {agent.subagentsConfig && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-xs">
              <InfoRow label="Max Concurrent" value={`${agent.subagentsConfig.maxConcurrent ?? 4}`} />
              <InfoRow label="Max Depth" value={`${agent.subagentsConfig.maxSpawnDepth ?? 3}`} />
              <InfoRow label="Max Children" value={`${agent.subagentsConfig.maxChildrenPerAgent ?? 8}`} />
            </div>
          )}
        </div>

        {/* Memory Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-3"><Brain size={14} /> Memory</h3>
          <div className="space-y-2 text-xs">
            <InfoRow label="Total Memories" value={`${profile.stats.memoriesCount ?? 0}`} />
            <InfoRow label="Auto Extract" value={agent.memoryConfig?.autoExtract !== false ? "Yes" : "No"} />
            {agent.memoryConfig?.maxResults && <InfoRow label="Max Results" value={`${agent.memoryConfig.maxResults}`} />}
            {agent.memoryConfig?.vectorWeight && <InfoRow label="Vector Weight" value={`${agent.memoryConfig.vectorWeight}`} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigTab({ config, providers, onSave, saving }: any) {
  const [editSection, setEditSection] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  if (!config) return <div className="text-gray-400 text-sm">Loading configuration...</div>;

  const startEdit = (section: string, data: Record<string, unknown>) => {
    setEditSection(section);
    setForm({ ...data });
  };

  const save = () => {
    if (editSection) onSave(editSection, form);
    setEditSection(null);
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* LLM Config */}
      <ConfigSection title="LLM Configuration" icon={<Brain size={14} />} editing={editSection === "llm"} onEdit={() => startEdit("llm", config.llm)} onSave={save} onCancel={() => setEditSection(null)} saving={saving}>
        {editSection === "llm" ? (
          <div className="space-y-3">
            <SelectField label="Provider" value={form.providerId as string ?? ""} onChange={v => setForm({ ...form, providerId: v || null })} options={[{ value: "", label: "Default" }, ...providers.map((p: any) => ({ value: p.id.toString(), label: p.name }))]} />
            <Field label="Model" value={form.model as string ?? ""} onChange={v => setForm({ ...form, model: v || null })} placeholder="e.g. claude-3.5-sonnet" />
            <NumberField label="Temperature" value={form.temperature as number ?? 0.7} onChange={v => setForm({ ...form, temperature: v })} min={0} max={2} step={0.1} />
            <NumberField label="Max Tokens" value={form.maxTokens as number ?? 4096} onChange={v => setForm({ ...form, maxTokens: v })} min={256} max={200000} step={256} />
            <SelectField label="Thinking Level" value={form.thinkingLevel as string ?? "off"} onChange={v => setForm({ ...form, thinkingLevel: v })} options={[{ value: "off", label: "Off" }, { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <InfoRow label="Provider" value={config.llm.providerId ? providers.find((p: any) => p.id.toString() === config.llm.providerId)?.name ?? config.llm.providerId : "Default"} />
            <InfoRow label="Model" value={config.llm.model ?? "Default"} />
            <InfoRow label="Temperature" value={config.llm.temperature?.toString() ?? "0.7"} />
            <InfoRow label="Max Tokens" value={config.llm.maxTokens?.toString() ?? "4096"} />
            <InfoRow label="Context Window" value={config.llm.contextWindow.toLocaleString()} />
            <InfoRow label="Thinking" value={config.llm.thinkingLevel} />
          </div>
        )}
      </ConfigSection>

      {/* Tools Config */}
      <ConfigSection title="Tool Policy" icon={<Shield size={14} />} editing={editSection === "tools"} onEdit={() => startEdit("tools", config.tools)} onSave={save} onCancel={() => setEditSection(null)} saving={saving}>
        {editSection === "tools" ? (
          <div className="space-y-3">
            <Field label="Deny List (comma-separated)" value={(form.denyList as string[] ?? []).join(", ")} onChange={v => setForm({ ...form, denyList: v ? v.split(",").map(s => s.trim()) : null })} placeholder="shell_exec, file_delete" />
            <Field label="Allow List (comma-separated)" value={(form.allowList as string[] ?? []).join(", ")} onChange={v => setForm({ ...form, allowList: v ? v.split(",").map(s => s.trim()) : null })} placeholder="Leave empty for all" />
            <Field label="Require Approval (comma-separated)" value={(form.requireApproval as string[] ?? []).join(", ")} onChange={v => setForm({ ...form, requireApproval: v ? v.split(",").map(s => s.trim()) : null })} placeholder="web_fetch, shell_exec" />
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <InfoRow label="Deny List" value={(config.tools.denyList ?? []).join(", ") || "None"} />
            <InfoRow label="Allow List" value={(config.tools.allowList ?? []).join(", ") || "All tools"} />
            <InfoRow label="Approval" value={(config.tools.requireApproval ?? []).join(", ") || "None"} />
          </div>
        )}
      </ConfigSection>

      {/* Sub-Agents Config */}
      <ConfigSection title="Sub-Agent Limits" icon={<Sparkles size={14} />} editing={editSection === "subagents"} onEdit={() => startEdit("subagents", config.subagents)} onSave={save} onCancel={() => setEditSection(null)} saving={saving}>
        {editSection === "subagents" ? (
          <div className="space-y-3">
            <NumberField label="Max Concurrent" value={form.maxConcurrent as number ?? 4} onChange={v => setForm({ ...form, maxConcurrent: v })} min={1} max={20} />
            <NumberField label="Max Spawn Depth" value={form.maxSpawnDepth as number ?? 3} onChange={v => setForm({ ...form, maxSpawnDepth: v })} min={1} max={10} />
            <NumberField label="Max Children" value={form.maxChildrenPerAgent as number ?? 8} onChange={v => setForm({ ...form, maxChildrenPerAgent: v })} min={1} max={50} />
            <NumberField label="Archive After (min)" value={form.archiveAfterMinutes as number ?? 30} onChange={v => setForm({ ...form, archiveAfterMinutes: v })} min={5} max={1440} />
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <InfoRow label="Max Concurrent" value={config.subagents.maxConcurrent.toString()} />
            <InfoRow label="Spawn Depth" value={config.subagents.maxSpawnDepth.toString()} />
            <InfoRow label="Max Children" value={config.subagents.maxChildrenPerAgent.toString()} />
            <InfoRow label="Archive After" value={`${config.subagents.archiveAfterMinutes} min`} />
          </div>
        )}
      </ConfigSection>

      {/* Memory Config */}
      <ConfigSection title="Memory Settings" icon={<Brain size={14} />} editing={editSection === "memory"} onEdit={() => startEdit("memory", config.memory)} onSave={save} onCancel={() => setEditSection(null)} saving={saving}>
        {editSection === "memory" ? (
          <div className="space-y-3">
            <ToggleField label="Auto Extract" value={form.autoExtract as boolean ?? true} onChange={v => setForm({ ...form, autoExtract: v })} />
            <NumberField label="Max Memories" value={form.maxMemories as number ?? 1000} onChange={v => setForm({ ...form, maxMemories: v })} min={100} max={50000} />
            <NumberField label="Importance Threshold" value={form.importanceThreshold as number ?? 0.3} onChange={v => setForm({ ...form, importanceThreshold: v })} min={0} max={1} step={0.05} />
            <NumberField label="Max Chunk Length" value={form.maxChunkLength as number ?? 2000} onChange={v => setForm({ ...form, maxChunkLength: v })} min={100} max={10000} step={100} />
            <NumberField label="Chunk Overlap" value={form.chunkOverlap as number ?? 200} onChange={v => setForm({ ...form, chunkOverlap: v })} min={0} max={1000} step={50} />
            <NumberField label="Max Results" value={form.maxResults as number ?? 10} onChange={v => setForm({ ...form, maxResults: v })} min={1} max={50} />
            <NumberField label="Min Score" value={form.minScore as number ?? 0.5} onChange={v => setForm({ ...form, minScore: v })} min={0} max={1} step={0.05} />
            <NumberField label="Vector Weight" value={form.vectorWeight as number ?? 0.6} onChange={v => setForm({ ...form, vectorWeight: v })} min={0} max={1} step={0.1} />
            <NumberField label="Text Weight" value={form.textWeight as number ?? 0.4} onChange={v => setForm({ ...form, textWeight: v })} min={0} max={1} step={0.1} />
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <InfoRow label="Auto Extract" value={config.memory.autoExtract ? "Yes" : "No"} />
            <InfoRow label="Max Memories" value={config.memory.maxMemories.toLocaleString()} />
            <InfoRow label="Importance" value={`≥ ${config.memory.importanceThreshold}`} />
            <InfoRow label="Chunk Length" value={`${config.memory.maxChunkLength ?? 2000}`} />
            <InfoRow label="Overlap" value={`${config.memory.chunkOverlap ?? 200}`} />
            <InfoRow label="Max Results" value={`${config.memory.maxResults ?? 10}`} />
            <InfoRow label="Vector/Text" value={`${config.memory.vectorWeight ?? 0.6} / ${config.memory.textWeight ?? 0.4}`} />
          </div>
        )}
      </ConfigSection>

      {/* Behavior */}
      <ConfigSection title="Behavior" icon={<Settings2 size={14} />} editing={editSection === "behavior"} onEdit={() => startEdit("behavior", config.behavior)} onSave={save} onCancel={() => setEditSection(null)} saving={saving}>
        {editSection === "behavior" ? (
          <div className="space-y-3">
            <ToggleField label="Self Evolve" value={form.selfEvolve as boolean ?? false} onChange={v => setForm({ ...form, selfEvolve: v })} />
            <ToggleField label="Skill Evolve" value={form.skillEvolve as boolean ?? false} onChange={v => setForm({ ...form, skillEvolve: v })} />
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <InfoRow label="Self Evolve" value={config.behavior.selfEvolve ? "Enabled" : "Disabled"} />
            <InfoRow label="Skill Evolve" value={config.behavior.skillEvolve ? "Enabled" : "Disabled"} />
          </div>
        )}
      </ConfigSection>

      {/* Sandbox */}
      <ConfigSection title="Sandbox" icon={<Shield size={14} />} editing={editSection === "sandbox"} onEdit={() => startEdit("sandbox", config.sandbox)} onSave={save} onCancel={() => setEditSection(null)} saving={saving}>
        {editSection === "sandbox" ? (
          <div className="space-y-3">
            <ToggleField label="Enabled" value={form.enabled as boolean ?? false} onChange={v => setForm({ ...form, enabled: v })} />
            <NumberField label="Timeout (ms)" value={form.timeoutMs as number ?? 30000} onChange={v => setForm({ ...form, timeoutMs: v })} min={1000} max={300000} step={1000} />
            <ToggleField label="Allow Network" value={form.allowNetwork as boolean ?? false} onChange={v => setForm({ ...form, allowNetwork: v })} />
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <InfoRow label="Enabled" value={config.sandbox.enabled ? "Yes" : "No"} />
            <InfoRow label="Timeout" value={`${config.sandbox.timeoutMs}ms`} />
            <InfoRow label="Network" value={config.sandbox.allowNetwork ? "Allowed" : "Blocked"} />
          </div>
        )}
      </ConfigSection>

      {/* Dreaming Config */}
      <ConfigSection title="Dreaming (Memory Consolidation)" icon={<Heart size={14} />} editing={editSection === "dreaming"} onEdit={() => startEdit("dreaming", config.dreaming ?? { enabled: false, threshold: 50, debounceMs: 300000, verbose: false })} onSave={save} onCancel={() => setEditSection(null)} saving={saving}>
        {editSection === "dreaming" ? (
          <div className="space-y-3">
            <ToggleField label="Enabled" value={form.enabled as boolean ?? false} onChange={v => setForm({ ...form, enabled: v })} />
            <NumberField label="Threshold (memories)" value={form.threshold as number ?? 50} onChange={v => setForm({ ...form, threshold: v })} min={10} max={500} step={10} />
            <NumberField label="Debounce (ms)" value={form.debounceMs as number ?? 300000} onChange={v => setForm({ ...form, debounceMs: v })} min={10000} max={3600000} step={10000} />
            <ToggleField label="Verbose Log" value={form.verbose as boolean ?? false} onChange={v => setForm({ ...form, verbose: v })} />
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <InfoRow label="Enabled" value={config.dreaming?.enabled ? "Yes" : "No"} />
            <InfoRow label="Threshold" value={`${config.dreaming?.threshold ?? 50} memories`} />
            <InfoRow label="Debounce" value={`${((config.dreaming?.debounceMs ?? 300000) / 60000).toFixed(0)} min`} />
            <InfoRow label="Verbose" value={config.dreaming?.verbose ? "Yes" : "No"} />
          </div>
        )}
      </ConfigSection>

      {/* Prompt Mode Config */}
      <ConfigSection title="System Prompt Mode" icon={<Zap size={14} />} editing={editSection === "promptMode"} onEdit={() => startEdit("promptMode", { promptMode: config.promptMode ?? "full" })} onSave={save} onCancel={() => setEditSection(null)} saving={saving}>
        {editSection === "promptMode" ? (
          <div className="space-y-3">
            <SelectField label="Mode" value={form.promptMode as string ?? "full"} onChange={v => setForm({ ...form, promptMode: v })} options={[
              { value: "full", label: "Đầy đủ (~4.8K tokens)" },
              { value: "task", label: "Tác vụ (~1.3K tokens)" },
              { value: "minimal", label: "Tối giản (~570 tokens)" },
              { value: "none", label: "Không (~640 tokens)" },
            ]} />
          </div>
        ) : (
          <div className="space-y-1.5 text-xs">
            <InfoRow label="Mode" value={config.promptMode === "full" ? "Đầy đủ (~4.8K)" : config.promptMode === "task" ? "Tác vụ (~1.3K)" : config.promptMode === "minimal" ? "Tối giản (~570)" : "Không (~640)"} />
          </div>
        )}
      </ConfigSection>
    </div>
  );
}

function PersonalityTab({ personality, onSave }: any) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, number | string>>({});

  useEffect(() => {
    if (personality) setForm({ ...personality });
  }, [personality]);

  if (!personality) return <div className="text-gray-400 text-sm">Loading personality...</div>;

  const traits = [
    { key: "openness", label: "Openness", color: "#6366f1" },
    { key: "conscientiousness", label: "Conscientiousness", color: "#8b5cf6" },
    { key: "extraversion", label: "Extraversion", color: "#ec4899" },
    { key: "agreeableness", label: "Agreeableness", color: "#14b8a6" },
    { key: "neuroticism", label: "Neuroticism", color: "#f59e0b" },
    { key: "creativity", label: "Creativity", color: "#3b82f6" },
    { key: "empathy", label: "Empathy", color: "#ef4444" },
    { key: "humor", label: "Humor", color: "#22c55e" },
    { key: "curiosity", label: "Curiosity", color: "#f97316" },
    { key: "assertiveness", label: "Assertiveness", color: "#64748b" },
  ];

  const handleSave = () => {
    onSave(form);
    setEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Heart size={14} /> Big Five + Traits</h3>
        {editing ? (
          <div className="flex gap-1"><button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"><Check size={12} className="inline mr-1" />Save</button><button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">Cancel</button></div>
        ) : (
          <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50"><Pencil size={12} className="inline mr-1" />Edit</button>
        )}
      </div>
      <div className="space-y-4">
        {traits.map(t => (
          <div key={t.key} className="flex items-center gap-4">
            <span className="text-xs text-gray-600 w-32">{t.label}</span>
            <div className="flex-1 relative">
              {editing ? (
                <input type="range" min={0} max={100} value={form[t.key] as number ?? 50} onChange={e => setForm({ ...form, [t.key]: Number(e.target.value) })} className="w-full h-2 rounded-full appearance-none cursor-pointer" style={{ accentColor: t.color }} />
              ) : (
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${personality[t.key]}%`, background: t.color }} />
                </div>
              )}
            </div>
            <span className="text-xs font-bold text-gray-700 w-8 text-right">{editing ? form[t.key] : personality[t.key]}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-gray-100">
        <InfoRow label="Communication Style" value={personality.communicationStyle ?? "—"} />
      </div>
    </div>
  );
}

function ContextFilesTab({ files, editingFile, fileContent, onOpen, onContentChange, onSave, onCancel }: { files: AgentContextFile[]; editingFile: string | null; fileContent: string; onOpen: (name: string) => void; onContentChange: (v: string) => void; onSave: () => void; onCancel: () => void }) {
  return (
    <div className="space-y-4">
      {editingFile ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><FileText size={14} /> {editingFile}</h3>
            <div className="flex gap-2">
              <button onClick={onSave} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 flex items-center gap-1"><Save size={12} /> Save</button>
              <button onClick={onCancel} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs hover:bg-gray-200">Cancel</button>
            </div>
          </div>
          <textarea value={fileContent} onChange={e => onContentChange(e.target.value)} className="w-full h-80 font-mono text-xs p-4 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {files.map(f => (
            <button key={f.id} onClick={() => onOpen(f.fileName)} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-left group">
              <div className="flex items-center gap-3 mb-2">
                <FileText size={18} className="text-indigo-500" />
                <span className="text-sm font-bold text-gray-800">{f.fileName}</span>
              </div>
              <p className="text-[10px] text-gray-400">{f.isSystem ? "System file" : "Custom file"} · Updated {new Date(f.updatedAt).toLocaleDateString()}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil size={12} /> Edit content
              </div>
            </button>
          ))}
          {files.length === 0 && <p className="text-sm text-gray-400 col-span-3">No context files found</p>}
        </div>
      )}
    </div>
  );
}

function CommitmentsTab({ commitments, agentId, onRefresh }: { commitments: any[]; agentId: number; onRefresh: () => void }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ type: "reminder", title: "", description: "" });

  const handleCreate = async () => {
    await api.createCommitment(agentId, form);
    setShowCreate(false);
    setForm({ type: "reminder", title: "", description: "" });
    onRefresh();
  };

  const handleComplete = async (id: number) => {
    await api.updateCommitment(agentId, id, { status: "completed" });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-800">{commitments.length} Commitments</h3>
        <button onClick={() => setShowCreate(!showCreate)} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">+ Add</button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
          <SelectField label="Type" value={form.type} onChange={v => setForm({ ...form, type: v })} options={[{ value: "reminder", label: "Reminder" }, { value: "follow_up", label: "Follow Up" }, { value: "care_check_in", label: "Care Check-in" }, { value: "deadline_check", label: "Deadline" }, { value: "open_loop", label: "Open Loop" }]} />
          <Field label="Title" value={form.title} onChange={v => setForm({ ...form, title: v })} placeholder="What did you commit to?" />
          <Field label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} placeholder="Details..." multiline />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">Create</button>
            <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {commitments.map(c => (
          <div key={c.id} className={cn("bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center gap-4", c.status === "completed" && "opacity-50")}>
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", c.status === "active" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600")}>
              {c.status === "active" ? <AlertCircle size={14} /> : <Check size={14} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{c.title}</p>
              <p className="text-[10px] text-gray-400">{c.type} · {c.dueAt ? `Due ${new Date(c.dueAt).toLocaleDateString()}` : "No deadline"}</p>
              {c.description && <p className="text-xs text-gray-500 mt-0.5">{c.description}</p>}
            </div>
            {c.status === "active" && (
              <button onClick={() => handleComplete(c.id)} className="px-2 py-1 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-green-50 hover:text-green-600 hover:border-green-200">Done</button>
            )}
          </div>
        ))}
        {commitments.length === 0 && <p className="text-sm text-gray-400">No commitments yet</p>}
      </div>
    </div>
  );
}

function MoodHistoryTab({ history }: { history: any[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4"><Clock size={14} /> Mood Timeline</h3>
      <div className="space-y-3">
        {history.map(h => (
          <div key={h.id} className="flex items-center gap-4 py-2 border-b border-gray-50 last:border-0">
            <div className="w-3 h-3 rounded-full" style={{ background: MOOD_COLORS[h.mood] ?? "#6366f1" }} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{h.moodLabel}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">Energy: {h.energy}%</span>
              </div>
              {h.trigger && <p className="text-xs text-gray-400 mt-0.5">Trigger: {h.trigger}</p>}
            </div>
            <span className="text-[10px] text-gray-400">{new Date(h.createdAt).toLocaleString()}</span>
          </div>
        ))}
        {history.length === 0 && <p className="text-sm text-gray-400">No mood history recorded yet</p>}
      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────────────────

function ConfigSection({ title, icon, editing, onEdit, onSave, onCancel, saving, children }: { title: string; icon: React.ReactNode; editing: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void; saving: boolean; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">{icon} {title}</h3>
        {editing ? (
          <div className="flex gap-1">
            <button onClick={onSave} disabled={saving} className="px-2 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"><Check size={10} className="inline" /> Save</button>
            <button onClick={onCancel} className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs hover:bg-gray-200">Cancel</button>
          </div>
        ) : (
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Pencil size={12} /></button>
        )}
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2"><span className="text-gray-400 min-w-[80px]">{label}</span><span className="text-gray-700">{value}</span></div>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, min, max, step }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} min={min} max={max} step={step} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{label}</span>
      <button onClick={() => onChange(!value)} className={cn("w-10 h-5 rounded-full transition-colors relative", value ? "bg-indigo-600" : "bg-gray-200")}>
        <div className={cn("w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm", value ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

// ─── Skills Section with Browse/Pin ──────────────────────────────────────────

const MAX_PINNED = 10;
const CATEGORY_COLORS: Record<string, string> = {
  analytics: "bg-blue-50 text-blue-600", development: "bg-emerald-50 text-emerald-600",
  research: "bg-purple-50 text-purple-600", creative: "bg-pink-50 text-pink-600",
  language: "bg-amber-50 text-amber-600", strategy: "bg-orange-50 text-orange-600",
  tools: "bg-gray-50 text-gray-600", social: "bg-cyan-50 text-cyan-600",
  education: "bg-teal-50 text-teal-600", ethics: "bg-indigo-50 text-indigo-600",
  leadership: "bg-violet-50 text-violet-600", security: "bg-red-50 text-red-600",
  memory: "bg-lime-50 text-lime-600", vision: "bg-sky-50 text-sky-600",
  general: "bg-gray-50 text-gray-500",
};

function SkillsSection({ agentId, skills: initialSkills }: { agentId: number; skills: any[] }) {
  const [skills, setSkills] = useState(initialSkills);
  const [showBrowse, setShowBrowse] = useState(false);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catSearch, setCatSearch] = useState("");
  const qc = useQueryClient();

  useEffect(() => { setSkills(initialSkills); }, [initialSkills]);

  const pinnedSkills = skills.filter(s => s.pinned);
  const unpinnedSkills = skills.filter(s => !s.pinned);

  const handlePin = async (skillId: number) => {
    if (pinnedSkills.length >= MAX_PINNED) return;
    await request(`/agents/${agentId}/skills/${skillId}/pin`, { method: "POST" });
    setSkills(skills.map(s => s.id === skillId ? { ...s, pinned: true } : s));
    qc.invalidateQueries({ queryKey: ["agent-profile", agentId] });
  };

  const handleUnpin = async (skillId: number) => {
    await request(`/agents/${agentId}/skills/${skillId}/unpin`, { method: "POST" });
    setSkills(skills.map(s => s.id === skillId ? { ...s, pinned: false } : s));
    qc.invalidateQueries({ queryKey: ["agent-profile", agentId] });
  };

  const handleRemove = async (skillId: number) => {
    await request(`/agents/${agentId}/skills/${skillId}`, { method: "DELETE" });
    setSkills(skills.filter(s => s.id !== skillId));
    qc.invalidateQueries({ queryKey: ["agent-profile", agentId] });
  };

  const handleAddFromCatalog = async (item: any) => {
    const existing = skills.find(s => s.slug === item.slug || s.name === item.name);
    if (existing) return;
    const res = await request(`/agents/${agentId}/skills`, {
      method: "POST",
      body: JSON.stringify({ name: item.name, slug: item.slug, category: item.category, description: item.description }),
    });
    if (res) {
      setSkills([...skills, res]);
      qc.invalidateQueries({ queryKey: ["agent-profile", agentId] });
    }
  };

  const loadCatalog = async () => {
    if (catalog.length === 0) {
      const data = await request<any[]>("/skills/catalog");
      setCatalog(data ?? []);
    }
    setShowBrowse(!showBrowse);
  };

  const filteredCatalog = catalog.filter(c =>
    !skills.find(s => s.slug === c.slug || s.name === c.name) &&
    (catSearch === "" || c.name.toLowerCase().includes(catSearch.toLowerCase()) || c.category.includes(catSearch.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><BarChart3 size={14} /> Skills</h3>
        <button onClick={loadCatalog} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
          <Plus size={12} /> Browse
        </button>
      </div>

      {/* Pinned Skills */}
      {pinnedSkills.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Pin size={11} className="text-orange-500" />
            <span className="text-[10px] font-medium text-gray-500 uppercase">Pinned ({pinnedSkills.length}/{MAX_PINNED})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {pinnedSkills.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-[11px] font-medium group cursor-pointer hover:bg-orange-100" onClick={() => handleUnpin(s.id)}>
                <Pin size={10} /> {s.name}
                <PinOff size={10} className="opacity-0 group-hover:opacity-100 text-orange-400" />
              </span>
            ))}
          </div>
        </div>
      )}

      {/* All Skills (with mastery bars) */}
      <div className="space-y-2">
        {skills.map((s: any) => (
          <div key={s.id} className="flex items-center gap-2 group">
            <button onClick={() => s.pinned ? handleUnpin(s.id) : handlePin(s.id)} className="p-0.5 rounded hover:bg-gray-100" title={s.pinned ? "Unpin" : "Pin"}>
              <Pin size={11} className={s.pinned ? "text-orange-500" : "text-gray-300"} />
            </button>
            <span className="text-xs text-gray-600 w-28 truncate">{s.name}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${s.mastery}%` }} />
            </div>
            <span className="text-[10px] text-gray-400 w-8">{s.mastery}%</span>
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded", CATEGORY_COLORS[s.category] ?? CATEGORY_COLORS.general)}>{s.category}</span>
            <button onClick={() => handleRemove(s.id)} className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-50 text-red-400">
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        {skills.length === 0 && <p className="text-xs text-gray-400">No skills yet. Click "Browse" to add from catalog.</p>}
      </div>

      {/* Browse Catalog */}
      {showBrowse && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Search size={12} className="text-gray-400" />
            <input value={catSearch} onChange={e => setCatSearch(e.target.value)} placeholder="Search skills..." className="flex-1 text-xs border-none outline-none bg-transparent placeholder-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {filteredCatalog.map(item => (
              <button key={item.slug} onClick={() => handleAddFromCatalog(item)} className="text-left p-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors">
                <div className="flex items-center gap-1.5">
                  <Plus size={10} className="text-indigo-500" />
                  <span className="text-xs font-medium text-gray-700">{item.name}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">{item.description}</p>
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block", CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.general)}>{item.category}</span>
              </button>
            ))}
            {filteredCatalog.length === 0 && <p className="col-span-2 text-xs text-gray-400 text-center py-2">All catalog skills already added!</p>}
          </div>
        </div>
      )}

      <p className="text-[10px] text-gray-400 mt-3">
        Pinned skills are always inlined in the system prompt. Others use skill_search.
      </p>
    </div>
  );
}
