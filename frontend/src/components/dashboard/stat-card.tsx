"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  accent?: "indigo" | "violet" | "emerald" | "amber" | "sky";
}

const accentStyles = {
  indigo: "from-indigo-500/20 to-indigo-500/5 text-indigo-400 shadow-indigo-500/10",
  violet: "from-violet-500/20 to-violet-500/5 text-violet-400 shadow-violet-500/10",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 shadow-emerald-500/10",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-400 shadow-amber-500/10",
  sky: "from-sky-500/20 to-sky-500/5 text-sky-400 shadow-sky-500/10",
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  accent = "indigo",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br opacity-50 blur-2xl transition-opacity group-hover:opacity-80",
          accentStyles[accent],
        )}
      />
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-zinc-500">{subtitle}</p>
          )}
          {trend && (
            <p className="text-xs text-emerald-400">{trend}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg",
            accentStyles[accent],
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
