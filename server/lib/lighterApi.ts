/**
 * Lighter.xyz API Client
 * Base URL: https://mainnet.zklighter.elliot.ai
 */

import { LIGHTER_API_BASE, API_VERSION } from "@shared/const";
import type { Market, Timeframe } from "@shared/types";
import { RESOLUTION_MAP } from "@shared/types";

interface LighterOrderBook {
    market_id: number;
    symbol: string;
    base_asset: string;
    quote_asset: string;
    status: string;
}

interface LighterCandlestick {
    // New format (shortened field names)
    t?: number;  // timestamp
    o?: number;  // open
    h?: number;  // high
    l?: number;  // low
    c?: number;  // close
    v?: number;  // volume (base)
    V?: number;  // volume (quote)
    i?: number;  // index/id

    // Legacy format (full field names)
    timestamp?: number;
    open?: number;
    high?: number;
    low?: number;
    close?: number;
    volume0?: number;
    volume1?: number;
}

interface CandlesResponse {
    code: number;
    r?: string;  // resolution (shortened)
    resolution?: string;  // Legacy support
    c?: LighterCandlestick[];  // candles array (shortened) - new endpoint
    candles?: LighterCandlestick[];  // Legacy support
    candlesticks?: LighterCandlestick[];  // Legacy support
}

interface OrderBooksResponse {
    order_books: LighterOrderBook[];
}

/**
 * Fetch all available order books (markets) from Lighter.xyz
 */
export async function fetchOrderBooks(): Promise<Market[]> {
    const url = `${LIGHTER_API_BASE}/api/${API_VERSION}/orderBooks`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch order books: ${response.status}`);
    }

    const data: OrderBooksResponse = await response.json();
    const orderBooks = data.order_books || [];

    return orderBooks
        .filter((ob) => ob.status === "active")
        .map((ob, index) => ({
            symbol: ob.symbol, // Use symbol directly (BTC, ETH, etc.)
            marketIndex: index,
            marketId: ob.market_id,
        }));
}

/**
 * Fetch candlestick data for a market
 */
export async function fetchCandles(
    marketId: number,
    timeframe: Timeframe,
    countBack: number = 20
): Promise<LighterCandlestick[]> {
    const resolution = RESOLUTION_MAP[timeframe];
    const now = Math.floor(Date.now() / 1000);
    const endTimestamp = now + 86400; // Tomorrow
    const startTimestamp = now - (86400 * 30); // 30 days ago

    const url = new URL(`${LIGHTER_API_BASE}/api/${API_VERSION}/candles`);
    url.searchParams.set("market_id", marketId.toString());
    url.searchParams.set("resolution", resolution);
    url.searchParams.set("count_back", countBack.toString());
    url.searchParams.set("start_timestamp", startTimestamp.toString());
    url.searchParams.set("end_timestamp", endTimestamp.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Failed to fetch candles: ${response.status}`);
    }

    const data: CandlesResponse = await response.json();
    console.log(`[fetchCandles] Response for market ${marketId}:`, JSON.stringify(data).substring(0, 500));

    // New endpoint uses shortened field names: 'c' for candles
    const allCandles = data.c || data.candles || data.candlesticks || [];

    // Deduplicate candles by timestamp (API sometimes returns duplicates, especially for longer timeframes)
    const candleMap = new Map<number, LighterCandlestick>();
    for (const candle of allCandles) {
        // Keep the last occurrence of each timestamp (most recent data)
        // Handle both old format (timestamp) and new format (t)
        const ts = candle.t ?? candle.timestamp ?? 0;
        candleMap.set(ts, candle);
    }

    // Convert back to array and sort by timestamp ascending
    const uniqueCandles = Array.from(candleMap.values()).sort((a, b) => {
        const tsA = a.t ?? a.timestamp ?? 0;
        const tsB = b.t ?? b.timestamp ?? 0;
        return tsA - tsB;
    });

    // Filter out placeholder candles:
    // 1. Candles with zero volume AND all OHLC values equal (flat placeholder)
    // 2. Candles with future timestamps (beyond current time + 1 week buffer)
    const currentTimeMs = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const validCandles = uniqueCandles.filter(c => {
        const o = c.o ?? c.open ?? 0;
        const h = c.h ?? c.high ?? 0;
        const l = c.l ?? c.low ?? 0;
        const cl = c.c ?? c.close ?? 0;
        const vol = c.v ?? c.volume0 ?? 0;
        const ts = c.t ?? c.timestamp ?? 0;

        const isFlatPlaceholder = vol === 0 && o === h && h === l && l === cl;
        const isFuture = ts > currentTimeMs + oneWeekMs;
        // Keep candle if it's NOT a flat placeholder AND NOT too far in the future
        return !isFlatPlaceholder && !isFuture;
    });

    // Take the most recent candles (end of array)
    return validCandles.slice(-countBack);
}

/**
 * Convert Lighter candle format to our internal format
 * Handles both old format (timestamp, open, high, low, close, volume0, volume1)
 * and new format (t, o, h, l, c, v, V, i)
 */
export function convertCandle(candle: LighterCandlestick): {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
} {
    return {
        // New format uses 't', old uses 'timestamp'
        timestamp: candle.t ?? candle.timestamp ?? 0,
        // New format uses 'o', old uses 'open'
        open: candle.o ?? candle.open ?? 0,
        // New format uses 'h', old uses 'high'
        high: candle.h ?? candle.high ?? 0,
        // New format uses 'l', old uses 'low'
        low: candle.l ?? candle.low ?? 0,
        // New format uses 'c', old uses 'close'
        close: candle.c ?? candle.close ?? 0,
        // New format uses 'v', old uses 'volume0'
        volume: candle.v ?? candle.volume0 ?? 0,
    };
}
