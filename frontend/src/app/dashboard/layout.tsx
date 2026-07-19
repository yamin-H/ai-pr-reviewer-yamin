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
      <div className="flex h-screen items-center justify-center bg-[#05070C]">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mx-auto" />
          <p className="text-sm text-zinc-400">Loading your space...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-[#05070C]">
      {/* Sidebar - fixed width 64 */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="pl-64">
        {/* Top Header */}
        <header className="flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#0B0F1A]/40 px-8 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {isClientMock && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-400 border border-violet-500/20">
                <Terminal className="h-3 w-3" />
                Sandbox Demo Mode
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Agent Core Online
            </span>
          </div>
        </header>

        <main className="p-8 max-w-[1400px] mx-auto min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
