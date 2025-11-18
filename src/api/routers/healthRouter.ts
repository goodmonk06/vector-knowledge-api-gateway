import { router, publicProcedure } from '../trpc';

/**
 * ヘルスチェック関連のルーター
 */
export const healthRouter = router({
  /**
   * 全体のヘルスチェック
   */
  check: publicProcedure.query(async ({ ctx }) => {
    const storeHealths = await ctx.registry.healthCheckAll();
    const allHealthy = storeHealths.every(h => h.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      stores: storeHealths,
    };
  }),

  /**
   * 利用可能なストアの一覧
   */
  stores: publicProcedure.query(async ({ ctx }) => {
    return {
      stores: ctx.registry.getStoreNames(),
      count: ctx.registry.getStoreNames().length,
    };
  }),

  /**
   * シンプルなpingエンドポイント
   */
  ping: publicProcedure.query(() => {
    return { message: 'pong', timestamp: new Date().toISOString() };
  }),
});
