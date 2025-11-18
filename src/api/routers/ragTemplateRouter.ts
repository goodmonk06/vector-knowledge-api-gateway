import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { RAGTemplateService } from '../../services/ragTemplateService';
import { DocumentService } from '../../services/documentService';
import { TRPCError } from '@trpc/server';

const templateService = new RAGTemplateService();
const documentService = new DocumentService();

/**
 * RAG Template management router
 */
export const ragTemplateRouter = router({
  /**
   * Create a new template
   */
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        description: z.string().optional(),
        category: z.string().max(50).optional(),
        templateQuery: z.string().min(1),
        systemPrompt: z.string().optional(),
        variables: z.array(z.string()).optional(),
        defaultParams: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Check if template with this name exists
        const existing = await templateService.getTemplateByName(input.name);
        if (existing) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Template with name "${input.name}" already exists`,
          });
        }

        const template = await templateService.createTemplate(input);
        return {
          success: true,
          template,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create template',
          cause: error,
        });
      }
    }),

  /**
   * Get template by ID
   */
  get: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const template = await templateService.getTemplate(input.id);

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Template with id ${input.id} not found`,
        });
      }

      return { template };
    }),

  /**
   * Get template by name
   */
  getByName: publicProcedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const template = await templateService.getTemplateByName(input.name);

      if (!template) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Template with name "${input.name}" not found`,
        });
      }

      return { template };
    }),

  /**
   * List templates with optional filtering
   */
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional().default(20),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ input }) => {
      const result = await templateService.listTemplates(
        input.category,
        input.limit,
        input.offset
      );

      return {
        templates: result.templates,
        total: result.total,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + input.limit < result.total,
      };
    }),

  /**
   * Update template
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        category: z.string().max(50).optional(),
        templateQuery: z.string().min(1).optional(),
        systemPrompt: z.string().optional(),
        variables: z.array(z.string()).optional(),
        defaultParams: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...updateData } = input;

      try {
        const template = await templateService.updateTemplate(id, updateData);

        if (!template) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Template with id ${id} not found`,
          });
        }

        return {
          success: true,
          template,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update template',
          cause: error,
        });
      }
    }),

  /**
   * Delete template
   */
  delete: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const deleted = await templateService.deleteTemplate(input.id);

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Template with id ${input.id} not found`,
        });
      }

      return {
        success: true,
        message: `Template ${input.id} deleted`,
      };
    }),

  /**
   * Execute template with variable substitution and search
   */
  execute: publicProcedure
    .input(
      z.object({
        templateId: z.number().int().positive(),
        variables: z.record(z.string()).optional(),
        params: z.object({
          topK: z.number().int().min(1).max(50).optional(),
          collectionId: z.number().int().positive().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Get template
        const template = await templateService.getTemplate(input.templateId);
        if (!template) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Template with id ${input.templateId} not found`,
          });
        }

        // Render template with variables
        const rendered = templateService.renderTemplate(template, input.variables);

        // Execute search using rendered query
        const params = { ...template.defaultParams, ...input.params };
        const results = await documentService.searchDocuments(
          rendered.query,
          params.topK || 5
        );

        // Increment usage count
        await templateService.incrementUsage(input.templateId);

        return {
          template: {
            id: template.id,
            name: template.name,
            category: template.category,
          },
          renderedQuery: rendered.query,
          systemPrompt: rendered.systemPrompt,
          results,
          metadata: {
            resultCount: results.length,
            variables: input.variables,
            params,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to execute template',
          cause: error,
        });
      }
    }),

  /**
   * Get all template categories
   */
  categories: publicProcedure
    .query(async () => {
      const categories = await templateService.getCategories();
      return {
        categories,
        count: categories.length,
      };
    }),
});
