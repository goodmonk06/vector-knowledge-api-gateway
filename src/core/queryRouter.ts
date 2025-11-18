import { VectorStoreRegistry } from './vectorStoreRegistry';
import { VectorSearchQuery, VectorSearchResult, MultiStoreSearchQuery } from './types';

/**
 * クエリを適切なベクトルストアにルーティング
 */
export class QueryRouter {
  constructor(private registry: VectorStoreRegistry) {}

  /**
   * 単一ストアに対するクエリ実行
   */
  async searchSingle(
    storeName: string,
    query: VectorSearchQuery
  ): Promise<VectorSearchResult[]> {
    const store = this.registry.getStore(storeName);
    if (!store) {
      throw new Error(`Vector store "${storeName}" not found`);
    }

    return store.search(query);
  }

  /**
   * 複数ストアに対して並列クエリ実行し、結果をマージ
   */
  async searchMulti(
    query: MultiStoreSearchQuery
  ): Promise<VectorSearchResult[]> {
    const stores = this.registry.getAllStores();

    if (stores.length === 0) {
      throw new Error('No vector stores available');
    }

    // 全ストアに並列クエリ
    const promises = stores.map(store =>
      store.search({
        query: query.query,
        topK: query.topK,
        filter: query.filter,
      }).catch(err => {
        console.error(`Error searching ${store.name}:`, err);
        return [] as VectorSearchResult[];
      })
    );

    const results = await Promise.all(promises);

    // 結果を統合してスコアでソート
    const merged = results.flat();
    merged.sort((a, b) => b.score - a.score);

    // topK件を返す
    const topK = query.topK || 5;
    return merged.slice(0, topK);
  }

  /**
   * 特定のストアリストに対して検索
   */
  async searchStores(
    storeNames: string[],
    query: MultiStoreSearchQuery
  ): Promise<VectorSearchResult[]> {
    const stores = storeNames
      .map(name => this.registry.getStore(name))
      .filter((store): store is NonNullable<typeof store> => store !== undefined);

    if (stores.length === 0) {
      throw new Error('No valid vector stores found');
    }

    const promises = stores.map(store =>
      store.search({
        query: query.query,
        topK: query.topK,
        filter: query.filter,
      }).catch(err => {
        console.error(`Error searching ${store.name}:`, err);
        return [] as VectorSearchResult[];
      })
    );

    const results = await Promise.all(promises);
    const merged = results.flat();
    merged.sort((a, b) => b.score - a.score);

    const topK = query.topK || 5;
    return merged.slice(0, topK);
  }
}
