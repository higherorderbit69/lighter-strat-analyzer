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
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume0: number;
    volume1: number;
}

interface CandlesticksResponse {
    code: number;
    resolution: string;
    candlesticks: LighterCandlestick[];
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
    const endTimestamp = Math.floor(Date.now() / 1000) + 86400; // Tomorrow
    const startTimestamp = 0;

    const url = new URL(`${LIGHTER_API_BASE}/api/${API_VERSION}/candlesticks`);
    url.searchParams.set("market_id", marketId.toString());
    url.searchParams.set("resolution", resolution);
    url.searchParams.set("count_back", countBack.toString());
    url.searchParams.set("start_timestamp", startTimestamp.toString());
    url.searchParams.set("end_timestamp", endTimestamp.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Failed to fetch candles: ${response.status}`);
    }

    const data: CandlesticksResponse = await response.json();
    const allCandles = data.candlesticks || [];

    // Deduplicate candles by timestamp (API sometimes returns duplicates, especially for longer timeframes)
    const candleMap = new Map<number, LighterCandlestick>();
    for (const candle of allCandles) {
        // Keep the last occurrence of each timestamp (most recent data)
        candleMap.set(candle.timestamp, candle);
    }

    // Convert back to array and sort by timestamp ascending
    const uniqueCandles = Array.from(candleMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // Filter out placeholder candles:
    // 1. Candles with zero volume AND all OHLC values equal (flat placeholder)
    // 2. Candles with future timestamps (beyond current time + 1 week buffer)
    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const validCandles = uniqueCandles.filter(c => {
        const isFlatPlaceholder = c.volume0 === 0 && c.open === c.high && c.high === c.low && c.low === c.close;
        const isFuture = c.timestamp > now + oneWeekMs;
        // Keep candle if it's NOT a flat placeholder AND NOT too far in the future
        return !isFlatPlaceholder && !isFuture;
    });

    // Take the most recent candles (end of array)
    return validCandles.slice(-countBack);
}

/**
 * Convert Lighter candle format to our internal format
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
        // Timestamp is already in milliseconds from the API
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume0,
    };
}
