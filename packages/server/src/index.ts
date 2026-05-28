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

const port = Number(process.env.PORT ?? 3001);

console.log(`🧠 HumanCore AI Server running on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
