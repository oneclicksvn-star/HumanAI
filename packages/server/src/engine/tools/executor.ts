import { db } from "@humancore/db";
import { tools, activityLog } from "@humancore/db/schema";
import { eq } from "drizzle-orm";

// ─── Tool Execution Engine ───────────────────────────────────────────────────
//
// Built-in tools that agents can invoke during conversation:
// - shell_exec: Execute shell commands (sandboxed)
// - web_fetch: Fetch URLs and extract content
// - file_read: Read file contents
// - file_write: Write/create files
// - file_list: List directory contents
// - web_search: Search the web
// - code_run: Run code snippets (JS/TS/Python)
// - memory_store: Store a memory
// - memory_recall: Recall memories by query
// - delegate_task: Delegate to another agent

export interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
  agentId: number;
  sessionId?: number;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  durationMs: number;
  requiresApproval?: boolean;
}

// ─── Tool Registry ───────────────────────────────────────────────────────────

const BUILTIN_TOOLS: Record<string, {
  category: string;
  description: string;
  requiresApproval: boolean;
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}> = {
  shell_exec: {
    category: "system",
    description: "Execute a shell command and return output",
    requiresApproval: true,
    execute: executeShell,
  },
  web_fetch: {
    category: "web",
    description: "Fetch content from a URL",
    requiresApproval: false,
    execute: executeWebFetch,
  },
  file_read: {
    category: "file",
    description: "Read contents of a file",
    requiresApproval: false,
    execute: executeFileRead,
  },
  file_write: {
    category: "file",
    description: "Write content to a file",
    requiresApproval: true,
    execute: executeFileWrite,
  },
  file_list: {
    category: "file",
    description: "List directory contents",
    requiresApproval: false,
    execute: executeFileList,
  },
  web_search: {
    category: "web",
    description: "Search the web for information",
    requiresApproval: false,
    execute: executeWebSearch,
  },
  code_run: {
    category: "code",
    description: "Execute a code snippet (JavaScript/TypeScript)",
    requiresApproval: true,
    execute: executeCodeRun,
  },
  json_parse: {
    category: "data",
    description: "Parse and extract data from JSON",
    requiresApproval: false,
    execute: executeJsonParse,
  },
  math_eval: {
    category: "data",
    description: "Evaluate a mathematical expression",
    requiresApproval: false,
    execute: executeMathEval,
  },
  datetime: {
    category: "utility",
    description: "Get current date/time or convert timestamps",
    requiresApproval: false,
    execute: executeDatetime,
  },
};

// ─── Approval Queue ──────────────────────────────────────────────────────────

interface PendingApproval {
  id: string;
  toolCall: ToolCall;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

const approvalQueue: PendingApproval[] = [];

export function getPendingApprovals(): PendingApproval[] {
  return approvalQueue.filter(a => a.status === "pending");
}

export function approveToolCall(approvalId: string): boolean {
  const item = approvalQueue.find(a => a.id === approvalId);
  if (item) { item.status = "approved"; return true; }
  return false;
}

export function rejectToolCall(approvalId: string): boolean {
  const item = approvalQueue.find(a => a.id === approvalId);
  if (item) { item.status = "rejected"; return true; }
  return false;
}

// ─── Main Executor ───────────────────────────────────────────────────────────

export async function executeTool(call: ToolCall): Promise<ToolResult> {
  const startTime = Date.now();
  const toolDef = BUILTIN_TOOLS[call.toolName];

  if (!toolDef) {
    return { success: false, output: "", error: `Unknown tool: ${call.toolName}`, durationMs: 0 };
  }

  // Check if tool is enabled in DB
  const [dbTool] = await db.select().from(tools).where(eq(tools.name, call.toolName));
  if (dbTool && !dbTool.isEnabled) {
    return { success: false, output: "", error: `Tool ${call.toolName} is disabled`, durationMs: 0 };
  }

  // Check approval requirement
  const needsApproval = dbTool?.requiresApproval ?? toolDef.requiresApproval;
  if (needsApproval) {
    const approvalId = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    approvalQueue.push({
      id: approvalId,
      toolCall: call,
      createdAt: new Date().toISOString(),
      status: "pending",
    });

    return {
      success: false,
      output: "",
      error: `Tool requires approval. Approval ID: ${approvalId}`,
      durationMs: Date.now() - startTime,
      requiresApproval: true,
    };
  }

  // Execute
  try {
    const result = await toolDef.execute(call.args);
    result.durationMs = Date.now() - startTime;

    // Update usage count
    if (dbTool) {
      await db.update(tools).set({ usageCount: dbTool.usageCount + 1 }).where(eq(tools.id, dbTool.id));
    }

    // Log activity
    await db.insert(activityLog).values({
      agentId: call.agentId,
      type: "tool",
      summary: `Tool: ${call.toolName} — ${result.success ? "success" : "failed"} (${result.durationMs}ms)`,
    });

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, output: "", error: errorMsg, durationMs: Date.now() - startTime };
  }
}

