import { cn, timeAgo, MOOD_COLORS } from "@/lib/utils";
import { useSessions } from "@/hooks/useApi";
import { Link } from "wouter";
import { MessageSquare, Clock, Archive } from "lucide-react";

export default function Sessions() {
  const { data: sessions } = useSessions();

  const active = (sessions ?? []).filter(s => s.status === "active");
  const archived = (sessions ?? []).filter(s => s.status === "archived");

  return (
    <div className="p-7 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <p className="text-sm text-gray-400 mt-0.5">{(sessions ?? []).length} total sessions</p>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold tracking-wider text-gray-400 flex items-center gap-2"><Clock size={12} /> ACTIVE</h2>
        {active.map(s => (
          <Link key={s.id} href="/chat">
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex items-center gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ border: `2px solid ${MOOD_COLORS[s.agent?.mood ?? "neutral"] ?? "#6366f1"}` }}>
                {s.agent?.emoji ?? "🤖"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <p className="text-[11px] text-gray-400">{s.agent?.name ?? "Agent"} · {timeAgo(s.updatedAt)}</p>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <MessageSquare size={12} />
                <span>{s.messageCount} messages</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {archived.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold tracking-wider text-gray-400 flex items-center gap-2"><Archive size={12} /> ARCHIVED</h2>
          {archived.map(s => (
            <div key={s.id} className="bg-gray-50 rounded-2xl border border-gray-100 p-4 flex items-center gap-4 opacity-60">
              <span className="text-xl">{s.agent?.emoji ?? "🤖"}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-600">{s.title}</p>
                <p className="text-[11px] text-gray-400">{s.agent?.name ?? "Agent"} · {timeAgo(s.updatedAt)}</p>
              </div>
              <span className="text-[11px] text-gray-400">{s.messageCount} msgs</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
