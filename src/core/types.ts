/**
 * ベクトル検索の基本型定義
 */

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, any>;
  content: string;
  storeName: string; // どのストアから来たか
}

export interface VectorSearchQuery {
  query: string;
  collection?: string;
  topK?: number;
  filter?: Record<string, any>;
}

export interface MultiStoreSearchQuery {
  query: string;
  topK?: number;
  filter?: Record<string, any>;
}

export interface StoreHealth {
  storeName: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  error?: string;
}

export interface EmbeddingConfig {
  model: string;
  dimensions?: number;
}
