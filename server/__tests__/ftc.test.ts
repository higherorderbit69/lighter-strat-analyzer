/**
 * Unit Tests for FTC Rate Limiter and Confluence Calculation
 * Run with: npx tsx server/__tests__/ftc.test.ts
 */

import { RateLimiter } from "../lib/rateLimiter";
import { calculateConfluence } from "../lib/ftcService";
import type { FTCStratState, FTCTimeframe } from "@shared/types";

// ============================================================================
// Rate Limiter Tests
// ============================================================================

async function testRateLimiterConcurrency() {
    console.log("\n[TEST] Rate Limiter Concurrency Behavior");

    const limiter = new RateLimiter(5); // Max 5 concurrent (production value)
    let concurrent = 0;
    let maxConcurrent = 0;
    let maxQueueLength = 0;

    // Create 15 tasks to prove max concurrency = 5 and queueing occurs
    const tasks = Array.from({ length: 15 }, (_, i) =>
        limiter.execute(async () => {
            concurrent++;
            maxConcurrent = Math.max(maxConcurrent, concurrent);

            // Track queue length during execution
            const stats = limiter.getStats();
            maxQueueLength = Math.max(maxQueueLength, stats.queueLength);

            // Simulate async work
            await new Promise(resolve => setTimeout(resolve, 50));

            concurrent--;
            return i;
        })
    );

    const allResults = await Promise.all(tasks);

    // Assertions
    const concurrencyRespected = maxConcurrent <= 5;
    const queueingOccurred = maxQueueLength > 0;
    const allCompleted = allResults.length === 15;
    const passed = concurrencyRespected && queueingOccurred && allCompleted;

    console.log(`  Tasks scheduled: 15`);
    console.log(`  Max concurrent observed: ${maxConcurrent} (limit: 5)`);
    console.log(`  Max queue length: ${maxQueueLength}`);
    console.log(`  All tasks completed: ${allCompleted}`);
    console.log(`  Concurrency respected: ${concurrencyRespected ? "✅" : "❌"}`);
    console.log(`  Queueing occurred: ${queueingOccurred ? "✅" : "❌"}`);
    console.log(`  Result: ${passed ? "✅ PASS" : "❌ FAIL"}`);

    return passed;
}

async function testRateLimiterStats() {
    console.log("\n[TEST] Rate Limiter Stats");

    const limiter = new RateLimiter(2);

    // Queue 5 tasks
    const tasks = Array.from({ length: 5 }, (_, i) =>
        limiter.execute(async () => {
            await new Promise(resolve => setTimeout(resolve, 30));
            return i;
        })
    );

    // Check stats immediately (should show some queued)
    await new Promise(resolve => setTimeout(resolve, 10));
    const stats = limiter.getStats();

    const passed = stats.currentlyRunning <= 2 && stats.maxConcurrent === 2;
    console.log(`  Currently running: ${stats.currentlyRunning}`);
    console.log(`  Queue length: ${stats.queueLength}`);
    console.log(`  Max concurrent: ${stats.maxConcurrent}`);
    console.log(`  Result: ${passed ? "✅ PASS" : "❌ FAIL"}`);

    await Promise.all(tasks); // Clean up
    return passed;
}

// ============================================================================
// Confluence Calculation Tests
// ============================================================================

