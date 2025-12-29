/**
 * Signal Detectors
 * Phase 1: CA (Chop Avoidance) and HTFBC (HTF Bias Confirmation)
 */

import type { SignalContext } from "./types";
import { countPattern } from "./direction";

/**
 * Detect Chop Avoidance (CA)
 * Fires when both HTF and LTF show no clear direction
 * 
 * HTF Chop: (2U=2 AND 2D=2) OR (1+3 >= 2)
 * LTF Chop: (2U=2 AND 2D=2) OR (1+3 >= 2)
 */
export function detectChopAvoidance(context: SignalContext): boolean {
    const htf2U = countPattern(context.timeframes, "2U", "HTF");
    const htf2D = countPattern(context.timeframes, "2D", "HTF");
    const htf1 = countPattern(context.timeframes, "1", "HTF");
    const htf3 = countPattern(context.timeframes, "3", "HTF");

    const ltf2U = countPattern(context.timeframes, "2U", "LTF");
    const ltf2D = countPattern(context.timeframes, "2D", "LTF");
    const ltf1 = countPattern(context.timeframes, "1", "LTF");
    const ltf3 = countPattern(context.timeframes, "3", "LTF");

    // HTF chop condition
    const htfChop = (htf2U === 2 && htf2D === 2) || ((htf1 + htf3) >= 2);

    // LTF chop condition
    const ltfChop = (ltf2U === 2 && ltf2D === 2) || ((ltf1 + ltf3) >= 2);

    return htfChop && ltfChop;
}

/**
 * Detect HTF Bias Confirmation (HTFBC)
 * Fires when HTF has clear bias AND LTF agrees
 * 
 * Rules:
 * - HTF bias exists (>= 3 of 4 in one direction, i.e., not mixed)
 * - LTF agreement >= 3 of 4
 * - No stale HTF timeframes
 */
export function detectHTFBiasConfirmation(context: SignalContext): boolean {
    // HTF bias must not be mixed
    if (context.htfBias === "mixed") {
        return false;
    }

    // Check HTF has >= 3 timeframes in bias direction
    const htfPattern = context.htfBias;
    const htfCount = countPattern(context.timeframes, htfPattern, "HTF");
    if (htfCount < 3) {
        return false;
    }

    // LTF agreement: >= 3 of 4 LTF match HTF direction
    const ltfCount = countPattern(context.timeframes, htfPattern, "LTF");
    if (ltfCount < 3) {
        return false;
    }

    // No stale HTF timeframes
    if (context.reasons.staleCount > 0) {
        // More specific: check if any HTF timeframe is stale
        const htfTimeframes: Array<"1h" | "4h" | "12h" | "1d"> = ["1h", "4h", "12h", "1d"];
        const htfStale = htfTimeframes.some(tf => context.timeframes[tf]?.stale === true);
        if (htfStale) {
            return false;
        }
    }

    return true;
}

/**
 * Detect Inside Compression - Early Breakout Candidate
 * 
 * Criteria:
 * - HTF lacks clear direction (neutral/inside-heavy)
 * - HTF compression evidence: >=2 of 4 HTF timeframes are Inside bars (pattern "1")
 * - LTF has strong alignment: >=3 of 4 show same direction
 * - HTF has zero opposing direction
 * 
 * Represents potential early breakout setups
 */
export function detectInsideCompression(context: SignalContext): {
    detected: boolean;
    direction: "LONG" | "SHORT" | "NEUTRAL";
} {
    const { htfBullish, htfBearish, ltfBullish, ltfBearish } = context.reasons;

    // Count HTF inside bars (pattern "1")
    const htfInsideCount = countPattern(context.timeframes, "1", "HTF");

    // Require HTF compression evidence: >=2 inside bars
    if (htfInsideCount < 2) {
        return { detected: false, direction: "NEUTRAL" };
    }

    // HTF must lack clear direction (no strong bias)
    // Allow if htfBias is "mixed" OR if bullish/bearish counts are tied/weak
    const hasHTFDirection = context.htfBias !== "mixed" && (htfBullish >= 3 || htfBearish >= 3);
    if (hasHTFDirection) {
        return { detected: false, direction: "NEUTRAL" };
    }

    // Check for bullish candidate: LTF >=3 2U AND HTF has zero 2D
    if (ltfBullish >= 3 && htfBearish === 0) {
        return { detected: true, direction: "LONG" };
    }

    // Check for bearish candidate: LTF >=3 2D AND HTF has zero 2U
    if (ltfBearish >= 3 && htfBullish === 0) {
        return { detected: true, direction: "SHORT" };
    }

    return { detected: false, direction: "NEUTRAL" };
}
