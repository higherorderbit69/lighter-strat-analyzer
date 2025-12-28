/**
 * Strat Pattern Analyzer
 * 
 * Implements "The Strat" trading methodology pattern detection with PREDICTIVE logic.
 * 
 * KEY CONCEPT: 
 * - We analyze what the CURRENT FORMING candle is doing relative to prior setups
 * - If a setup exists and the current candle has triggered it, show "TRIGGERED"
 * - If a setup exists and current candle hasn't triggered yet, show "IN FORCE"
 */

import type { StratCandle, StratPatternType, ActionableSetup } from "@shared/types";

/**
 * Classify a candle's pattern type relative to the previous candle
 */
export function classifyCandle(
    current: { high: number; low: number },
    previous: { high: number; low: number }
): StratPatternType {
    const higherHigh = current.high > previous.high;
    const lowerLow = current.low < previous.low;
    const lowerHigh = current.high < previous.high;
    const higherLow = current.low > previous.low;

    if (higherHigh && lowerLow) return "3";
    if (lowerHigh && higherLow) return "1";
    if (higherHigh && !lowerLow) return "2U";
    if (lowerLow && !higherHigh) return "2D";
    return "1";
}

/**
 * Classify all candles in an array
 */
export function classifyCandles(candles: Omit<StratCandle, "patternType">[]): StratCandle[] {
    if (candles.length === 0) return [];

    const result: StratCandle[] = [{ ...candles[0], patternType: undefined }];

    for (let i = 1; i < candles.length; i++) {
        const patternType = classifyCandle(candles[i], candles[i - 1]);
        result.push({ ...candles[i], patternType });
    }

    return result;
}

/**
 * Get pattern sequence string
 */
export function getPatternSequence(candles: StratCandle[], count: number = 5): string {
    const recentCandles = candles.slice(-count);
    return recentCandles
        .map((c) => c.patternType || "?")
        .join("-");
}

/**
 * Find the trigger bar before inside bars (searching backwards from a given position)
 */
function findTriggerBarBeforePosition(candles: StratCandle[], startPos: number): {
    triggerCandle: StratCandle | null;
    triggerIndex: number;
    insideCount: number
} {
    let insideCount = 0;

    for (let i = startPos; i >= 0; i--) {
        const pattern = candles[i].patternType;

        if (pattern === "1") {
            insideCount++;
            continue;
        }

        if (pattern === "2U" || pattern === "2D" || pattern === "3") {
            return { triggerCandle: candles[i], triggerIndex: i, insideCount };
        }
    }

    return { triggerCandle: null, triggerIndex: -1, insideCount };
}

/**
 * PREDICTIVE pattern detection
 * 
 * This is the core logic that determines what signal is relevant for the CURRENT candle.
 * 
 * The current candle (candles[-1]) IS classified - we use that classification to determine:
 * - If a prior setup has been TRIGGERED by the current candle's movement
 * - If a setup is still IN FORCE (current candle hasn't triggered it yet)
 * 
 * KEY INSIGHT: The "present" candle that's forming already HAS a pattern classification
 * based on what it has done so far. We use that to determine if breakouts occurred.
 */
