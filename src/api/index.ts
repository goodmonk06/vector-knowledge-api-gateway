import { router } from './trpc';
import { vectorRouter } from './routers/vectorRouter';
import { healthRouter } from './routers/healthRouter';

/**
 * メインのAPIルーター
 */
export const appRouter = router({
  vector: vectorRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
