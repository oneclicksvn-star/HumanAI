import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSettings, useUpdateSettings, useAgents } from "@/hooks/useApi";
import { Save, Moon, Sun, Globe, Shield, Palette, Brain, Zap, Bell, Database } from "lucide-react";

const SECTIONS = [
  { id: "general", label: "Chung", icon: Globe },
  { id: "ai", label: "AI & Models", icon: Brain },
  { id: "memory", label: "Bộ nhớ", icon: Database },
  { id: "appearance", label: "Giao diện", icon: Palette },
  { id: "notifications", label: "Thông báo", icon: Bell },
  { id: "security", label: "Bảo mật", icon: Shield },
];

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const { data: agents } = useAgents();
  const [section, setSection] = useState("general");
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState({
    language: settings?.language ?? "vi",
    theme: settings?.theme ?? "light",
    autoSave: settings?.autoSave ?? true,
    notifications: settings?.notifications ?? true,
    defaultProvider: settings?.defaultProvider ?? "mock",
    defaultAgentId: settings?.defaultAgentId ?? "",
    maxTokens: settings?.maxTokens ?? 4096,
    temperature: settings?.temperature ?? 0.7,
  });

  const update = (k: string, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate(form);
    setDirty(false);
  };

  return (
    <div className="p-7 flex gap-6">
      <div className="w-56 space-y-1">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={cn("w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all text-left",
              section === s.id ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50")}>
            <s.icon size={14} /> {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
          {dirty && (
            <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
              <Save size={12} /> Save Changes
            </button>
          )}
        </div>

        {section === "general" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-700">Chung</h3>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Ngôn ngữ</label>
              <select value={form.language} onChange={e => update("language", e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-300">
                <option value="vi">Tiếng Việt</option>
                <option value="en">Tiếng Anh</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Auto-save conversations</label>
                <p className="text-[10px] text-gray-400">Tự động lưu lịch sử phiên</p>
              </div>
              <button onClick={() => update("autoSave", !form.autoSave)} className={cn("w-10 h-6 rounded-full transition-colors relative", form.autoSave ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", form.autoSave ? "left-5" : "left-1")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Auto-title sessions</label>
                <p className="text-[10px] text-gray-400">Tự tạo tiêu đề từ tin nhắn đầu</p>
              </div>
              <button onClick={() => update("autoTitle", !(form as any).autoTitle)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).autoTitle !== false ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).autoTitle !== false ? "left-5" : "left-1")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Nhận diện cảm xúc</label>
                <p className="text-[10px] text-gray-400">Nhận diện cảm xúc từ hội thoại</p>
              </div>
              <button onClick={() => update("moodDetection", !(form as any).moodDetection)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).moodDetection !== false ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).moodDetection !== false ? "left-5" : "left-1")} />
              </button>
            </div>
          </div>
        )}

        {section === "appearance" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <label className="text-xs font-semibold text-gray-600 mb-3 block">Chủ đề</label>
            <div className="flex gap-4">
              {[
                { id: "light", label: "Sáng", icon: Sun },
                { id: "dark", label: "Tối", icon: Moon },
              ].map(t => (
                <button key={t.id} onClick={() => update("theme", t.id)}
                  className={cn("flex items-center gap-2 px-5 py-3 rounded-xl border transition-all",
                    form.theme === t.id ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500")}>
                  <t.icon size={14} /> {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {section === "ai" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-700">AI & Models</h3>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Provider mặc định</label>
              <select value={form.defaultProvider} onChange={e => update("defaultProvider", e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-300">
                <option value="mock">Mock (Demo)</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
                <option value="ollama">Ollama</option>
                <option value="deepseek">DeepSeek</option>
                <option value="groq">Groq</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Agent mặc định</label>
              <select value={form.defaultAgentId} onChange={e => update("defaultAgentId", e.target.value ? parseInt(e.target.value) : "")} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-300">
                <option value="">None (always ask)</option>
                {(agents ?? []).map((a: any) => (
                  <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>
                ))}
              </select>
              <p className="text-[10px] text-gray-400 mt-1">Agent dùng mặc định khi tạo chat mới không chọn agent</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Token tối đa</label>
              <input type="number" value={form.maxTokens} onChange={e => update("maxTokens", parseInt(e.target.value))} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Temperature: {form.temperature}</label>
              <input type="range" min={0} max={2} step={0.1} value={form.temperature} onChange={e => update("temperature", parseFloat(e.target.value))} className="w-64 accent-indigo-600" />
              <p className="text-[10px] text-gray-400 mt-1">Lower = more focused, Higher = more creative</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Phản hồi streaming</label>
                <p className="text-[10px] text-gray-400">Show AI responses as they are generated</p>
              </div>
              <button onClick={() => update("streaming", !(form as any).streaming)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).streaming !== false ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).streaming !== false ? "left-5" : "left-1")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Tool auto-approve</label>
                <p className="text-[10px] text-gray-400">Auto-approve safe tool executions</p>
              </div>
              <button onClick={() => update("toolAutoApprove", !(form as any).toolAutoApprove)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).toolAutoApprove ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).toolAutoApprove ? "left-5" : "left-1")} />
              </button>
            </div>
          </div>
        )}

        {section === "memory" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-700">Memory & Consolidation</h3>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Auto-consolidation</label>
                <p className="text-[10px] text-gray-400">Tự động tổng hợp ký ức theo lịch</p>
              </div>
              <button onClick={() => update("autoConsolidation", !(form as any).autoConsolidation)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).autoConsolidation !== false ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).autoConsolidation !== false ? "left-5" : "left-1")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Chế độ mơ</label>
                <p className="text-[10px] text-gray-400">Cho phép agent tạo nhận định từ ký ức</p>
              </div>
              <button onClick={() => update("dreamingEnabled", !(form as any).dreamingEnabled)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).dreamingEnabled !== false ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).dreamingEnabled !== false ? "left-5" : "left-1")} />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Memory decay half-life (days)</label>
              <input type="number" value={(form as any).decayHalfLife ?? 30} onChange={e => update("decayHalfLife", parseInt(e.target.value))} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-300" />
              <p className="text-[10px] text-gray-400 mt-1">Ebbinghaus curve: memories decay to 50% importance after this many days</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Ký ức ngữ cảnh tối đa</label>
              <input type="number" value={(form as any).maxContextMemories ?? 10} onChange={e => update("maxContextMemories", parseInt(e.target.value))} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-300" />
              <p className="text-[10px] text-gray-400 mt-1">Số ký ức tối đa đưa vào ngữ cảnh hội thoại</p>
            </div>
          </div>
        )}

        {section === "notifications" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-700">Thông báo</h3>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Thông báo màn hình</label>
                <p className="text-[10px] text-gray-400">Hiện thông báo trình duyệt</p>
              </div>
              <button onClick={() => update("notifications", !form.notifications)} className={cn("w-10 h-6 rounded-full transition-colors relative", form.notifications ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", form.notifications ? "left-5" : "left-1")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Cảnh báo duyệt tool</label>
                <p className="text-[10px] text-gray-400">Thông báo khi tool cần duyệt</p>
              </div>
              <button onClick={() => update("toolApprovalAlerts", !(form as any).toolApprovalAlerts)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).toolApprovalAlerts !== false ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).toolApprovalAlerts !== false ? "left-5" : "left-1")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Thông báo khi giao việc hoàn thành</label>
                <p className="text-[10px] text-gray-400">Thông báo khi tác vụ giao xong</p>
              </div>
              <button onClick={() => update("delegationAlerts", !(form as any).delegationAlerts)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).delegationAlerts !== false ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).delegationAlerts !== false ? "left-5" : "left-1")} />
              </button>
            </div>
          </div>
        )}

        {section === "security" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-700">Bảo mật</h3>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Thực thi tool trong hộp cát</label>
                <p className="text-[10px] text-gray-400">Chạy tool trong hộp cát cô lập</p>
              </div>
              <button onClick={() => update("sandboxed", !(form as any).sandboxed)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).sandboxed !== false ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).sandboxed !== false ? "left-5" : "left-1")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">Yêu cầu phê duyệt tool nguy hiểm</label>
                <p className="text-[10px] text-gray-400">shell_exec, file_write require manual approval</p>
              </div>
              <button onClick={() => update("dangerousToolApproval", !(form as any).dangerousToolApproval)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).dangerousToolApproval !== false ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).dangerousToolApproval !== false ? "left-5" : "left-1")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-gray-600">API key masking</label>
                <p className="text-[10px] text-gray-400">Mask API keys in UI display</p>
              </div>
              <button onClick={() => update("apiKeyMasking", !(form as any).apiKeyMasking)} className={cn("w-10 h-6 rounded-full transition-colors relative", (form as any).apiKeyMasking !== false ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", (form as any).apiKeyMasking !== false ? "left-5" : "left-1")} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
