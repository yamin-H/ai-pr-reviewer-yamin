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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/repos", label: "Repositories", icon: FolderGit2 },
  { href: "/dashboard/reviews", label: "Reviews", icon: GitPullRequest },
  { href: "/dashboard/memory", label: "Team Memory", icon: Brain },
  { href: "/dashboard/digest", label: "Weekly Digest", icon: BookOpen },
  { href: "/dashboard/pipeline", label: "Agent Pipeline", icon: GitBranch },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-white/[0.06] bg-[#0B0F1A]/80 backdrop-blur-2xl">
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Powerful</p>
          <p className="text-[11px] text-zinc-500">PR Review Agent</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-500/15 text-indigo-200 shadow-sm shadow-indigo-500/10"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-white",
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
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-white/[0.06] p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
            <Avatar src={user.avatarUrl} alt={user.login} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {user.login}
              </p>
              <p className="text-xs text-zinc-500">GitHub</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              title="Sign out"
              className="h-8 w-8 shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
