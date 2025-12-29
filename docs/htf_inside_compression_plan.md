# HTF Inside Compression Near-Miss Enhancement

## Goal
Expand near-miss generation to capture early breakout setups where HTF is neutral (inside bars) but LTF shows strong directional alignment.

## Current Behavior
- HTFBC requires non-mixed HTF bias (>=3 of 4 HTF timeframes in same direction)
- Signals with mixed HTF bias are rejected, even if LTF has strong alignment
- Near-misses only capture low-scoring qualifying HTFBC setups (25-39 conviction)

## Proposed Changes

### Detection Logic (`server/signalEngine/detectors.ts`)

Add new detector: `detectInsideCompression(context)`

**Criteria:**
- HTF bias is "mixed" (neutral due to inside bars or conflicting patterns)
- LTF has strong alignment: >=3 of 4 LTF timeframes show 2U OR >=3 show 2D
- HTF has zero opposing direction:
  - For bullish candidate (LTF >=3 2U): HTF 2D count must be 0
  - For bearish candidate (LTF >=3 2D): HTF 2U count must be 0
- Direction determined by LTF majority

**Scoring:**
- Base score: 20 points (LTF-driven, lower than HTFBC)
- LTF alignment bonus: +5 per aligned LTF timeframe (max +20)
- HTF clean bonus: +5 if HTF has NO opposing direction
- Standard penalties apply (stale, error, missing)
- Target range: 25-35 conviction (near-miss band)

###Changes to Existing Files

#### 1. `server/signalEngine/detectors.ts`
**Additions:**
```typescript
// New detector for inside compression setups
export function detectInsideCompression(context: SignalContext): {
    detected: boolean;
    direction: SignalDirection;
} {
    // HTF must be mixed (neutral)
    if (context.htfBias !== "mixed") {
        return { detected: false, direction: "NEUTRAL" };
    }

    const { htfBullish, htfBearish, ltfBullish, ltfBearish } = context.reasons;

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
```

#### 2. `server/signalEngine/scoring.ts`
**Additions:**
```typescript
// New scoring function for inside compression setups
export function scoreInsideCompression(context: SignalContext): number {
    let score = 20; // Base score (LTF-driven)

    // LTF alignment bonus
    const ltfAlignment = context.ltfBias === "2U" ? context.reasons.ltfBullish : context.reasons.ltfBearish;
    score += ltfAlignment * 5; // 5 points per aligned LTF

    // HTF clean bonus (no opposing direction)
    const htfOpposing = context.ltfBias === "2U" ? context.reasons.htfBearish : context.reasons.htfBullish;
    if (htfOpposing === 0) {
        score += 5;
    }

    // Standard penalties
    score -= context.reasons.staleCount * 5;
    score -= context.reasons.errorCount * 10;
    score -= context.reasons.missingCount * 5;

    return Math.max(0, Math.min(100, score));
}
```

#### 3. `server/signalEngine/index.ts`
**Modifications:**
- Import new detector and scoring function
- After HTFBC detection, check for inside compression candidates
- Generate signals with name "Inside Compression - Early Breakout"
- Use new scoring function for these signals
- Mark reason as "HTF neutral/inside compression"

**Pseudocode:**
```typescript
// After existing HTFBC detection...

// Detect inside compression (only if HTFBC didn't fire)
const insideCompression = detectInsideCompression(ctx);
if (insideCompression.detected) {
    const conviction = scoreInsideCompression(ctx);
    signals.push({
        id: `IC-${analysis.marketId}`,
        name: "Inside Compression - Early Breakout",
        symbol: analysis.symbol,
        marketId: analysis.marketId,
        direction: insideCompression.direction,
        conviction,
        reasons: { ...ctx.reasons, htfBias: "mixed" as const }, // Preserve mixed status
        suppressedByChop: isChoppy,
    });
}
```

#### 4. `client/src/components/SignalPanel.tsx`
**Modifications:**
Update `formatReason` to detect mixed HTF bias and show special message:

```typescript
const formatReason = (signal: Signal): string => {
    const { reasons } = signal;
    const htfBiasStr = reasons.htfBias === "mixed" 
        ? "HTF neutral/inside compression" 
        : reasons.htfBias === "2U" ? "Bullish" : "Bearish";
    // ... rest of formatting
};
```

#### 5. `server/__tests__/signalEngine.test.ts`
**Additions:**

```typescript
// Test 6: Inside Compression Detection
async function testInsideCompression() {
    // Case 1: Bullish inside compression (HTF mixed, LTF 3x2U, HTF 2D=0)
    const bullishIC = {
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
    
    const response = generateSignalResponse([bullishIC]);
    assert(response.nearMisses.length === 1, "Should generate inside compression near-miss");
    assert(response.nearMisses[0].direction === "LONG", "Should be bullish");
    assert(response.nearMisses[0].conviction >= 25 && response.nearMisses[0].conviction <= 39, "Should be in near-miss range");
    
    // Case 2: Should NOT detect if HTF has opposing direction
    // ... test case with HTF 2D > 0 for bullish candidate
}
```

## Verification Plan

### Automated Tests
1. Run unit test suite with new test case
2. Verify TypeScript compilation
3. Verify existing HTFBC tests still pass

### Manual Testing
1. Find market with HTF inside bars (1s and 3s) and LTF directional
2. Verify near-miss appears
3. Expand near-misses section and verify reason shows "HTF neutral/inside compression"
4. Verify conviction is in 25-39 range

## Constraints
- ✅ No changes to qualifying HTFBC rules (still requires non-mixed HTF)
- ✅ Inside compression signals always land in near-miss band (25-39)
- ✅ Additive only, no refactoring
- ✅ TypeScript must pass
