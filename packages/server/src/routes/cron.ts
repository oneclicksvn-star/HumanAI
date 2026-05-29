import { Hono } from "hono";
import { db } from "@humancore/db";
import { cronJobs } from "@humancore/db/schema";
import { eq } from "drizzle-orm";
import { startScheduler, stopScheduler, isSchedulerRunning, processDueJobs } from "../engine/scheduler";

export const cronRoutes = new Hono()
  .get("/cron-jobs", async (c) => {
    const rows = await db.select().from(cronJobs);
    return c.json(rows);
  })
  .post("/cron-jobs", async (c) => {
    const body = await c.req.json();
    const [row] = await db.insert(cronJobs).values({
      ...body,
      nextRunAt: body.nextRunAt ?? new Date().toISOString(),
    }).returning();
    return c.json(row, 201);
  })
  .patch("/cron-jobs/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const [row] = await db.update(cronJobs).set(body).where(eq(cronJobs.id, id)).returning();
    return c.json(row);
  })
  .delete("/cron-jobs/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.delete(cronJobs).where(eq(cronJobs.id, id));
    return c.body(null, 204);
  })

  // Scheduler control
  .post("/cron-jobs/scheduler/start", async (c) => {
    startScheduler(60000);
    return c.json({ running: true, message: "Scheduler started (60s interval)" });
  })
  .post("/cron-jobs/scheduler/stop", async (c) => {
    stopScheduler();
    return c.json({ running: false, message: "Scheduler stopped" });
  })
  .get("/cron-jobs/scheduler/status", async (c) => {
    return c.json({ running: isSchedulerRunning() });
  })
  .post("/cron-jobs/scheduler/run-now", async (c) => {
    await processDueJobs();
    return c.json({ message: "Processed due jobs" });
  });
