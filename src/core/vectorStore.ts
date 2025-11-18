import { VectorSearchQuery, VectorSearchResult, StoreHealth } from './types';

/**
 * すべてのベクトルストアが実装すべきインターフェース
 */
export interface IVectorStore {
  readonly name: string;

  /**
   * ベクトル検索を実行
   */
  search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;

  /**
   * ストアの健全性チェック
   */
  healthCheck(): Promise<StoreHealth>;

  /**
   * 初期化処理
   */
  initialize(): Promise<void>;

  /**
   * クリーンアップ処理
   */
  dispose?(): Promise<void>;
}

/**
 * ベクトルストアの抽象基底クラス
 */
export abstract class VectorStore implements IVectorStore {
  constructor(public readonly name: string) {}

  abstract search(query: VectorSearchQuery): Promise<VectorSearchResult[]>;
  abstract healthCheck(): Promise<StoreHealth>;
  abstract initialize(): Promise<void>;

  async dispose(): Promise<void> {
    // デフォルトは何もしない
  }

  protected createResult(
    id: string,
    score: number,
    content: string,
    metadata: Record<string, any>
  ): VectorSearchResult {
    return {
      id,
      score,
      content,
      metadata,
      storeName: this.name,
    };
  }
}
