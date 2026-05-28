import { Hono } from "hono";
import { db } from "@humancore/db";
import { tasks, agents } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const tasksRoutes = new Hono();

tasksRoutes.get("/tasks", async (c) => {
  const teamId = c.req.query("teamId");
  const rows = teamId
    ? await db.select().from(tasks).where(eq(tasks.teamId, Number(teamId)))
    : await db.select().from(tasks);

  const result = await Promise.all(rows.map(async (t) => {
    let assignee = null;
    if (t.assignedAgentId) {
      const [a] = await db.select().from(agents).where(eq(agents.id, t.assignedAgentId));
      assignee = a ?? null;
    }
    return { ...t, assignee };
  }));
  return c.json(result);
});

tasksRoutes.post("/tasks", async (c) => {
  const body = await c.req.json();
  const [task] = await db.insert(tasks).values({
    teamId: body.teamId,
    title: body.title,
    description: body.description,
    status: body.status ?? "todo",
    priority: body.priority ?? "medium",
    assignedAgentId: body.assignedAgentId,
  }).returning();
  return c.json(task, 201);
});

tasksRoutes.patch("/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [task] = await db.update(tasks).set(body).where(eq(tasks.id, id)).returning();
  if (!task) return c.json({ error: "Task not found" }, 404);
  return c.json(task);
});

tasksRoutes.delete("/tasks/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(tasks).where(eq(tasks.id, id));
  return c.body(null, 204);
});
