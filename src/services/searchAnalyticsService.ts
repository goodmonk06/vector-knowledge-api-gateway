import { getDbPool } from '../db/client';

export interface SearchHistoryEntry {
  id: number;
  query: string;
  collectionId: number | null;
  filters: Record<string, any>;
  resultCount: number | null;
  topScore: number | null;
  latencyMs: number | null;
  storeName: string | null;
  userId: string | null;
  sessionId: string | null;
  createdAt: Date;
}

export interface RecordSearchInput {
  query: string;
  collectionId?: number;
  filters?: Record<string, any>;
  resultCount?: number;
  topScore?: number;
  latencyMs?: number;
  storeName?: string;
  userId?: string;
  sessionId?: string;
}

export interface PopularQuery {
  query: string;
  searchCount: number;
  avgResultCount: number | null;
  avgLatencyMs: number | null;
}

export interface SearchTrend {
  date: Date;
  searchCount: number;
  uniqueQueries: number;
}

export class SearchAnalyticsService {
  /**
   * Record a search query for analytics
   */
  async recordSearch(input: RecordSearchInput): Promise<SearchHistoryEntry> {
    const pool = getDbPool();

    const result = await pool.query(
      `INSERT INTO search_history (query, collection_id, filters, result_count, top_score, latency_ms, store_name, user_id, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, query, collection_id, filters, result_count, top_score, latency_ms, store_name, user_id, session_id, created_at`,
      [
        input.query,
        input.collectionId || null,
        JSON.stringify(input.filters || {}),
        input.resultCount || null,
        input.topScore || null,
        input.latencyMs || null,
        input.storeName || null,
        input.userId || null,
        input.sessionId || null,
      ]
    );

    return this.mapRowToSearchHistory(result.rows[0]);
  }

  /**
   * Get popular queries using database function
   */
  async getPopularQueries(
    daysBack: number = 7,
    limit: number = 10
  ): Promise<PopularQuery[]> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT * FROM get_popular_queries($1, $2)`,
      [daysBack, limit]
    );

    return result.rows.map(row => ({
      query: row.query,
      searchCount: parseInt(row.search_count, 10),
      avgResultCount: row.avg_result_count ? parseFloat(row.avg_result_count) : null,
      avgLatencyMs: row.avg_latency_ms ? parseFloat(row.avg_latency_ms) : null,
    }));
  }

  /**
   * Get search trends over time
   */
  async getSearchTrends(daysBack: number = 30): Promise<SearchTrend[]> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT
         DATE(created_at) as date,
         COUNT(*)::INTEGER as search_count,
         COUNT(DISTINCT query)::INTEGER as unique_queries
       FROM search_history
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [daysBack]
    );

    return result.rows.map(row => ({
      date: row.date,
      searchCount: row.search_count,
      uniqueQueries: row.unique_queries,
    }));
  }

  /**
   * Get search history with pagination
   */
  async getSearchHistory(
    limit: number = 20,
    offset: number = 0,
    collectionId?: number
  ): Promise<{ entries: SearchHistoryEntry[]; total: number }> {
    const pool = getDbPool();

    let query = `
      SELECT id, query, collection_id, filters, result_count, top_score, latency_ms, store_name, user_id, session_id, created_at
      FROM search_history
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (collectionId !== undefined) {
      query += ` WHERE collection_id = $${paramIndex++}`;
      params.push(collectionId);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) FROM search_history${collectionId !== undefined ? ' WHERE collection_id = $1' : ''}`;
    const countParams = collectionId !== undefined ? [collectionId] : [];

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    return {
      entries: dataResult.rows.map(this.mapRowToSearchHistory),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Get analytics summary
   */
  async getSummary(daysBack: number = 7): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    avgLatencyMs: number | null;
    avgResultCount: number | null;
  }> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT
         COUNT(*)::INTEGER as total_searches,
         COUNT(DISTINCT query)::INTEGER as unique_queries,
         AVG(latency_ms)::DECIMAL as avg_latency_ms,
         AVG(result_count)::DECIMAL as avg_result_count
       FROM search_history
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1`,
      [daysBack]
    );

    const row = result.rows[0];
    return {
      totalSearches: row.total_searches,
      uniqueQueries: row.unique_queries,
      avgLatencyMs: row.avg_latency_ms ? parseFloat(row.avg_latency_ms) : null,
      avgResultCount: row.avg_result_count ? parseFloat(row.avg_result_count) : null,
    };
  }

  /**
   * Get store performance metrics
   */
  async getStorePerformance(daysBack: number = 7): Promise<Array<{
    storeName: string;
    searchCount: number;
    avgLatencyMs: number | null;
    avgResultCount: number | null;
  }>> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT
         store_name,
         COUNT(*)::INTEGER as search_count,
         AVG(latency_ms)::DECIMAL as avg_latency_ms,
         AVG(result_count)::DECIMAL as avg_result_count
       FROM search_history
       WHERE created_at >= NOW() - INTERVAL '1 day' * $1
         AND store_name IS NOT NULL
       GROUP BY store_name
       ORDER BY search_count DESC`,
      [daysBack]
    );

    return result.rows.map(row => ({
      storeName: row.store_name,
      searchCount: row.search_count,
      avgLatencyMs: row.avg_latency_ms ? parseFloat(row.avg_latency_ms) : null,
      avgResultCount: row.avg_result_count ? parseFloat(row.avg_result_count) : null,
    }));
  }

  /**
   * Map database row to SearchHistoryEntry object
   */
  private mapRowToSearchHistory(row: any): SearchHistoryEntry {
    return {
      id: row.id,
      query: row.query,
      collectionId: row.collection_id,
      filters: row.filters || {},
      resultCount: row.result_count,
      topScore: row.top_score ? parseFloat(row.top_score) : null,
      latencyMs: row.latency_ms,
      storeName: row.store_name,
      userId: row.user_id,
      sessionId: row.session_id,
      createdAt: row.created_at,
    };
  }
}
