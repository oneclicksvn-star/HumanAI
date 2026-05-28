import { Hono } from "hono";
import { runAgentPipeline } from "../engine/pipeline";

export const pipelineRoutes = new Hono();

// Run the full 6-stage agent pipeline (non-streaming)
pipelineRoutes.post("/pipeline/run", async (c) => {
  const body = await c.req.json() as { agentId: number; sessionId: number; message: string };
  if (!body.agentId || !body.sessionId || !body.message) {
    return c.json({ error: "agentId, sessionId, and message are required" }, 400);
  }

  const result = await runAgentPipeline({
    agentId: body.agentId,
    sessionId: body.sessionId,
    userMessage: body.message,
  });

  return c.json(result);
});

// Get pipeline stage info (for UI debugging)
pipelineRoutes.get("/pipeline/stages", async (c) => {
  return c.json({
    stages: [
      { name: "perception", description: "Parse input, detect intent, extract context" },
      { name: "cognition", description: "Think (System 1 fast / System 2 deep), plan response" },
      { name: "decision", description: "Decide action: respond, use tool, delegate, clarify" },
      { name: "action", description: "Execute: generate text, call tools, spawn sub-agents" },
      { name: "observation", description: "Observe results, check quality, self-evaluate" },
      { name: "learning", description: "Store memory, update skills, evolve personality" },
    ],
  });
});
