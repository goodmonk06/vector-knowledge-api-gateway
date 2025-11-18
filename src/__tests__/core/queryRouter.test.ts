import { describe, it, expect, beforeEach } from 'vitest';
import { QueryRouter } from '../../core/queryRouter';
import { VectorStoreRegistry } from '../../core/vectorStoreRegistry';
import { VectorStore } from '../../core/vectorStore';
import {
  VectorSearchQuery,
  VectorSearchResult,
  StoreHealth,
} from '../../core/types';

// Mock vector store for testing
class MockVectorStore extends VectorStore {
  private mockResults: VectorSearchResult[];

  constructor(name: string, mockResults: VectorSearchResult[]) {
    super(name);
    this.mockResults = mockResults;
  }

  async initialize(): Promise<void> {
    // Mock initialization
  }

  async search(_query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    return this.mockResults;
  }

  async healthCheck(): Promise<StoreHealth> {
    return {
      storeName: this.name,
      status: 'healthy',
      latency: 10,
    };
  }
}

describe('QueryRouter', () => {
  let registry: VectorStoreRegistry;
  let router: QueryRouter;

  beforeEach(() => {
    registry = new VectorStoreRegistry();

    // Register mock stores
    const store1Results: VectorSearchResult[] = [
      {
        id: 'store1-1',
        score: 0.9,
        content: 'Content from store 1',
        metadata: {},
        storeName: 'store1',
      },
      {
        id: 'store1-2',
        score: 0.7,
        content: 'More content from store 1',
        metadata: {},
        storeName: 'store1',
      },
    ];

    const store2Results: VectorSearchResult[] = [
      {
        id: 'store2-1',
        score: 0.85,
        content: 'Content from store 2',
        metadata: {},
        storeName: 'store2',
      },
    ];

    registry.register(new MockVectorStore('store1', store1Results));
    registry.register(new MockVectorStore('store2', store2Results));

    router = new QueryRouter(registry);
  });

  describe('searchSingle', () => {
    it('should search in a single store', async () => {
      const results = await router.searchSingle('store1', {
        query: 'test query',
        topK: 5,
      });

      expect(results).toHaveLength(2);
      expect(results[0].storeName).toBe('store1');
    });

    it('should throw error for non-existent store', async () => {
      await expect(
        router.searchSingle('nonexistent', { query: 'test' })
      ).rejects.toThrow('not found');
    });
  });

  describe('searchMulti', () => {
    it('should search across all stores', async () => {
      const results = await router.searchMulti({
        query: 'test query',
        topK: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      // Should have results from both stores
      const storeNames = new Set(results.map(r => r.storeName));
      expect(storeNames.size).toBeGreaterThan(1);
    });

    it('should sort results by score', async () => {
      const results = await router.searchMulti({
        query: 'test query',
        topK: 10,
      });

      // Verify descending order
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].score).toBeGreaterThanOrEqual(results[i + 1].score);
      }
    });

    it('should respect topK limit', async () => {
      const results = await router.searchMulti({
        query: 'test query',
        topK: 2,
      });

      expect(results).toHaveLength(2);
    });
  });

  describe('searchStores', () => {
    it('should search only specified stores', async () => {
      const results = await router.searchStores(['store1'], {
        query: 'test query',
        topK: 10,
      });

      expect(results.length).toBeGreaterThan(0);
      // All results should be from store1
      expect(results.every(r => r.storeName === 'store1')).toBe(true);
    });

    it('should handle multiple specified stores', async () => {
      const results = await router.searchStores(['store1', 'store2'], {
        query: 'test query',
        topK: 10,
      });

      const storeNames = new Set(results.map(r => r.storeName));
      expect(storeNames.has('store1')).toBe(true);
      expect(storeNames.has('store2')).toBe(true);
    });

    it('should throw error for empty store list', async () => {
      await expect(
        router.searchStores([], { query: 'test' })
      ).rejects.toThrow('No valid vector stores');
    });
  });
});