/**
 * Execute a previously approved tool call.
 */
export async function executeApprovedTool(approvalId: string): Promise<ToolResult> {
  const item = approvalQueue.find(a => a.id === approvalId && a.status === "approved");
  if (!item) {
    return { success: false, output: "", error: "Approval not found or not approved", durationMs: 0 };
  }

  const toolDef = BUILTIN_TOOLS[item.toolCall.toolName];
  if (!toolDef) {
    return { success: false, output: "", error: `Unknown tool: ${item.toolCall.toolName}`, durationMs: 0 };
  }

  const startTime = Date.now();
  try {
    const result = await toolDef.execute(item.toolCall.args);
    result.durationMs = Date.now() - startTime;

    // Update usage count
    const [dbTool] = await db.select().from(tools).where(eq(tools.name, item.toolCall.toolName));
    if (dbTool) {
      await db.update(tools).set({ usageCount: dbTool.usageCount + 1 }).where(eq(tools.id, dbTool.id));
    }

    await db.insert(activityLog).values({
      agentId: item.toolCall.agentId,
      type: "tool",
      summary: `Tool: ${item.toolCall.toolName} (approved) — ${result.success ? "success" : "failed"} (${result.durationMs}ms)`,
    });

    return result;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, output: "", error: errorMsg, durationMs: Date.now() - startTime };
  }
}

/**
 * Get list of available tools with their schemas.
 */
export function getAvailableTools() {
  return Object.entries(BUILTIN_TOOLS).map(([name, def]) => ({
    name,
    category: def.category,
    description: def.description,
    requiresApproval: def.requiresApproval,
  }));
}

// ─── Tool Implementations ────────────────────────────────────────────────────

async function executeShell(args: Record<string, unknown>): Promise<ToolResult> {
  const command = String(args.command ?? "");
  if (!command) return { success: false, output: "", error: "No command provided", durationMs: 0 };

  // Sandbox: block dangerous commands
  const blocked = ["rm -rf /", "sudo rm", "mkfs", "dd if=", "> /dev/", ":(){ :|:& };:"];
  for (const b of blocked) {
    if (command.includes(b)) {
      return { success: false, output: "", error: `Blocked: dangerous command pattern "${b}"`, durationMs: 0 };
    }
  }

  try {
    const proc = Bun.spawn(["bash", "-c", command], {
      timeout: 30000, // 30s timeout
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    return {
      success: exitCode === 0,
      output: stdout.slice(0, 10000) + (stderr ? `\n[stderr]: ${stderr.slice(0, 2000)}` : ""),
      error: exitCode !== 0 ? `Exit code: ${exitCode}` : undefined,
      durationMs: 0,
    };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), durationMs: 0 };
  }
}

async function executeWebFetch(args: Record<string, unknown>): Promise<ToolResult> {
  const url = String(args.url ?? "");
  if (!url) return { success: false, output: "", error: "No URL provided", durationMs: 0 };

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "HumanCore-AI/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    let body: string;

    if (contentType.includes("json")) {
      body = JSON.stringify(await response.json(), null, 2);
    } else {
      body = await response.text();
      // Strip HTML tags for readability
      if (contentType.includes("html")) {
        body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 10000);
      }
    }

    return {
      success: response.ok,
      output: `[${response.status}] ${body.slice(0, 10000)}`,
      error: !response.ok ? `HTTP ${response.status}` : undefined,
      durationMs: 0,
    };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), durationMs: 0 };
  }
}

async function executeFileRead(args: Record<string, unknown>): Promise<ToolResult> {
  const path = String(args.path ?? "");
  if (!path) return { success: false, output: "", error: "No path provided", durationMs: 0 };

  // Sandbox: restrict to workspace
  const allowedPrefixes = ["/home/ubuntu/", "/tmp/"];
  if (!allowedPrefixes.some(p => path.startsWith(p))) {
    return { success: false, output: "", error: "Access denied: path outside workspace", durationMs: 0 };
  }

  try {
    const file = Bun.file(path);
    if (!await file.exists()) {
      return { success: false, output: "", error: "File not found", durationMs: 0 };
    }
    const content = await file.text();
    return { success: true, output: content.slice(0, 50000), durationMs: 0 };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), durationMs: 0 };
  }
}

async function executeFileWrite(args: Record<string, unknown>): Promise<ToolResult> {
  const path = String(args.path ?? "");
  const content = String(args.content ?? "");
  if (!path) return { success: false, output: "", error: "No path provided", durationMs: 0 };

  const allowedPrefixes = ["/home/ubuntu/", "/tmp/"];
  if (!allowedPrefixes.some(p => path.startsWith(p))) {
    return { success: false, output: "", error: "Access denied: path outside workspace", durationMs: 0 };
  }

  try {
    await Bun.write(path, content);
    return { success: true, output: `Written ${content.length} bytes to ${path}`, durationMs: 0 };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), durationMs: 0 };
  }
}

