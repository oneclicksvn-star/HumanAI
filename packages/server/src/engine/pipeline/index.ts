import { db } from "@humancore/db";
import { agents } from "@humancore/db/schema";
import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { getActiveModel } from "../providers";
import { buildSystemPrompt, detectMoodFromContent } from "../prompts";
import { executeTool } from "../tools";
import { createQuickMemory, recallForContext } from "../memory";

// ─── 6-Stage Agent Pipeline ──────────────────────────────────────────────────
//
// 1. PERCEPTION  — Parse input, detect intent, extract context
// 2. COGNITION   — Think (System 1 fast / System 2 deep), plan response
// 3. DECISION    — Decide action: respond, use tool, delegate, ask clarification
// 4. ACTION      — Execute: generate text, call tools, spawn sub-agents
// 5. OBSERVATION — Observe results, check quality, self-evaluate
// 6. LEARNING    — Store memory, update skills, evolve personality

export interface PipelineInput {
  agentId: number;
  sessionId: number;
  userMessage: string;
}

export interface PipelineStage {
  name: string;
  status: "pending" | "running" | "completed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  output?: unknown;
  durationMs?: number;
}

export interface PipelineResult {
  agentId: number;
  sessionId: number;
  response: string;
  stages: PipelineStage[];
  toolCalls: Array<{ tool: string; result: string; success: boolean }>;
  moodShift?: { from: string; to: string };
  memoryCreated: boolean;
  totalDurationMs: number;
}

// ─── Stage 1: PERCEPTION ─────────────────────────────────────────────────────

interface PerceptionOutput {
  intent: "question" | "command" | "conversation" | "creative" | "technical" | "emotional";
  complexity: "simple" | "moderate" | "complex";
  entities: string[];
  mood: string | null;
  requiresTool: boolean;
  toolHint?: string;
}

function runPerception(userMessage: string): PerceptionOutput {
  const msg = userMessage.toLowerCase();

  // Intent detection
  let intent: PerceptionOutput["intent"] = "conversation";
  if (msg.includes("?") || msg.startsWith("what") || msg.startsWith("how") || msg.startsWith("why")) intent = "question";
  else if (msg.startsWith("/") || msg.includes("execute") || msg.includes("run ") || msg.includes("create ")) intent = "command";
  else if (msg.includes("code") || msg.includes("function") || msg.includes("bug") || msg.includes("error")) intent = "technical";
  else if (msg.includes("write") || msg.includes("story") || msg.includes("poem") || msg.includes("imagine")) intent = "creative";
  else if (msg.includes("feel") || msg.includes("worried") || msg.includes("happy") || msg.includes("sad")) intent = "emotional";

  // Complexity
  let complexity: PerceptionOutput["complexity"] = "simple";
  if (userMessage.length > 200 || userMessage.includes("\n")) complexity = "moderate";
  if (userMessage.length > 500 || msg.includes("step by step") || msg.includes("analyze")) complexity = "complex";

  // Tool detection
  let requiresTool = false;
  let toolHint: string | undefined;
  if (msg.includes("search") || msg.includes("look up") || msg.includes("find ")) { requiresTool = true; toolHint = "web_search"; }
  if (msg.includes("fetch") || msg.includes("get url") || msg.includes("http")) { requiresTool = true; toolHint = "web_fetch"; }
  if (msg.includes("run ") || msg.includes("execute") || msg.includes("$ ")) { requiresTool = true; toolHint = "shell_exec"; }
  if (msg.includes("read file") || msg.includes("open file")) { requiresTool = true; toolHint = "file_read"; }
  if (msg.includes("write file") || msg.includes("save to")) { requiresTool = true; toolHint = "file_write"; }
  if (msg.includes("calculate") || msg.includes("math") || /\d+\s*[+\-*/]\s*\d+/.test(msg)) { requiresTool = true; toolHint = "math_eval"; }

  // Entity extraction (simple NER)
  const entities: string[] = [];
  const capWords = userMessage.match(/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g) || [];
  entities.push(...capWords.filter(w => w.length > 2).slice(0, 5));

  // Mood detection
  const mood = detectMoodFromContent(userMessage);

  return { intent, complexity, entities, mood, requiresTool, toolHint };
}

