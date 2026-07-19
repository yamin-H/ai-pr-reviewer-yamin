"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemoryStats } from "@/lib/types";

const COLORS = ["#6366F1", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#1a1f2e] px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400">{label || payload[0].name}</p>
      <p className="text-sm font-semibold text-white">{payload[0].value}</p>
    </div>
  );
};

export function MemoryCharts({ stats }: { stats: MemoryStats }) {
  const decisionData = stats.byDecisionType.map((d) => ({
    name: d.decisionType,
    value: d._count.decisionType,
  }));

  const outcomeData = stats.byOutcome.map((d) => ({
    name: d.outcome,
    value: d._count.outcome,
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Decisions by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {decisionData.length === 0 ? (
            <EmptyChart message="No decision data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={decisionData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {decisionData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Outcome Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {outcomeData.length === 0 ? (
            <EmptyChart message="No outcome data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={outcomeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  nameKey="name"
                >
                  {outcomeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center">
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}

export function RecentMemoryEntries({
  entries,
}: {
  entries: MemoryStats["recentEntries"];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Memory Entries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            Team memory builds as reviews are processed
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300">
                  {entry.decisionType}
                </span>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-zinc-400 capitalize">
                  {entry.outcome}
                </span>
                <span className="ml-auto text-xs text-zinc-600">
                  PR #{entry.prNumber}
                </span>
              </div>
              <p className="text-sm text-zinc-300 line-clamp-2">{entry.content}</p>
              <p className="mt-2 text-xs text-zinc-600">{entry.repo.fullName}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
