import { Hono } from "hono";
import {
  getAgentMetrics,
  generateSuggestions,
  evolveAgent,
  createCommitment,
  getCommitments,
  getActiveCommitments,
  completeCommitment,
  failCommitment,
  checkExpiredCommitments,
  LIFECYCLE_STAGES,
  LIFECYCLE_THRESHOLDS,
} from "../engine/evolution";

export const evolutionRoutes = new Hono()
  // Agent metrics
  .get("/evolution/:agentId/metrics", async (c) => {
    const agentId = Number(c.req.param("agentId"));
    const metrics = await getAgentMetrics(agentId);
    return c.json(metrics);
  })

  // Suggestions
  .get("/evolution/:agentId/suggestions", async (c) => {
    const agentId = Number(c.req.param("agentId"));
    const suggestions = await generateSuggestions(agentId);
    return c.json(suggestions);
  })

  // Evolve (lifecycle progression)
  .post("/evolution/:agentId/evolve", async (c) => {
    const agentId = Number(c.req.param("agentId"));
    const result = await evolveAgent(agentId);
    return c.json(result);
  })

  // Lifecycle info
  .get("/evolution/lifecycle", async (c) => {
    return c.json({
      stages: LIFECYCLE_STAGES,
      thresholds: LIFECYCLE_THRESHOLDS,
    });
  })

  // ─── Commitments ─────────────────────────────────────────────────────────
  .get("/commitments/:agentId", async (c) => {
    const agentId = Number(c.req.param("agentId"));
    const all = c.req.query("active") === "true"
      ? getActiveCommitments(agentId)
      : getCommitments(agentId);
    return c.json(all);
  })
  .post("/commitments/:agentId", async (c) => {
    const agentId = Number(c.req.param("agentId"));
    const body = await c.req.json() as {
      type: "promise" | "goal" | "check_in" | "deadline" | "open_loop";
      title: string;
      description: string;
      deadline?: string;
      reminderSchedule?: string;
    };
    const commitment = createCommitment({ agentId, ...body });
    return c.json(commitment, 201);
  })
  .post("/commitments/:agentId/:commitId/complete", async (c) => {
    const commitId = c.req.param("commitId");
    const ok = completeCommitment(commitId);
    if (!ok) return c.json({ error: "Commitment not found" }, 404);
    return c.json({ completed: true });
  })
  .post("/commitments/:agentId/:commitId/fail", async (c) => {
    const commitId = c.req.param("commitId");
    const ok = failCommitment(commitId);
    if (!ok) return c.json({ error: "Commitment not found" }, 404);
    return c.json({ failed: true });
  })
  .post("/commitments/check-expired", async (c) => {
    const expired = checkExpiredCommitments();
    return c.json({ expired: expired.length, items: expired });
  });