// ─── Stage 2: COGNITION ──────────────────────────────────────────────────────

interface CognitionOutput {
  thinkingMode: "system1" | "system2";
  plan: string[];
  contextMemories: Array<{ title: string; summary: string }>;
}

async function runCognition(
  agentId: number,
  perception: PerceptionOutput,
  userMessage: string
): Promise<CognitionOutput> {
  // System 1 (fast) vs System 2 (deep) thinking
  const thinkingMode = perception.complexity === "complex" || perception.intent === "technical"
    ? "system2" : "system1";

  // Recall relevant memories
  const contextMemories = await recallForContext(agentId, userMessage, thinkingMode === "system2" ? 7 : 3);

  // Plan actions
  const plan: string[] = [];
  if (perception.requiresTool) plan.push(`use_tool:${perception.toolHint}`);
  if (perception.intent === "emotional") plan.push("empathize", "validate_feelings");
  if (perception.intent === "question") plan.push("research", "answer_clearly");
  if (perception.intent === "technical") plan.push("analyze_problem", "provide_solution");
  if (perception.intent === "creative") plan.push("generate_creative_content");
  plan.push("respond");

  return { thinkingMode, plan, contextMemories };
}

// ─── Stage 3: DECISION ───────────────────────────────────────────────────────

interface DecisionOutput {
  action: "respond" | "use_tool" | "delegate" | "clarify";
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  delegateTo?: number;
  responseStrategy: "direct" | "step_by_step" | "creative" | "empathetic";
}

function runDecision(
  perception: PerceptionOutput,
  cognition: CognitionOutput
): DecisionOutput {
  const decision: DecisionOutput = {
    action: "respond",
    responseStrategy: "direct",
  };

  // Decide action
  if (perception.requiresTool && perception.toolHint) {
    decision.action = "use_tool";
    decision.toolName = perception.toolHint;
  }

  // Response strategy
  if (perception.intent === "emotional") decision.responseStrategy = "empathetic";
  else if (perception.intent === "creative") decision.responseStrategy = "creative";
  else if (perception.complexity === "complex") decision.responseStrategy = "step_by_step";

  return decision;
}

// ─── Stage 4: ACTION ─────────────────────────────────────────────────────────

interface ActionOutput {
  response: string;
  toolResults: Array<{ tool: string; result: string; success: boolean }>;
}

async function runAction(
  agentId: number,
  sessionId: number,
  userMessage: string,
  decision: DecisionOutput,
  cognition: CognitionOutput
): Promise<ActionOutput> {
  const toolResults: Array<{ tool: string; result: string; success: boolean }> = [];

  // Execute tool if needed
  if (decision.action === "use_tool" && decision.toolName) {
    // Extract tool args from message
    const args = extractToolArgs(userMessage, decision.toolName);
    const result = await executeTool({
      toolName: decision.toolName,
      args,
      agentId,
      sessionId,
    });

    toolResults.push({
      tool: decision.toolName,
      result: result.output || result.error || "",
      success: result.success,
    });
  }

  // Generate response
  const model = await getActiveModel();
  if (!model) {
    // Mock response
    const response = generateMockResponse(userMessage, decision, toolResults);
    return { response, toolResults };
  }

  const systemPrompt = await buildSystemPrompt(agentId);

  // Build context with memories and tool results
  let contextAddition = "";
  if (cognition.contextMemories.length > 0) {
    contextAddition += "\n\n[Recalled Memories]\n" +
      cognition.contextMemories.map(m => `- ${m.title}: ${m.summary}`).join("\n");
  }
  if (toolResults.length > 0) {
    contextAddition += "\n\n[Tool Results]\n" +
      toolResults.map(t => `${t.tool}: ${t.success ? t.result : `Error: ${t.result}`}`).join("\n");
  }

  const { text } = await generateText({
    model: model.model,
    system: systemPrompt + contextAddition,
    messages: [{ role: "user", content: userMessage }],
    temperature: decision.responseStrategy === "creative" ? 0.9 : decision.responseStrategy === "empathetic" ? 0.7 : 0.5,
    maxTokens: 2048,
  });

  return { response: text, toolResults };
}

