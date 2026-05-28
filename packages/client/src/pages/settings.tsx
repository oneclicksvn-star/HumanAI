import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSettings, useUpdateSettings } from "@/hooks/useApi";
import { Save, Moon, Sun, Globe, Shield, Palette } from "lucide-react";

const SECTIONS = [
  { id: "general", label: "General", icon: Globe },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "security", label: "Security", icon: Shield },
];

export default function SettingsPage() {
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();
  const [section, setSection] = useState("general");
  const [dirty, setDirty] = useState(false);

  const [form, setForm] = useState({
    language: settings?.language ?? "vi",
    theme: settings?.theme ?? "light",
    autoSave: settings?.autoSave ?? true,
    notifications: settings?.notifications ?? true,
    defaultProvider: settings?.defaultProvider ?? "mock",
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
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          {dirty && (
            <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors">
              <Save size={12} /> Save Changes
            </button>
          )}
        </div>

        {section === "general" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Language</label>
              <select value={form.language} onChange={e => update("language", e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-300">
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Default Provider</label>
              <select value={form.defaultProvider} onChange={e => update("defaultProvider", e.target.value)} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-300">
                <option value="mock">Mock (Demo)</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
                <option value="google">Google</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Max Tokens</label>
              <input type="number" value={form.maxTokens} onChange={e => update("maxTokens", parseInt(e.target.value))} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm w-64 focus:outline-none focus:border-indigo-300" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-2 block">Temperature: {form.temperature}</label>
              <input type="range" min={0} max={2} step={0.1} value={form.temperature} onChange={e => update("temperature", parseFloat(e.target.value))} className="w-64 accent-indigo-600" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-600">Auto-save conversations</label>
              <button onClick={() => update("autoSave", !form.autoSave)} className={cn("w-10 h-6 rounded-full transition-colors relative", form.autoSave ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", form.autoSave ? "left-5" : "left-1")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-600">Notifications</label>
              <button onClick={() => update("notifications", !form.notifications)} className={cn("w-10 h-6 rounded-full transition-colors relative", form.notifications ? "bg-indigo-600" : "bg-gray-200")}>
                <div className={cn("w-4 h-4 bg-white rounded-full absolute top-1 transition-all", form.notifications ? "left-5" : "left-1")} />
              </button>
            </div>
          </div>
        )}

        {section === "appearance" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-5">
            <label className="text-xs font-semibold text-gray-600 mb-3 block">Theme</label>
            <div className="flex gap-4">
              {[
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
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

        {section === "security" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
            <p className="text-xs text-gray-500">Security settings will be available when provider integration is enabled.</p>
          </div>
        )}
      </div>
    </div>
  );
}
