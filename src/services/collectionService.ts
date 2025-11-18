import { getDbPool } from '../db/client';

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionStats {
  totalDocuments: number;
  activeDocuments: number;
  totalSearches: number;
  avgSearchScore: number | null;
}

export interface CreateCollectionInput {
  name: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCollectionInput {
  name?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export class CollectionService {
  /**
   * Create a new collection
   */
  async createCollection(input: CreateCollectionInput): Promise<Collection> {
    const pool = getDbPool();

    const result = await pool.query(
      `INSERT INTO collections (name, description, metadata)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, metadata, created_at, updated_at`,
      [
        input.name,
        input.description || null,
        JSON.stringify(input.metadata || {}),
      ]
    );

    return this.mapRowToCollection(result.rows[0]);
  }

  /**
   * Get collection by ID
   */
  async getCollection(id: number): Promise<Collection | null> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT id, name, description, metadata, created_at, updated_at
       FROM collections
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCollection(result.rows[0]);
  }

  /**
   * Get collection by name
   */
  async getCollectionByName(name: string): Promise<Collection | null> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT id, name, description, metadata, created_at, updated_at
       FROM collections
       WHERE name = $1`,
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToCollection(result.rows[0]);
  }

  /**
   * List all collections with pagination
   */
  async listCollections(
    limit: number = 20,
    offset: number = 0
  ): Promise<{ collections: Collection[]; total: number }> {
    const pool = getDbPool();

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, name, description, metadata, created_at, updated_at
         FROM collections
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM collections`),
    ]);

    return {
      collections: dataResult.rows.map(this.mapRowToCollection),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Update collection
   */
  async updateCollection(
    id: number,
    input: UpdateCollectionInput
  ): Promise<Collection | null> {
    const pool = getDbPool();

    // Get existing collection
    const existing = await this.getCollection(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }

    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }

    if (input.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE collections
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, description, metadata, created_at, updated_at`,
      values
    );

    return this.mapRowToCollection(result.rows[0]);
  }

  /**
   * Delete collection
   */
  async deleteCollection(id: number): Promise<boolean> {
    const pool = getDbPool();

    const result = await pool.query(
      `DELETE FROM collections WHERE id = $1`,
      [id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(id: number): Promise<CollectionStats | null> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT * FROM get_collection_stats($1)`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      totalDocuments: parseInt(row.total_documents, 10),
      activeDocuments: parseInt(row.active_documents, 10),
      totalSearches: parseInt(row.total_searches, 10),
      avgSearchScore: row.avg_search_score ? parseFloat(row.avg_search_score) : null,
    };
  }

  /**
   * Get documents in collection
   */
  async getDocumentsInCollection(
    collectionId: number,
    limit: number = 20,
    offset: number = 0,
    status?: string
  ): Promise<{ documents: any[]; total: number }> {
    const pool = getDbPool();

    let query = `
      SELECT id, title, content, metadata, status, version, source_url, word_count, created_at, updated_at
      FROM documents
      WHERE collection_id = $1
    `;

    const params: any[] = [collectionId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(
        `SELECT COUNT(*) FROM documents WHERE collection_id = $1${status ? ' AND status = $2' : ''}`,
        status ? [collectionId, status] : [collectionId]
      ),
    ]);

    return {
      documents: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Map database row to Collection object
   */
  private mapRowToCollection(row: any): Collection {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
