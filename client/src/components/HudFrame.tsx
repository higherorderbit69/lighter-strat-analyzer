import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface HudFrameProps {
  children: ReactNode;
  className?: string;
  title?: string;
  variant?: "default" | "highlight" | "alert";
}

export function HudFrame({ children, className, title, variant = "default" }: HudFrameProps) {
  const borderColors = {
    default: "border-primary/30",
    highlight: "border-secondary/50",
    alert: "border-destructive/50",
  };

  const cornerColors = {
    default: "border-primary",
    highlight: "border-secondary",
    alert: "border-destructive",
  };

  return (
    <div className={cn("relative p-4", borderColors[variant], className)}>
      {/* Corner brackets */}
      <div className={cn("absolute top-0 left-0 w-5 h-5 border-l-2 border-t-2", cornerColors[variant])} />
      <div className={cn("absolute top-0 right-0 w-5 h-5 border-r-2 border-t-2", cornerColors[variant])} />
      <div className={cn("absolute bottom-0 left-0 w-5 h-5 border-l-2 border-b-2", cornerColors[variant])} />
      <div className={cn("absolute bottom-0 right-0 w-5 h-5 border-r-2 border-b-2", cornerColors[variant])} />
      
      {/* Title bar */}
      {title && (
        <div className="absolute -top-3 left-6 px-2 bg-background">
          <span className={cn(
            "text-xs font-bold tracking-widest uppercase",
            variant === "default" && "text-primary neon-glow-pink",
            variant === "highlight" && "text-secondary neon-glow-cyan",
            variant === "alert" && "text-destructive neon-glow-red"
          )}>
            {title}
          </span>
        </div>
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Subtle border */}
      <div className={cn("absolute inset-0 border", borderColors[variant], "pointer-events-none")} />
    </div>
  );
}
