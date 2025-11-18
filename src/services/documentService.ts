import { getDbPool } from '../db/client';
import { OpenAI } from 'openai';
import { config } from '../config/env';

export interface Document {
  id: number;
  title: string;
  content: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDocumentInput {
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export class DocumentService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: text,
    });
    return response.data[0].embedding;
  }

  /**
   * Create a new document with embedding
   */
  async createDocument(input: CreateDocumentInput): Promise<Document> {
    const pool = getDbPool();

    // Generate embedding for the content
    const embedding = await this.generateEmbedding(input.content);

    const result = await pool.query(
      `INSERT INTO documents (title, content, embedding, metadata)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, content, metadata, created_at, updated_at`,
      [
        input.title,
        input.content,
        `[${embedding.join(',')}]`,
        JSON.stringify(input.metadata || {}),
      ]
    );

    const row = result.rows[0];
    return this.mapRowToDocument(row);
  }

  /**
   * Get document by ID
   */
  async getDocument(id: number): Promise<Document | null> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT id, title, content, metadata, created_at, updated_at
       FROM documents
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToDocument(result.rows[0]);
  }

  /**
   * List documents with pagination
   */
  async listDocuments(
    limit: number = 20,
    offset: number = 0
  ): Promise<{ documents: Document[]; total: number }> {
    const pool = getDbPool();

    const [dataResult, countResult] = await Promise.all([
      pool.query(
        `SELECT id, title, content, metadata, created_at, updated_at
         FROM documents
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
      pool.query(`SELECT COUNT(*) FROM documents`),
    ]);

    return {
      documents: dataResult.rows.map(this.mapRowToDocument),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Update document
   */
  async updateDocument(
    id: number,
    input: UpdateDocumentInput
  ): Promise<Document | null> {
    const pool = getDbPool();

    // Get existing document
    const existing = await this.getDocument(id);
    if (!existing) {
      return null;
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }

    if (input.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(input.content);

      // Regenerate embedding if content changed
      const embedding = await this.generateEmbedding(input.content);
      updates.push(`embedding = $${paramIndex++}`);
      values.push(`[${embedding.join(',')}]`);
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
      `UPDATE documents
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, title, content, metadata, created_at, updated_at`,
      values
    );

    return this.mapRowToDocument(result.rows[0]);
  }

  /**
   * Delete document
   */
  async deleteDocument(id: number): Promise<boolean> {
    const pool = getDbPool();

    const result = await pool.query(
      `DELETE FROM documents WHERE id = $1`,
      [id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Search documents by vector similarity
   */
  async searchDocuments(
    query: string,
    limit: number = 5
  ): Promise<Array<Document & { score: number }>> {
    const pool = getDbPool();

    // Generate embedding for query
    const embedding = await this.generateEmbedding(query);

    const result = await pool.query(
      `SELECT
         id,
         title,
         content,
         metadata,
         created_at,
         updated_at,
         1 - (embedding <=> $1::vector) as score
       FROM documents
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [`[${embedding.join(',')}]`, limit]
    );

    return result.rows.map(row => ({
      ...this.mapRowToDocument(row),
      score: parseFloat(row.score),
    }));
  }

  /**
   * Map database row to Document object
   */
  private mapRowToDocument(row: any): Document {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
