import { Hono } from "hono";
import { db } from "@humancore/db";
import { mcpServers } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const mcpRoutes = new Hono()
  .get("/mcp-servers", async (c) => {
    const rows = await db.select().from(mcpServers);
    return c.json(rows);
  })
  .post("/mcp-servers", async (c) => {
    const body = await c.req.json();
    const [row] = await db.insert(mcpServers).values(body).returning();
    return c.json(row, 201);
  })
  .patch("/mcp-servers/:id", async (c) => {
    const id = Number(c.req.param("id"));
    const body = await c.req.json();
    const [row] = await db.update(mcpServers).set(body).where(eq(mcpServers.id, id)).returning();
    return c.json(row);
  })
  .delete("/mcp-servers/:id", async (c) => {
    const id = Number(c.req.param("id"));
    await db.delete(mcpServers).where(eq(mcpServers.id, id));
    return c.body(null, 204);
  });
