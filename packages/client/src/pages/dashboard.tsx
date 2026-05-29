import { Link } from "wouter";
import { Plus, Zap, Users, Activity, CheckCircle, ChevronRight, Star, Moon } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { getGreeting, MOOD_COLORS } from "@/lib/utils";
import { useDashboardStats, useDashboardActivity, useDashboardDreams, useAgents } from "@/hooks/useApi";
import { motion } from "framer-motion";

const STAGE_COLORS: Record<string, string> = { infant: "#60a5fa", child: "#34d399", teen: "#f59e0b", adult: "#f97316", expert: "#ef4444", mentor: "#8b5cf6" };
const MOOD_BG: Record<string, string> = { positive: "bg-emerald-50 text-emerald-700", focused: "bg-blue-50 text-blue-700", reflective: "bg-violet-50 text-violet-700", calming: "bg-sky-50 text-sky-700", supportive: "bg-amber-50 text-amber-700", neutral: "bg-indigo-50 text-indigo-700", satisfied: "bg-emerald-50 text-emerald-700", empathetic: "bg-violet-50 text-violet-700" };

const PULSE_DATA = Array.from({ length: 12 }, (_, i) => ({ t: `${(i * 2).toString().padStart(2, "0")}:00`, mood: Math.floor(Math.random() * 20) + 70 }));

const COMMITMENTS = [
  { type: "📅", agent: "Luna", content: "Theo dõi kết quả phân tích Q4", due: "trong 2 giờ" },
  { type: "💚", agent: "Sage", content: "Kiểm tra sức khỏe nhóm hàng tuần", due: "ngày mai 9h" },
  { type: "⏰", agent: "Atlas", content: "Hạn chót review PR nhánh chính", due: "hôm nay 17h" },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

export default function Dashboard() {
  const { data: stats } = useDashboardStats();
  const { data: agents } = useAgents();
  const { data: activity } = useDashboardActivity();
  const { data: dreams } = useDashboardDreams();

  const agentList = agents ?? [];

  const STAT_CARDS = [
    { label: "Agent hoạt động", value: stats?.activeAgents ?? agentList.length, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100", badge: "+2 mới" },
    { label: "Phiên hôm nay", value: stats?.sessionsToday ?? 0, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100", badge: "đang chạy" },
    { label: "Token đã dùng", value: stats?.tokensToday ? `${(stats.tokensToday / 1000).toFixed(0)}K` : "0", icon: Zap, color: "text-violet-600", bg: "bg-violet-50 border-violet-100", badge: "ngân sách" },
    { label: "Tác vụ đang chạy", value: stats?.openTasks ?? 0, icon: CheckCircle, color: "text-amber-600", bg: "bg-amber-50 border-amber-100", badge: "mở" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fc] p-7 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, Admin 👋</h1>
          <p className="text-sm text-gray-400 mt-0.5">Các agent AI của bạn đang hoạt động tốt — {agentList.length} đang chạy, hệ thống ổn định</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-100 px-4 py-2 shadow-sm text-[11px]">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-gray-600 font-semibold">Hệ thống hoạt động tốt</span>
          </div>
          <Link href="/agents">
            <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-colors">
              <Plus size={14} /> Tạo Agent
            </button>
          </Link>
        </div>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-4 gap-4">
        {STAT_CARDS.map(s => (
          <motion.div key={s.label} variants={item} className={cn("rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow cursor-default", s.bg)}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 font-semibold">{s.label}</p>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={cn("text-3xl font-bold", s.color)}>{s.value}</p>
            <p className="text-[10px] text-gray-400 mt-1.5">{s.badge}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-800">Trạng thái Agent</h2>
            <Link href="/agents"><span className="text-xs text-indigo-500 flex items-center gap-1 hover:underline cursor-pointer">Xem tất cả <ChevronRight size={12} /></span></Link>
          </div>
          {agentList.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl" style={{ border: `3px solid ${MOOD_COLORS[a.mood] ?? "#6366f1"}` }}>
                {a.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-gray-900">{a.name}</span>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: STAGE_COLORS[a.lifecycle] + "20", color: STAGE_COLORS[a.lifecycle] }}>{a.lifecycle}</span>
                  <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full", MOOD_BG[a.mood] ?? "bg-gray-50 text-gray-600")}>{a.mood}</span>
                </div>
                <p className="text-[11px] text-gray-400">{a.status}</p>
                <div className="flex gap-1.5 mt-2">
                  {(a.skills || []).slice(0, 3).map(sk => <span key={sk} className="text-[9px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full">{sk}</span>)}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-[10px] text-gray-400"><span>Năng lượng</span><p className="font-bold text-sm text-gray-700">{a.energy}%</p></div>
                <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(a.xp / Math.max(a.xpNext, 1)) * 100}%`, background: MOOD_COLORS[a.mood] ?? "#6366f1" }} />
                </div>
                <p className="text-[9px] text-gray-400 mt-1">Lv.{a.level} XP</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-700">Nhịp hệ thống</h3>
              <span className="text-[10px] text-gray-400">Hôm nay</span>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PULSE_DATA}><Line type="monotone" dataKey="mood" stroke="#6366f1" strokeWidth={2} dot={false} /></LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-2">
              {(activity ?? []).slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <span>{a.type === "tin nhắn" ? "💬" : a.type === "tool_call" ? "⚡" : a.type === "memory_store" ? "🧠" : "✅"}</span>
                  <p className="text-gray-600 flex-1">{a.summary}</p>
                  <span className="text-gray-300 flex-shrink-0">{new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h3 className="text-xs font-bold text-gray-700 mb-3">Cam kết</h3>
            {COMMITMENTS.map((c, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0">
                <span className="text-lg">{c.type}</span>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold text-gray-700">{c.agent}</p>
                  <p className="text-[10px] text-gray-500">{c.content}</p>
                  <p className="text-[9px] text-gray-400">Hạn: {c.due}</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Moon size={16} className="text-indigo-500" />
          <h2 className="text-sm font-bold text-gray-800">Giấc mơ & Nhận định</h2>
          <span className="text-[10px] text-gray-400">— Tổng hợp mới nhất từ chế độ Dream</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {(dreams ?? []).slice(0, 3).map((d, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{d.agent?.emoji ?? "🤖"}</span>
                <div>
                  <p className="text-xs font-bold text-gray-700">{d.agent?.name ?? "Agent"}</p>
                  <p className="text-[9px] text-gray-400">Chế độ mơ</p>
                </div>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed">{d.insight}</p>
              <div className="flex gap-1.5 mt-2">{(d.sourceTags ?? []).map(t => <span key={t} className="text-[9px] text-indigo-500 font-semibold">{t}</span>)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
