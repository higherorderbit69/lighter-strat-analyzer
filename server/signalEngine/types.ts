/**
 * FTC Signal Engine Types
 * Phase 1: CA (Chop Avoidance) and HTFBC (HTF Bias Confirmation)
 */

import type { FTCTimeframe } from "@shared/types";

export type SignalDirection = "LONG" | "SHORT" | "NEUTRAL";
export type SignalId = "CA" | "HTFBC" | "IC";

export interface Signal {
    id: SignalId;
    name: string;
    symbol: string;
    marketId: number;
    direction: SignalDirection;
    conviction: number; // 0-100
    reasons: SignalReasons;
    suppressedByChop: boolean;
}

export interface SignalReasons {
    htfBullish: number;
    htfBearish: number;
    ltfBullish: number;
    ltfBearish: number;
    staleCount: number;
    errorCount: number;
    missingCount: number;
    htfBias: "2U" | "2D" | "mixed";
    ltfBias: "2U" | "2D" | "mixed";
}

export interface SignalContext {
    symbol: string;
    marketId: number;
    timeframes: Record<FTCTimeframe, {
        patternType?: "1" | "2U" | "2D" | "3";
        stale?: boolean;
        error?: boolean;
    }>;
    htfBias: "2U" | "2D" | "mixed";
    ltfBias: "2U" | "2D" | "mixed";
    reasons: SignalReasons;
}

export interface SignalResponse {
    signals: Signal[];
    nearMisses: Signal[]; // 25-39 conviction
}
