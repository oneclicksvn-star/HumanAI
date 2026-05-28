import { Hono } from "hono";
import { db } from "@humancore/db";
import { tools } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const toolsRoutes = new Hono()
  .get("/tools", async (c) => {
    const rows = await db.select().from(tools);
    return c.json(rows);
  })
  .post("/tools", async (c) => {
    const body = await c.req.json();
    const [row] = await db.insert(tools).values(body).returning();
    return c.json(row, 201);
  })
  .patch("/tools/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const [row] = await db.update(tools).set(body).where(eq(tools.id, id)).returning();
    return c.json(row);
  })
  .delete("/tools/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.delete(tools).where(eq(tools.id, id));
    return c.body(null, 204);
  });
