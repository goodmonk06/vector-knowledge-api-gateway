import { Pool, PoolClient } from 'pg';
import { VectorStore } from '../core/vectorStore';
import { VectorSearchQuery, VectorSearchResult, StoreHealth } from '../core/types';
import { OpenAI } from 'openai';

/**
 * PostgreSQL + pgvector ストア実装
 */
export class PgVectorStore extends VectorStore {
  private pool: Pool | null = null;
  private openai: OpenAI;

  constructor(
    private config: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
      openaiApiKey: string;
      embeddingModel?: string;
    }
  ) {
    super('pgvector');
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  async initialize(): Promise<void> {
    this.pool = new Pool({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
    });

    // 接続テスト
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    if (!this.pool) {
      throw new Error('PgVectorStore not initialized');
    }

    // クエリをembeddingに変換
    const embedding = await this.getEmbedding(query.query);
    const topK = query.topK || 5;
    const collection = query.collection || 'documents';

    // pgvectorのコサイン類似度検索
    const sql = `
      SELECT
        id,
        content,
        metadata,
        1 - (embedding <=> $1::vector) as score
      FROM ${collection}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
    `;

    const result = await this.pool.query(sql, [
      `[${embedding.join(',')}]`,
      topK,
    ]);

    return result.rows.map(row =>
      this.createResult(
        row.id,
        row.score,
        row.content,
        row.metadata || {}
      )
    );
  }

  async healthCheck(): Promise<StoreHealth> {
    const start = Date.now();
    try {
      if (!this.pool) {
        return {
          storeName: this.name,
          status: 'unhealthy',
          error: 'Not initialized',
        };
      }

      await this.pool.query('SELECT 1');
      const latency = Date.now() - start;

      return {
        storeName: this.name,
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        storeName: this.name,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - start,
      };
    }
  }

  async dispose(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.config.embeddingModel || 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}
