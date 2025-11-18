-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- COLLECTIONS: Organize documents into namespaces
-- ============================================================================
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS collections_name_idx ON collections(name);

-- ============================================================================
-- TAGS: Flexible categorization system
-- ============================================================================
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50),
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS tags_category_idx ON tags(category);
CREATE INDEX IF NOT EXISTS tags_name_idx ON tags(name);

-- ============================================================================
-- DOCUMENTS: Enhanced with collections, tags, status, versioning
-- ============================================================================
CREATE TYPE document_status AS ENUM ('draft', 'active', 'archived', 'deleted');

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
    status document_status DEFAULT 'active',
    version INTEGER DEFAULT 1,
    source_url TEXT,
    word_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS documents_collection_idx ON documents(collection_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);
CREATE INDEX IF NOT EXISTS documents_created_idx ON documents(created_at DESC);

-- Full text search index
CREATE INDEX IF NOT EXISTS documents_content_idx ON documents
USING gin(to_tsvector('english', content));

-- ============================================================================
-- DOCUMENT_TAGS: Many-to-many relationship
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_tags (
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id, tag_id)
);

CREATE INDEX IF NOT EXISTS document_tags_doc_idx ON document_tags(document_id);
CREATE INDEX IF NOT EXISTS document_tags_tag_idx ON document_tags(tag_id);

-- ============================================================================
-- SEARCH_HISTORY: Track and analyze searches
-- ============================================================================
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
    filters JSONB DEFAULT '{}',
    result_count INTEGER,
    top_score DECIMAL(5, 4),
    latency_ms INTEGER,
    store_name VARCHAR(50),
    user_id VARCHAR(100), -- Future: link to auth service
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS search_history_query_idx ON search_history
USING gin(to_tsvector('english', query));
CREATE INDEX IF NOT EXISTS search_history_created_idx ON search_history(created_at DESC);
CREATE INDEX IF NOT EXISTS search_history_collection_idx ON search_history(collection_id);

-- ============================================================================
-- RAG_TEMPLATES: Pre-configured query patterns
-- ============================================================================
CREATE TABLE IF NOT EXISTS rag_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50),
    template_query TEXT NOT NULL,
    system_prompt TEXT,
    variables JSONB DEFAULT '[]', -- List of variable names
    default_params JSONB DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS rag_templates_category_idx ON rag_templates(category);
CREATE INDEX IF NOT EXISTS rag_templates_name_idx ON rag_templates(name);

-- ============================================================================
-- EMBEDDING_JOBS: Batch processing queue
-- ============================================================================
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS embedding_jobs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200),
    status job_status DEFAULT 'pending',
    total_documents INTEGER DEFAULT 0,
    processed_documents INTEGER DEFAULT 0,
    failed_documents INTEGER DEFAULT 0,
    collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
    config JSONB DEFAULT '{}',
    error_log TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS embedding_jobs_status_idx ON embedding_jobs(status);
CREATE INDEX IF NOT EXISTS embedding_jobs_created_idx ON embedding_jobs(created_at DESC);

-- ============================================================================
-- VECTOR_STORE_METRICS: Performance tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS vector_store_metrics (
    id SERIAL PRIMARY KEY,
    store_name VARCHAR(50) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'latency', 'error_rate', 'query_count'
    metric_value DECIMAL(10, 2),
    labels JSONB DEFAULT '{}',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS vector_store_metrics_store_idx ON vector_store_metrics(store_name);
CREATE INDEX IF NOT EXISTS vector_store_metrics_type_idx ON vector_store_metrics(metric_type);
CREATE INDEX IF NOT EXISTS vector_store_metrics_recorded_idx ON vector_store_metrics(recorded_at DESC);

-- ============================================================================
-- TRIGGERS: Auto-update timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_collections_updated_at ON collections;
CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rag_templates_updated_at ON rag_templates;
CREATE TRIGGER update_rag_templates_updated_at
    BEFORE UPDATE ON rag_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FUNCTIONS: Domain-specific helpers
-- ============================================================================

-- Get popular search queries
CREATE OR REPLACE FUNCTION get_popular_queries(
    days_back INTEGER DEFAULT 7,
    result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    query TEXT,
    search_count BIGINT,
    avg_result_count DECIMAL,
    avg_latency_ms DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sh.query,
        COUNT(*)::BIGINT as search_count,
        AVG(sh.result_count)::DECIMAL as avg_result_count,
        AVG(sh.latency_ms)::DECIMAL as avg_latency_ms
    FROM search_history sh
    WHERE sh.created_at >= NOW() - INTERVAL '1 day' * days_back
    GROUP BY sh.query
    ORDER BY search_count DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Get collection statistics
CREATE OR REPLACE FUNCTION get_collection_stats(collection_id_param INTEGER)
RETURNS TABLE (
    total_documents BIGINT,
    active_documents BIGINT,
    total_searches BIGINT,
    avg_search_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT d.id)::BIGINT as total_documents,
        COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'active')::BIGINT as active_documents,
        COUNT(DISTINCT sh.id)::BIGINT as total_searches,
        AVG(sh.top_score)::DECIMAL as avg_search_score
    FROM documents d
    LEFT JOIN search_history sh ON sh.collection_id = d.collection_id
    WHERE d.collection_id = collection_id_param
    GROUP BY d.collection_id;
END;
$$ LANGUAGE plpgsql;
