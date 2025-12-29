/**
 * FTC Signal Engine Unit Tests
 * Phase 1: CA (Chop Avoidance) and HTFBC (HTF Bias Confirmation)
 */

import { computeHTFBias, computeLTFBias, countPattern } from "../signalEngine/direction";
import { detectChopAvoidance, detectHTFBiasConfirmation } from "../signalEngine/detectors";
import { scoreSignal } from "../signalEngine/scoring";
import { generateSignalResponse } from "../signalEngine";
import type { SignalContext } from "../signalEngine/types";
import type { MultiTimeframeAnalysis, FTCTimeframe } from "@shared/types";

// Test 1: Direction Computation
async function testDirectionComputation() {
    console.log("Test 1: Direction Computation");

    // Case 1: 3/4 bullish -> '2U'
    const bullishTimeframes = {
        "1h": { patternType: "2U" as const },
        "4h": { patternType: "2U" as const },
        "12h": { patternType: "2U" as const },
        "1d": { patternType: "2D" as const },
    };
    const htfBias1 = computeHTFBias(bullishTimeframes as any);
    console.assert(htfBias1 === "2U", `Expected '2U', got '${htfBias1}'`);

    // Case 2: Tie -> 'mixed'
    const tiedTimeframes = {
        "1h": { patternType: "2U" as const },
        "4h": { patternType: "2U" as const },
        "12h": { patternType: "2D" as const },
        "1d": { patternType: "2D" as const },
    };
    const htfBias2 = computeHTFBias(tiedTimeframes as any);
    console.assert(htfBias2 === "mixed", `Expected 'mixed', got '${htfBias2}'`);

    console.log("✅ Direction computation passed\n");
}

// Test 2: Chop Avoidance Detection
async function testChopAvoidance() {
    console.log("Test 2: Chop Avoidance Detection");

    // Case 1: Choppy market (HTF: 2U=2, 2D=2; LTF: 2U=2, 2D=2)
    const choppyContext: SignalContext = {
        symbol: "TEST",
        marketId: 1,
        timeframes: {
            "1h": { patternType: "2U" },
            "4h": { patternType: "2U" },
            "12h": { patternType: "2D" },
            "1d": { patternType: "2D" },
            "1m": { patternType: "2U" },
            "5m": { patternType: "2U" },
            "15m": { patternType: "2D" },
            "30m": { patternType: "2D" },
        } as any,
        htfBias: "mixed",
        ltfBias: "mixed",
        reasons: {
            htfBullish: 2,
            htfBearish: 2,
            ltfBullish: 2,
            ltfBearish: 2,
            staleCount: 0,
            errorCount: 0,
            missingCount: 0,
            htfBias: "mixed",
            ltfBias: "mixed",
        },
    };

    const isChoppy = detectChopAvoidance(choppyContext);
    console.assert(isChoppy === true, `Expected true, got ${isChoppy}`);

    // Case 2: Clear trend (not choppy)
    const trendingContext: SignalContext = {
        symbol: "TEST",
        marketId: 1,
        timeframes: {
            "1h": { patternType: "2U" },
            "4h": { patternType: "2U" },
            "12h": { patternType: "2U" },
            "1d": { patternType: "2U" },
            "1m": { patternType: "2U" },
            "5m": { patternType: "2U" },
            "15m": { patternType: "2U" },
            "30m": { patternType: "2U" },
        } as any,
        htfBias: "2U",
        ltfBias: "2U",
        reasons: {
            htfBullish: 4,
            htfBearish: 0,
            ltfBullish: 4,
            ltfBearish: 0,
            staleCount: 0,
            errorCount: 0,
            missingCount: 0,
            htfBias: "2U",
            ltfBias: "2U",
        },
    };

    const isNotChoppy = detectChopAvoidance(trendingContext);
    console.assert(isNotChoppy === false, `Expected false, got ${isNotChoppy}`);

    console.log("✅ Chop avoidance detection passed\n");
}

