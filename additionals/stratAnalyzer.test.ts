import { describe, expect, it } from "vitest";
import { classifyStratPattern, analyzeCandles, getPatternSequence, identifyActionableSetup } from "./stratAnalyzer";
import type { Candle, StratCandle } from "@shared/types";

describe("classifyStratPattern", () => {
  it("should classify Type 1 (Inside Bar) correctly", () => {
    const previous: Candle = { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 };
    const current: Candle = { timestamp: 2, open: 102, high: 108, low: 92, close: 104, volume: 1000 };
    
    expect(classifyStratPattern(current, previous)).toBe("1");
  });

  it("should classify Type 2-Up (Directional Up) correctly", () => {
    const previous: Candle = { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 };
    const current: Candle = { timestamp: 2, open: 105, high: 115, low: 95, close: 112, volume: 1000 };
    
    expect(classifyStratPattern(current, previous)).toBe("2U");
  });

  it("should classify Type 2-Down (Directional Down) correctly", () => {
    const previous: Candle = { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 };
    const current: Candle = { timestamp: 2, open: 95, high: 105, low: 85, close: 88, volume: 1000 };
    
    expect(classifyStratPattern(current, previous)).toBe("2D");
  });

  it("should classify Type 3 (Outside Bar) correctly", () => {
    const previous: Candle = { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 };
    const current: Candle = { timestamp: 2, open: 95, high: 120, low: 85, close: 115, volume: 1000 };
    
    expect(classifyStratPattern(current, previous)).toBe("3");
  });

  it("should handle edge case where candle touches but doesn't break", () => {
    const previous: Candle = { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 };
    const current: Candle = { timestamp: 2, open: 100, high: 110, low: 90, close: 105, volume: 1000 };
    
    // Touching exactly should be treated as inside
    expect(classifyStratPattern(current, previous)).toBe("1");
  });
});

describe("analyzeCandles", () => {
  it("should return empty array for empty input", () => {
    expect(analyzeCandles([])).toEqual([]);
  });

  it("should return single candle with null pattern", () => {
    const candles: Candle[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 }
    ];
    const result = analyzeCandles(candles);
    
    expect(result).toHaveLength(1);
    expect(result[0].patternType).toBeNull();
  });

  it("should classify multiple candles correctly", () => {
    const candles: Candle[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
      { timestamp: 2, open: 105, high: 108, low: 92, close: 104, volume: 1000 }, // Inside
      { timestamp: 3, open: 104, high: 115, low: 95, close: 112, volume: 1000 }, // 2-Up
    ];
    
    const result = analyzeCandles(candles);
    
    expect(result).toHaveLength(3);
    expect(result[0].patternType).toBeNull();
    expect(result[1].patternType).toBe("1");
    expect(result[2].patternType).toBe("2U");
  });
});

describe("getPatternSequence", () => {
  it("should return pattern sequence string", () => {
    const stratCandles: StratCandle[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000, patternType: null },
      { timestamp: 2, open: 105, high: 108, low: 92, close: 104, volume: 1000, patternType: "1" },
      { timestamp: 3, open: 104, high: 115, low: 95, close: 112, volume: 1000, patternType: "2U" },
    ];
    
    expect(getPatternSequence(stratCandles, 3)).toBe("?-1-2U");
  });

  it("should limit to specified length", () => {
    const stratCandles: StratCandle[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000, patternType: "2D" },
      { timestamp: 2, open: 105, high: 108, low: 92, close: 104, volume: 1000, patternType: "1" },
      { timestamp: 3, open: 104, high: 115, low: 95, close: 112, volume: 1000, patternType: "2U" },
      { timestamp: 4, open: 112, high: 118, low: 100, close: 115, volume: 1000, patternType: "2U" },
    ];
    
    expect(getPatternSequence(stratCandles, 2)).toBe("2U-2U");
  });
});

describe("identifyActionableSetup", () => {
  it("should identify 2-1-2U bullish continuation", () => {
    const stratCandles: StratCandle[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000, patternType: "2U" },
      { timestamp: 2, open: 105, high: 108, low: 92, close: 104, volume: 1000, patternType: "1" },
      { timestamp: 3, open: 104, high: 115, low: 95, close: 112, volume: 1000, patternType: "2U" },
    ];
    
    const setup = identifyActionableSetup(stratCandles);
    
    expect(setup).not.toBeNull();
    expect(setup?.type).toBe("continuation");
    expect(setup?.direction).toBe("bullish");
    expect(setup?.pattern).toBe("2-1-2U");
  });

  it("should identify 2-1-2D bearish continuation", () => {
    const stratCandles: StratCandle[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 95, volume: 1000, patternType: "2D" },
      { timestamp: 2, open: 95, high: 98, low: 88, close: 92, volume: 1000, patternType: "1" },
      { timestamp: 3, open: 92, high: 95, low: 82, close: 85, volume: 1000, patternType: "2D" },
    ];
    
    const setup = identifyActionableSetup(stratCandles);
    
    expect(setup).not.toBeNull();
    expect(setup?.type).toBe("continuation");
    expect(setup?.direction).toBe("bearish");
    expect(setup?.pattern).toBe("2-1-2D");
  });

  it("should identify 2D-1-2U bullish reversal", () => {
    const stratCandles: StratCandle[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 95, volume: 1000, patternType: "2D" },
      { timestamp: 2, open: 95, high: 98, low: 92, close: 96, volume: 1000, patternType: "1" },
      { timestamp: 3, open: 96, high: 105, low: 94, close: 102, volume: 1000, patternType: "2U" },
    ];
    
    const setup = identifyActionableSetup(stratCandles);
    
    expect(setup).not.toBeNull();
    expect(setup?.type).toBe("reversal");
    expect(setup?.direction).toBe("bullish");
  });

  it("should identify 3-1-2U bullish breakout", () => {
    const stratCandles: StratCandle[] = [
      { timestamp: 1, open: 100, high: 115, low: 85, close: 110, volume: 1000, patternType: "3" },
      { timestamp: 2, open: 110, high: 112, low: 105, close: 108, volume: 1000, patternType: "1" },
      { timestamp: 3, open: 108, high: 120, low: 106, close: 118, volume: 1000, patternType: "2U" },
    ];
    
    const setup = identifyActionableSetup(stratCandles);
    
    expect(setup).not.toBeNull();
    expect(setup?.type).toBe("breakout");
    expect(setup?.direction).toBe("bullish");
    expect(setup?.pattern).toBe("3-1-2U");
  });

  it("should return null for non-actionable patterns", () => {
    const stratCandles: StratCandle[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000, patternType: "1" },
      { timestamp: 2, open: 105, high: 108, low: 92, close: 104, volume: 1000, patternType: "1" },
      { timestamp: 3, open: 104, high: 106, low: 95, close: 100, volume: 1000, patternType: "1" },
    ];
    
    const setup = identifyActionableSetup(stratCandles);
    
    expect(setup).toBeNull();
  });

  it("should return null for insufficient candles", () => {
    const stratCandles: StratCandle[] = [
      { timestamp: 1, open: 100, high: 110, low: 90, close: 105, volume: 1000, patternType: "2U" },
    ];
    
    expect(identifyActionableSetup(stratCandles)).toBeNull();
  });
});
