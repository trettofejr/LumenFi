import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.34em]",
  {
    variants: {
      variant: {
        open: "border-[#22C55E]/70 bg-[#22C55E]/18 text-[#22C55E]",
        locked: "border-[#94A3B8]/70 bg-[#94A3B8]/18 text-[#94A3B8]",
        exposure: "border-[#FACC15]/70 bg-[#FACC15]/18 text-[#FACC15] animate-pulse-glow",
        settled: "border-[#38BDF8]/70 bg-[#38BDF8]/18 text-[#38BDF8]",
        push: "border-[#F97316]/70 bg-[#F97316]/18 text-[#F97316]",
        cancelled: "border-[#EF4444]/70 bg-[#EF4444]/18 text-[#EF4444]",
        muted: "border-slate-600 bg-slate-900/70 text-slate-300",
        primary: "border-[#4ae4ff]/70 bg-[#4ae4ff]/15 text-[#4ae4ff]",
        goal: "border-[#4ae4ff]/70 bg-[#4ae4ff]/15 text-[#4ae4ff]",
        save: "border-[#38ffb7]/70 bg-[#38ffb7]/15 text-[#38ffb7]"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };



