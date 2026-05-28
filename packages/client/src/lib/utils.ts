import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const MOOD_COLORS: Record<string, string> = {
  neutral: "#6366f1",
  positive: "#22c55e",
  focused: "#3b82f6",
  reflective: "#8b5cf6",
  calming: "#38bdf8",
  supportive: "#f59e0b",
  satisfied: "#10b981",
  empathetic: "#a78bfa",
};
