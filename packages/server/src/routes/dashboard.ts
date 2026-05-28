import { Hono } from "hono";
import { db } from "@humancore/db";
import { agents, sessions, tasks, memoryEntries, activityLog, dreams } from "@humancore/db/schema";
import { count, eq, desc } from "drizzle-orm";

export const dashboardRoutes = new Hono();

dashboardRoutes.get("/dashboard/stats", async (c) => {
  const [{ total: totalAgents }] = await db.select({ total: count() }).from(agents);
  const [{ total: totalSessions }] = await db.select({ total: count() }).from(sessions);
  const [{ total: totalTasks }] = await db.select({ total: count() }).from(tasks);
  const [{ total: totalMemories }] = await db.select({ total: count() }).from(memoryEntries);

  return c.json({
    activeAgents: totalAgents,
    sessionsToday: totalSessions,
    tokensToday: 284000,
    openTasks: totalTasks,
    totalMemories,
  });
});

dashboardRoutes.get("/dashboard/activity", async (c) => {
  const rows = await db.select().from(activityLog).orderBy(desc(activityLog.createdAt)).limit(20);
  return c.json(rows);
});

dashboardRoutes.get("/dashboard/dreams", async (c) => {
  const rows = await db.select().from(dreams).orderBy(desc(dreams.consolidatedAt)).limit(6);
  const result = await Promise.all(rows.map(async (d) => {
    const [agent] = await db.select().from(agents).where(eq(agents.id, d.agentId));
    return { ...d, agent };
  }));
  return c.json(result);
});
