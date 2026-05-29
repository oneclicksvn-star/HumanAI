import { Hono } from "hono";
import { db } from "@humancore/db";
import { vaultDocs } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const vaultRoutes = new Hono()
  .get("/vault", async (c) => {
    const rows = await db.select().from(vaultDocs);
    return c.json(rows);
  })
  .get("/vault/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const [row] = await db.select().from(vaultDocs).where(eq(vaultDocs.id, id));
    return row ? c.json(row) : c.json({ error: "Not found" }, 404);
  })
  .post("/vault", async (c) => {
    const body = await c.req.json();
    body.size = body.content?.length ?? 0;
    const [row] = await db.insert(vaultDocs).values(body).returning();
    return c.json(row, 201);
  })
  .patch("/vault/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    if (body.content) body.size = body.content.length;
    body.updatedAt = new Date().toISOString();
    const [row] = await db.update(vaultDocs).set(body).where(eq(vaultDocs.id, id)).returning();
    return c.json(row);
  })
  .delete("/vault/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.delete(vaultDocs).where(eq(vaultDocs.id, id));
    return c.body(null, 204);
  });
