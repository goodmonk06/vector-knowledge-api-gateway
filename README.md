# Vector Knowledge API Gateway

社内の複数ベクトルDBをまとめて検索できるAPIゲートウェイ。RAG（Retrieval-Augmented Generation）システム構築のための統一エンドポイントを提供します。

## Overview

このプロジェクトは、複数のベクトルデータベース（pgvector、Qdrant、OpenAI Vector Store）を抽象化し、統一されたインターフェースで検索できるAPIゲートウェイです。LLMアプリケーションやセマンティック検索システムの基盤として利用できます。

**主な特徴:**
- 🔍 統一された検索API（単一・マルチストア対応）
- 📚 完全なCRUD機能を持つ文書管理システム
- 🤖 RAG用のプロンプト自動生成
- 🔒 型安全なAPI（tRPC）
- 🐳 Docker対応で簡単セットアップ
- ✅ 包括的なテストカバレッジ

## Tech Stack

| Category | Technology |
|----------|-----------|
| **Runtime** | Node.js 20+ |
| **Language** | TypeScript |
| **API Framework** | tRPC 10.x |
| **Web Framework** | Express |
| **Database** | PostgreSQL 16 with pgvector |
| **Vector Stores** | pgvector, Qdrant, OpenAI Vector Store |
| **Embeddings** | OpenAI Embeddings API |
| **Testing** | Vitest |
| **Linting** | ESLint, Prettier |
| **Containerization** | Docker, Docker Compose |

## Domain Model

### Core Entities

**Document**
```typescript
{
  id: number;              // Primary key
  title: string;           // Document title (max 500 chars)
  content: string;         // Full text content
  embedding: vector(1536); // OpenAI embedding vector
  metadata: JSONB;         // Flexible metadata
  createdAt: Date;
  updatedAt: Date;
}
```

**Vector Search Result**
```typescript
{
  id: string;
  score: number;           // Similarity score (0-1)
  content: string;
  metadata: Record<string, any>;
  storeName: string;       // Source store identifier
}
```

### Relationships

```
┌─────────────────┐
│   API Gateway   │
└────────┬────────┘
         │
    ┌────┴────┬─────────┬──────────┐
    │         │         │          │
┌───▼───┐ ┌──▼───┐ ┌───▼────┐ ┌───▼────┐
│pgvector│ │Qdrant│ │OpenAI │ │[Future]│
└────────┘ └──────┘ └────────┘ └────────┘
```

## Architecture

```
src/
├── api/                    # tRPC API layer
│   ├── index.ts           # Main router
│   ├── trpc.ts            # tRPC setup
│   └── routers/
│       ├── documentRouter.ts   # Document CRUD
│       ├── vectorRouter.ts     # Vector search
│       └── healthRouter.ts     # Health checks
├── core/                   # Core abstractions
│   ├── types.ts           # Type definitions
│   ├── vectorStore.ts     # IVectorStore interface
│   ├── vectorStoreRegistry.ts
│   └── queryRouter.ts     # Query routing logic
├── stores/                 # Vector store implementations
│   ├── pgVectorStore.ts
│   ├── qdrantStore.ts
│   └── openaiStore.ts
├── services/               # Business logic
│   └── documentService.ts # Document management
├── db/                     # Database
│   ├── schema.sql         # PostgreSQL schema
│   └── client.ts          # DB connection pool
├── middleware/             # Express middleware
│   ├── errorHandler.ts
│   └── requestLogger.ts
├── utils/                  # Utilities
│   ├── ragFormatter.ts    # RAG helpers
│   └── storeFactory.ts    # Store initialization
├── config/                 # Configuration
│   └── env.ts             # Environment variables
└── server.ts              # Main entry point
```

## Getting Started

### Requirements

- **Node.js**: 20.x or higher
- **Docker & Docker Compose**: Latest version
- **OpenAI API Key**: Required for embeddings

### Quick Start

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd vector-knowledge-api-gateway
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

3. **Start with Docker (Recommended)**
```bash
# Start all services (PostgreSQL + API)
npm run docker:up

# Wait for services to be healthy (about 10 seconds)
# Check logs
npm run docker:logs
```

4. **Initialize database and seed data**
```bash
# Run migrations
npm run db:migrate

# Seed sample documents
npm run db:seed
```

