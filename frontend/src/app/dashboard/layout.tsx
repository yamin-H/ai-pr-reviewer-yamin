"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { Sparkles, Terminal } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isClientMock, setIsClientMock] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
    
    // Check if running in mock mode to show notification banner
    if (typeof window !== "undefined") {
      setIsClientMock(localStorage.getItem("use_mock_mode") === "true");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#080C14] transition-colors duration-300">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your space...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#080C14] text-[#0F0F0F] dark:text-zinc-100 bg-dot-grid relative transition-colors duration-300">
      {/* Ambient background glow */}
      <div className="fixed top-0 left-64 right-0 h-96 bg-gradient-to-b from-indigo-500/5 via-violet-500/2 to-transparent pointer-events-none" />

      {/* Sidebar - fixed width 64 */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="pl-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#070A12]/80 px-8 backdrop-blur-xl sticky top-0 z-20 shadow-xs dark:shadow-sm transition-colors duration-300">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-medium">
              <span className="text-zinc-500 dark:text-zinc-500">Dashboard</span>
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <span className="text-zinc-900 dark:text-zinc-200 capitalize font-semibold">
                {typeof window !== "undefined"
                  ? window.location.pathname.split("/").filter(Boolean)[1] || "Overview"
                  : "Overview"}
              </span>
            </div>

            {isClientMock && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-medium text-violet-700 dark:text-violet-400 border border-violet-500/20">
                <Terminal className="h-3 w-3" />
                Demo Sandbox
              </span>
            )}
          </div>

          {/* Right Header Badges & Actions */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-zinc-100 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/[0.07] px-3 py-1 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Agent Core 2.0</span>
              <span className="text-zinc-300 dark:text-zinc-600">|</span>
              <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Live</span>
            </div>

            <a
              href="https://github.com/yamin-H/ai-pr-reviewer-yamin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/[0.05] transition-colors px-2 py-1 rounded-lg"
            >
              Docs ↗
            </a>
          </div>
        </header>

        <main className="p-8 max-w-[1440px] w-full mx-auto flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
