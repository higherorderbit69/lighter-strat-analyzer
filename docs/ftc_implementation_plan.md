# FTC Implementation Plan

## 1. Design Understanding

The Full Timeframe Continuity (FTC) feature provides a **multi-timeframe dashboard view** where users can see Strat pattern analysis across **8 timeframes** (1m, 5m, 15m, 30m, 1h, 4h, 12h, 1d) for multiple markets simultaneously.

**Note**: 1w timeframe is excluded due to unreliable API data.

**Core Architecture:**
- **Server-side orchestration**: All data fetching, caching, and aggregation happens on the backend
- **Tiered caching**: Higher timeframes (1d, 12h) cached aggressively (4-12h TTL), lower timeframes (1m, 5m) refresh frequently (30s-2m TTL)
- **Rate limiting**: Maximum 5 concurrent API requests; additional requests queue
- **Confluence calculation**: Count timeframes showing bullish (2U) vs bearish (2D) patterns, derive 0-100 score and categorical label

**Data Flow:**
1. Client calls `strat.getFTCMatrix({ markets: Market[] })`
2. Server checks in-memory cache for each (marketId, timeframe) pair
3. On cache miss, fetches native candles from Lighter API (respecting rate limits)
4. Runs existing `analyzeCandles()` per timeframe
5. Aggregates results into `MultiTimeframeAnalysis` objects
6. Returns array to client

## 2. Invariants (Must Not Break)

### Behavioral Invariants
1. **Existing single-timeframe behavior**: When `FTC_ENABLED=false`, app functions identically to current production
2. **Pattern classification logic**: `stratAnalyzer.ts` classification rules remain unchanged
3. **API contracts**: Current tRPC endpoints continue to work
4. **Data correctness**: FTC pattern results match single-timeframe analysis for same market+timeframe

### Architectural Invariants
1. **No client-side API calls**: FTC must not introduce direct Lighter API calls from browser
2. **Additive only**: No refactoring of existing modules
3. **Cache isolation**: FTC caching must not interfere with existing data flows
4. **Type safety**: All new types properly exported from `shared/types.ts`

## 3. Files to Touch

### New Files (Create)
- `server/lib/ftcService.ts` - FTC orchestration + caching
- `server/lib/rateLimiter.ts` - Request queue/limiter wrapper
- `client/src/components/ftc/FTCDashboard.tsx`
- `client/src/components/ftc/FTCMarketCard.tsx`
- `client/src/components/ftc/TimeframeMatrix.tsx`
- `client/src/components/ftc/ConfluenceBadge.tsx`
- `client/src/components/ftc/SignalStrengthMeter.tsx`

### Existing Files (Modify - Additive Only)
- `shared/types.ts` - Add FTC interfaces
- `server/routers/strat.ts` - Add `getFTCMatrix` procedure
- `client/src/pages/Home.tsx` - Add FTC toggle + conditional rendering
- Environment config - Add `FTC_ENABLED` flag

### Files to NOT Touch
- `server/lib/stratAnalyzer.ts` - Already pure and reusable
- `server/lib/lighterApi.ts` - Will wrap with rate limiter, not modify
- Any existing client components

## 4. Validated Assumptions

1. **8 timeframes**: Using 1m, 5m, 15m, 30m, 1h, 4h, 12h, 1d (1w excluded)
2. **`analyzeCandles()` purity**: ✅ Confirmed - function is pure, no side effects
3. **Rate limits**: 5 concurrent requests is conservative
4. **Cache stale tolerance**: Users accept that 1d candles might be 4 hours old

## 5. Implementation Roadmap

### Step 1: Define FTC Data Model (Types Only)
**Scope**: Add TypeScript interfaces to `shared/types.ts`

**Changes:**
- Add `FTC_TIMEFRAMES` constant (8 timeframes)
- Add `StratAnalysis` interface
- Add `MarketConfluence` interface
- Add `MultiTimeframeAnalysis` interface
- Add `FTCResponse` type alias

**Why First**: Validates data contract understanding, enables parallel dev, zero risk

**Acceptance Criteria:**
- Types compile without errors
- Can be imported in both server and client
- Matches spec section 3 exactly
- PR < 30 lines

### Step 2: Server-Side Aggregation
**Scope**: Create FTC service with caching

**Changes:**
- Create `server/lib/rateLimiter.ts` - Queue with max 5 concurrent requests
- Create `server/lib/ftcService.ts`:
  - In-memory cache Map with TTL
  - `fetchAndAnalyze(market, timeframes[])` function
  - `calculateConfluence()` function
- Add unit tests for confluence calculation

**Acceptance Criteria:**
- Rate limiter prevents >5 concurrent requests
- Cache respects TTL per timeframe
- Confluence score calculation matches spec

### Step 3: tRPC Endpoint
**Scope**: Wire FTC service to API

**Changes:**
- Add `getFTCMatrix` procedure to `server/routers/strat.ts`
- Input validation: `{ markets: Market[] }`
- Output: `FTCResponse`
- Error handling for partial failures

**Acceptance Criteria:**
- Endpoint callable from client
- Returns valid `MultiTimeframeAnalysis[]`
- Handles missing timeframe data gracefully

### Step 4: UI Implementation
**Scope**: Create FTC dashboard components

**Changes:**
- Create all FTC components (Dashboard, Card, Matrix, Badge, Meter)
- Add FTC toggle to `Home.tsx` (behind `FTC_ENABLED`)
- Implement 3x3 grid layout (8 cells + 1 confluence summary)
- Add color coding: Green (2U), Red (2D), Yellow (1), Purple (3)

**Acceptance Criteria:**
- Toggle switches between single-TF and FTC views
- Matrix displays all 8 timeframes
- Confluence badge shows score and label
- Loading/stale states handled

### Step 5: Export Feature
**Scope**: Add JSON export

**Changes:**
- Add "Export JSON" button to FTC dashboard
- Generate canonical export DTO
- Download as `.json` file

**Acceptance Criteria:**
- Export matches spec section 8 format
- File downloads with timestamp in filename

## 6. Step 1 Detailed Spec (Ready to Implement)

**File**: `shared/types.ts`

**Add the following:**

```typescript
// FTC Timeframes (8 total - 1w excluded due to API reliability)
export const FTC_TIMEFRAMES = ["1m", "5m", "15m", "30m", "1h", "4h", "12h", "1d"] as const;
export type FTCTimeframe = (typeof FTC_TIMEFRAMES)[number];

// Single timeframe analysis result for FTC
export interface StratAnalysis {
    pattern: string;         // e.g., "2-2 Continuation"
    direction: "bullish" | "bearish" | "neutral";
    confidence: "high" | "medium" | "low";
    patternType: "1" | "2U" | "2D" | "3"; // Raw type of current candle
}

// Confluence metrics across all timeframes
export interface MarketConfluence {
    bullishTimeframes: string[]; // e.g., ["1h", "4h"]
    bearishTimeframes: string[]; // e.g., ["5m"]
    score: number;               // 0-100 (bullish dominance)
    label: "Strong Buy" | "Buy" | "Neutral" | "Sell" | "Strong Sell";
}

// Multi-timeframe analysis for a single market
export interface MultiTimeframeAnalysis {
    marketId: number;
    symbol: string;
    timeframes: Record<string, StratAnalysis>; // Map of timeframe -> analysis
    confluence: MarketConfluence;
    lastUpdated: number; // Unix timestamp
}

// FTC API response type
export type FTCResponse = MultiTimeframeAnalysis[];
```

**Testing**: Import in a test file to verify compilation.