export function predictActionableSetup(candles: StratCandle[]): ActionableSetup | null {
    if (candles.length < 4) return null;

    const current = candles[candles.length - 1];     // Current FORMING bar (already classified based on current state)
    const lastCompleted = candles[candles.length - 2]; // Last COMPLETED bar

    const currentPattern = current.patternType;
    const lastPattern = lastCompleted.patternType;

    // ===============================================
    // CASE 1: Current candle is INSIDE (1)
    // Look for what setup is building / in force
    // ===============================================
    if (currentPattern === "1") {
        // Find trigger bar before this inside bar
        const { triggerCandle, insideCount } = findTriggerBarBeforePosition(candles, candles.length - 2);

        if (triggerCandle && insideCount > 0) {
            const triggerPattern = triggerCandle.patternType;
            const triggerBullish = triggerCandle.close > triggerCandle.open;

            if (triggerPattern === "2U") {
                return {
                    pattern: `2U-${"1".repeat(Math.min(insideCount + 1, 3))} Setup`,
                    direction: "bullish",
                    description: `Inside bar(s) forming after bullish move. Break above ${triggerCandle.high.toFixed(2)} = bullish continuation`,
                    confidence: "high",
                };
            }

            if (triggerPattern === "2D") {
                return {
                    pattern: `2D-${"1".repeat(Math.min(insideCount + 1, 3))} Setup`,
                    direction: "bearish",
                    description: `Inside bar(s) forming after bearish move. Break below ${triggerCandle.low.toFixed(2)} = bearish continuation`,
                    confidence: "high",
                };
            }

            if (triggerPattern === "3") {
                return {
                    pattern: `3-${"1".repeat(Math.min(insideCount + 1, 3))} Setup`,
                    direction: triggerBullish ? "bullish" : "bearish",
                    description: `Consolidation after range expansion. Breakout imminent`,
                    confidence: "high",
                };
            }
        }

        // Just inside bars without clear trigger
        return {
            pattern: "Inside Bar",
            direction: current.close > current.open ? "bullish" : "bearish",
            description: "Consolidation - watching for directional break",
            confidence: "low",
        };
    }

    // ===============================================
    // CASE 2: Current candle is 2U (broke up)
    // Check what setup it triggered
    // ===============================================
    if (currentPattern === "2U") {
        // Check if previous candle was inside bar (continuation triggered)
        if (lastPattern === "1") {
            // Look for the original trigger bar before the inside
            const { triggerCandle, insideCount } = findTriggerBarBeforePosition(candles, candles.length - 2);

            if (triggerCandle) {
                if (triggerCandle.patternType === "2D") {
                    // This is a REVERSAL - bearish inside then broke bullish!
                    return {
                        pattern: "2D-1-2U Reversal",
                        direction: "bullish",
                        description: `Bullish reversal TRIGGERED! Bearish momentum reversed after inside bar`,
                        confidence: "high",
                    };
                }
                if (triggerCandle.patternType === "2U") {
                    // Bullish continuation triggered
                    return {
                        pattern: "2U-1-2U Continuation",
                        direction: "bullish",
                        description: `Bullish continuation TRIGGERED! ${insideCount} inside bar(s) broke up`,
                        confidence: "high",
                    };
                }
                if (triggerCandle.patternType === "3") {
                    return {
                        pattern: "3-1-2U Breakout",
                        direction: "bullish",
                        description: `Bullish breakout TRIGGERED from range expansion + consolidation`,
                        confidence: "high",
                    };
                }
            }
        }

        // Check for 2-2 reversal (previous was 2D, current is 2U)
        if (lastPattern === "2D") {
            return {
                pattern: "2-2 Reversal",
                direction: "bullish",
                description: "Bullish reversal ACTIVE! Bearish→Bullish momentum shift",
                confidence: "high",
            };
        }

        // Consecutive 2U = strong momentum
        if (lastPattern === "2U") {
            return {
                pattern: "Bullish Momentum",
                direction: "bullish",
                description: "Strong uptrend: consecutive higher highs",
                confidence: "medium",
            };
        }

        // Single 2U
        return {
            pattern: "2U Active",
            direction: "bullish",
            description: "Bullish bar, watching for continuation",
            confidence: "low",
        };
    }

    // ===============================================
    // CASE 3: Current candle is 2D (broke down)
    // Check what setup it triggered
    // ===============================================
    if (currentPattern === "2D") {
        if (lastPattern === "1") {
            const { triggerCandle, insideCount } = findTriggerBarBeforePosition(candles, candles.length - 2);

            if (triggerCandle) {
                if (triggerCandle.patternType === "2U") {
                    return {
                        pattern: "2U-1-2D Reversal",
                        direction: "bearish",
                        description: `Bearish reversal TRIGGERED! Bullish momentum reversed after inside bar`,
                        confidence: "high",
                    };
                }
                if (triggerCandle.patternType === "2D") {
                    return {
                        pattern: "2D-1-2D Continuation",
                        direction: "bearish",
                        description: `Bearish continuation TRIGGERED! ${insideCount} inside bar(s) broke down`,
                        confidence: "high",
                    };
                }
                if (triggerCandle.patternType === "3") {
                    return {
                        pattern: "3-1-2D Breakdown",
                        direction: "bearish",
                        description: `Bearish breakdown TRIGGERED from range expansion + consolidation`,
                        confidence: "high",
                    };
                }
            }
        }

        if (lastPattern === "2U") {
            return {
                pattern: "2-2 Reversal",
                direction: "bearish",
                description: "Bearish reversal ACTIVE! Bullish→Bearish momentum shift",
                confidence: "high",
            };
        }

        if (lastPattern === "2D") {
            return {
                pattern: "Bearish Momentum",
                direction: "bearish",
                description: "Strong downtrend: consecutive lower lows",
                confidence: "medium",
            };
        }

        return {
            pattern: "2D Active",
            direction: "bearish",
            description: "Bearish bar, watching for continuation",
            confidence: "low",
        };
    }

    // ===============================================
    // CASE 4: Current candle is 3 (outside bar)
    // ===============================================
    if (currentPattern === "3") {
        const bullish = current.close > current.open;
        return {
            pattern: "Outside Bar",
            direction: bullish ? "bullish" : "bearish",
            description: bullish
                ? "Range expansion with bullish close - strength signal"
                : "Range expansion with bearish close - weakness signal",
            confidence: "medium",
        };
    }

    return null;
}

/**
 * Full analysis of candles - classify and find actionable setup
 */
export function analyzeCandles(rawCandles: Omit<StratCandle, "patternType">[]): {
    candles: StratCandle[];
    patternSequence: string;
    actionableSetup: ActionableSetup | null;
} {
    const candles = classifyCandles(rawCandles);
    const patternSequence = getPatternSequence(candles);
    const actionableSetup = predictActionableSetup(candles);

    return {
        candles,
        patternSequence,
        actionableSetup,
    };
}
