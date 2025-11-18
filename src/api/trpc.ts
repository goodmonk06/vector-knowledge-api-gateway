import { initTRPC } from '@trpc/server';
import { VectorStoreRegistry } from '../core/vectorStoreRegistry';
import { QueryRouter } from '../core/queryRouter';

/**
 * tRPCコンテキスト
 */
export interface Context {
  registry: VectorStoreRegistry;
  queryRouter: QueryRouter;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
