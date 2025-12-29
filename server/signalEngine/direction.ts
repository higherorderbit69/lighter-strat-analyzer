/**
 * Direction and Bias Computation
 * Determines HTF/LTF directional bias from pattern counts
 */

import type { FTCTimeframe } from "@shared/types";

const HTF_TIMEFRAMES: FTCTimeframe[] = ["1h", "4h", "12h", "1d"];
const LTF_TIMEFRAMES: FTCTimeframe[] = ["1m", "5m", "15m", "30m"];

export type Bias = "2U" | "2D" | "mixed";

interface TimeframeData {
    patternType?: "1" | "2U" | "2D" | "3";
    stale?: boolean;
    error?: boolean;
}

type TimeframesRecord = Partial<Record<FTCTimeframe, TimeframeData>>;

/**
 * Count patterns matching a specific type in given timeframes
 */
export function countPattern(
    timeframes: TimeframesRecord,
    pattern: "1" | "2U" | "2D" | "3",
    scope: "HTF" | "LTF" | "all"
): number {
    const targetTimeframes = scope === "HTF"
        ? HTF_TIMEFRAMES
        : scope === "LTF"
            ? LTF_TIMEFRAMES
            : [...HTF_TIMEFRAMES, ...LTF_TIMEFRAMES];

    return targetTimeframes.filter(tf =>
        timeframes[tf]?.patternType === pattern
    ).length;
}

/**
 * Count timeframes with missing data
 */
export function countMissing(
    timeframes: Record<FTCTimeframe, TimeframeData>,
    scope: "HTF" | "LTF" | "all"
): number {
    const targetTimeframes = scope === "HTF"
        ? HTF_TIMEFRAMES
        : scope === "LTF"
            ? LTF_TIMEFRAMES
            : [...HTF_TIMEFRAMES, ...LTF_TIMEFRAMES];

    return targetTimeframes.filter(tf =>
        !timeframes[tf] || !timeframes[tf].patternType
    ).length;
}

/**
 * Count timeframes with stale flag
 */
export function countStale(
    timeframes: Record<FTCTimeframe, TimeframeData>,
    scope: "HTF" | "LTF" | "all"
): number {
    const targetTimeframes = scope === "HTF"
        ? HTF_TIMEFRAMES
        : scope === "LTF"
            ? LTF_TIMEFRAMES
            : [...HTF_TIMEFRAMES, ...LTF_TIMEFRAMES];

    return targetTimeframes.filter(tf =>
        timeframes[tf]?.stale === true
    ).length;
}

/**
 * Count timeframes with error flag
 */
export function countError(
    timeframes: Record<FTCTimeframe, TimeframeData>,
    scope: "HTF" | "LTF" | "all"
): number {
    const targetTimeframes = scope === "HTF"
        ? HTF_TIMEFRAMES
        : scope === "LTF"
            ? LTF_TIMEFRAMES
            : [...HTF_TIMEFRAMES, ...LTF_TIMEFRAMES];

    return targetTimeframes.filter(tf =>
        timeframes[tf]?.error === true
    ).length;
}

/**
 * Compute directional bias for a scope
 * Rules:
 * - Bullish if 2U count > 2D count
 * - Bearish if 2D count > 2U count
 * - Mixed (neutral) if tied or no clear direction
 */
export function computeBias(
    timeframes: Record<FTCTimeframe, TimeframeData>,
    scope: "HTF" | "LTF"
): Bias {
    const bullishCount = countPattern(timeframes, "2U", scope);
    const bearishCount = countPattern(timeframes, "2D", scope);

    if (bullishCount > bearishCount) {
        return "2U";
    } else if (bearishCount > bullishCount) {
        return "2D";
    } else {
        return "mixed";
    }
}

/**
 * Compute HTF bias
 */
export function computeHTFBias(
    timeframes: Record<FTCTimeframe, TimeframeData>
): Bias {
    return computeBias(timeframes, "HTF");
}

/**
 * Compute LTF bias
 */
export function computeLTFBias(
    timeframes: Record<FTCTimeframe, TimeframeData>
): Bias {
    return computeBias(timeframes, "LTF");
}
