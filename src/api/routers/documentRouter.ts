import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { DocumentService } from '../../services/documentService';
import { TRPCError } from '@trpc/server';

const documentService = new DocumentService();

/**
 * Document management router
 */
export const documentRouter = router({
  /**
   * Create a new document
   */
  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        content: z.string().min(1),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const document = await documentService.createDocument(input);
        return {
          success: true,
          document,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create document',
          cause: error,
        });
      }
    }),

  /**
   * Get document by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const document = await documentService.getDocument(input.id);

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Document with id ${input.id} not found`,
        });
      }

      return { document };
    }),

  /**
   * List documents with pagination
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const result = await documentService.listDocuments(
        input.limit,
        input.offset
      );

      return {
        documents: result.documents,
        total: result.total,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < result.total,
      };
    }),

  /**
   * Update document
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(500).optional(),
        content: z.string().min(1).optional(),
        metadata: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      try {
        const document = await documentService.updateDocument(id, updateData);

        if (!document) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Document with id ${id} not found`,
          });
        }

        return {
          success: true,
          document,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update document',
          cause: error,
        });
      }
    }),

  /**
   * Delete document
   */
  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const deleted = await documentService.deleteDocument(input.id);

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Document with id ${input.id} not found`,
        });
      }

      return {
        success: true,
        message: `Document ${input.id} deleted`,
      };
    }),

  /**
   * Search documents by content similarity
   */
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().int().min(1).max(50).optional().default(5),
      })
    )
    .query(async ({ input }) => {
      try {
        const results = await documentService.searchDocuments(
          input.query,
          input.limit
        );

        return {
          query: input.query,
          results,
          count: results.length,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to search documents',
          cause: error,
        });
      }
    }),
});