// Test 3: HTFBC Detection
async function testHTFBCDetection() {
    console.log("Test 3: HTFBC Detection");

    // Case 1: Valid HTFBC (HTF bias + LTF agreement >= 3)
    const validContext: SignalContext = {
        symbol: "TEST",
        marketId: 1,
        timeframes: {
            "1h": { patternType: "2U", stale: false },
            "4h": { patternType: "2U", stale: false },
            "12h": { patternType: "2U", stale: false },
            "1d": { patternType: "2D", stale: false },
            "1m": { patternType: "2U" },
            "5m": { patternType: "2U" },
            "15m": { patternType: "2U" },
            "30m": { patternType: "2D" },
        } as any,
        htfBias: "2U",
        ltfBias: "2U",
        reasons: {
            htfBullish: 3,
            htfBearish: 1,
            ltfBullish: 3,
            ltfBearish: 1,
            staleCount: 0,
            errorCount: 0,
            missingCount: 0,
            htfBias: "2U",
            ltfBias: "2U",
        },
    };

    const htfbcValid = detectHTFBiasConfirmation(validContext);
    console.assert(htfbcValid === true, `Expected true, got ${htfbcValid}`);

    // Case 2: Invalid (HTF mixed bias)
    const invalidContext: SignalContext = {
        ...validContext,
        htfBias: "mixed",
        reasons: {
            ...validContext.reasons,
            htfBias: "mixed",
        },
    };

    const htfbcInvalid = detectHTFBiasConfirmation(invalidContext);
    console.assert(htfbcInvalid === false, `Expected false, got ${htfbcInvalid}`);

    console.log("✅ HTFBC detection passed\n");
}

// Test 4: Scoring Clamp
async function testScoringClamp() {
    console.log("Test 4: Scoring Clamp");

    // Case 1: Perfect alignment (should clamp to 100)
    const perfectContext: SignalContext = {
        symbol: "TEST",
        marketId: 1,
        timeframes: {
            "1h": { patternType: "2U" },
            "4h": { patternType: "2U" },
            "12h": { patternType: "2U" },
            "1d": { patternType: "2U" },
            "1m": { patternType: "2U" },
            "5m": { patternType: "2U" },
            "15m": { patternType: "2U" },
            "30m": { patternType: "2U" },
        } as any,
        htfBias: "2U",
        ltfBias: "2U",
        reasons: {
            htfBullish: 4,
            htfBearish: 0,
            ltfBullish: 4,
            ltfBearish: 0,
            staleCount: 0,
            errorCount: 0,
            missingCount: 0,
            htfBias: "2U",
            ltfBias: "2U",
        },
    };

    const perfectScore = scoreSignal(perfectContext);
    console.assert(perfectScore === 85, `Expected 85 (40+30+15), got ${perfectScore}`);

    // Case 2: Heavy penalties (should not go below 0)
    const penaltyContext: SignalContext = {
        symbol: "TEST",
        marketId: 1,
        timeframes: {
            "1h": { patternType: "2U", stale: true, error: true },
            "4h": { patternType: "2U", stale: true, error: true },
            "12h": { patternType: "2D", stale: true },
            "1d": { patternType: "2D", stale: true },
            "1m": { patternType: "2U" },
            "5m": { patternType: "2D" },
            "15m": { patternType: "1" },
            "30m": { patternType: "3" },
        } as any,
        htfBias: "mixed",
        ltfBias: "mixed",
        reasons: {
            htfBullish: 2,
            htfBearish: 2,
            ltfBullish: 1,
            ltfBearish: 1,
            staleCount: 4,
            errorCount: 2,
            missingCount: 0,
            htfBias: "mixed",
            ltfBias: "mixed",
        },
    };

    const penaltyScore = scoreSignal(penaltyContext);
    console.assert(penaltyScore >= 0, `Score should not be negative, got ${penaltyScore}`);
    console.assert(penaltyScore <= 100, `Score should not exceed 100, got ${penaltyScore}`);

    console.log("✅ Scoring clamp passed\n");
}

// Test 5: Shortlist Order
async function testShortlistOrder() {
    console.log("Test 5: Shortlist Order");

    const analyses: MultiTimeframeAnalysis[] = [
        {
            marketId: 1,
            symbol: "BTC",
            lastUpdated: Date.now(),
            timeframes: {
                "1h": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "4h": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "12h": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "1d": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "1m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "5m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "15m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "30m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
            },
            confluence: { bullishTimeframes: [], bearishTimeframes: [], totalTimeframes: 8 },
        },
        {
            marketId: 2,
            symbol: "ETH",
            lastUpdated: Date.now(),
            timeframes: {
                "1h": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "4h": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "12h": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "1d": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
                "1m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "5m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "15m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
                "30m": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
            },
            confluence: { bullishTimeframes: [], bearishTimeframes: [], totalTimeframes: 8 },
        },
    ];

    const response = generateSignalResponse(analyses);

    // Signals should be sorted by conviction DESC
    console.assert(response.signals.length >= 1, "Should have at least 1 signal");

    if (response.signals.length >= 2) {
        console.assert(
            response.signals[0].conviction >= response.signals[1].conviction,
            `Signals should be sorted DESC, got ${response.signals[0].conviction} < ${response.signals[1].conviction}`
        );
    }

    console.log("✅ Shortlist order passed\n");
}

