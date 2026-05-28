import { Hono } from "hono";
import { db } from "@humancore/db";
import { settings } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const settingsRoutes = new Hono();

settingsRoutes.get("/settings", async (c) => {
  const rows = await db.select().from(settings);
  return c.json(rows);
});

settingsRoutes.get("/settings/:key", async (c) => {
  const key = c.req.param("key");
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  if (!row) return c.json({ error: "Setting not found" }, 404);
  return c.json(row);
});

settingsRoutes.put("/settings/:key", async (c) => {
  const key = c.req.param("key");
  const body = await c.req.json();
  const [existing] = await db.select().from(settings).where(eq(settings.key, key));
  let row;
  if (existing) {
    [row] = await db.update(settings).set({ value: body.value }).where(eq(settings.key, key)).returning();
  } else {
    [row] = await db.insert(settings).values({ key, value: body.value, category: body.category ?? "general" }).returning();
  }
  return c.json(row);
});