async function executeFileList(args: Record<string, unknown>): Promise<ToolResult> {
  const path = String(args.path ?? "/home/ubuntu/");

  const allowedPrefixes = ["/home/ubuntu/", "/tmp/"];
  if (!allowedPrefixes.some(p => path.startsWith(p))) {
    return { success: false, output: "", error: "Access denied: path outside workspace", durationMs: 0 };
  }

  try {
    const { readdir, stat } = await import("node:fs/promises");
    const entries = await readdir(path);
    const details = await Promise.all(entries.slice(0, 100).map(async (name) => {
      try {
        const s = await stat(`${path}/${name}`);
        return `${s.isDirectory() ? "d" : "-"} ${name} (${s.size}b)`;
      } catch { return `? ${name}`; }
    }));
    return { success: true, output: details.join("\n"), durationMs: 0 };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), durationMs: 0 };
  }
}

async function executeWebSearch(args: Record<string, unknown>): Promise<ToolResult> {
  const query = String(args.query ?? "");
  if (!query) return { success: false, output: "", error: "No query provided", durationMs: 0 };

  // Use DuckDuckGo HTML for search (no API key needed)
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "HumanCore-AI/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await response.text();

    // Extract results
    const results: string[] = [];
    const regex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) && results.length < 5) {
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      const href = match[1];
      results.push(`• ${title}\n  ${href}`);
    }

    return {
      success: results.length > 0,
      output: results.length > 0 ? results.join("\n\n") : "No results found",
      durationMs: 0,
    };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), durationMs: 0 };
  }
}

async function executeCodeRun(args: Record<string, unknown>): Promise<ToolResult> {
  const code = String(args.code ?? "");
  const language = String(args.language ?? "javascript");
  if (!code) return { success: false, output: "", error: "No code provided", durationMs: 0 };

  try {
    if (language === "javascript" || language === "typescript") {
      // Write to temp file and execute with Bun
      const tmpFile = `/tmp/humancore_exec_${Date.now()}.${language === "typescript" ? "ts" : "js"}`;
      await Bun.write(tmpFile, code);
      const proc = Bun.spawn(["bun", "run", tmpFile], {
        timeout: 10000,
        stdout: "pipe",
        stderr: "pipe",
      });
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();
      const exitCode = await proc.exited;

      // Cleanup
      try { await import("node:fs/promises").then(fs => fs.unlink(tmpFile)); } catch {}

      return {
        success: exitCode === 0,
        output: stdout.slice(0, 10000) + (stderr ? `\n[stderr]: ${stderr.slice(0, 2000)}` : ""),
        error: exitCode !== 0 ? `Exit code: ${exitCode}` : undefined,
        durationMs: 0,
      };
    }
    return { success: false, output: "", error: `Unsupported language: ${language}`, durationMs: 0 };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), durationMs: 0 };
  }
}

async function executeJsonParse(args: Record<string, unknown>): Promise<ToolResult> {
  const input = String(args.input ?? args.json ?? "");
  const path = String(args.path ?? "");
  if (!input) return { success: false, output: "", error: "No input provided", durationMs: 0 };

  try {
    let data = JSON.parse(input);
    if (path) {
      for (const key of path.split(".")) {
        data = data?.[key];
      }
    }
    return { success: true, output: JSON.stringify(data, null, 2), durationMs: 0 };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), durationMs: 0 };
  }
}

async function executeMathEval(args: Record<string, unknown>): Promise<ToolResult> {
  const expr = String(args.expression ?? args.expr ?? "");
  if (!expr) return { success: false, output: "", error: "No expression provided", durationMs: 0 };

  try {
    // Only allow safe math characters
    const sanitized = expr.replace(/[^0-9+\-*/().%\s^]/g, "");
    if (!sanitized.trim()) {
      return { success: false, output: "", error: "Invalid expression (only numbers and basic operators allowed)", durationMs: 0 };
    }
    const result = Function(`"use strict"; return (${sanitized})`)();
    return { success: true, output: String(result), durationMs: 0 };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), durationMs: 0 };
  }
}

async function executeDatetime(args: Record<string, unknown>): Promise<ToolResult> {
  const format = String(args.format ?? "iso");
  const tz = String(args.timezone ?? "UTC");

  try {
    const now = new Date();
    let output: string;

    switch (format) {
      case "iso": output = now.toISOString(); break;
      case "unix": output = String(Math.floor(now.getTime() / 1000)); break;
      case "human": output = now.toLocaleString("en-US", { timeZone: tz }); break;
      case "date": output = now.toLocaleDateString("en-US", { timeZone: tz }); break;
      case "time": output = now.toLocaleTimeString("en-US", { timeZone: tz }); break;
      default: output = now.toISOString();
    }

    return { success: true, output, durationMs: 0 };
  } catch (err) {
    return { success: false, output: "", error: err instanceof Error ? err.message : String(err), durationMs: 0 };
  }
}