// ─── Stage 5: OBSERVATION ────────────────────────────────────────────────────

interface ObservationOutput {
  responseQuality: "good" | "adequate" | "poor";
  wordCount: number;
  containsCode: boolean;
  answersQuestion: boolean;
}

function runObservation(response: string, perception: PerceptionOutput): ObservationOutput {
  const wordCount = response.split(/\s+/).length;
  const containsCode = response.includes("```") || response.includes("function ") || response.includes("const ");
  const answersQuestion = perception.intent === "question" ? response.includes("?") || wordCount > 20 : true;

  let responseQuality: ObservationOutput["responseQuality"] = "adequate";
  if (wordCount > 50 && answersQuestion) responseQuality = "good";
  if (wordCount < 10 && perception.complexity !== "simple") responseQuality = "poor";

  return { responseQuality, wordCount, containsCode, answersQuestion };
}

// ─── Stage 6: LEARNING ───────────────────────────────────────────────────────

interface LearningOutput {
  memoryCreated: boolean;
  moodUpdated: boolean;
  skillPracticed?: string;
}

async function runLearning(
  agentId: number,
  sessionId: number,
  userMessage: string,
  response: string,
  perception: PerceptionOutput,
  observation: ObservationOutput
): Promise<LearningOutput> {
  const result: LearningOutput = { memoryCreated: false, moodUpdated: false };

  // Create memory if conversation was meaningful
  const memResult = await createQuickMemory(
    agentId,
    sessionId,
    userMessage,
    response,
    perception.mood ?? "neutral"
  );
  result.memoryCreated = memResult.created;

  // Update agent mood
  if (perception.mood) {
    const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
    if (agent && agent.mood !== perception.mood) {
      await db.update(agents).set({
        mood: perception.mood,
        moodLabel: perception.mood.charAt(0).toUpperCase() + perception.mood.slice(1),
      }).where(eq(agents.id, agentId));
      result.moodUpdated = true;
    }
  }

  // Identify practiced skill
  if (perception.intent === "technical") result.skillPracticed = "problem-solving";
  else if (perception.intent === "creative") result.skillPracticed = "creative-writing";
  else if (perception.intent === "emotional") result.skillPracticed = "empathy";

  return result;
}

// ─── Full Pipeline Execution ─────────────────────────────────────────────────

