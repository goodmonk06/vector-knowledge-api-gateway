import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

export const config = {
  // サーバー設定
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // 有効なストア
  enabledStores: (process.env.ENABLED_STORES || 'pgvector,qdrant,openai')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean),

  // OpenAI設定
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: process.env.DEFAULT_EMBEDDING_MODEL || 'text-embedding-3-small',
  },

  // PostgreSQL (pgvector) 設定
  pgvector: {
    host: process.env.PGVECTOR_HOST || 'localhost',
    port: parseInt(process.env.PGVECTOR_PORT || '5432', 10),
    database: process.env.PGVECTOR_DATABASE || 'vectordb',
    user: process.env.PGVECTOR_USER || 'postgres',
    password: process.env.PGVECTOR_PASSWORD || 'postgres',
  },

  // Qdrant設定
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY,
  },

  // デフォルト検索設定
  defaults: {
    topK: parseInt(process.env.DEFAULT_TOP_K || '5', 10),
  },
};

// 必須設定のバリデーション
export function validateConfig(): void {
  const errors: string[] = [];

  if (config.enabledStores.includes('pgvector') || config.enabledStores.includes('qdrant')) {
    if (!config.openai.apiKey) {
      errors.push('OPENAI_API_KEY is required for embedding generation');
    }
  }

  if (config.enabledStores.includes('openai')) {
    if (!config.openai.apiKey) {
      errors.push('OPENAI_API_KEY is required for OpenAI store');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}
