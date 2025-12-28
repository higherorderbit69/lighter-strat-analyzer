/**
 * Main tRPC Router
 */

import { router } from "../trpc";
import { stratRouter } from "./strat";

export const appRouter = router({
    strat: stratRouter,
});

export type AppRouter = typeof appRouter;
