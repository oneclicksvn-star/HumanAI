import { Hono } from "hono";
import {
  runConsolidation,
  runConsolidationForAll,
  getConsolidationHistory,
  hybridSearch,
  boostOnRecall,
  applyGlobalDecay,
} from "../engine/memory";

export const consolidationRoutes = new Hono();

// ─── Trigger consolidation for a specific agent ──────────────────────────────

consolidationRoutes.post("/consolidation/:agentId/run", async (c) => {
  const agentId = Number(c.req.param("agentId"));
  const body = await c.req.json().catch(() => ({}));
  const type = (body as { type?: string }).type ?? "full";

  if (!["episodic", "semantic", "dreaming", "full"].includes(type)) {
    return c.json({ error: "Invalid type. Must be: episodic, semantic, dreaming, or full" }, 400);
  }

  const result = await runConsolidation(agentId, type as "episodic" | "semantic" | "dreaming" | "full");
  return c.json(result);
});

// ─── Trigger consolidation for all agents ────────────────────────────────────

consolidationRoutes.post("/consolidation/run-all", async (c) => {
  const results = await runConsolidationForAll();
  return c.json({
    agentsProcessed: results.length,
    results,
  });
});

// ─── Get consolidation history ───────────────────────────────────────────────

consolidationRoutes.get("/consolidation/:agentId/history", async (c) => {
  const agentId = Number(c.req.param("agentId"));
  const limit = Number(c.req.query("limit") ?? 10);
  const history = await getConsolidationHistory(agentId, limit);
  return c.json(history);
});

// ─── Hybrid memory search ────────────────────────────────────────────────────

consolidationRoutes.get("/memory/search", async (c) => {
  const agentId = Number(c.req.query("agentId"));
  const query = c.req.query("q") ?? "";
  const type = c.req.query("type") as "episodic" | "semantic" | "procedural" | undefined;
  const minImportance = Number(c.req.query("minImportance") ?? 0);
  const limit = Number(c.req.query("limit") ?? 10);

  if (!agentId) {
    return c.json({ error: "agentId is required" }, 400);
  }

  const results = await hybridSearch({
    agentId,
    query,
    type,
    minImportance,
    limit,
    boostOnRecall: query.trim().length > 0,
  });

  return c.json({
    query,
    resultCount: results.length,
    results,
  });
});

// ─── Recall boost (manual) ───────────────────────────────────────────────────

consolidationRoutes.post("/memory/:id/recall", async (c) => {
  const id = Number(c.req.param("id"));
  const result = await boostOnRecall(id);
  return c.json(result);
});

// ─── Apply decay (manual trigger) ────────────────────────────────────────────

consolidationRoutes.post("/memory/:agentId/decay", async (c) => {
  const agentId = Number(c.req.param("agentId"));
  const result = await applyGlobalDecay(agentId);
  return c.json(result);
});
