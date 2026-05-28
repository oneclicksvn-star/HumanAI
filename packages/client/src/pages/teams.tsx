import { useState } from "react";
import { cn, MOOD_COLORS } from "@/lib/utils";
import { useTeams, useTasks, useAgents, useUpdateTask } from "@/hooks/useApi";
import { Plus, GripVertical, Star } from "lucide-react";
import { motion } from "framer-motion";

const COLUMNS = [
  { id: "todo", label: "TODO", color: "border-gray-300" },
  { id: "in_progress", label: "IN PROGRESS", color: "border-blue-400" },
  { id: "review", label: "REVIEW", color: "border-amber-400" },
  { id: "done", label: "DONE", color: "border-emerald-400" },
];

const PRIORITY_DOT: Record<string, string> = { high: "bg-red-400", medium: "bg-amber-400", low: "bg-gray-300" };

export default function Teams() {
  const { data: teams } = useTeams();
  const { data: agents } = useAgents();
  const [activeTeam, setActiveTeam] = useState<number>(0);
  const teamId = activeTeam || teams?.[0]?.id;
  const { data: tasks } = useTasks(teamId);
  const updateTask = useUpdateTask();

  const team = teams?.find(t => t.id === teamId);
  const teamAgents = agents?.filter(a => team?.agentIds?.includes(a.id)) ?? [];

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
          <p className="text-sm text-gray-400 mt-0.5">{teams?.length ?? 0} teams active</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-colors">
          <Plus size={14} /> New Team
        </button>
      </div>

      {/* Team selector */}
      <div className="flex gap-2">
        {(teams ?? []).map(t => (
          <button key={t.id} onClick={() => setActiveTeam(t.id)}
            className={cn("px-4 py-2 rounded-xl text-xs font-semibold transition-all",
              t.id === teamId ? "bg-indigo-600 text-white shadow-md" : "bg-white border border-gray-200 text-gray-600 hover:border-indigo-200")}>
            {t.name}
          </button>
        ))}
      </div>

      {/* Team members bar */}
      {team && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-700">Team Members</p>
            <div className="flex gap-1.5">{(team.values ?? []).map(v => <span key={v} className="text-[9px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{v}</span>)}</div>
          </div>
          <div className="flex gap-3">
            {teamAgents.map(a => (
              <div key={a.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg" style={{ border: `2px solid ${MOOD_COLORS[a.mood] ?? "#6366f1"}` }}>{a.emoji}</div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-700">{a.name}</p>
                  <p className="text-[9px] text-gray-400">{a.lifecycle} · Lv.{a.level}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colTasks = (tasks ?? []).filter(t => t.status === col.id);
          return (
            <div key={col.id} className="space-y-3">
              <div className={cn("flex items-center gap-2 px-1 border-b-2 pb-2", col.color)}>
                <p className="text-[10px] font-bold tracking-wider text-gray-500">{col.label}</p>
                <span className="text-[9px] font-bold w-5 h-5 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center">{colTasks.length}</span>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {colTasks.map(task => (
                  <motion.div key={task.id} layout className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-grab">
                    <div className="flex items-start justify-between mb-2">
                      <div className={cn("w-2 h-2 rounded-full mt-1", PRIORITY_DOT[task.priority] ?? "bg-gray-300")} />
                      <GripVertical size={12} className="text-gray-300" />
                    </div>
                    <p className="text-xs font-semibold text-gray-800 mb-1">{task.title}</p>
                    {task.description && <p className="text-[10px] text-gray-400 mb-2">{task.description}</p>}
                    {task.progress > 0 && (
                      <div className="w-full h-1 bg-gray-100 rounded-full mb-2 overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${task.progress}%` }} />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {task.assignee && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{task.assignee.emoji}</span>
                          <span className="text-[9px] text-gray-500">{task.assignee.name}</span>
                        </div>
                      )}
                      {task.qualityStars && (
                        <div className="flex gap-0.5">
                          {Array.from({ length: task.qualityStars }, (_, i) => <Star key={i} size={10} className="text-amber-400 fill-amber-400" />)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
