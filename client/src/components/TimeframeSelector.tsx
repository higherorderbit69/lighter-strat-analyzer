import { cn } from "@/lib/utils";
import type { Timeframe } from "@shared/types";
import { TIMEFRAMES } from "@shared/types";

interface TimeframeSelectorProps {
  selected: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}

export function TimeframeSelector({ selected, onChange }: TimeframeSelectorProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-card/50 rounded-lg border border-border/50">
      {TIMEFRAMES.map((tf) => (
        <button
          key={tf}
          onClick={() => onChange(tf)}
          className={cn(
            "px-3 py-1.5 text-xs font-mono font-bold tracking-wider transition-all duration-200",
            "rounded hover:bg-primary/20",
            selected === tf
              ? "bg-primary text-primary-foreground neon-glow-pink"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {tf.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
