import { Hono } from "hono";
import { db } from "@humancore/db";
import { teams } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

export const teamsRoutes = new Hono();

teamsRoutes.get("/teams", async (c) => {
  const rows = await db.select().from(teams);
  return c.json(rows);
});

teamsRoutes.get("/teams/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const [team] = await db.select().from(teams).where(eq(teams.id, id));
  if (!team) return c.json({ error: "Team not found" }, 404);
  return c.json(team);
});

teamsRoutes.post("/teams", async (c) => {
  const body = await c.req.json();
  const [team] = await db.insert(teams).values({
    name: body.name,
    description: body.description,
    leadAgentId: body.leadAgentId,
    agentIds: body.agentIds ?? [],
    values: body.values ?? [],
    communicationStyle: body.communicationStyle ?? "collaborative",
  }).returning();
  return c.json(team, 201);
});

teamsRoutes.patch("/teams/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json();
  const [team] = await db.update(teams).set(body).where(eq(teams.id, id)).returning();
  if (!team) return c.json({ error: "Team not found" }, 404);
  return c.json(team);
});

teamsRoutes.delete("/teams/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await db.delete(teams).where(eq(teams.id, id));
  return c.body(null, 204);
});
