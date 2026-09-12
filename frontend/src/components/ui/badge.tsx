import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20",
        success:
          "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
        warning:
          "bg-amber-500/15 text-amber-300 border border-amber-500/20",
        danger: "bg-red-500/15 text-red-300 border border-red-500/20",
        muted: "bg-white/5 text-zinc-400 border border-white/10",
        info: "bg-sky-500/15 text-sky-300 border border-sky-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === "completed"
      ? "success"
      : status === "failed"
        ? "danger"
        : status === "pending"
          ? "warning"
          : "muted";

  const dotColor =
    status === "completed"
      ? "bg-emerald-400"
      : status === "failed"
        ? "bg-red-400"
        : status === "pending"
          ? "bg-amber-400 animate-pulse"
          : "bg-zinc-400";

  return (
    <Badge variant={variant} className="gap-1.5 font-medium tracking-wide">
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const normalized = severity.toLowerCase();
  const variant =
    normalized === "critical" || normalized === "error"
      ? "danger"
      : normalized === "warning"
        ? "warning"
        : normalized === "info"
          ? "info"
          : "muted";

  return (
    <Badge variant={variant} className="gap-1 font-semibold uppercase tracking-wider text-[10px]">
      <span className="capitalize">{severity}</span>
    </Badge>
  );
}
