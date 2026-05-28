import { useLocation } from "wouter";
import { Construction } from "lucide-react";

const PAGE_INFO: Record<string, { title: string; description: string }> = {
  "/company": { title: "Company", description: "Multi-agent company with departments, KPIs, and org chart." },
  "/channels": { title: "Channels", description: "WhatsApp, Telegram, Discord, Slack, Email, Webhooks — manage all message channels." },
  "/skills": { title: "Skills", description: "Browse and manage agent skills — installed + skill store." },
  "/tools": { title: "Tools", description: "Built-in and custom tools available to agents: shell, web, file, code." },
  "/mcp-servers": { title: "MCP Servers", description: "Model Context Protocol servers — PostgreSQL, GitHub, Filesystem." },
  "/hooks": { title: "Hooks", description: "Event hooks for tool approval flow, message interception, agent lifecycle." },
  "/cron-jobs": { title: "Cron Jobs", description: "Scheduled agent tasks — care check-ins, memory consolidation, reports." },
  "/vault": { title: "Vault", description: "Document storage with folders, wikilinks, and semantic search." },
  "/activity": { title: "Activity", description: "Real-time activity feed with approval actions." },
  "/usage": { title: "Usage & Costs", description: "Token and cost breakdown by provider and agent." },
  "/traces": { title: "Traces", description: "LLM call tracing — latency, tokens, cost per call." },
  "/logs": { title: "Logs", description: "Terminal-style log viewer with filters." },
  "/api-keys": { title: "API Keys", description: "Manage API keys for external access." },
  "/security": { title: "Security", description: "DM pairing, sandbox, ethics audit logs." },
  "/backup": { title: "Backup & Restore", description: "Backup database, import/export agent configs." },
  "/doctor": { title: "Doctor", description: "15+ health checks with auto-repair capabilities." },
  "/heartbeat": { title: "Heartbeat", description: "System heartbeat monitoring — uptime, response time, errors." },
};

export default function Placeholder() {
  const [location] = useLocation();
  const info = PAGE_INFO[location] ?? { title: location.replace("/", ""), description: "This page is coming soon." };

  return (
    <div className="p-7 flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Construction size={28} className="text-indigo-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{info.title}</h1>
        <p className="text-sm text-gray-400 mb-6">{info.description}</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-xl">
          Coming in Phase 2
        </div>
      </div>
    </div>
  );
}
