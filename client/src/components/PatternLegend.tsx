import { cn } from "@/lib/utils";
import { HudFrame } from "./HudFrame";
import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";

const patterns = [
  {
    type: "1",
    name: "Inside Bar",
    description: "Consolidation pattern",
    icon: <Minus className="w-4 h-4" />,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    glow: "neon-glow-yellow",
  },
  {
    type: "2U",
    name: "2-Up",
    description: "Bullish directional",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "text-[oklch(0.75_0.22_145)]",
    bg: "bg-[oklch(0.75_0.22_145/0.15)]",
    glow: "neon-glow-green",
  },
  {
    type: "2D",
    name: "2-Down",
    description: "Bearish directional",
    icon: <TrendingDown className="w-4 h-4" />,
    color: "text-destructive",
    bg: "bg-destructive/15",
    glow: "neon-glow-red",
  },
  {
    type: "3",
    name: "Outside Bar",
    description: "Volatility expansion",
    icon: <Zap className="w-4 h-4" />,
    color: "text-primary",
    bg: "bg-primary/15",
    glow: "neon-glow-pink",
  },
];

export function PatternLegend() {
  return (
    <HudFrame title="PATTERN LEGEND" className="bg-card/30">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {patterns.map((p) => (
          <div
            key={p.type}
            className={cn("flex items-center gap-2 p-2 rounded", p.bg)}
          >
            <span className={p.color}>{p.icon}</span>
            <div>
              <div className={cn("text-xs font-bold", p.color, p.glow)}>
                {p.name}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {p.description}
              </div>
            </div>
          </div>
        ))}
      </div>
    </HudFrame>
  );
}
