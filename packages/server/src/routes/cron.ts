import { Hono } from "hono";
import { db } from "@humancore/db";
import { cronJobs } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const cronRoutes = new Hono()
  .get("/cron-jobs", async (c) => {
    const rows = await db.select().from(cronJobs);
    return c.json(rows);
  })
  .post("/cron-jobs", async (c) => {
    const body = await c.req.json();
    const [row] = await db.insert(cronJobs).values(body).returning();
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
  });
