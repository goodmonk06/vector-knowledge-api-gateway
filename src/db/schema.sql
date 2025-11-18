-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table with vector embeddings
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Full text search index
CREATE INDEX IF NOT EXISTS documents_content_idx ON documents
USING gin(to_tsvector('english', content));

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
