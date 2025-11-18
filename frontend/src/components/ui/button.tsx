import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold uppercase tracking-[0.3em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#4ae4ff] to-[#38ffb7] text-[#040714] shadow-[0_18px_58px_-22px_rgba(74,228,255,0.8)] hover:shadow-[0_22px_70px_-20px_rgba(56,255,183,0.85)]",
        secondary:
          "border border-[#4ae4ff]/60 bg-[#040714]/75 text-[#4ae4ff] hover:border-[#38ffb7] hover:text-white",
        outline:
          "border border-slate-600 bg-transparent text-slate-200 hover:border-[#4ae4ff] hover:text-[#4ae4ff]",
        ghost: "text-slate-300 hover:bg-[#040714]/60",
        destructive: "bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-400",
        accent:
          "bg-gradient-to-r from-[#4ae4ff] to-[#38ffb7] text-[#040714] hover:from-[#6deeff] hover:to-[#5dffc9]",
        link: "text-[#4ae4ff] underline-offset-4 hover:underline"
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-[11px]",
        lg: "h-12 px-8 text-base",
        icon: "h-11 w-11"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };



