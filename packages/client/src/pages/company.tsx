import { useAgents, useTeams } from "@/hooks/useApi";
import { Building2, Users, BarChart3, Crown } from "lucide-react";

const DEPARTMENTS = [
  { name: "Engineering", color: "#6366f1", lead: "Atlas" },
  { name: "Research", color: "#22c55e", lead: "Luna" },
  { name: "Operations", color: "#f59e0b", lead: "Sage" },
];

export default function Company() {
  const { data: agents = [] } = useAgents();
  const { data: teams = [] } = useTeams();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company</h1>
          <p className="text-gray-500">Multi-agent organization structure</p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2">
          <Building2 size={18} /> Create Department
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Agents", value: agents.length, icon: Users, color: "text-indigo-500" },
          { label: "Departments", value: DEPARTMENTS.length, icon: Building2, color: "text-green-500" },
          { label: "Active Teams", value: teams.length, icon: Users, color: "text-blue-500" },
          { label: "Avg Performance", value: "87%", icon: BarChart3, color: "text-amber-500" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <kpi.icon size={20} className={kpi.color} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-sm text-gray-500">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Org Chart */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Organization Chart</h2>
        <div className="flex flex-col items-center">
          {/* CEO Level */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-xl shadow-lg mb-2">
            <div className="flex items-center gap-2"><Crown size={16} /> <span className="font-semibold">Admin (You)</span></div>
            <div className="text-xs opacity-80">Company Owner</div>
          </div>
          <div className="w-px h-8 bg-gray-300" />
          <div className="flex items-center gap-1 mb-2">
            <div className="w-32 h-px bg-gray-300" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="w-32 h-px bg-gray-300" />
          </div>
          {/* Department Level */}
          <div className="flex gap-8">
            {DEPARTMENTS.map((dept) => {
              const lead = agents.find((a: any) => a.name === dept.lead);
              const teamAgents = agents.filter((a: any) => a.name === dept.lead || (dept.name === "Engineering" && a.name === "Atlas"));
              return (
                <div key={dept.name} className="flex flex-col items-center">
                  <div className="bg-white border-2 rounded-xl px-5 py-3 text-center shadow-sm" style={{ borderColor: dept.color }}>
                    <div className="font-semibold text-gray-900">{dept.name}</div>
                    <div className="text-xs text-gray-500 mt-1">Lead: {dept.lead}</div>
                    {lead && (
                      <div className="mt-2 flex items-center gap-1 justify-center">
                        <span className="text-lg">{lead.emoji}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: dept.color }}>{lead.lifecycle}</span>
                      </div>
                    )}
                  </div>
                  <div className="w-px h-4 bg-gray-200" />
                  <div className="text-xs text-gray-400">{teamAgents.length} agent(s)</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Department Details */}
      <div className="grid grid-cols-3 gap-6">
        {DEPARTMENTS.map((dept) => (
          <div key={dept.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ background: dept.color }} />
              <h3 className="font-semibold text-gray-900">{dept.name}</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Lead</span><span className="font-medium">{dept.lead}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Tasks</span><span className="font-medium">4</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Performance</span><span className="font-medium text-green-600">92%</span></div>
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">Progress</div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: "78%", background: dept.color }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
