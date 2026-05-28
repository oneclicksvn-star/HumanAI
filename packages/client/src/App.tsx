import { Switch, Route, Redirect } from "wouter";
import { Sidebar } from "@/components/layout/Sidebar";
import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Agents from "@/pages/agents";
import Teams from "@/pages/teams";
import Sessions from "@/pages/sessions";
import Memory from "@/pages/memory";
import Providers from "@/pages/providers";
import SettingsPage from "@/pages/settings";
import Company from "@/pages/company";
import Skills from "@/pages/skills";
import ToolsPage from "@/pages/tools-page";
import Channels from "@/pages/channels";
import McpServers from "@/pages/mcp-servers";
import HooksPage from "@/pages/hooks-page";
import CronJobsPage from "@/pages/cron-jobs";
import Vault from "@/pages/vault";
import ActivityPage from "@/pages/activity";
import Usage from "@/pages/usage";
import Traces from "@/pages/traces";
import Logs from "@/pages/logs";
import ApiKeysPage from "@/pages/api-keys";
import Security from "@/pages/security";
import Backup from "@/pages/backup";
import Doctor from "@/pages/doctor";
import Heartbeat from "@/pages/heartbeat";
import Placeholder from "@/pages/placeholder";

export default function App() {
  return (
    <div className="flex min-h-screen bg-[#f7f8fc]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Switch>
          <Route path="/" component={() => <Redirect to="/dashboard" />} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/chat" component={Chat} />
          <Route path="/agents" component={Agents} />
          <Route path="/agents/:id" component={Agents} />
          <Route path="/teams" component={Teams} />
          <Route path="/company" component={Company} />
          <Route path="/sessions" component={Sessions} />
          <Route path="/channels" component={Channels} />
          <Route path="/skills" component={Skills} />
          <Route path="/tools" component={ToolsPage} />
          <Route path="/mcp-servers" component={McpServers} />
          <Route path="/hooks" component={HooksPage} />
          <Route path="/cron-jobs" component={CronJobsPage} />
          <Route path="/memory" component={Memory} />
          <Route path="/vault" component={Vault} />
          <Route path="/activity" component={ActivityPage} />
          <Route path="/usage" component={Usage} />
          <Route path="/traces" component={Traces} />
          <Route path="/logs" component={Logs} />
          <Route path="/providers" component={Providers} />
          <Route path="/api-keys" component={ApiKeysPage} />
          <Route path="/security" component={Security} />
          <Route path="/backup" component={Backup} />
          <Route path="/doctor" component={Doctor} />
          <Route path="/heartbeat" component={Heartbeat} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={Placeholder} />
        </Switch>
      </main>
    </div>
  );
}
