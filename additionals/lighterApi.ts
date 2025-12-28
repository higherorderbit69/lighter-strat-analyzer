import axios from 'axios';
import type { Candle, Market, Timeframe } from '@shared/types';

const LIGHTER_API_BASE = 'https://mainnet.zklighter.elliot.ai/api/v1';
const LIGHTER_EXPLORER_API = 'https://explorer.elliot.ai/api';

// Lighter API uses short field names: t, o, h, l, c, v
interface LighterCandle {
  t: number;  // timestamp in milliseconds
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
}

interface LighterMarket {
  symbol: string;
  market_index: number;
}

export async function fetchMarkets(): Promise<Market[]> {
  try {
    const response = await axios.get<LighterMarket[]>(`${LIGHTER_EXPLORER_API}/markets`);
    return response.data.map((m) => ({
      symbol: m.symbol,
      marketIndex: m.market_index,
    }));
  } catch (error) {
    console.error('Error fetching markets:', error);
    throw new Error('Failed to fetch markets from Lighter.xyz');
  }
}

export async function fetchCandles(
  marketId: number,
  resolution: Timeframe,
  countBack: number = 50
): Promise<Candle[]> {
  try {
    const now = Math.floor(Date.now() / 1000);
    // Calculate start_timestamp based on timeframe
    const timeframeSeconds: Record<Timeframe, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '4h': 14400,
      '12h': 43200,
      '1d': 86400,
      '1w': 604800,
    };
    const startTimestamp = now - (timeframeSeconds[resolution] * countBack * 2);
    
    const response = await axios.get(`${LIGHTER_API_BASE}/candles`, {
      params: {
        market_id: marketId,
        resolution,
        start_timestamp: startTimestamp,
        end_timestamp: now,
        count_back: countBack,
        set_timestamp_to_end: true,
      },
    });

    // Response structure: { code: 200, r: '15m', c: [...candles] }
    const candles: LighterCandle[] = response.data.c || response.data.candles || [];
    
    return candles.map((c) => ({
      timestamp: c.t, // Already in milliseconds
      open: c.o,
      high: c.h,
      low: c.l,
      close: c.c,
      volume: c.v,
    }));
  } catch (error) {
    console.error(`Error fetching candles for market ${marketId}:`, error);
    throw new Error(`Failed to fetch candles for market ${marketId}`);
  }
}

export async function fetchMultipleMarketCandles(
  markets: Market[],
  resolution: Timeframe,
  countBack: number = 50
): Promise<Map<string, Candle[]>> {
  const results = new Map<string, Candle[]>();
  
  const promises = markets.map(async (market) => {
    try {
      const candles = await fetchCandles(market.marketIndex, resolution, countBack);
      return { symbol: market.symbol, candles };
    } catch (error) {
      console.error(`Failed to fetch candles for ${market.symbol}:`, error);
      return { symbol: market.symbol, candles: [] };
    }
  });

  const settled = await Promise.all(promises);
  
  for (const result of settled) {
    results.set(result.symbol, result.candles);
  }

  return results;
}