export async function runAgentPipeline(input: PipelineInput): Promise<PipelineResult> {
  const totalStart = Date.now();
  const stages: PipelineStage[] = [];

  // Stage 1: Perception
  let stageStart = Date.now();
  stages.push({ name: "perception", status: "running", startedAt: new Date().toISOString() });
  const perception = runPerception(input.userMessage);
  stages[0].status = "completed";
  stages[0].completedAt = new Date().toISOString();
  stages[0].durationMs = Date.now() - stageStart;
  stages[0].output = perception;

  // Stage 2: Cognition
  stageStart = Date.now();
  stages.push({ name: "cognition", status: "running", startedAt: new Date().toISOString() });
  const cognition = await runCognition(input.agentId, perception, input.userMessage);
  stages[1].status = "completed";
  stages[1].completedAt = new Date().toISOString();
  stages[1].durationMs = Date.now() - stageStart;
  stages[1].output = { thinkingMode: cognition.thinkingMode, planSteps: cognition.plan.length, memoriesRecalled: cognition.contextMemories.length };

  // Stage 3: Decision
  stageStart = Date.now();
  stages.push({ name: "decision", status: "running", startedAt: new Date().toISOString() });
  const decision = runDecision(perception, cognition);
  stages[2].status = "completed";
  stages[2].completedAt = new Date().toISOString();
  stages[2].durationMs = Date.now() - stageStart;
  stages[2].output = decision;

  // Stage 4: Action
  stageStart = Date.now();
  stages.push({ name: "action", status: "running", startedAt: new Date().toISOString() });
  const action = await runAction(input.agentId, input.sessionId, input.userMessage, decision, cognition);
  stages[3].status = "completed";
  stages[3].completedAt = new Date().toISOString();
  stages[3].durationMs = Date.now() - stageStart;
  stages[3].output = { responseLength: action.response.length, toolsCalled: action.toolResults.length };

  // Stage 5: Observation
  stageStart = Date.now();
  stages.push({ name: "observation", status: "running", startedAt: new Date().toISOString() });
  const observation = runObservation(action.response, perception);
  stages[4].status = "completed";
  stages[4].completedAt = new Date().toISOString();
  stages[4].durationMs = Date.now() - stageStart;
  stages[4].output = observation;

  // Stage 6: Learning
  stageStart = Date.now();
  stages.push({ name: "learning", status: "running", startedAt: new Date().toISOString() });
  const learning = await runLearning(input.agentId, input.sessionId, input.userMessage, action.response, perception, observation);
  stages[5].status = "completed";
  stages[5].completedAt = new Date().toISOString();
  stages[5].durationMs = Date.now() - stageStart;
  stages[5].output = learning;

  // Detect mood shift
  const [agent] = await db.select().from(agents).where(eq(agents.id, input.agentId));
  const moodShift = learning.moodUpdated && perception.mood
    ? { from: agent?.mood ?? "neutral", to: perception.mood }
    : undefined;

  return {
    agentId: input.agentId,
    sessionId: input.sessionId,
    response: action.response,
    stages,
    toolCalls: action.toolResults,
    moodShift,
    memoryCreated: learning.memoryCreated,
    totalDurationMs: Date.now() - totalStart,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractToolArgs(message: string, toolName: string): Record<string, unknown> {
  switch (toolName) {
    case "web_search": return { query: message.replace(/search|look up|find/gi, "").trim() };
    case "web_fetch": {
      const urlMatch = message.match(/https?:\/\/\S+/);
      return { url: urlMatch?.[0] ?? "" };
    }
    case "shell_exec": {
      const cmdMatch = message.match(/\$\s*(.+)/) || message.match(/run\s+(.+)/i) || message.match(/execute\s+(.+)/i);
      return { command: cmdMatch?.[1] ?? message };
    }
    case "file_read": {
      const pathMatch = message.match(/\/[\w./\-]+/);
      return { path: pathMatch?.[0] ?? "" };
    }
    case "math_eval": {
      const exprMatch = message.match(/[\d+\-*/().%\s^]+/);
      return { expression: exprMatch?.[0]?.trim() ?? "" };
    }
    default: return {};
  }
}

function generateMockResponse(
  userMessage: string,
  decision: DecisionOutput,
  toolResults: Array<{ tool: string; result: string; success: boolean }>
): string {
  if (toolResults.length > 0) {
    const tr = toolResults[0];
    if (tr.success) return `Here's what I found:\n\n${tr.result}`;
    return `I tried using ${tr.tool} but encountered an issue: ${tr.result}. Let me try a different approach.`;
  }

  switch (decision.responseStrategy) {
    case "empathetic": return `I understand how you feel. ${userMessage.length > 50 ? "That sounds like a lot to process." : "I'm here to listen."} Would you like to talk more about it?`;
    case "creative": return `Here's what I came up with:\n\n[Creative response would be generated by LLM — configure a provider in Settings > Providers to enable real AI responses]`;
    case "step_by_step": return `Let me break this down:\n\n1. First, I'll analyze the problem\n2. Then, I'll research possible solutions\n3. Finally, I'll provide my recommendation\n\n[Detailed response would be generated by LLM — configure a provider to enable]`;
    default: return `[Response would be generated by LLM — configure a provider in Settings > Providers to enable real AI responses]`;
  }
}
