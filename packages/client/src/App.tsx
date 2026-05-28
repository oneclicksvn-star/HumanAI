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
          <Route path="/company" component={Placeholder} />
          <Route path="/sessions" component={Sessions} />
          <Route path="/channels" component={Placeholder} />
          <Route path="/skills" component={Placeholder} />
          <Route path="/tools" component={Placeholder} />
          <Route path="/mcp-servers" component={Placeholder} />
          <Route path="/hooks" component={Placeholder} />
          <Route path="/cron-jobs" component={Placeholder} />
          <Route path="/memory" component={Memory} />
          <Route path="/vault" component={Placeholder} />
          <Route path="/activity" component={Placeholder} />
          <Route path="/usage" component={Placeholder} />
          <Route path="/traces" component={Placeholder} />
          <Route path="/logs" component={Placeholder} />
          <Route path="/providers" component={Providers} />
          <Route path="/api-keys" component={Placeholder} />
          <Route path="/security" component={Placeholder} />
          <Route path="/backup" component={Placeholder} />
          <Route path="/doctor" component={Placeholder} />
          <Route path="/heartbeat" component={Placeholder} />
          <Route path="/settings" component={SettingsPage} />
          <Route component={Placeholder} />
        </Switch>
      </main>
    </div>
  );
}
