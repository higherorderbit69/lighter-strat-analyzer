import { useState } from "react";
import { HudFrame } from "./HudFrame";
import { TrendingUp, TrendingDown, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Signal type (matches server-side SignalResponse structure)
interface Signal {
    id: string;
    name: string;
    symbol: string;
    marketId: number;
    direction: "LONG" | "SHORT" | "NEUTRAL";
    conviction: number;
    reasons: {
        htfBullish: number;
        htfBearish: number;
        ltfBullish: number;
        ltfBearish: number;
        staleCount: number;
        errorCount: number;
        missingCount: number;
        htfBias: "2U" | "2D" | "mixed";
        ltfBias: "2U" | "2D" | "mixed";
    };
    suppressedByChop: boolean;
}

interface SignalPanelProps {
    signals: Signal[];
    nearMisses: Signal[];
}

export function SignalPanel({ signals, nearMisses }: SignalPanelProps) {
    const [hideSuppressed, setHideSuppressed] = useState(true); // Default ON
    const [hideConflicts, setHideConflicts] = useState(true); // Default ON
    const [showNearMisses, setShowNearMisses] = useState(false);

    // Detect conflicts: HTF and LTF bias don't match
    const hasConflict = (signal: Signal): boolean => {
        const { htfBias, ltfBias } = signal.reasons;
        if (htfBias === "mixed" || ltfBias === "mixed") return false;
        return htfBias !== ltfBias;
    };

    // Filter signals based on toggles
    let visibleSignals = signals;

    if (hideSuppressed) {
        visibleSignals = visibleSignals.filter(s => !s.suppressedByChop);
    }

    if (hideConflicts) {
        visibleSignals = visibleSignals.filter(s => !hasConflict(s));
    }

    const suppressedCount = signals.filter(s => s.suppressedByChop).length;
    const conflictCount = signals.filter(s => hasConflict(s)).length;

    // Format reason summary with detailed info
    const formatReason = (signal: Signal): string => {
        const { reasons } = signal;

        // Special handling for IC signals (HTF inside compression)
        if (signal.name === "Inside Compression - Early Breakout") {
            const ltfBiasStr = reasons.ltfBias === "2U" ? "Bullish" : "Bearish";
            return `HTF neutral/inside compression, LTF ${ltfBiasStr}${signal.suppressedByChop ? ", SUPPRESSED" : ""}, ${reasons.staleCount} stale`;
        }

        // Normal HTFBC/other signals
        const htfBiasStr = reasons.htfBias === "2U" ? "Bullish" : reasons.htfBias === "2D" ? "Bearish" : "Mixed";
        const ltfAligned = reasons.htfBias !== "mixed" && reasons.htfBias === reasons.ltfBias;
        const conflict = hasConflict(signal);

        return `HTF ${htfBiasStr}, LTF ${ltfAligned ? "aligned" : "not aligned"}${signal.suppressedByChop ? ", SUPPRESSED" : ""}${conflict ? ", CONFLICT" : ""}, ${reasons.staleCount} stale`;
    };

    const hasAnyData = signals.length > 0 || nearMisses.length > 0;

    return (
        <HudFrame title="TOP SIGNALS" className="mb-6">
            <div className="space-y-4">
                {/* Empty State */}
                {!hasAnyData && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <AlertTriangle className="w-5 h-5 mb-2" />
                        <span className="font-semibold">No qualifying setups found</span>
                        <span className="text-xs mt-1">Markets lack clear HTF bias + LTF alignment (conviction &lt; 40)</span>
                    </div>
                )}

                {/* Controls - only show when there are signals */}
                {hasAnyData && (
                    <div className="flex items-center gap-4 text-sm">
                        {suppressedCount > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={hideSuppressed}
                                    onChange={() => setHideSuppressed(!hideSuppressed)}
                                    className="rounded border-primary/30 bg-background text-primary focus:ring-primary"
                                />
                                <span className="text-muted-foreground">
                                    Hide suppressed ({suppressedCount})
                                </span>
                            </label>
                        )}
                        {conflictCount > 0 && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={hideConflicts}
                                    onChange={() => setHideConflicts(!hideConflicts)}
                                    className="rounded border-primary/30 bg-background text-primary focus:ring-primary"
                                />
                                <span className="text-muted-foreground">
                                    Hide conflicts ({conflictCount})
                                </span>
                            </label>
                        )}
                    </div>
                )}

                {/* Signals Table */}
                {hasAnyData && visibleSignals.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-primary/20">
                                    <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Symbol</th>
                                    <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Direction</th>
                                    <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Signal</th>
                                    <th className="text-right py-2 px-2 text-muted-foreground font-semibold">Conviction</th>
                                    <th className="text-left py-2 px-2 text-muted-foreground font-semibold">Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleSignals.slice(0, 15).map((signal, idx) => (
                                    <tr
                                        key={`${signal.symbol}-${idx}`}
                                        className={cn(
                                            "border-b border-primary/10 hover:bg-primary/5",
                                            signal.suppressedByChop && "opacity-50"
                                        )}
                                    >
                                        <td className="py-3 px-2 font-bold">
                                            {signal.symbol}
                                            {signal.suppressedByChop && (
                                                <span className="ml-2 text-xs text-yellow-400">(CHOP)</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-2">
                                            {signal.direction === "LONG" ? (
                                                <span className="flex items-center gap-1 text-[oklch(0.75_0.22_145)]">
                                                    <TrendingUp className="w-4 h-4" />
                                                    LONG
                                                </span>
                                            ) : signal.direction === "SHORT" ? (
                                                <span className="flex items-center gap-1 text-destructive">
                                                    <TrendingDown className="w-4 h-4" />
                                                    SHORT
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">NEUTRAL</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-2 text-muted-foreground">{signal.name}</td>
                                        <td className="py-3 px-2 text-right">
                                            <span
                                                className={cn(
                                                    "font-bold",
                                                    signal.conviction >= 70 && "text-[oklch(0.75_0.22_145)]",
                                                    signal.conviction >= 50 && signal.conviction < 70 && "text-yellow-400",
                                                    signal.conviction < 50 && "text-muted-foreground"
                                                )}
                                            >
                                                {signal.conviction}
                                            </span>
                                        </td>
                                        <td className="py-3 px-2 text-xs text-muted-foreground">
                                            {formatReason(signal)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Empty filtered state */}
                {hasAnyData && visibleSignals.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        {hideSuppressed && hideConflicts
                            ? "All signals hidden by filters. Uncheck toggles to view."
                            : hideSuppressed
                                ? "All signals suppressed by chop. Uncheck 'Hide suppressed' to view."
                                : "All signals hidden by conflict filter. Uncheck 'Hide conflicts' to view."}
                    </div>
                )}

                {/* Near Misses Section (Always visible) */}
                <div className="mt-4 border-t border-primary/10 pt-4">
                    <button
                        onClick={() => setShowNearMisses(!showNearMisses)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {showNearMisses ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                        <span>Near Misses (25–39 conviction) • {nearMisses.length}</span>
                    </button>

                    {showNearMisses && nearMisses.length > 0 && (
                        <div className="mt-3 overflow-x-auto">
                            <table className="w-full text-sm opacity-70">
                                <tbody>
                                    {nearMisses.slice(0, 15).map((signal, idx) => (
                                        <tr
                                            key={`near-${signal.symbol}-${idx}`}
                                            className="border-b border-primary/10"
                                        >
                                            <td className="py-2 px-2 font-bold">{signal.symbol}</td>
                                            <td className="py-2 px-2">
                                                {signal.direction === "LONG" ? (
                                                    <span className="flex items-center gap-1 text-[oklch(0.75_0.22_145)]">
                                                        <TrendingUp className="w-4 h-4" />
                                                        LONG
                                                    </span>
                                                ) : signal.direction === "SHORT" ? (
                                                    <span className="flex items-center gap-1 text-destructive">
                                                        <TrendingDown className="w-4 h-4" />
                                                        SHORT
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">NEUTRAL</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2 text-muted-foreground">{signal.name}</td>
                                            <td className="py-2 px-2 text-right font-bold text-yellow-600">
                                                {signal.conviction}
                                            </td>
                                            <td className="py-2 px-2 text-xs text-muted-foreground">
                                                {formatReason(signal)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {showNearMisses && nearMisses.length === 0 && (
                        <div className="mt-3 text-center py-4 text-xs text-muted-foreground">
                            No signals in 25-39 conviction range
                        </div>
                    )}
                </div>
            </div>
        </HudFrame>
    );
}
