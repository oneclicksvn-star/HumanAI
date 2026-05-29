import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, MessageSquare, Users, GitBranch, Building2,
  Brain, Settings, HelpCircle, LogOut, Sparkles, Search,
  History, Radio, Zap, Wrench, Server, Link2, Clock,
  FolderOpen, Activity, BarChart2, GitMerge, Terminal,
  Settings2, Key, Shield, HardDrive, Stethoscope, Heart,
  ChevronDown, ChevronRight,
} from "lucide-react";
import type { ElementType } from "react";

interface NavItem { href: string; label: string; icon: ElementType; badge?: string }
interface NavSection { section: string; items: NavItem[]; collapsible?: boolean }

const NAV: NavSection[] = [
  { section: "CHÍNH", items: [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/chat", label: "Trò chuyện", icon: MessageSquare, badge: "3" },
    { href: "/agents", label: "Nhân vật AI", icon: Users },
    { href: "/teams", label: "Nhóm", icon: GitBranch },
    { href: "/company", label: "Công ty", icon: Building2 },
    { href: "/sessions", label: "Phiên làm việc", icon: History },
  ]},
  { section: "KẾT NỐI", collapsible: true, items: [
    { href: "/channels", label: "Kênh", icon: Radio },
  ]},
  { section: "KHẢ NĂNG", collapsible: true, items: [
    { href: "/skills", label: "Kỹ năng", icon: Zap },
    { href: "/tools", label: "Công cụ", icon: Wrench },
    { href: "/mcp-servers", label: "MCP Servers", icon: Server },
    { href: "/hooks", label: "Hooks", icon: Link2 },
    { href: "/cron-jobs", label: "Tác vụ định kỳ", icon: Clock },
  ]},
  { section: "DỮ LIỆU", collapsible: true, items: [
    { href: "/memory", label: "Bộ nhớ", icon: Brain },
    { href: "/vault", label: "Kho lưu trữ", icon: FolderOpen },
  ]},
  { section: "GIÁM SÁT", collapsible: true, items: [
    { href: "/activity", label: "Hoạt động", icon: Activity },
    { href: "/usage", label: "Sử dụng", icon: BarChart2 },
    { href: "/traces", label: "Traces", icon: GitMerge },
    { href: "/logs", label: "Nhật ký", icon: Terminal },
  ]},
  { section: "HỆ THỐNG", collapsible: true, items: [
    { href: "/providers", label: "Providers", icon: Settings2 },
    { href: "/api-keys", label: "API Keys", icon: Key },
    { href: "/security", label: "Bảo mật", icon: Shield },
    { href: "/backup", label: "Sao lưu", icon: HardDrive },
  ]},
  { section: "SỨC KHỎE", collapsible: true, items: [
    { href: "/doctor", label: "Chẩn đoán", icon: Stethoscope },
    { href: "/heartbeat", label: "Nhịp tim", icon: Heart },
  ]},
];

export function Sidebar() {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["KẾT NỐI", "SỨC KHỎE"]));

  const toggle = (s: string) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <aside className="w-[220px] flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 z-50">
      <div className="px-5 py-5 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_4px_12px_rgba(99,102,241,0.4)]">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">HumanCore</p>
            <p className="text-[10px] text-gray-400">Nền tảng AI</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 cursor-pointer hover:border-gray-200 transition-colors">
          <Search size={12} className="text-gray-400" />
          <span className="text-xs text-gray-400">Tìm kiếm…</span>
          <span className="ml-auto text-[9px] text-gray-300 font-semibold">⌘K</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV.map(({ section, items, collapsible }) => {
          const isCol = collapsed.has(section);
          return (
            <div key={section} className="mb-1">
              <button
                onClick={() => collapsible && toggle(section)}
                className={cn("w-full flex items-center justify-between px-3 py-1.5 mb-0.5", collapsible && "cursor-pointer hover:bg-gray-50 rounded-lg transition-colors")}
              >
                <p className="text-[9px] font-bold tracking-[0.12em] text-gray-400">{section}</p>
                {collapsible && (isCol ? <ChevronRight size={10} className="text-gray-300" /> : <ChevronDown size={10} className="text-gray-300" />)}
              </button>
              {(!collapsible || !isCol) && (
                <div className="space-y-0.5">
                  {items.map(({ href, label, icon: Icon, badge }) => (
                    <Link key={href} href={href}>
                      <div className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm cursor-pointer transition-all",
                        isActive(href) ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      )}>
                        <Icon size={15} className="flex-shrink-0" />
                        <span className="flex-1 text-xs">{label}</span>
                        {badge && <span className="text-[9px] font-bold w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center">{badge}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mx-3 mb-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-3.5 text-white flex-shrink-0">
        <p className="text-[11px] font-bold mb-0.5">Nâng cấp Pro</p>
        <p className="text-[9px] opacity-75 mb-2.5">Mở khóa agent không giới hạn và bộ nhớ nâng cao.</p>
        <button className="w-full bg-white/20 hover:bg-white/30 text-[10px] font-bold py-1.5 rounded-lg transition-colors">Nâng cấp →</button>
      </div>

      <div className="px-3 pb-3 space-y-0.5 border-t border-gray-50 pt-2 flex-shrink-0">
        <Link href="/settings">
          <div className={cn("flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs cursor-pointer transition-all", isActive("/settings") ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-500 hover:bg-gray-50")}>
            <Settings size={15} /><span>Cài đặt</span>
          </div>
        </Link>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-500 hover:bg-gray-50 cursor-pointer">
          <HelpCircle size={15} /><span>Trợ giúp</span>
        </div>
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-red-400 hover:bg-red-50 cursor-pointer">
          <LogOut size={15} /><span>Đăng xuất</span>
        </div>
      </div>
    </aside>
  );
}
