import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { agentsRoutes } from "./routes/agents";
import { sessionsRoutes } from "./routes/sessions";
import { messagesRoutes } from "./routes/messages";
import { teamsRoutes } from "./routes/teams";
import { tasksRoutes } from "./routes/tasks";
import { memoryRoutes } from "./routes/memory";
import { dashboardRoutes } from "./routes/dashboard";
import { providersRoutes } from "./routes/providers";
import { settingsRoutes } from "./routes/settings";
import { channelsRoutes } from "./routes/channels";
import { toolsRoutes } from "./routes/tools";
import { mcpRoutes } from "./routes/mcp";
import { hooksRoutes } from "./routes/hooks";
import { cronRoutes } from "./routes/cron";
import { vaultRoutes } from "./routes/vault";
import { systemRoutes } from "./routes/system";
import { chatRoutes } from "./routes/chat";

const app = new Hono();

app.use("*", cors());
app.use("*", logger());

// Health check
app.get("/api/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

// API routes
app.route("/api", agentsRoutes);
app.route("/api", sessionsRoutes);
app.route("/api", messagesRoutes);
app.route("/api", teamsRoutes);
app.route("/api", tasksRoutes);
app.route("/api", memoryRoutes);
app.route("/api", dashboardRoutes);
app.route("/api", providersRoutes);
app.route("/api", settingsRoutes);
app.route("/api", channelsRoutes);
app.route("/api", toolsRoutes);
app.route("/api", mcpRoutes);
app.route("/api", hooksRoutes);
app.route("/api", cronRoutes);
app.route("/api", vaultRoutes);
app.route("/api", systemRoutes);
app.route("/api", chatRoutes);

const port = Number(process.env.PORT ?? 3001);

console.log(`🧠 HumanCore AI Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
