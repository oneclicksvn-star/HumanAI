import { useCronJobs, useAgents } from "@/hooks/useApi";
import { Clock, Plus, Play, Pause, AlertCircle } from "lucide-react";

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  active: { bg: "bg-green-50", text: "text-green-600", icon: Play },
  paused: { bg: "bg-amber-50", text: "text-amber-600", icon: Pause },
  error: { bg: "bg-red-50", text: "text-red-600", icon: AlertCircle },
};

export default function CronJobsPage() {
  const { data: jobs = [] } = useCronJobs();
  const { data: agents = [] } = useAgents();
  const agentMap = Object.fromEntries(agents.map((a: any) => [a.id, a]));

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cron Jobs</h1>
          <p className="text-gray-500">{jobs.filter((j: any) => j.status === "active").length} active, {jobs.length} total</p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2">
          <Plus size={18} /> New Job
        </button>
      </div>

      <div className="space-y-3">
        {jobs.map((job: any) => {
          const agent = job.agentId ? agentMap[job.agentId] : null;
          const style = STATUS_STYLES[job.status] ?? STATUS_STYLES.paused;
          const StatusIcon = style.icon;
          return (
            <div key={job.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Clock size={20} className="text-indigo-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{job.name}</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full flex items-center gap-1 ${style.bg} ${style.text}`}>
                      <StatusIcon size={10} /> {job.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">{job.schedule}</code>
                    <span>{job.command}</span>
                    {agent && <span className="flex items-center gap-1">{agent.emoji} {agent.name}</span>}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-400">
                    {job.lastRun && <span>Last: {new Date(job.lastRun).toLocaleDateString()}</span>}
                    {job.nextRun && <span>Next: {new Date(job.nextRun).toLocaleDateString()}</span>}
                    <span>{job.runCount} runs</span>
                  </div>
                </div>
                <button className={`px-3 py-1.5 text-sm rounded-lg ${job.status === "active" ? "bg-amber-50 text-amber-600 hover:bg-amber-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
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
