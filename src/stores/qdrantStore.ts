import { VectorStore } from '../core/vectorStore';
import { VectorSearchQuery, VectorSearchResult, StoreHealth } from '../core/types';
import { OpenAI } from 'openai';

/**
 * Qdrant ストア実装
 * Note: qdrant-js をインストールする場合は npm install @qdrant/js-client-rest
 * 今回はシンプルにREST APIで実装
 */
export class QdrantStore extends VectorStore {
  private openai: OpenAI;

  constructor(
    private config: {
      url: string;
      apiKey?: string;
      openaiApiKey: string;
      embeddingModel?: string;
    }
  ) {
    super('qdrant');
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
  }

  async initialize(): Promise<void> {
    // 接続テスト
    const response = await this.makeRequest('/');
    if (!response.ok) {
      throw new Error(`Failed to connect to Qdrant: ${response.statusText}`);
    }
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    // クエリをembeddingに変換
    const embedding = await this.getEmbedding(query.query);
    const topK = query.topK || 5;
    const collection = query.collection || 'documents';

    const searchPayload = {
      vector: embedding,
      limit: topK,
      with_payload: true,
      with_vector: false,
    };

    const response = await this.makeRequest(
      `/collections/${collection}/points/search`,
      {
        method: 'POST',
        body: JSON.stringify(searchPayload),
      }
    );

    if (!response.ok) {
      throw new Error(`Qdrant search failed: ${response.statusText}`);
    }

    const data = await response.json() as { result?: any[] };
    const results = data.result || [];

    return results.map((item: any) =>
      this.createResult(
        item.id.toString(),
        item.score,
        item.payload?.content || '',
        item.payload || {}
      )
    );
  }

  async healthCheck(): Promise<StoreHealth> {
    const start = Date.now();
    try {
      const response = await this.makeRequest('/healthz');
      const latency = Date.now() - start;

      if (response.ok) {
        return {
          storeName: this.name,
          status: 'healthy',
          latency,
        };
      } else {
        return {
          storeName: this.name,
          status: 'unhealthy',
          error: `HTTP ${response.status}`,
          latency,
        };
      }
    } catch (error) {
      return {
        storeName: this.name,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - start,
      };
    }
  }

  private async makeRequest(path: string, options?: RequestInit): Promise<Response> {
    const url = `${this.config.url}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.apiKey) {
      headers['api-key'] = this.config.apiKey;
    }

    return fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options?.headers,
      },
    });
  }

  private async getEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.config.embeddingModel || 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }
}
