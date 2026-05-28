import { useApiKeys } from "@/hooks/useApi";
import { Key, Plus, Copy, Trash2, Shield } from "lucide-react";

export default function ApiKeysPage() {
  const { data: keys = [] } = useApiKeys();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-500">{keys.length} keys — {keys.filter((k: any) => k.isActive).length} active</p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2">
          <Plus size={18} /> Generate Key
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Shield size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <div className="font-medium text-amber-800">Security Notice</div>
          <div className="text-sm text-amber-700">API keys grant access to your HumanCore AI instance. Keep them secret and rotate regularly.</div>
        </div>
      </div>

      <div className="space-y-3">
        {keys.map((key: any) => (
          <div key={key.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Key size={20} className="text-indigo-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{key.name}</span>
                  <span className={`px-2 py-0.5 text-[10px] rounded-full ${key.isActive ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                    {key.isActive ? "Active" : "Revoked"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <code className="text-sm text-gray-500 font-mono bg-gray-50 px-2 py-0.5 rounded">{key.prefix}•••••••••</code>
                  <button className="text-gray-400 hover:text-gray-600"><Copy size={14} /></button>
                </div>
                <div className="flex gap-2 mt-1">
                  {(key.permissions ?? []).map((p: string) => (
                    <span key={p} className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded capitalize">{p}</span>
                  ))}
                </div>
              </div>
              <div className="text-right text-xs text-gray-400">
                <div>Created {new Date(key.createdAt).toLocaleDateString()}</div>
                {key.lastUsed && <div>Used {new Date(key.lastUsed).toLocaleDateString()}</div>}
              </div>
              <button className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
