/**
 * Strat Analysis tRPC Router
 * Handles market listing and pattern analysis endpoints
 */

import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { fetchOrderBooks, fetchCandles, convertCandle } from "../lib/lighterApi";
import { analyzeCandles } from "../lib/stratAnalyzer";
import type { Market, Timeframe, MarketAnalysis } from "@shared/types";
import { TIMEFRAMES, DEFAULT_MARKETS } from "@shared/types";

export const stratRouter = router({
    /**
     * Get all available markets from Lighter.xyz
     */
    getMarkets: publicProcedure.query(async (): Promise<Market[]> => {
        try {
            const markets = await fetchOrderBooks();
            return markets;
        } catch (error) {
            console.error("Failed to fetch markets:", error);
            // Return defaults on error
            return DEFAULT_MARKETS;
        }
    }),

    /**
     * Analyze multiple markets for Strat patterns
     */
    analyzeMultipleMarkets: publicProcedure
        .input(
            z.object({
                markets: z.array(
                    z.object({
                        symbol: z.string(),
                        marketIndex: z.number(),
                        marketId: z.number(),
                    })
                ),
                timeframe: z.enum([...TIMEFRAMES]),
                candleCount: z.number().min(5).max(100).default(20),
            })
        )
        .query(async ({ input }): Promise<MarketAnalysis[]> => {
            const { markets, timeframe, candleCount } = input;

            const analyses: MarketAnalysis[] = await Promise.all(
                markets.map(async (market) => {
                    try {
                        // Fetch candles from Lighter.xyz
                        const rawCandles = await fetchCandles(
                            market.marketId,
                            timeframe as Timeframe,
                            candleCount
                        );

                        // Convert and analyze
                        const convertedCandles = rawCandles.map(convertCandle);
                        const { candles, patternSequence, actionableSetup } = analyzeCandles(convertedCandles);

                        return {
                            market,
                            candles,
                            currentCandle: candles.length > 0 ? candles[candles.length - 1] : null,
                            patternSequence,
                            actionableSetup,
                        };
                    } catch (error) {
                        console.error(`Failed to analyze ${market.symbol}:`, error);
                        return {
                            market,
                            candles: [],
                            currentCandle: null,
                            patternSequence: "",
                            actionableSetup: null,
                        };
                    }
                })
            );

            return analyses;
        }),

    /**
     * Analyze a single market (for chart page)
     */
    analyzeSingleMarket: publicProcedure
        .input(
            z.object({
                marketId: z.number(),
                symbol: z.string(),
                marketIndex: z.number(),
                timeframe: z.enum([...TIMEFRAMES]),
                candleCount: z.number().min(5).max(500).default(100),
            })
        )
        .query(async ({ input }): Promise<MarketAnalysis> => {
            const { marketId, symbol, marketIndex, timeframe, candleCount } = input;
            const market: Market = { symbol, marketIndex, marketId };

            try {
                const rawCandles = await fetchCandles(marketId, timeframe as Timeframe, candleCount);
                const convertedCandles = rawCandles.map(convertCandle);
                const { candles, patternSequence, actionableSetup } = analyzeCandles(convertedCandles);

                return {
                    market,
                    candles,
                    currentCandle: candles.length > 0 ? candles[candles.length - 1] : null,
                    patternSequence,
                    actionableSetup,
                };
            } catch (error) {
                console.error(`Failed to analyze ${symbol}:`, error);
                return {
                    market,
                    candles: [],
                    currentCandle: null,
                    patternSequence: "",
                    actionableSetup: null,
                };
            }
        }),

    /**
     * Get candles with pattern analysis for chart page
     * Uses marketId directly (no lookup needed)
     */
    getCandles: publicProcedure
        .input(
            z.object({
                marketId: z.number(),
                timeframe: z.enum([...TIMEFRAMES]),
                candleCount: z.number().min(5).max(200).default(50),
            })
        )
        .query(async ({ input }) => {
            const { marketId, timeframe, candleCount } = input;

            try {
                const rawCandles = await fetchCandles(marketId, timeframe as Timeframe, candleCount);

                const convertedCandles = rawCandles.map(convertCandle);


                const { candles, patternSequence, actionableSetup } = analyzeCandles(convertedCandles);

                return {
                    candles,
                    patternSequence,
                    actionableSetup,
                };
            } catch (error) {
                console.error(`Failed to get candles for marketId ${marketId}:`, error);
                return {
                    candles: [],
                    patternSequence: "",
                    actionableSetup: null,
                };
            }
        }),

    /**
     * Get Full Timeframe Continuity (FTC) analysis for multiple markets
     * Analyzes all 8 timeframes (1m-1d) simultaneously with caching
     * 
     * Note: Gated behind FTC_ENABLED flag (default OFF)
     */
    getFTCMatrix: publicProcedure
        .input(
            z.object({
                markets: z.array(
                    z.object({
                        symbol: z.string(),
                        marketIndex: z.number(),
                        marketId: z.number(),
                    })
                ).max(50, "Maximum 50 markets allowed"), // Prevent accidental overload
                candleCount: z.number().min(5).max(100).default(20),
            })
        )
        .query(async ({ input }) => {
            const { markets, candleCount } = input;

            // Feature flag check - FTC disabled by default
            const { FTC_ENABLED } = await import("@shared/const");
            if (!FTC_ENABLED) {
                console.warn("FTC endpoint called but FTC_ENABLED=false, returning empty array");
                return [];
            }

            try {
                // Import FTC service (lazy load to avoid circular deps)
                const { analyzeMultipleMarketsFTC } = await import("../lib/ftcService");

                const ftcResults = await analyzeMultipleMarketsFTC(markets, candleCount);
                return ftcResults;
            } catch (error) {
                // Log catastrophic errors server-side
                console.error("CATASTROPHIC ERROR in getFTCMatrix:", error);
                console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace available");

                // Return empty array on catastrophic failure
                // Individual timeframe failures are handled within ftcService
                return [];
            }
        }),
});
