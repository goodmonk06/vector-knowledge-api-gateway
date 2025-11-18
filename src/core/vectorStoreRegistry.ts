import { IVectorStore } from './vectorStore';
import { StoreHealth } from './types';

/**
 * ベクトルストアのレジストリ
 * 複数のストアを管理し、統一的なアクセスを提供
 */
export class VectorStoreRegistry {
  private stores: Map<string, IVectorStore> = new Map();

  /**
   * ストアを登録
   */
  register(store: IVectorStore): void {
    this.stores.set(store.name, store);
  }

  /**
   * ストアを名前で取得
   */
  getStore(name: string): IVectorStore | undefined {
    return this.stores.get(name);
  }

  /**
   * すべてのストアを取得
   */
  getAllStores(): IVectorStore[] {
    return Array.from(this.stores.values());
  }

  /**
   * ストア名のリストを取得
   */
  getStoreNames(): string[] {
    return Array.from(this.stores.keys());
  }

  /**
   * すべてのストアを初期化
   */
  async initializeAll(): Promise<void> {
    const promises = Array.from(this.stores.values()).map(store =>
      store.initialize().catch(err => {
        console.error(`Failed to initialize store ${store.name}:`, err);
      })
    );
    await Promise.all(promises);
  }

  /**
   * すべてのストアのヘルスチェック
   */
  async healthCheckAll(): Promise<StoreHealth[]> {
    const promises = Array.from(this.stores.values()).map(store =>
      store.healthCheck().catch(err => ({
        storeName: store.name,
        status: 'unhealthy' as const,
        error: err.message,
      }))
    );
    return Promise.all(promises);
  }

  /**
   * すべてのストアをクリーンアップ
   */
  async disposeAll(): Promise<void> {
    const promises = Array.from(this.stores.values()).map(store =>
      store.dispose?.().catch(err => {
        console.error(`Failed to dispose store ${store.name}:`, err);
      })
    );
    await Promise.all(promises);
  }
}

// シングルトンインスタンス
export const registry = new VectorStoreRegistry();