5. **Access the API**
```bash
# API is now running at http://localhost:3000

# Check health
curl http://localhost:3000/health

# View API info
curl http://localhost:3000
```

### Alternative: Local Development (without Docker)

If you want to run locally without Docker:

1. **Start PostgreSQL with pgvector**
```bash
# Using Docker for PostgreSQL only
docker run -d \
  --name vector-postgres \
  -e POSTGRES_DB=vectordb \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

2. **Run migrations and seed**
```bash
npm run db:migrate
npm run db:seed
```

3. **Start dev server**
```bash
npm run dev
```

## Example Vertical Slice: Document Search

This implementation provides a complete end-to-end flow for document management and semantic search.

### 1. Create Documents

```bash
curl -X POST http://localhost:3000/trpc/documents.create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Vector Databases",
    "content": "Vector databases store high-dimensional vectors for similarity search...",
    "metadata": {
      "category": "technology",
      "tags": ["vector-db", "ai"]
    }
  }'
```

### 2. List All Documents

```bash
curl 'http://localhost:3000/trpc/documents.list?input={"json":{"limit":10,"offset":0}}'
```

### 3. Search by Semantic Similarity

```bash
curl 'http://localhost:3000/trpc/documents.search?input={"json":{"query":"How do vector databases work?","limit":5}}'
```

### 4. Get RAG Context

```bash
curl 'http://localhost:3000/trpc/vector.getRagContext?input={"json":{"query":"Explain vector search","topK":3}}'
```

**Response includes:**
- `context`: Formatted context string
- `prompt`: Complete prompt for LLM
- `results`: Raw search results
- `metadata`: Summary statistics

## API Reference

### Documents API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/trpc/documents.create` | POST | Create new document with auto-embedding |
| `/trpc/documents.get` | GET | Get document by ID |
| `/trpc/documents.list` | GET | List documents with pagination |
| `/trpc/documents.update` | POST | Update document (re-embeds if content changes) |
| `/trpc/documents.delete` | POST | Delete document |
| `/trpc/documents.search` | GET | Semantic search using vector similarity |

### Vector Search API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/trpc/vector.searchSingle` | GET | Search single store |
| `/trpc/vector.searchMulti` | GET | Search all stores, merge results |
| `/trpc/vector.searchStores` | GET | Search specific stores |
| `/trpc/vector.getRagContext` | GET | Get formatted RAG prompt |

### Health API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Overall health status |
| `/trpc/health.check` | GET | Detailed store health |
| `/trpc/health.stores` | GET | List available stores |
| `/trpc/health.ping` | GET | Simple ping |

## Development Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build TypeScript to dist/
npm start                # Start production server

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed sample data
npm run db:setup         # Migrate + Seed

# Docker
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
npm run docker:logs      # View app logs
npm run docker:rebuild   # Rebuild and restart

# Testing & Quality
npm test                 # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run lint             # Lint code
npm run lint:fix         # Fix lint issues
npm run format           # Format with Prettier
npm run typecheck        # TypeScript type checking
```

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

**Test Coverage Areas:**
- ✅ Core query routing logic
- ✅ RAG formatter utilities
- ✅ Vector store abstractions
- ✅ Document service (integration tests require DB)

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 3000 | Server port |
| `NODE_ENV` | No | development | Environment |
| `ENABLED_STORES` | No | pgvector | Active stores (comma-separated) |
| `OPENAI_API_KEY` | **Yes** | - | OpenAI API key for embeddings |
| `DEFAULT_EMBEDDING_MODEL` | No | text-embedding-3-small | Embedding model |
| `PGVECTOR_HOST` | No | localhost | PostgreSQL host |
| `PGVECTOR_PORT` | No | 5432 | PostgreSQL port |
| `PGVECTOR_DATABASE` | No | vectordb | Database name |
| `PGVECTOR_USER` | No | postgres | Database user |
| `PGVECTOR_PASSWORD` | No | postgres | Database password |
| `QDRANT_URL` | No | http://localhost:6333 | Qdrant URL |
| `QDRANT_API_KEY` | No | - | Qdrant API key |
| `DEFAULT_TOP_K` | No | 5 | Default search results |

### Demo Credentials

The seeded database includes 8 sample documents covering:
- Vector databases
- RAG systems
- TypeScript & tRPC
- PostgreSQL pgvector
- Semantic search
- Docker
- OpenAI Embeddings

**Access:**
- Base URL: http://localhost:3000
- Health: http://localhost:3000/health
- API Docs: http://localhost:3000 (JSON response with all endpoints)

**Demo Query:**
```bash
curl 'http://localhost:3000/trpc/documents.search?input={"json":{"query":"How to build RAG systems?","limit":3}}'
```

## Monitoring & Observability

### Health Checks

**Simple health check:**
```bash
curl http://localhost:3000/health
```

**Detailed health with store status:**
```bash
curl 'http://localhost:3000/trpc/health.check'
```

**Response format:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "stores": [
    {
      "storeName": "pgvector",
      "status": "healthy",
      "latency": 23
    }
  ]
}
```

