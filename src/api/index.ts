import { router } from './trpc';
import { vectorRouter } from './routers/vectorRouter';
import { healthRouter } from './routers/healthRouter';
import { documentRouter } from './routers/documentRouter';
import { collectionRouter } from './routers/collectionRouter';
import { ragTemplateRouter } from './routers/ragTemplateRouter';
import { analyticsRouter } from './routers/analyticsRouter';

/**
 * メインのAPIルーター
 */
export const appRouter = router({
  vector: vectorRouter,
  health: healthRouter,
  documents: documentRouter,
  collections: collectionRouter,
  templates: ragTemplateRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