function testConfluenceAllBullish() {
    console.log("\n[TEST] Confluence: All Bullish");

    const timeframes: Partial<Record<FTCTimeframe, FTCStratState>> = {
        "1m": { pattern: "2U Active", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
        "5m": { pattern: "2U Active", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
        "15m": { pattern: "2U Active", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
        "1h": { pattern: "2U Active", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
    };

    const confluence = calculateConfluence(timeframes);

    const passed =
        confluence.bullishTimeframes.length === 4 &&
        confluence.bearishTimeframes.length === 0 &&
        confluence.totalTimeframes === 4;

    console.log(`  Bullish TFs: ${confluence.bullishTimeframes.length}`);
    console.log(`  Bearish TFs: ${confluence.bearishTimeframes.length}`);
    console.log(`  Total TFs: ${confluence.totalTimeframes}`);
    console.log(`  Result: ${passed ? "✅ PASS" : "❌ FAIL"}`);

    return passed;
}

function testConfluenceMixed() {
    console.log("\n[TEST] Confluence: Mixed Signals");

    const timeframes: Partial<Record<FTCTimeframe, FTCStratState>> = {
        "1m": { pattern: "2U Active", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
        "5m": { pattern: "2D Active", direction: "bearish", patternType: "2D", lastUpdated: Date.now(), stale: false },
        "15m": { pattern: "Inside Bar", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: false },
        "1h": { pattern: "Outside Bar", direction: "bullish", patternType: "3", lastUpdated: Date.now(), stale: false },
        "4h": { pattern: "2U Active", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
    };

    const confluence = calculateConfluence(timeframes);

    const passed =
        confluence.bullishTimeframes.length === 2 && // 1m, 4h
        confluence.bearishTimeframes.length === 1 && // 5m
        confluence.totalTimeframes === 5;

    console.log(`  Bullish TFs: ${confluence.bullishTimeframes.join(", ")}`);
    console.log(`  Bearish TFs: ${confluence.bearishTimeframes.join(", ")}`);
    console.log(`  Total TFs: ${confluence.totalTimeframes}`);
    console.log(`  Result: ${passed ? "✅ PASS" : "❌ FAIL"}`);

    return passed;
}

function testConfluenceWithErrors() {
    console.log("\n[TEST] Confluence: Handles Errors");

    const timeframes: Partial<Record<FTCTimeframe, FTCStratState>> = {
        "1m": { pattern: "2U Active", direction: "bullish", patternType: "2U", lastUpdated: Date.now(), stale: false },
        "5m": { pattern: "Error", direction: "neutral", patternType: "1", lastUpdated: Date.now(), stale: true, error: "API timeout" },
        "15m": { pattern: "2D Active", direction: "bearish", patternType: "2D", lastUpdated: Date.now(), stale: false },
    };

    const confluence = calculateConfluence(timeframes);

    // Error TF should be excluded from count
    const passed =
        confluence.bullishTimeframes.length === 1 &&
        confluence.bearishTimeframes.length === 1 &&
        confluence.totalTimeframes === 2; // Only 2 valid TFs

    console.log(`  Bullish TFs: ${confluence.bullishTimeframes.length}`);
    console.log(`  Bearish TFs: ${confluence.bearishTimeframes.length}`);
    console.log(`  Total TFs: ${confluence.totalTimeframes} (excludes error)`);
    console.log(`  Result: ${passed ? "✅ PASS" : "❌ FAIL"}`);

    return passed;
}

function testConfluenceEmpty() {
    console.log("\n[TEST] Confluence: Empty Timeframes");

    const timeframes: Partial<Record<FTCTimeframe, FTCStratState>> = {};

    const confluence = calculateConfluence(timeframes);

    const passed =
        confluence.bullishTimeframes.length === 0 &&
        confluence.bearishTimeframes.length === 0 &&
        confluence.totalTimeframes === 0;

    console.log(`  Total TFs: ${confluence.totalTimeframes}`);
    console.log(`  Result: ${passed ? "✅ PASS" : "❌ FAIL"}`);

    return passed;
}

// ============================================================================
// Test Runner
// ============================================================================

async function runAllTests() {
    console.log("=".repeat(60));
    console.log("FTC UNIT TESTS");
    console.log("=".repeat(60));

    const results = {
        rateLimiterConcurrency: await testRateLimiterConcurrency(),
        rateLimiterStats: await testRateLimiterStats(),
        confluenceAllBullish: testConfluenceAllBullish(),
        confluenceMixed: testConfluenceMixed(),
        confluenceWithErrors: testConfluenceWithErrors(),
        confluenceEmpty: testConfluenceEmpty(),
    };

    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));

    const total = Object.keys(results).length;
    const passed = Object.values(results).filter(Boolean).length;

    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`\nOverall: ${passed === total ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);

    process.exit(passed === total ? 0 : 1);
}

// Run tests
runAllTests();
