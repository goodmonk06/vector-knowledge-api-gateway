import { VectorStore } from '../core/vectorStore';
import { VectorSearchQuery, VectorSearchResult, StoreHealth } from '../core/types';
import { OpenAI } from 'openai';

/**
 * OpenAI Vector Store 実装
 * OpenAIのVector Store APIを使用
 * https://platform.openai.com/docs/api-reference/vector-stores
 */
export class OpenAIStore extends VectorStore {
  private openai: OpenAI;

  constructor(
    private config: {
      apiKey: string;
      embeddingModel?: string;
    }
  ) {
    super('openai');
    this.openai = new OpenAI({ apiKey: config.apiKey });
  }

  async initialize(): Promise<void> {
    // OpenAI APIの接続テスト
    try {
      await this.openai.models.list();
    } catch (error) {
      throw new Error(`Failed to connect to OpenAI: ${error}`);
    }
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    // OpenAI Vector Storeでは file_search ツールを使用
    // collection はvector_store_id として扱う
    const vectorStoreId = query.collection;
    if (!vectorStoreId) {
      throw new Error('collection (vector_store_id) is required for OpenAI store');
    }

    // Assistantを一時的に作成して検索
    const assistant = await this.openai.beta.assistants.create({
      name: 'Vector Search Assistant',
      instructions: 'You are a helpful assistant that searches through documents.',
      model: 'gpt-4o-mini',
      tools: [{ type: 'file_search' }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId],
        },
      },
    });

    try {
      // スレッドを作成してメッセージを送信
      const thread = await this.openai.beta.threads.create({
        messages: [
          {
            role: 'user',
            content: query.query,
          },
        ],
      });

      // 実行
      const run = await this.openai.beta.threads.runs.createAndPoll(thread.id, {
        assistant_id: assistant.id,
      });

      // 結果を取得
      const messages = await this.openai.beta.threads.messages.list(thread.id);
      const topK = query.topK || 5;

      // メッセージから検索結果を抽出
      const results: VectorSearchResult[] = [];
      let index = 0;

      for (const message of messages.data) {
        if (message.role === 'assistant' && index < topK) {
          for (const content of message.content) {
            if (content.type === 'text') {
              results.push(
                this.createResult(
                  message.id,
                  1.0 - index * 0.1, // 仮のスコア
                  content.text.value,
                  {
                    created_at: message.created_at,
                    thread_id: thread.id,
                  }
                )
              );
              index++;
            }
          }
        }
      }

      return results;
    } finally {
      // クリーンアップ
      await this.openai.beta.assistants.del(assistant.id);
    }
  }

  async healthCheck(): Promise<StoreHealth> {
    const start = Date.now();
    try {
      await this.openai.models.retrieve('gpt-4o-mini');
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
}
