import { router } from './trpc';
import { vectorRouter } from './routers/vectorRouter';
import { healthRouter } from './routers/healthRouter';
import { documentRouter } from './routers/documentRouter';

/**
 * メインのAPIルーター
 */
export const appRouter = router({
  vector: vectorRouter,
  health: healthRouter,
  documents: documentRouter,
});

export type AppRouter = typeof appRouter;
