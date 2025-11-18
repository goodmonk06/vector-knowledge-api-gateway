import { IVectorStore } from '../core/vectorStore';
import { PgVectorStore } from '../stores/pgVectorStore';
import { QdrantStore } from '../stores/qdrantStore';
import { OpenAIStore } from '../stores/openaiStore';
import { config } from '../config/env';

/**
 * 環境変数から有効なストアを初期化するファクトリー
 */
export class StoreFactory {
  static createEnabledStores(): IVectorStore[] {
    const stores: IVectorStore[] = [];

    for (const storeName of config.enabledStores) {
      try {
        const store = this.createStore(storeName);
        if (store) {
          stores.push(store);
          console.log(`✓ Enabled store: ${storeName}`);
        }
      } catch (error) {
        console.error(`✗ Failed to create store ${storeName}:`, error);
      }
    }

    return stores;
  }

  private static createStore(storeName: string): IVectorStore | null {
    switch (storeName.toLowerCase()) {
      case 'pgvector':
        return new PgVectorStore({
          host: config.pgvector.host,
          port: config.pgvector.port,
          database: config.pgvector.database,
          user: config.pgvector.user,
          password: config.pgvector.password,
          openaiApiKey: config.openai.apiKey,
          embeddingModel: config.openai.embeddingModel,
        });

      case 'qdrant':
        return new QdrantStore({
          url: config.qdrant.url,
          apiKey: config.qdrant.apiKey,
          openaiApiKey: config.openai.apiKey,
          embeddingModel: config.openai.embeddingModel,
        });

      case 'openai':
        return new OpenAIStore({
          apiKey: config.openai.apiKey,
          embeddingModel: config.openai.embeddingModel,
        });

      default:
        console.warn(`Unknown store type: ${storeName}`);
        return null;
    }
  }
}
