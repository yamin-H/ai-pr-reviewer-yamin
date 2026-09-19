"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  GitPullRequest,
  LayoutDashboard,
  LogOut,
  Sparkles,
  BookOpen,
  FolderGit2,
  GitBranch,
  Settings,
  Layers,
  Gauge,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-provider";

const navGroups = [
  {
    title: "CORE",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/repos", label: "Repositories", icon: FolderGit2 },
      { href: "/dashboard/reviews", label: "Reviews", icon: GitPullRequest },
      { href: "/dashboard/queue", label: "Queue", icon: Layers },
      { href: "/dashboard/usage", label: "Usage", icon: Gauge },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { href: "/dashboard/memory", label: "Team Memory", icon: Brain },
      { href: "/dashboard/digest", label: "Weekly Digest", icon: BookOpen },
      { href: "/dashboard/pipeline", label: "Agent Pipeline", icon: GitBranch },
    ],
  },
  {
    title: "PREFERENCES",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/billing", label: "Billing & Plans", icon: CreditCard },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/[0.08] bg-[#080B14]/90 backdrop-blur-2xl">
      {/* Brand & Workspace */}
      <div className="flex flex-col border-b border-white/[0.07] px-5 py-4 gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_4px_12px_rgba(99,102,241,0.3)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-tight">Powerful</span>
                <span className="rounded-md bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-300 border border-indigo-500/30">v2.0</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">Autonomous PR Review</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Active Workspace / Org Pill */}
        <div className="flex items-center justify-between rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse shrink-0" />
            <span className="truncate font-medium text-zinc-300">
              {user?.login ? `${user.login}'s Org` : "GitHub Workspace"}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.06] px-1.5 py-0.5 rounded border border-white/[0.06]">⌘K</span>
        </div>
      </div>

      {/* Nav Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
              {group.title}
            </p>
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-white font-semibold border border-indigo-500/20 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                      : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200 border border-transparent",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 transition-colors",
                      isActive
                        ? "text-indigo-400"
                        : "text-zinc-500 group-hover:text-zinc-300",
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* User Footer Profile */}
      {user && (
        <div className="border-t border-white/[0.07] p-3.5 bg-black/20">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 shadow-sm">
            <Avatar src={user.avatarUrl} alt={user.login} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {user.login}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Active</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Sign out"
              className="h-7 w-7 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
