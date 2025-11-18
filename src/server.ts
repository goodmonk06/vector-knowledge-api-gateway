import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { config, validateConfig } from './config/env';
import { registry } from './core/vectorStoreRegistry';
import { QueryRouter } from './core/queryRouter';
import { StoreFactory } from './utils/storeFactory';
import { appRouter } from './api';
import { Context } from './api/trpc';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

/**
 * APIゲートウェイサーバーのメイン実装
 */
async function startServer() {
  console.log('🚀 Vector Knowledge API Gateway');
  console.log('================================');

  // 設定のバリデーション
  try {
    validateConfig();
    console.log('✓ Configuration validated');
  } catch (error) {
    console.error('✗ Configuration error:', error);
    process.exit(1);
  }

  // ベクトルストアの初期化
  console.log('\nInitializing vector stores...');
  const stores = StoreFactory.createEnabledStores();

  if (stores.length === 0) {
    console.error('✗ No vector stores enabled');
    process.exit(1);
  }

  // レジストリに登録
  stores.forEach(store => registry.register(store));

  // すべてのストアを初期化
  try {
    await registry.initializeAll();
    console.log('✓ All stores initialized');
  } catch (error) {
    console.error('✗ Store initialization error:', error);
    // 一部のストアが失敗しても継続
  }

  // クエリルーターの作成
  const queryRouter = new QueryRouter(registry);

  // Expressサーバーの設定
  const app = express();

  // ミドルウェア
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  // ヘルスチェックエンドポイント (tRPC外)
  app.get('/health', async (req, res) => {
    try {
      const healthResults = await registry.healthCheckAll();
      const allHealthy = healthResults.every(h => h.status === 'healthy');

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        stores: healthResults,
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // tRPC エンドポイント
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext: (): Context => ({
        registry,
        queryRouter,
      }),
    })
  );

  // ルートエンドポイント
  app.get('/', (req, res) => {
    res.json({
      name: 'Vector Knowledge API Gateway',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        trpc: '/trpc',
        documents: {
          create: 'POST /trpc/documents.create',
          list: 'GET /trpc/documents.list',
          get: 'GET /trpc/documents.get',
          update: 'POST /trpc/documents.update',
          delete: 'POST /trpc/documents.delete',
          search: 'GET /trpc/documents.search',
        },
      },
      availableStores: registry.getStoreNames(),
    });
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  // サーバー起動
  const server = app.listen(config.port, () => {
    console.log('\n================================');
    console.log(`✓ Server running on port ${config.port}`);
    console.log(`✓ Health check: http://localhost:${config.port}/health`);
    console.log(`✓ tRPC endpoint: http://localhost:${config.port}/trpc`);
    console.log(`✓ Available stores: ${registry.getStoreNames().join(', ')}`);
    console.log('================================\n');
  });

  // グレースフルシャットダウン
  const shutdown = async () => {
    console.log('\nShutting down gracefully...');

    server.close(async () => {
      console.log('HTTP server closed');

      try {
        await registry.disposeAll();
        console.log('All stores disposed');
      } catch (error) {
        console.error('Error disposing stores:', error);
      }

      process.exit(0);
    });

    // タイムアウト (10秒)
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// サーバー起動
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
