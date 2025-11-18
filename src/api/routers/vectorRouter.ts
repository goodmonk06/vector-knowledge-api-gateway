import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { RAGFormatter } from '../../utils/ragFormatter';

/**
 * ベクトル検索関連のルーター
 */
export const vectorRouter = router({
  /**
   * 単一ストアに対する検索
   */
  searchSingle: publicProcedure
    .input(
      z.object({
        storeName: z.string(),
        query: z.string(),
        collection: z.string().optional(),
        topK: z.number().min(1).max(100).optional(),
        filter: z.record(z.any()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const results = await ctx.queryRouter.searchSingle(input.storeName, {
        query: input.query,
        collection: input.collection,
        topK: input.topK,
        filter: input.filter,
      });

      return {
        results,
        count: results.length,
      };
    }),

  /**
   * 全ストアに対するマルチ検索
   */
  searchMulti: publicProcedure
    .input(
      z.object({
        query: z.string(),
        topK: z.number().min(1).max(100).optional(),
        filter: z.record(z.any()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const results = await ctx.queryRouter.searchMulti({
        query: input.query,
        topK: input.topK,
        filter: input.filter,
      });

      return {
        results,
        count: results.length,
        sources: [...new Set(results.map(r => r.storeName))],
      };
    }),

  /**
   * 特定のストアリストに対する検索
   */
  searchStores: publicProcedure
    .input(
      z.object({
        storeNames: z.array(z.string()),
        query: z.string(),
        topK: z.number().min(1).max(100).optional(),
        filter: z.record(z.any()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const results = await ctx.queryRouter.searchStores(input.storeNames, {
        query: input.query,
        topK: input.topK,
        filter: input.filter,
      });

      return {
        results,
        count: results.length,
        sources: [...new Set(results.map(r => r.storeName))],
      };
    }),

  /**
   * RAG用のフォーマット済みコンテキストを取得
   */
  getRagContext: publicProcedure
    .input(
      z.object({
        query: z.string(),
        topK: z.number().min(1).max(100).optional(),
        maxContextLength: z.number().optional(),
        includeMetadata: z.boolean().optional(),
        storeNames: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      // ストア指定がある場合はsearchStores、なければsearchMulti
      const results = input.storeNames
        ? await ctx.queryRouter.searchStores(input.storeNames, {
            query: input.query,
            topK: input.topK,
          })
        : await ctx.queryRouter.searchMulti({
            query: input.query,
            topK: input.topK,
          });

      const context = RAGFormatter.formatContext(results, {
        maxLength: input.maxContextLength,
        includeMetadata: input.includeMetadata,
      });

      const prompt = RAGFormatter.formatPrompt(results, {
        userQuery: input.query,
        maxContextLength: input.maxContextLength,
        includeMetadata: input.includeMetadata,
      });

      return {
        context,
        prompt,
        results,
        metadata: {
          resultCount: results.length,
          sources: [...new Set(results.map(r => r.storeName))],
        },
      };
    }),
});
