import { Hono } from "hono";
import { db } from "@humancore/db";
import { channels } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const channelsRoutes = new Hono()
  .get("/channels", async (c) => {
    const rows = await db.select().from(channels);
    return c.json(rows);
  })
  .post("/channels", async (c) => {
    const body = await c.req.json();
    const [row] = await db.insert(channels).values(body).returning();
    return c.json(row, 201);
  })
  .patch("/channels/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const [row] = await db.update(channels).set(body).where(eq(channels.id, id)).returning();
    return c.json(row);
  })
  .delete("/channels/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.delete(channels).where(eq(channels.id, id));
    return c.body(null, 204);
  });
