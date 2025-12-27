import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { fetchMarkets, fetchCandles } from "./lighterApi";
import { analyzeMarket, analyzeMultipleMarkets, analyzeCandles, getPatternSequence, identifyActionableSetup } from "./stratAnalyzer";
import { TIMEFRAMES, DEFAULT_MARKETS } from "@shared/types";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Strat Analyzer Routes
  strat: router({
    // Get all available markets from Lighter.xyz
    getMarkets: publicProcedure.query(async () => {
      return fetchMarkets();
    }),

    // Get default markets for quick start
    getDefaultMarkets: publicProcedure.query(() => {
      return DEFAULT_MARKETS;
    }),

    // Get available timeframes
    getTimeframes: publicProcedure.query(() => {
      return TIMEFRAMES;
    }),

    // Analyze a single market
    analyzeMarket: publicProcedure
      .input(
        z.object({
          symbol: z.string(),
          marketIndex: z.number(),
          timeframe: z.enum(TIMEFRAMES),
          candleCount: z.number().min(5).max(100).default(20),
        })
      )
      .query(async ({ input }) => {
        return analyzeMarket(
          { symbol: input.symbol, marketIndex: input.marketIndex },
          input.timeframe,
          input.candleCount
        );
      }),

    // Analyze multiple markets at once
    analyzeMultipleMarkets: publicProcedure
      .input(
        z.object({
          markets: z.array(
            z.object({
              symbol: z.string(),
              marketIndex: z.number(),
            })
          ),
          timeframe: z.enum(TIMEFRAMES),
          candleCount: z.number().min(5).max(100).default(20),
        })
      )
      .query(async ({ input }) => {
        return analyzeMultipleMarkets(input.markets, input.timeframe, input.candleCount);
      }),

    // Get raw candles for charting
    getCandles: publicProcedure
      .input(
        z.object({
          marketIndex: z.number(),
          timeframe: z.enum(TIMEFRAMES),
          candleCount: z.number().min(5).max(200).default(50),
        })
      )
      .query(async ({ input }) => {
        const candles = await fetchCandles(input.marketIndex, input.timeframe, input.candleCount);
        const stratCandles = analyzeCandles(candles);
        return {
          candles: stratCandles,
          patternSequence: getPatternSequence(stratCandles, 5),
          actionableSetup: identifyActionableSetup(stratCandles),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
