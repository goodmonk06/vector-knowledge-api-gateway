import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { SearchAnalyticsService } from '../../services/searchAnalyticsService';
import { TRPCError } from '@trpc/server';

const analyticsService = new SearchAnalyticsService();

/**
 * Search analytics router
 */
export const analyticsRouter = router({
  /**
   * Get popular search queries
   */
  popularQueries: publicProcedure
    .input(
      z.object({
        daysBack: z.number().int().min(1).max(365).optional().default(7),
        limit: z.number().int().min(1).max(100).optional().default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        const queries = await analyticsService.getPopularQueries(
          input.daysBack,
          input.limit
        );

        return {
          queries,
          count: queries.length,
          period: `${input.daysBack} days`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get popular queries',
          cause: error,
        });
      }
    }),

  /**
   * Get search trends over time
   */
  trends: publicProcedure
    .input(
      z.object({
        daysBack: z.number().int().min(1).max(365).optional().default(30),
      })
    )
    .query(async ({ input }) => {
      try {
        const trends = await analyticsService.getSearchTrends(input.daysBack);

        return {
          trends,
          count: trends.length,
          period: `${input.daysBack} days`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get search trends',
          cause: error,
        });
      }
    }),

  /**
   * Get search history with pagination
   */
  history: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
        collectionId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const result = await analyticsService.getSearchHistory(
          input.limit,
          input.offset,
          input.collectionId
        );

        return {
          entries: result.entries,
          total: result.total,
          limit: input.limit,
          offset: input.offset,
          hasMore: input.offset + input.limit < result.total,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get search history',
          cause: error,
        });
      }
    }),

  /**
   * Get analytics summary
   */
  summary: publicProcedure
    .input(
      z.object({
        daysBack: z.number().int().min(1).max(365).optional().default(7),
      })
    )
    .query(async ({ input }) => {
      try {
        const summary = await analyticsService.getSummary(input.daysBack);

        return {
          ...summary,
          period: `${input.daysBack} days`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get analytics summary',
          cause: error,
        });
      }
    }),

  /**
   * Get store performance metrics
   */
  storePerformance: publicProcedure
    .input(
      z.object({
        daysBack: z.number().int().min(1).max(365).optional().default(7),
      })
    )
    .query(async ({ input }) => {
      try {
        const performance = await analyticsService.getStorePerformance(input.daysBack);

        return {
          stores: performance,
          count: performance.length,
          period: `${input.daysBack} days`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get store performance',
          cause: error,
        });
      }
    }),
});
