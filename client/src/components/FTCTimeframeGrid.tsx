/**
 * FTC Timeframe Grid Component
 * Displays multi-timeframe analysis in a grid format
 */

import type { MultiTimeframeAnalysis, FTCTimeframe } from "@shared/types";
import { FTC_TIMEFRAMES } from "@shared/types";
import { cn } from "@/lib/utils";
import { AlertCircle, Clock } from "lucide-react";

interface FTCTimeframeGridProps {
    analysis: MultiTimeframeAnalysis;
}

/**
 * Get semantic CSS classes for pattern type
 * Maps to existing theme tokens: success (green), destructive (red), accent (yellow), muted (purple)
 */
function getPatternColor(patternType: string): string {
    switch (patternType) {
        case "2U":
            // Bullish → success/green
            return "ftc-bullish text-green-500 bg-green-500/10 border-green-500/30";
        case "2D":
            // Bearish → destructive/red
            return "ftc-bearish text-red-500 bg-red-500/10 border-red-500/30";
        case "1":
            // Inside → accent/yellow
            return "ftc-inside text-yellow-500 bg-yellow-500/10 border-yellow-500/30";
        case "3":
            // Outside → muted/purple
            return "ftc-outside text-purple-500 bg-purple-500/10 border-purple-500/30";
        default:
            return "text-muted-foreground bg-card/20 border-border/30";
    }
}

export function FTCTimeframeGrid({ analysis }: FTCTimeframeGridProps) {
    return (
        <div className="grid grid-cols-8 gap-1 font-mono text-xs">
            {FTC_TIMEFRAMES.map((tf: FTCTimeframe) => {
                const state = analysis.timeframes[tf];

                if (!state) {
                    // Missing timeframe
                    return (
                        <div
                            key={tf}
                            className="p-2 rounded border border-border/20 bg-card/10 text-center"
                        >
                            <div className="text-[10px] text-muted-foreground/50 mb-1">
                                {tf.toUpperCase()}
                            </div>
                            <div className="text-muted-foreground/30">—</div>
                        </div>
                    );
                }

                if (state.error) {
                    // Error state → destructive styling
                    return (
                        <div
                            key={tf}
                            className="ftc-error p-2 rounded border border-destructive/20 bg-destructive/5 text-center"
                            title={`Error: ${state.error}`}
                        >
                            <div className="text-[10px] text-muted-foreground/50 mb-1">
                                {tf.toUpperCase()}
                            </div>
                            <AlertCircle className="w-3 h-3 text-destructive/50 mx-auto" />
                        </div>
                    );
                }

                // Valid state
                const colorClasses = getPatternColor(state.patternType);

                return (
                    <div
                        key={tf}
                        className={cn(
                            "p-2 rounded border text-center transition-all",
                            colorClasses
                        )}
                        title={`${state.pattern} (${state.direction})`}
                    >
                        <div className="text-[10px] text-muted-foreground/70 mb-1 flex items-center justify-center gap-1">
                            {tf.toUpperCase()}
                            {state.stale && (
                                <Clock className="w-2 h-2 opacity-50" />
                            )}
                        </div>
                        <div className="font-bold tracking-wider">{state.patternType}</div>
                    </div>
                );
            })}
        </div>
    );
}
