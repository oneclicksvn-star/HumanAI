import { Hono } from "hono";
import { db } from "@humancore/db";
import { hooks } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const hooksRoutes = new Hono()
  .get("/hooks", async (c) => {
    const rows = await db.select().from(hooks);
    return c.json(rows);
  })
  .post("/hooks", async (c) => {
    const body = await c.req.json();
    const [row] = await db.insert(hooks).values(body).returning();
    return c.json(row, 201);
  })
  .patch("/hooks/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const [row] = await db.update(hooks).set(body).where(eq(hooks.id, id)).returning();
    return c.json(row);
  })
  .delete("/hooks/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.delete(hooks).where(eq(hooks.id, id));
    return c.body(null, 204);
  });
