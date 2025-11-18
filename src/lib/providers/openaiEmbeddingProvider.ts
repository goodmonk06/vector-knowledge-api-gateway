import { OpenAI } from 'openai';
import { EmbeddingProvider, EmbeddingResponse, BatchEmbeddingResponse } from '../embeddingProvider';

export class OpenAIEmbeddingProvider extends EmbeddingProvider {
  private client: OpenAI;

  constructor(apiKey: string, defaultModel: string = 'text-embedding-3-small') {
    super('openai', defaultModel);
    this.client = new OpenAI({ apiKey });
  }

  async generateEmbedding(text: string, model?: string): Promise<EmbeddingResponse> {
    const modelToUse = model || this.defaultModel;

    const response = await this.client.embeddings.create({
      model: modelToUse,
      input: text,
    });

    const data = response.data[0];

    return {
      embedding: data.embedding,
      model: response.model,
      dimensions: data.embedding.length,
      tokenCount: response.usage?.total_tokens,
    };
  }

  async generateBatchEmbeddings(texts: string[], model?: string): Promise<BatchEmbeddingResponse> {
    const modelToUse = model || this.defaultModel;

    const response = await this.client.embeddings.create({
      model: modelToUse,
      input: texts,
    });

    const embeddings = response.data.map(d => d.embedding);

    return {
      embeddings,
      model: response.model,
      dimensions: embeddings[0]?.length || 0,
      totalTokens: response.usage?.total_tokens,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try to list models as a health check
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('OpenAI health check failed:', error);
      return false;
    }
  }
}
