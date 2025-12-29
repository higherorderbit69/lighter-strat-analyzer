/**
 * FTC Signal Engine
 * Main orchestrator for signal generation
 */

import type { MultiTimeframeAnalysis, FTCTimeframe, FTCStratState } from "@shared/types";
import type { Signal, SignalContext, SignalReasons, SignalResponse, SignalDirection } from "./types";
import { computeHTFBias, computeLTFBias, countPattern, countStale, countError, countMissing } from "./direction";
import { detectChopAvoidance, detectHTFBiasConfirmation, detectInsideCompression } from "./detectors";
import { scoreSignal, scoreInsideCompression } from "./scoring";

/**
 * Build signal context from FTC analysis
 */
function buildContext(analysis: MultiTimeframeAnalysis): SignalContext {
    // Convert FTCStratState to TimeframeData format
    const timeframes: Partial<Record<FTCTimeframe, {
        patternType?: "1" | "2U" | "2D" | "3";
        stale?: boolean;
        error?: boolean;
    }>> = {};

    for (const [tf, state] of Object.entries(analysis.timeframes) as [FTCTimeframe, FTCStratState][]) {
        timeframes[tf] = {
            patternType: state.patternType,
            stale: state.stale,
            error: state.error ? true : undefined, // Convert string error to boolean
        };
    }

    const htfBias = computeHTFBias(timeframes as any);
    const ltfBias = computeLTFBias(timeframes as any);

    const reasons: SignalReasons = {
        htfBullish: countPattern(timeframes as any, "2U", "HTF"),
        htfBearish: countPattern(timeframes as any, "2D", "HTF"),
        ltfBullish: countPattern(timeframes as any, "2U", "LTF"),
        ltfBearish: countPattern(timeframes as any, "2D", "LTF"),
        staleCount: countStale(timeframes as any, "all"),
        errorCount: countError(timeframes as any, "all"),
        missingCount: countMissing(timeframes as any, "all"),
        htfBias,
        ltfBias,
    };

    return {
        symbol: analysis.symbol,
        marketId: analysis.marketId,
        timeframes: timeframes as any,
        htfBias,
        ltfBias,
        reasons,
    };
}

/**
 * Determine signal direction from context
 */
function determineDirection(context: SignalContext): SignalDirection {
    if (context.htfBias === "2U") {
        return "LONG";
    } else if (context.htfBias === "2D") {
        return "SHORT";
    } else {
        return "NEUTRAL";
    }
}

/**
 * Generate signals for a single market
 */
export function generateSignals(analysis: MultiTimeframeAnalysis): Signal[] {
    const context = buildContext(analysis);
    const signals: Signal[] = [];

    // Detect Chop Avoidance
    const chopDetected = detectChopAvoidance(context);

    // Detect HTFBC
    const htfbcDetected = detectHTFBiasConfirmation(context);

    if (htfbcDetected) {
        const direction = determineDirection(context);
        const conviction = scoreSignal(context);

        signals.push({
            id: "HTFBC",
            name: "HTF Bias Confirmation",
            symbol: context.symbol,
            marketId: context.marketId,
            direction,
            conviction,
            reasons: context.reasons,
            suppressedByChop: chopDetected,
        });
    } else {
        // Detect Inside Compression (only if HTFBC didn't fire)
        const icResult = detectInsideCompression(context);

        if (icResult.detected) {
            const conviction = scoreInsideCompression(context);

            signals.push({
                id: "IC",
                name: "Inside Compression - Early Breakout",
                symbol: context.symbol,
                marketId: context.marketId,
                direction: icResult.direction,
                conviction,
                reasons: context.reasons,
                suppressedByChop: chopDetected,
            });
        }
    }

    return signals;
}

/**
 * Generate signal response for multiple markets
 * Returns signals (>= 40 conviction) and near-misses (25-39 conviction)
 */
export function generateSignalResponse(analyses: MultiTimeframeAnalysis[]): SignalResponse {
    const allSignals: Signal[] = [];

    // Generate signals for each market
    for (const analysis of analyses) {
        const marketSignals = generateSignals(analysis);
        allSignals.push(...marketSignals);
    }

    // Split into signals and near-misses
    const signals = allSignals.filter(s => s.conviction >= 40);
    const nearMisses = allSignals.filter(s => s.conviction >= 25 && s.conviction < 40);

    // Sort by conviction DESC
    signals.sort((a, b) => b.conviction - a.conviction);
    nearMisses.sort((a, b) => b.conviction - a.conviction);

    return {
        signals,
        nearMisses,
    };
}
