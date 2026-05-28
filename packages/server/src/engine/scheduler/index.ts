import { db } from "@humancore/db";
import { cronJobs, activityLog } from "@humancore/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { runConsolidation } from "../memory";

// ─── Scheduler Engine ────────────────────────────────────────────────────────
//
// Interval-based job runner that processes cron jobs.
// Jobs can be: consolidation, health_check, cleanup, custom
//
// Cron expressions supported (simplified):
// - "every 5m" = every 5 minutes
// - "every 1h" = every hour
// - "every 24h" = daily
// - "every 7d" = weekly

interface ScheduledJob {
  id: number;
  name: string;
  schedule: string;
  handler: string;
  agentId?: number;
  nextRunAt: Date;
  lastRunAt?: Date;
  config: Record<string, unknown>;
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// ─── Parse Schedule ──────────────────────────────────────────────────────────

function parseScheduleToMs(schedule: string): number {
  const match = schedule.match(/every\s+(\d+)\s*(m|min|h|hour|d|day|s|sec)/i);
  if (!match) return 3600000; // default 1 hour

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s": case "sec": return value * 1000;
    case "m": case "min": return value * 60 * 1000;
    case "h": case "hour": return value * 60 * 60 * 1000;
    case "d": case "day": return value * 24 * 60 * 60 * 1000;
    default: return 3600000;
  }
}

function getNextRunTime(schedule: string, lastRun?: Date): Date {
  const intervalMs = parseScheduleToMs(schedule);
  const base = lastRun ?? new Date();
  return new Date(base.getTime() + intervalMs);
}

// ─── Job Handlers ────────────────────────────────────────────────────────────

type JobHandler = (job: ScheduledJob) => Promise<{ success: boolean; output: string }>;

const JOB_HANDLERS: Record<string, JobHandler> = {
  memory_consolidation: async (job) => {
    const agentId = job.agentId ?? (job.config.agentId as number);
    if (!agentId) return { success: false, output: "No agentId specified" };
    const result = await runConsolidation(agentId, "full");
    return {
      success: result.status === "completed",
      output: `Memories: ${result.episodic.memoriesCreated}, Entities: ${result.semantic.entitiesExtracted}, Dreams: ${result.dreaming.dreamsGenerated}`,
    };
  },

  health_check: async () => {
    // Check DB connectivity + basic health
    try {
      await db.select().from(cronJobs).limit(1);
      return { success: true, output: "Database healthy, scheduler running" };
    } catch (err) {
      return { success: false, output: `Health check failed: ${err}` };
    }
  },

  cleanup_old_logs: async () => {
    // Clean logs older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.delete(activityLog).where(lte(activityLog.createdAt, thirtyDaysAgo));
    return { success: true, output: "Cleaned old activity logs (>30 days)" };
  },

  custom_script: async (job) => {
    const script = job.config.script as string;
    if (!script) return { success: false, output: "No script provided in config" };
    try {
      const proc = Bun.spawn(["bash", "-c", script], { timeout: 30000, stdout: "pipe", stderr: "pipe" });
      const stdout = await new Response(proc.stdout).text();
      const exitCode = await proc.exited;
      return { success: exitCode === 0, output: stdout.slice(0, 5000) };
    } catch (err) {
      return { success: false, output: String(err) };
    }
  },
};

// ─── Process Due Jobs ────────────────────────────────────────────────────────

async function processDueJobs(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const now = new Date().toISOString();
    const dueJobs = await db.select().from(cronJobs)
      .where(and(
        eq(cronJobs.isActive, true),
        lte(cronJobs.nextRunAt, now)
      ));

    for (const job of dueJobs) {
      const handler = JOB_HANDLERS[job.handler ?? job.type ?? "custom_script"];
      if (!handler) {
        await db.update(cronJobs).set({
          lastRunAt: now,
          lastStatus: "error",
          nextRunAt: getNextRunTime(job.schedule, new Date()).toISOString(),
          runCount: job.runCount + 1,
        }).where(eq(cronJobs.id, job.id));
        continue;
      }

      try {
        const scheduledJob: ScheduledJob = {
          id: job.id,
          name: job.name,
          schedule: job.schedule,
          handler: job.handler ?? job.type ?? "",
          agentId: job.agentId ?? undefined,
          nextRunAt: new Date(job.nextRunAt),
          lastRunAt: job.lastRunAt ? new Date(job.lastRunAt) : undefined,
          config: (job.config as Record<string, unknown>) ?? {},
        };

        const result = await handler(scheduledJob);

        await db.update(cronJobs).set({
          lastRunAt: now,
          lastStatus: result.success ? "success" : "error",
          lastOutput: result.output,
          nextRunAt: getNextRunTime(job.schedule, new Date()).toISOString(),
          runCount: job.runCount + 1,
        }).where(eq(cronJobs.id, job.id));

        await db.insert(activityLog).values({
          agentId: job.agentId ?? 1,
          type: "cron",
          summary: `Cron: ${job.name} — ${result.success ? "success" : "failed"}: ${result.output.slice(0, 100)}`,
        });
      } catch (err) {
        await db.update(cronJobs).set({
          lastRunAt: now,
          lastStatus: "error",
          lastOutput: String(err),
          nextRunAt: getNextRunTime(job.schedule, new Date()).toISOString(),
          runCount: job.runCount + 1,
        }).where(eq(cronJobs.id, job.id));
      }
    }
  } finally {
    isRunning = false;
  }
}

// ─── Scheduler Control ───────────────────────────────────────────────────────

export function startScheduler(intervalMs: number = 60000): void {
  if (schedulerInterval) return;
  console.log(`⏰ Scheduler started (check every ${intervalMs / 1000}s)`);
  schedulerInterval = setInterval(processDueJobs, intervalMs);
  // Run immediately on start
  processDueJobs();
}

export function stopScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("⏰ Scheduler stopped");
  }
}

export function isSchedulerRunning(): boolean {
  return schedulerInterval !== null;
}

export { processDueJobs, JOB_HANDLERS };
