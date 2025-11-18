/**
 * Embedding Provider Interface
 * Allows swapping between different embedding services (OpenAI, Cohere, HuggingFace, etc.)
 */

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimensions: number;
  tokenCount?: number;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
  totalTokens?: number;
}

export interface IEmbeddingProvider {
  readonly name: string;
  readonly defaultModel: string;

  /**
   * Generate embedding for a single text
   */
  generateEmbedding(text: string, model?: string): Promise<EmbeddingResponse>;

  /**
   * Generate embeddings for multiple texts (batch)
   */
  generateBatchEmbeddings(texts: string[], model?: string): Promise<BatchEmbeddingResponse>;

  /**
   * Check provider health/availability
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Abstract base class for embedding providers
 */
export abstract class EmbeddingProvider implements IEmbeddingProvider {
  constructor(
    public readonly name: string,
    public readonly defaultModel: string
  ) {}

  abstract generateEmbedding(text: string, model?: string): Promise<EmbeddingResponse>;
  abstract generateBatchEmbeddings(texts: string[], model?: string): Promise<BatchEmbeddingResponse>;
  abstract healthCheck(): Promise<boolean>;
}
