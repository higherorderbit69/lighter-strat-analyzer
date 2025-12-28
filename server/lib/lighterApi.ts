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

    // The API may return more candles than requested, so we slice to get the last N
    // Take the most recent candles (end of array)
    return allCandles.slice(-countBack);
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
        timestamp: candle.timestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume0,
    };
}
