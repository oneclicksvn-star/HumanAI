import { Hono } from "hono";
import { db } from "@humancore/db";
import { providers } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const providersRoutes = new Hono();

providersRoutes.get("/providers", async (c) => {
  const rows = await db.select().from(providers);
  // Mask API keys
  return c.json(rows.map(p => ({
    ...p,
    apiKey: p.apiKey ? "••••" + p.apiKey.slice(-4) : null,
  })));
});

providersRoutes.post("/providers", async (c) => {
  const body = await c.req.json();
  const [provider] = await db.insert(providers).values({
    name: body.name,
    type: body.type,
    apiKey: body.apiKey,
    baseUrl: body.baseUrl,
    models: body.models ?? [],
  }).returning();
  return c.json({ ...provider, apiKey: provider.apiKey ? "••••" + provider.apiKey.slice(-4) : null }, 201);
});

providersRoutes.patch("/providers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [provider] = await db.update(providers).set(body).where(eq(providers.id, id)).returning();
  if (!provider) return c.json({ error: "Provider not found" }, 404);
  return c.json({ ...provider, apiKey: provider.apiKey ? "••••" + provider.apiKey.slice(-4) : null });
});

providersRoutes.delete("/providers/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(providers).where(eq(providers.id, id));
  return c.body(null, 204);
});