### Logging

The application logs all requests with:
- HTTP method and path
- Status code
- Response time
- Error details (if any)

**Example log:**
```
✓ [INFO] GET /health - 200 (15ms)
✓ [INFO] POST /trpc/documents.create - 200 (234ms)
❌ [ERROR] GET /trpc/documents.get - 404 (5ms)
```

## Adding New Vector Stores

To add support for a new vector database:

1. **Create store implementation** in `src/stores/`:

```typescript
import { VectorStore } from '../core/vectorStore';

export class MyNewStore extends VectorStore {
  constructor(config: MyStoreConfig) {
    super('my-new-store');
  }

  async initialize(): Promise<void> {
    // Connect to your store
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    // Implement search logic
  }

  async healthCheck(): Promise<StoreHealth> {
    // Check store availability
  }
}
```

2. **Update store factory** in `src/utils/storeFactory.ts`:

```typescript
case 'my-new-store':
  return new MyNewStore({
    url: config.myNewStore.url,
    apiKey: config.myNewStore.apiKey,
  });
```

3. **Add config** in `src/config/env.ts`:

```typescript
myNewStore: {
  url: process.env.MY_NEW_STORE_URL,
  apiKey: process.env.MY_NEW_STORE_API_KEY,
}
```

4. **Enable in `.env`:**
```bash
ENABLED_STORES=pgvector,my-new-store
MY_NEW_STORE_URL=http://localhost:8080
```

## Future Extensions

Planned enhancements for future releases:

- [ ] **Authentication & Authorization**: API key management, role-based access
- [ ] **Advanced RAG Features**:
  - Hybrid search (dense + sparse)
  - Re-ranking models
  - Multi-hop retrieval
- [ ] **Additional Vector Stores**:
  - Pinecone
  - Weaviate
  - Milvus
  - Chroma
- [ ] **Enhanced Observability**:
  - Structured logging (Winston/Pino)
  - Metrics (Prometheus)
  - Distributed tracing (OpenTelemetry)
- [ ] **Performance Optimizations**:
  - Caching layer (Redis)
  - Batch embedding operations
  - Query result caching
- [ ] **Admin UI**: Web dashboard for document management
- [ ] **Multi-tenancy**: Isolated collections per tenant
- [ ] **Advanced Search**:
  - Filtered search
  - Date range queries
  - Faceted search
- [ ] **Data Management**:
  - Bulk import/export
  - Document versioning
  - Soft deletes

## Troubleshooting

### Database Connection Issues

**Problem**: `Failed to connect to database`

**Solution**:
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs vector-gateway-postgres

# Verify connection
docker exec -it vector-gateway-postgres psql -U postgres -d vectordb -c "SELECT 1"
```

### OpenAI API Errors

**Problem**: `Invalid API key`

**Solution**:
- Verify your API key in `.env`
- Check OpenAI account status
- Ensure sufficient credits

**Problem**: `Rate limit exceeded`

**Solution**:
- Implement request throttling
- Consider caching embeddings
- Upgrade OpenAI plan

### Docker Issues

**Problem**: Containers won't start

**Solution**:
```bash
# Clean up and rebuild
npm run docker:down
docker system prune -a
npm run docker:rebuild
```

## Contributing

This is an internal project. For questions or issues, contact the maintainers.

## License

MIT

---

**Built with ❤️ using TypeScript, tRPC, and pgvector**
