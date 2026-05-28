import { db } from "@humancore/db";
import { hooks, activityLog } from "@humancore/db/schema";
import { eq, and } from "drizzle-orm";

// ─── Hooks & Event System ────────────────────────────────────────────────────
//
// Events:
// - pre_tool_use   — Before tool execution (can block)
// - post_tool_use  — After tool execution
// - message_received — When user sends a message
// - message_sent    — When agent sends a response
// - agent_spawn     — When a sub-agent is created
// - agent_delegate  — When a task is delegated
// - mood_change     — When agent's mood changes
// - memory_created  — When a new memory is stored
// - cron_run        — When a cron job executes
// - error_occurred  — When any error occurs
//
// Actions:
// - approve  — Pause and wait for user approval (blocking)
// - log      — Log the event to activity feed
// - notify   — Send notification
// - block    — Block the action entirely
// - transform — Modify the event data before proceeding

export type EventType =
  | "pre_tool_use" | "post_tool_use"
  | "message_received" | "message_sent"
  | "agent_spawn" | "agent_delegate"
  | "mood_change" | "memory_created"
  | "cron_run" | "error_occurred";

export type HookAction = "approve" | "log" | "notify" | "block" | "transform";

export interface EventPayload {
  type: EventType;
  agentId?: number;
  sessionId?: number;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface HookResult {
  hookId: number;
  hookName: string;
  action: HookAction;
  blocked: boolean;
  requiresApproval: boolean;
  transformed?: Record<string, unknown>;
}

// ─── Approval Queue ──────────────────────────────────────────────────────────

interface HookApproval {
  id: string;
  hookId: number;
  event: EventPayload;
  createdAt: string;
  status: "pending" | "approved" | "rejected";
}

const hookApprovals: HookApproval[] = [];

export function getHookApprovals(): HookApproval[] {
  return hookApprovals.filter(a => a.status === "pending");
}

export function approveHook(approvalId: string): boolean {
  const item = hookApprovals.find(a => a.id === approvalId);
  if (item) { item.status = "approved"; return true; }
  return false;
}

export function rejectHook(approvalId: string): boolean {
  const item = hookApprovals.find(a => a.id === approvalId);
  if (item) { item.status = "rejected"; return true; }
  return false;
}

// ─── Event Emitter ───────────────────────────────────────────────────────────

type EventListener = (payload: EventPayload) => void | Promise<void>;
const listeners: Map<EventType, EventListener[]> = new Map();

export function on(event: EventType, listener: EventListener): void {
  const existing = listeners.get(event) ?? [];
  existing.push(listener);
  listeners.set(event, existing);
}

export function off(event: EventType, listener: EventListener): void {
  const existing = listeners.get(event) ?? [];
  listeners.set(event, existing.filter(l => l !== listener));
}

// ─── Emit Event ──────────────────────────────────────────────────────────────

export async function emit(event: EventPayload): Promise<{
  allowed: boolean;
  results: HookResult[];
  requiresApproval: boolean;
  approvalId?: string;
}> {
  // Get matching hooks from DB (sorted by priority)
  const matchingHooks = await db.select().from(hooks)
    .where(and(
      eq(hooks.event, event.type),
      eq(hooks.isActive, true)
    ));

  // Sort by priority (higher first)
  matchingHooks.sort((a, b) => b.priority - a.priority);

  const results: HookResult[] = [];
  let blocked = false;
  let requiresApproval = false;
  let approvalId: string | undefined;

  for (const hook of matchingHooks) {
    const action = hook.action as HookAction;
    const hookConfig = (hook.config as Record<string, unknown>) ?? {};

    switch (action) {
      case "block": {
        // Check conditions
        if (matchesCondition(event, hookConfig)) {
          blocked = true;
          results.push({ hookId: hook.id, hookName: hook.name, action: "block", blocked: true, requiresApproval: false });

          // Update trigger count
          await db.update(hooks).set({ triggerCount: hook.triggerCount + 1 }).where(eq(hooks.id, hook.id));
        }
        break;
      }
      case "approve": {
        if (matchesCondition(event, hookConfig)) {
          requiresApproval = true;
          approvalId = `hook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          hookApprovals.push({
            id: approvalId,
            hookId: hook.id,
            event,
            createdAt: new Date().toISOString(),
            status: "pending",
          });
          results.push({ hookId: hook.id, hookName: hook.name, action: "approve", blocked: false, requiresApproval: true });

          await db.update(hooks).set({ triggerCount: hook.triggerCount + 1 }).where(eq(hooks.id, hook.id));
        }
        break;
      }
      case "log": {
        if (matchesCondition(event, hookConfig)) {
          await db.insert(activityLog).values({
            agentId: event.agentId ?? 1,
            type: "hook",
            summary: `Hook[${hook.name}]: ${event.type} — ${JSON.stringify(event.data).slice(0, 200)}`,
          });
          results.push({ hookId: hook.id, hookName: hook.name, action: "log", blocked: false, requiresApproval: false });

          await db.update(hooks).set({ triggerCount: hook.triggerCount + 1 }).where(eq(hooks.id, hook.id));
        }
        break;
      }
      case "notify": {
        if (matchesCondition(event, hookConfig)) {
          // In a real system, send a push notification / websocket event
          results.push({ hookId: hook.id, hookName: hook.name, action: "notify", blocked: false, requiresApproval: false });

          await db.update(hooks).set({ triggerCount: hook.triggerCount + 1 }).where(eq(hooks.id, hook.id));
        }
        break;
      }
      case "transform": {
        if (matchesCondition(event, hookConfig)) {
          const transformation = hookConfig.transform as Record<string, unknown>;
          if (transformation) {
            Object.assign(event.data, transformation);
          }
          results.push({ hookId: hook.id, hookName: hook.name, action: "transform", blocked: false, requiresApproval: false, transformed: transformation });

          await db.update(hooks).set({ triggerCount: hook.triggerCount + 1 }).where(eq(hooks.id, hook.id));
        }
        break;
      }
    }

    if (blocked) break; // Stop processing if blocked
  }

  // Notify event listeners
  const eventListeners = listeners.get(event.type) ?? [];
  for (const listener of eventListeners) {
    try { await listener(event); } catch {}
  }

  return { allowed: !blocked && !requiresApproval, results, requiresApproval, approvalId };
}

// ─── Condition Matching ──────────────────────────────────────────────────────

function matchesCondition(event: EventPayload, config: Record<string, unknown>): boolean {
  const conditions = config.conditions as Record<string, unknown> | undefined;
  if (!conditions) return true; // No conditions = always match

  // Agent filter
  if (conditions.agentId && event.agentId !== conditions.agentId) return false;

  // Data field matching
  if (conditions.dataMatch) {
    const dataMatch = conditions.dataMatch as Record<string, unknown>;
    for (const [key, value] of Object.entries(dataMatch)) {
      if (event.data[key] !== value) return false;
    }
  }

  return true;
}
