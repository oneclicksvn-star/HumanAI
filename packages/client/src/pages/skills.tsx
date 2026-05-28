import { useSkills, useAgents } from "@/hooks/useApi";
import { Sparkles, Search, Star } from "lucide-react";
import { useState } from "react";

const CATEGORIES = ["Tất cả", "language", "code", "strategy", "ethics", "data", "creative"];

export default function Skills() {
  const { data: skills = [] } = useSkills();
  const { data: agents = [] } = useAgents();
  const [cat, setCat] = useState("Tất cả");
  const [search, setSearch] = useState("");

  const agentMap = Object.fromEntries(agents.map((a: any) => [a.id, a]));
  const filtered = skills
    .filter((s: any) => cat === "Tất cả" || s.category === cat)
    .filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kỹ năng</h1>
          <p className="text-gray-500">{skills.length} skills across all agents</p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 flex items-center gap-2">
          <Sparkles size={18} /> Add Skill
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kỹ năng..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div className="flex gap-1">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`px-3 py-1.5 text-sm rounded-lg ${cat === c ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Skills Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((skill: any) => {
          const agent = agentMap[skill.agentId];
          return (
            <div key={skill.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-500" />
                  <h3 className="font-semibold text-gray-900 capitalize">{skill.name.replace(/-/g, " ")}</h3>
                </div>
                <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">{skill.category}</span>
              </div>
              {agent && (
                <div className="flex items-center gap-1.5 mb-3 text-sm text-gray-500">
                  <span>{agent.emoji}</span> <span>{agent.name}</span>
                </div>
              )}
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-500">Thành thạo</span>
                  <span className="font-medium">{skill.mastery}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all" style={{ width: `${skill.mastery}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{skill.practiceCount} practices</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} className={i < Math.ceil(skill.mastery / 20) ? "text-amber-400 fill-amber-400" : "text-gray-200"} />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
