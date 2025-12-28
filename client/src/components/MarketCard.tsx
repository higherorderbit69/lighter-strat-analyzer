import { cn } from "@/lib/utils";
import type { MarketAnalysis, StratPatternType } from "@shared/types";
import { HudFrame } from "./HudFrame";
import { TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";

interface MarketCardProps {
  analysis: MarketAnalysis;
  onClick?: () => void;
  selected?: boolean;
}

const patternStyles: Record<StratPatternType, { bg: string; text: string; glow: string; icon: React.ReactNode }> = {
  "1": {
    bg: "bg-yellow-400/10",
    text: "text-yellow-400",
    glow: "neon-glow-yellow",
    icon: <Minus className="w-4 h-4" />,
  },
  "2U": {
    bg: "bg-[oklch(0.75_0.22_145/0.15)]",
    text: "text-[oklch(0.75_0.22_145)]",
    glow: "neon-glow-green",
    icon: <TrendingUp className="w-4 h-4" />,
  },
  "2D": {
    bg: "bg-destructive/15",
    text: "text-destructive",
    glow: "neon-glow-red",
    icon: <TrendingDown className="w-4 h-4" />,
  },
  "3": {
    bg: "bg-primary/15",
    text: "text-primary",
    glow: "neon-glow-pink",
    icon: <Zap className="w-4 h-4" />,
  },
};

const patternNames: Record<StratPatternType, string> = {
  "1": "INSIDE",
  "2U": "2-UP",
  "2D": "2-DOWN",
  "3": "OUTSIDE",
};

export function MarketCard({ analysis, onClick, selected }: MarketCardProps) {
  const { market, currentCandle, patternSequence, actionableSetup } = analysis;
  const pattern = currentCandle?.patternType;
  const style = pattern ? patternStyles[pattern] : null;

  const priceChange = currentCandle
    ? ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100
    : 0;

  return (
    <div
      onClick={onClick}
      className={cn(
        "h-full cursor-pointer transition-all duration-300 hover:scale-[1.02]",
        selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <HudFrame
        variant={actionableSetup ? "highlight" : "default"}
        className={cn(
          "h-full bg-card/50 backdrop-blur-sm",
          actionableSetup && "pulse-border"
        )}
      >
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold tracking-wider text-foreground">
              {market.symbol}
              <span className="text-muted-foreground text-xs ml-2">PERP</span>
            </h3>
            {pattern && style && (
              <div className={cn("flex items-center gap-1 px-2 py-1 rounded", style.bg)}>
                <span className={style.text}>{style.icon}</span>
                <span className={cn("text-xs font-bold", style.text, style.glow)}>
                  {patternNames[pattern]}
                </span>
              </div>
            )}
          </div>

          {/* Price */}
          {currentCandle && (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-foreground">
                ${currentCandle.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
              </span>
              <span
                className={cn(
                  "text-sm font-mono",
                  priceChange >= 0 ? "text-[oklch(0.75_0.22_145)] neon-glow-green" : "text-destructive neon-glow-red"
                )}
              >
                {priceChange >= 0 ? "+" : ""}
                {priceChange.toFixed(2)}%
              </span>
            </div>
          )}

          {/* Pattern Sequence */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-2">SEQUENCE:</span>
            {patternSequence.split("-").map((p, i) => {
              const pStyle = patternStyles[p as StratPatternType];
              return (
                <span
                  key={i}
                  className={cn(
                    "text-xs font-mono px-1.5 py-0.5 rounded",
                    pStyle ? pStyle.bg : "bg-muted",
                    pStyle ? pStyle.text : "text-muted-foreground"
                  )}
                >
                  {p}
                </span>
              );
            })}
          </div>

          {/* Actionable Setup */}
          {actionableSetup && (
            <div className={cn(
              "mt-2 p-2 rounded border",
              actionableSetup.direction === "bullish"
                ? "border-[oklch(0.75_0.22_145/0.5)] bg-[oklch(0.75_0.22_145/0.1)]"
                : "border-destructive/50 bg-destructive/10"
            )}>
              <div className="flex items-center gap-2">
                <Zap className={cn(
                  "w-4 h-4",
                  actionableSetup.direction === "bullish" ? "text-[oklch(0.75_0.22_145)]" : "text-destructive"
                )} />
                <span className={cn(
                  "text-xs font-bold tracking-wider",
                  actionableSetup.direction === "bullish"
                    ? "text-[oklch(0.75_0.22_145)] neon-glow-green"
                    : "text-destructive neon-glow-red"
                )}>
                  {actionableSetup.pattern} - {actionableSetup.direction.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {actionableSetup.description}
              </p>
            </div>
          )}
        </div>
      </HudFrame>
    </div>
  );
}