// Test 6: Inside Compression Detection
async function testInsideCompressionDetection() {
    console.log("Test 6: Inside Compression Detection");

    // Case 1: Bullish IC (HTF mixed with >=2 inside bars, LTF >=3 2U, HTF 2D=0)
    const bullishIC: MultiTimeframeAnalysis = {
        marketId: 1,
        symbol: "TEST",
        lastUpdated: Date.now(),
        timeframes: {
            "1h": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
            "4h": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
            "12h": { pattern: "", direction: "neutral", patternType: "3", lastUpdated: Date.now(), stale: false },
            "1d": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
            "1m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
            "5m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
            "15m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
            "30m": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
        },
        confluence: { bullishTimeframes: [], bearishTimeframes: [], totalTimeframes: 8 },
    };

    const response1 = generateSignalResponse([bullishIC]);
    console.assert(response1.nearMisses.length === 1, `Expected 1 near-miss, got ${response1.nearMisses.length}`);
    console.assert(response1.nearMisses[0].direction === "LONG", `Expected LONG, got ${response1.nearMisses[0].direction}`);
    console.assert(response1.nearMisses[0].conviction >= 25 && response1.nearMisses[0].conviction <= 39, `Conviction should be in [25,39], got ${response1.nearMisses[0].conviction}`);
    console.assert(response1.nearMisses[0].name === "Inside Compression - Early Breakout", `Expected IC signal name, got ${response1.nearMisses[0].name}`);

    // Case 2: Should NOT detect if HTF has opposing direction (HTF 2D > 0)
    const noICOpposing: MultiTimeframeAnalysis = {
        marketId: 2,
        symbol: "TEST2",
        lastUpdated: Date.now(),
        timeframes: {
            "1h": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
            "4h": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
            "12h": { pattern: "", direction: "bearish", patternType: "2D", lastUpdated: Date.now(), stale: false }, // Opposing!
            "1d": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
            "1m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
            "5m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
            "15m": { pattern: "", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
            "30m": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
        },
        confluence: { bullishTimeframes: [], bearishTimeframes: [], totalTimeframes: 8 },
    };

    const response2 = generateSignalResponse([noICOpposing]);
    console.assert(response2.nearMisses.length === 0, `Should not generate IC when HTF has opposing direction, got ${response2.nearMisses.length}`);

    // Case 3: Bearish IC (HTF mixed with inside bars, LTF >=3 2D, HTF 2U=0)
    const bearishIC: MultiTimeframeAnalysis = {
        marketId: 3,
        symbol: "TEST3",
        lastUpdated: Date.now(),
        timeframes: {
            "1h": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
            "4h": { pattern: "", direction: "neutral", patternType: "3", lastUpdated: Date.now(), stale: false },
            "12h": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
            "1d": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
            "1m": { pattern: "", direction: "bearish", patternType: "2D", lastUpdated: Date.now(), stale: false },
            "5m": { pattern: "", direction: "bearish", patternType: "2D", lastUpdated: Date.now(), stale: false },
            "15m": { pattern: "", direction: "bearish", patternType: "2D", lastUpdated: Date.now(), stale: false },
            "30m": { pattern: "", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
        },
        confluence: { bullishTimeframes: [], bearishTimeframes: [], totalTimeframes: 8 },
    };

    const response3 = generateSignalResponse([bearishIC]);
    console.assert(response3.nearMisses.length === 1, `Expected 1 near-miss, got ${response3.nearMisses.length}`);
    console.assert(response3.nearMisses[0].direction === "SHORT", `Expected SHORT, got ${response3.nearMisses[0].direction}`);
    console.assert(response3.nearMisses[0].conviction >= 25 && response3.nearMisses[0].conviction <= 39, `Conviction should be in [25,39], got ${response3.nearMisses[0].conviction}`);

    console.log("✅ Inside compression detection passed\n");
}

// Run all tests
async function runAllTests() {
    console.log("=== FTC Signal Engine Tests ===\n");

    await testDirectionComputation();
    await testChopAvoidance();
    await testHTFBCDetection();
    await testScoringClamp();
    await testShortlistOrder();
    await testInsideCompressionDetection();

    console.log("=== All Tests Passed ✅ ===");
}

runAllTests().catch(console.error);
