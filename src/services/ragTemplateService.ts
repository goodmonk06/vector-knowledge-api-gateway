import { getDbPool } from '../db/client';

export interface RAGTemplate {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  templateQuery: string;
  systemPrompt: string | null;
  variables: string[];
  defaultParams: Record<string, any>;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRAGTemplateInput {
  name: string;
  description?: string;
  category?: string;
  templateQuery: string;
  systemPrompt?: string;
  variables?: string[];
  defaultParams?: Record<string, any>;
}

export interface UpdateRAGTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  templateQuery?: string;
  systemPrompt?: string;
  variables?: string[];
  defaultParams?: Record<string, any>;
}

export interface ExecuteTemplateInput {
  templateId: number;
  variables?: Record<string, string>;
  params?: Record<string, any>;
}

export class RAGTemplateService {
  /**
   * Create a new RAG template
   */
  async createTemplate(input: CreateRAGTemplateInput): Promise<RAGTemplate> {
    const pool = getDbPool();

    const result = await pool.query(
      `INSERT INTO rag_templates (name, description, category, template_query, system_prompt, variables, default_params)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, category, template_query, system_prompt, variables, default_params, usage_count, created_at, updated_at`,
      [
        input.name,
        input.description || null,
        input.category || null,
        input.templateQuery,
        input.systemPrompt || null,
        JSON.stringify(input.variables || []),
        JSON.stringify(input.defaultParams || {}),
      ]
    );

    return this.mapRowToTemplate(result.rows[0]);
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: number): Promise<RAGTemplate | null> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT id, name, description, category, template_query, system_prompt, variables, default_params, usage_count, created_at, updated_at
       FROM rag_templates
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTemplate(result.rows[0]);
  }

  /**
   * Get template by name
   */
  async getTemplateByName(name: string): Promise<RAGTemplate | null> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT id, name, description, category, template_query, system_prompt, variables, default_params, usage_count, created_at, updated_at
       FROM rag_templates
       WHERE name = $1`,
      [name]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToTemplate(result.rows[0]);
  }

  /**
   * List templates with optional filtering
   */
  async listTemplates(
    category?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ templates: RAGTemplate[]; total: number }> {
    const pool = getDbPool();

    let query = `
      SELECT id, name, description, category, template_query, system_prompt, variables, default_params, usage_count, created_at, updated_at
      FROM rag_templates
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` WHERE category = $${paramIndex++}`;
      params.push(category);
    }

    query += ` ORDER BY usage_count DESC, created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const countQuery = `SELECT COUNT(*) FROM rag_templates${category ? ' WHERE category = $1' : ''}`;
    const countParams = category ? [category] : [];

    const [dataResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    return {
      templates: dataResult.rows.map(this.mapRowToTemplate),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  /**
   * Update template
   */
  async updateTemplate(
    id: number,
    input: UpdateRAGTemplateInput
  ): Promise<RAGTemplate | null> {
    const pool = getDbPool();

    const existing = await this.getTemplate(id);
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

    if (input.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(input.category);
    }

    if (input.templateQuery !== undefined) {
      updates.push(`template_query = $${paramIndex++}`);
      values.push(input.templateQuery);
    }

    if (input.systemPrompt !== undefined) {
      updates.push(`system_prompt = $${paramIndex++}`);
      values.push(input.systemPrompt);
    }

    if (input.variables !== undefined) {
      updates.push(`variables = $${paramIndex++}`);
      values.push(JSON.stringify(input.variables));
    }

    if (input.defaultParams !== undefined) {
      updates.push(`default_params = $${paramIndex++}`);
      values.push(JSON.stringify(input.defaultParams));
    }

    if (updates.length === 0) {
      return existing;
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE rag_templates
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, name, description, category, template_query, system_prompt, variables, default_params, usage_count, created_at, updated_at`,
      values
    );

    return this.mapRowToTemplate(result.rows[0]);
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: number): Promise<boolean> {
    const pool = getDbPool();

    const result = await pool.query(
      `DELETE FROM rag_templates WHERE id = $1`,
      [id]
    );

    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Render template with variable substitution
   */
  renderTemplate(
    template: RAGTemplate,
    variables: Record<string, string> = {}
  ): { query: string; systemPrompt: string | null } {
    let query = template.templateQuery;
    const systemPrompt = template.systemPrompt;

    // Simple variable substitution: {{variableName}}
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      query = query.replace(new RegExp(placeholder, 'g'), value);
    }

    return { query, systemPrompt };
  }

  /**
   * Increment usage count
   */
  async incrementUsage(id: number): Promise<void> {
    const pool = getDbPool();

    await pool.query(
      `UPDATE rag_templates SET usage_count = usage_count + 1 WHERE id = $1`,
      [id]
    );
  }

  /**
   * Get template categories
   */
  async getCategories(): Promise<string[]> {
    const pool = getDbPool();

    const result = await pool.query(
      `SELECT DISTINCT category FROM rag_templates WHERE category IS NOT NULL ORDER BY category`
    );

    return result.rows.map(row => row.category);
  }

  /**
   * Map database row to RAGTemplate object
   */
  private mapRowToTemplate(row: any): RAGTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      templateQuery: row.template_query,
      systemPrompt: row.system_prompt,
      variables: row.variables || [],
      defaultParams: row.default_params || {},
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
