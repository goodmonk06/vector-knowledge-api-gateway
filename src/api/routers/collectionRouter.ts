import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { CollectionService } from '../../services/collectionService';
import { TRPCError } from '@trpc/server';

const collectionService = new CollectionService();

/**
 * Collection management router
 */
export const collectionRouter = router({
  /**
   * Create a new collection
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Check if collection with this name already exists
        const existing = await collectionService.getCollectionByName(input.name);
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Collection with name "${input.name}" already exists`,
          });
        }

        const collection = await collectionService.createCollection(input);
        return {
          success: true,
          collection,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create collection',
          cause: error,
        });
      }
    }),

  /**
   * Get collection by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const collection = await collectionService.getCollection(input.id);

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Collection with id ${input.id} not found`,
        });
      }

      return { collection };
    }),

  /**
   * Get collection by name
   */
  getByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const collection = await collectionService.getCollectionByName(input.name);

      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Collection with name "${input.name}" not found`,
        });
      }

      return { collection };
    }),

  /**
   * List all collections with pagination
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const result = await collectionService.listCollections(
        input.limit,
        input.offset
      );

      return {
        collections: result.collections,
        total: result.total,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < result.total,
      };
    }),

  /**
   * Update collection
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      try {
        const collection = await collectionService.updateCollection(id, updateData);

        if (!collection) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Collection with id ${id} not found`,
          });
        }

        return {
          success: true,
          collection,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update collection',
          cause: error,
        });
      }
    }),

  /**
   * Delete collection
   */
  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const deleted = await collectionService.deleteCollection(input.id);

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Collection with id ${input.id} not found`,
        });
      }

      return {
        success: true,
        message: `Collection ${input.id} deleted`,
      };
    }),

  /**
   * Get collection statistics
   */
  stats: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const stats = await collectionService.getCollectionStats(input.id);

      if (!stats) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Collection with id ${input.id} not found`,
        });
      }

      return { stats };
    }),

  /**
   * Get documents in collection
   */
  documents: publicProcedure
    .input(
      z.object({
        collectionId: z.number().int().positive(),
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
        status: z.enum(['draft', 'active', 'archived', 'deleted']).optional(),
      })
    )
    .query(async ({ input }) => {
      // First check if collection exists
      const collection = await collectionService.getCollection(input.collectionId);
      if (!collection) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Collection with id ${input.collectionId} not found`,
        });
      }

      const result = await collectionService.getDocumentsInCollection(
        input.collectionId,
        input.limit,
        input.offset,
        input.status
      );

      return {
        documents: result.documents,
        total: result.total,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < result.total,
        collection,
      };
    }),
});
