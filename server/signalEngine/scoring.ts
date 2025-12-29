/**
 * Signal Conviction Scoring
 * Implements 0-100 scoring model with penalties and bonuses
 */

import type { SignalContext } from "./types";
import { countPattern } from "./direction";

/**
 * Score a signal based on context
 * 
 * Components:
 * - HTF alignment: count * 10 (max 40)
 * - LTF agreement: count * 7.5 (max 30)
 * - Direction bonus: +15 if HTF=LTF
 * - Conflict penalty: -8 HTF, -7 LTF if tied
 * - Stale penalty: -5 per stale TF
 * - Error penalty: -5 per error TF
 * - Missing penalty: -5 per missing TF
 * 
 * Final: clamp to 0-100
 */
export function scoreSignal(context: SignalContext): number {
    let score = 0;

    // HTF Alignment (0-40 points)
    const htfBullish = countPattern(context.timeframes, "2U", "HTF");
    const htfBearish = countPattern(context.timeframes, "2D", "HTF");
    const htfAlignment = Math.max(htfBullish, htfBearish);
    const htfScore = htfAlignment * 10;
    score += htfScore;

    // LTF Agreement (0-30 points)
    const ltfBullish = countPattern(context.timeframes, "2U", "LTF");
    const ltfBearish = countPattern(context.timeframes, "2D", "LTF");
    const ltfAlignment = Math.max(ltfBullish, ltfBearish);
    const ltfScore = ltfAlignment * 7.5;
    score += ltfScore;

    // Direction Bonus (0-15 points)
    if (context.htfBias !== "mixed" && context.htfBias === context.ltfBias) {
        score += 15;
    }

    // Conflict Penalty (-15 points)
    let conflictPenalty = 0;

    // HTF conflict: 2U=2 AND 2D=2
    if (htfBullish === 2 && htfBearish === 2) {
        conflictPenalty += 8;
    }

    // LTF conflict: 2U=2 AND 2D=2
    if (ltfBullish === 2 && ltfBearish === 2) {
        conflictPenalty += 7;
    }

    score -= conflictPenalty;

    // Stale Penalty (-5 per stale TF)
    score -= context.reasons.staleCount * 5;

    // Error Penalty (-5 per error TF)
    score -= context.reasons.errorCount * 5;

    // Missing Penalty (-5 per missing TF)
    score -= context.reasons.missingCount * 5;

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
}

/**
 * Score Inside Compression signals
 * 
 * Lower baseline than HTFBC (LTF-driven instead of HTF-driven)
 * Conviction is clamped to [25,39] to ensure it always appears in near-misses
 */
export function scoreInsideCompression(context: SignalContext): number {
    let score = 20; // Base score (LTF-driven, weaker than HTFBC)

    const { ltfBullish, ltfBearish, htfBullish, htfBearish, staleCount, errorCount, missingCount } = context.reasons;

    // LTF alignment bonus (5 points per aligned LTF timeframe)
    const ltfAlignment = context.ltfBias === "2U" ? ltfBullish : ltfBearish;
    score += ltfAlignment * 5; // Max +20 for 4 aligned

    // HTF clean bonus (no opposing direction)
    const htfOpposing = context.ltfBias === "2U" ? htfBearish : htfBullish;
    if (htfOpposing === 0) {
        score += 5;
    }

    // Standard penalties
    score -= staleCount * 5;
    score -= errorCount * 10;
    score -= missingCount * 5;

    // Clamp to near-miss range [25, 39]
    return Math.max(25, Math.min(39, score));
}
