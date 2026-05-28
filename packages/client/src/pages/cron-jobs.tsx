import { useState } from "react";
import { useCronJobs, useCreateCronJob, useUpdateCronJob, useAgents } from "@/hooks/useApi";
import { Clock, Plus, Play, Pause, AlertCircle, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { request } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  active: { bg: "bg-green-50", text: "text-green-600", icon: Play },
  paused: { bg: "bg-amber-50", text: "text-amber-600", icon: Pause },
  error: { bg: "bg-red-50", text: "text-red-600", icon: AlertCircle },
};

const SCHEDULE_PRESETS = [
  { label: "Every 5 min", value: "every 5m" },
  { label: "Every hour", value: "every 1h" },
  { label: "Every 6h", value: "every 6h" },
  { label: "Daily", value: "every 24h" },
  { label: "Weekly", value: "every 168h" },
];

const COMMAND_PRESETS = [
  { label: "Consolidate memories", value: "consolidate" },
  { label: "Check mood", value: "mood_check" },
  { label: "Cleanup old sessions", value: "cleanup_sessions" },
  { label: "Generate daily report", value: "daily_report" },
];

export default function CronJobsPage() {
  const { data: jobs = [] } = useCronJobs();
  const { data: agents = [] } = useAgents();
  const createJob = useCreateCronJob();
  const updateJob = useUpdateCronJob();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", schedule: "every 1h", command: "consolidate", agentId: 0 });
  const agentMap = Object.fromEntries(agents.map((a: any) => [a.id, a]));

  const handleCreate = () => {
    createJob.mutate({
      name: form.name,
      schedule: form.schedule,
      command: form.command,
      agentId: form.agentId || undefined,
      status: "active",
    } as any);
    setShowCreate(false);
    setForm({ name: "", schedule: "every 1h", command: "consolidate", agentId: 0 });
  };

  const handleToggle = (id: number, status: string) => {
    updateJob.mutate({ id, status: status === "active" ? "paused" : "active" } as any);
  };

  const handleDelete = async (id: number) => {
    await request(`/cron-jobs/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["cron-jobs"] });
  };

  return (
    <div className="p-7 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cron Jobs</h1>
          <p className="text-sm text-gray-400 mt-0.5">{jobs.filter((j: any) => j.status === "active").length} active · {jobs.length} total</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-bold px-5 py-2.5 rounded-2xl shadow-[0_4px_12px_rgba(99,102,241,0.4)] hover:bg-indigo-700 transition-colors">
          <Plus size={14} /> New Job
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">New Cron Job</h3>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Memory Consolidation" className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-indigo-300" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Agent (optional)</label>
              <select value={form.agentId} onChange={e => setForm({ ...form, agentId: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value={0}>All Agents</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Schedule</label>
              <select value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                {SCHEDULE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label} ({p.value})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Command</label>
              <select value={form.command} onChange={e => setForm({ ...form, command: e.target.value })} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm">
                {COMMAND_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleCreate} disabled={!form.name} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">Create Job</button>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-3">
        {jobs.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Clock size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No cron jobs configured</p>
            <p className="text-xs text-gray-300 mt-1">Create a job to run tasks on a schedule</p>
          </div>
        )}
        {jobs.map((job: any) => {
          const agent = job.agentId ? agentMap[job.agentId] : null;
          const style = STATUS_STYLES[job.status] ?? STATUS_STYLES.paused;
          const StatusIcon = style.icon;
          return (
            <div key={job.id} className={cn("bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow", job.status === "paused" && "opacity-70")}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Clock size={18} className="text-indigo-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{job.name}</span>
                    <span className={cn("px-2 py-0.5 text-[10px] rounded-full flex items-center gap-1", style.bg, style.text)}>
                      <StatusIcon size={10} /> {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <code className="px-1.5 py-0.5 bg-gray-100 rounded font-mono text-[10px]">{job.schedule}</code>
                    <span>{job.command}</span>
                    {agent && <span className="flex items-center gap-1">{agent.emoji} {agent.name}</span>}
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-gray-400">
                    {job.lastRun && <span>Last: {new Date(job.lastRun).toLocaleString()}</span>}
                    {job.nextRun && <span>Next: {new Date(job.nextRun).toLocaleString()}</span>}
                    <span>{job.runCount ?? 0} runs</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(job.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 size={14} /></button>
                <button onClick={() => handleToggle(job.id, job.status)}
                  className={cn("px-3 py-1.5 text-xs font-semibold rounded-lg",
                    job.status === "active" ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-green-50 text-green-600 hover:bg-green-100")}>
                  {job.status === "active" ? "Pause" : "Start"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
