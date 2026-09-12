import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_4px_12px_rgba(99,102,241,0.25)] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_6px_20px_rgba(99,102,241,0.4)] hover:brightness-110",
        secondary:
          "bg-white/[0.05] text-zinc-200 border border-white/[0.1] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:bg-white/[0.08] hover:border-white/[0.18] hover:text-white",
        ghost: "text-zinc-400 hover:text-white hover:bg-white/[0.06]",
        outline:
          "border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/50",
        danger:
          "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30",
        success:
          "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/30",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
