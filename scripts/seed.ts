import { CollectionService } from '../src/services/collectionService';
import { DocumentService } from '../src/services/documentService';
import { RAGTemplateService } from '../src/services/ragTemplateService';
import { SearchAnalyticsService } from '../src/services/searchAnalyticsService';
import { closeDbPool, getDbPool } from '../src/db/client';

const collectionService = new CollectionService();
const documentService = new DocumentService();
const templateService = new RAGTemplateService();
const analyticsService = new SearchAnalyticsService();

async function seedDatabase() {
  console.log('🌱 Seeding database with comprehensive demo data...\n');

  try {
    // ========================================================================
    // STEP 1: Create Collections
    // ========================================================================
    console.log('📚 Creating collections...');

    const collections = [
      {
        name: 'technical-docs',
        description: 'Technical documentation and API references',
        metadata: { department: 'engineering', public: true },
      },
      {
        name: 'marketing-content',
        description: 'Marketing materials and product descriptions',
        metadata: { department: 'marketing', public: true },
      },
      {
        name: 'support-kb',
        description: 'Customer support knowledge base articles',
        metadata: { department: 'support', public: true },
      },
      {
        name: 'internal-wiki',
        description: 'Internal company wiki and procedures',
        metadata: { department: 'all', public: false },
      },
    ];

    const createdCollections: any[] = [];
    for (const coll of collections) {
      const created = await collectionService.createCollection(coll);
      createdCollections.push(created);
      console.log(`   ✓ Created collection: ${created.name}`);
    }

    // ========================================================================
    // STEP 2: Create RAG Templates
    // ========================================================================
    console.log('\n🎯 Creating RAG templates...');

    const templates = [
      {
        name: 'faq-answer',
        category: 'support',
        description: 'Answer frequently asked questions using knowledge base',
        templateQuery: '{{question}}',
        systemPrompt: 'You are a helpful customer support assistant. Answer the question based on the knowledge base articles provided. Be concise and friendly.',
        variables: ['question'],
        defaultParams: { topK: 3, temperature: 0.7 },
      },
      {
        name: 'code-example',
        category: 'technical',
        description: 'Find relevant code examples and documentation',
        templateQuery: '{{language}} {{feature}} code example',
        systemPrompt: 'You are a technical documentation assistant. Provide clear code examples with explanations.',
        variables: ['language', 'feature'],
        defaultParams: { topK: 5 },
      },
      {
        name: 'summarize-topic',
        category: 'general',
        description: 'Summarize information about a specific topic',
        templateQuery: '{{topic}} overview summary explanation',
        systemPrompt: 'Provide a comprehensive summary of the topic based on available documentation.',
        variables: ['topic'],
        defaultParams: { topK: 10 },
      },
      {
        name: 'troubleshooting',
        category: 'support',
        description: 'Help troubleshoot technical issues',
        templateQuery: '{{error}} {{component}} troubleshooting solution',
        systemPrompt: 'You are a technical support expert. Provide step-by-step troubleshooting guidance.',
        variables: ['error', 'component'],
        defaultParams: { topK: 5 },
      },
      {
        name: 'product-comparison',
        category: 'marketing',
        description: 'Compare products or features',
        templateQuery: '{{productA}} vs {{productB}} comparison features',
        systemPrompt: 'Compare the products objectively, highlighting key differences and use cases.',
        variables: ['productA', 'productB'],
        defaultParams: { topK: 8 },
      },
    ];

    for (const template of templates) {
      await templateService.createTemplate(template);
      console.log(`   ✓ Created template: ${template.name}`);
    }

    // ========================================================================
    // STEP 3: Create Documents with Collection Assignment
    // ========================================================================
    console.log('\n📄 Creating documents...');

    const techDocsCollection = createdCollections.find(c => c.name === 'technical-docs')!;
    const marketingCollection = createdCollections.find(c => c.name === 'marketing-content')!;
    const supportCollection = createdCollections.find(c => c.name === 'support-kb')!;
    const wikiCollection = createdCollections.find(c => c.name === 'internal-wiki')!;

    const documents = [
      // Technical Docs Collection
      {
        title: 'Vector Database Fundamentals',
        content: `Vector databases are specialized databases designed to store and query high-dimensional vector embeddings efficiently. Unlike traditional databases that work with structured data, vector databases excel at similarity search operations. They use algorithms like HNSW (Hierarchical Navigable Small World) and IVFFlat to enable fast approximate nearest neighbor searches. Popular use cases include semantic search, recommendation systems, and RAG applications for LLMs.`,
        collectionId: techDocsCollection.id,
        metadata: { category: 'fundamentals', difficulty: 'beginner', tags: ['vector-db', 'embeddings', 'search'] },
      },
      {
        title: 'Building RAG Systems with Vector Search',
        content: `Retrieval-Augmented Generation (RAG) combines the power of vector search with large language models. The process involves: 1) Encoding documents into vector embeddings, 2) Storing them in a vector database, 3) Converting user queries into vectors, 4) Retrieving relevant documents via similarity search, and 5) Augmenting the LLM prompt with retrieved context. This approach significantly improves accuracy and reduces hallucinations compared to standalone LLMs.`,
        collectionId: techDocsCollection.id,
        metadata: { category: 'rag', difficulty: 'intermediate', tags: ['rag', 'llm', 'retrieval'] },
      },
      {
        title: 'TypeScript API Design Best Practices',
        content: `Modern TypeScript APIs benefit from strong typing, zod validation, and tRPC for end-to-end type safety. Key practices include: using strict mode, avoiding 'any' types, leveraging discriminated unions for error handling, implementing proper null safety, and using generics for reusable components. tRPC eliminates the need for code generation while maintaining complete type safety from server to client.`,
        collectionId: techDocsCollection.id,
        metadata: { category: 'programming', difficulty: 'intermediate', tags: ['typescript', 'api', 'trpc'] },
      },
      {
        title: 'PostgreSQL pgvector Extension Guide',
        content: `The pgvector extension brings vector similarity search capabilities directly to PostgreSQL. It supports multiple distance metrics including L2 (Euclidean), inner product, and cosine distance. Index types include IVFFlat for large datasets and HNSW for better recall. To use: CREATE EXTENSION vector; then create tables with vector columns. Query using operators like <-> for L2 distance or <=> for cosine distance. Performance tips: use appropriate index parameters and normalize vectors for cosine similarity.`,
        collectionId: techDocsCollection.id,
        metadata: { category: 'database', difficulty: 'advanced', tags: ['postgresql', 'pgvector', 'sql'] },
      },

      // Marketing Content Collection
      {
        title: 'AI-Powered Search: The Future of Information Retrieval',
        content: `Traditional keyword search is giving way to semantic search powered by AI. With vector embeddings, search systems can understand context, synonyms, and intent rather than just matching exact words. This transformation enables more intuitive search experiences where users find what they need even with imprecise queries. Businesses adopting semantic search see 40-60% improvement in search satisfaction and 30% reduction in "no results" pages.`,
        collectionId: marketingCollection.id,
        metadata: { category: 'product-marketing', audience: 'business', tags: ['ai', 'search', 'semantic'] },
      },
      {
        title: 'Why Your Business Needs a Knowledge Management System',
        content: `Knowledge silos cost businesses millions in productivity. A centralized knowledge management system powered by AI search ensures employees find information instantly, reduces duplicate work, and preserves institutional knowledge. Modern systems use vector databases for intelligent search, automatic categorization, and personalized recommendations. ROI typically shows within 3-6 months through reduced time-to-information and improved decision making.`,
        collectionId: marketingCollection.id,
        metadata: { category: 'thought-leadership', audience: 'enterprise', tags: ['knowledge-management', 'productivity'] },
      },

      // Support KB Collection
      {
        title: 'Getting Started with Vector Search',
        content: `Q: How do I start using vector search? A: Follow these steps: 1) Choose an embedding model (OpenAI, Cohere, or open-source), 2) Encode your documents into vectors, 3) Store vectors in a database (pgvector, Qdrant, Pinecone), 4) For queries: encode the question, search for similar vectors, 5) Use results to augment LLM prompts. Start small with 100-1000 documents to test, then scale up.`,
        collectionId: supportCollection.id,
        metadata: { type: 'faq', category: 'getting-started', tags: ['tutorial', 'beginners'] },
      },
      {
        title: 'Troubleshooting Slow Vector Search Performance',
        content: `If vector searches are slow: 1) Check if indexes are created (IVFFlat or HNSW), 2) Verify index parameters match your dataset size, 3) Use EXPLAIN ANALYZE to identify bottlenecks, 4) Consider reducing dimensions or using PCA, 5) Ensure vectors are normalized for cosine similarity, 6) Check database connection pooling, 7) Monitor memory usage during searches. For pgvector, ideal lists parameter is sqrt(row_count).`,
        collectionId: supportCollection.id,
        metadata: { type: 'troubleshooting', category: 'performance', tags: ['performance', 'optimization'] },
      },

      // Internal Wiki Collection
      {
        title: 'Company Engineering Standards',
        content: `Our engineering team follows these standards: TypeScript for all new projects with strict mode enabled. Use tRPC for API layers to maintain type safety. Follow conventional commits for git messages. All PRs require code review and passing CI. Documentation is mandatory for public APIs. We use Vitest for testing with minimum 70% coverage. Docker for local development, Kubernetes for production. Postgres for relational data, Redis for caching.`,
        collectionId: wikiCollection.id,
        metadata: { department: 'engineering', visibility: 'internal', tags: ['standards', 'guidelines'] },
      },
      {
        title: 'Onboarding Checklist for New Engineers',
        content: `Welcome! Complete these in your first week: 1) Set up local development environment using Docker Compose, 2) Clone main repositories and run tests, 3) Review architecture documentation in /docs, 4) Shadow team standup and sprint planning, 5) Deploy your first PR (fix a good-first-issue), 6) Meet with team lead for project assignment, 7) Complete security training, 8) Join engineering Slack channels. Your mentor will guide you through each step.`,
        collectionId: wikiCollection.id,
        metadata: { department: 'engineering', type: 'onboarding', tags: ['onboarding', 'new-hire'] },
      },

      // Additional diverse documents
      {
        title: 'Docker and Containerization Best Practices',
        content: `Docker revolutionized deployment by packaging applications with dependencies. Best practices: use multi-stage builds to reduce image size, run containers as non-root users for security, use .dockerignore to exclude unnecessary files, leverage layer caching by ordering Dockerfile commands properly, set resource limits to prevent container sprawl, use health checks for monitoring, tag images with version numbers not just 'latest', scan images for vulnerabilities regularly.`,
        collectionId: techDocsCollection.id,
        metadata: { category: 'devops', difficulty: 'intermediate', tags: ['docker', 'containers', 'devops'] },
      },
      {
        title: 'OpenAI Embeddings API Complete Guide',
        content: `OpenAI provides state-of-the-art text embedding models. text-embedding-3-small (1536 dimensions) offers great quality at low cost. text-embedding-3-large (3072 dimensions) provides highest quality. Usage: call embeddings.create() with your text. Batch multiple texts for efficiency (up to 2048 per request). Normalize embeddings before storing for cosine similarity. Cache embeddings to save API costs. Monitor token usage as you're charged per token. Typical use: 1000 pages = ~$0.02 with small model.`,
        collectionId: techDocsCollection.id,
        metadata: { category: 'ai-apis', difficulty: 'beginner', tags: ['openai', 'embeddings', 'api'] },
      },
      {
        title: 'Understanding Semantic Search vs Keyword Search',
        content: `Semantic search understands meaning while keyword search matches exact words. Example: keyword search for "car repair" won't find "automobile maintenance", but semantic search will. This works through embeddings that encode meaning into vectors - similar concepts have similar vectors. Benefits: handles synonyms, understands context, works across languages, finds conceptually related content. Limitations: requires embedding generation, needs more compute than keyword search, may occasionally miss exact matches.`,
        collectionId: supportCollection.id,
        metadata: { type: 'concept-explanation', category: 'search', tags: ['semantic-search', 'concepts'] },
      },
    ];

    for (const doc of documents) {
      const created = await documentService.createDocument({
        title: doc.title,
        content: doc.content,
        metadata: doc.metadata,
      });

      // Update document with collection_id using raw query (documentService doesn't support it yet)
      const pool = getDbPool();
      await pool.query(
        'UPDATE documents SET collection_id = $1 WHERE id = $2',
        [doc.collectionId, created.id]
      );

      console.log(`   ✓ Created document: ${doc.title}`);
    }

    // ========================================================================
    // STEP 4: Simulate Search History for Analytics
    // ========================================================================
    console.log('\n📊 Creating search history...');

    const searchQueries = [
      { query: 'How to use vector databases', resultCount: 5, topScore: 0.92, latencyMs: 45 },
      { query: 'RAG implementation guide', resultCount: 4, topScore: 0.89, latencyMs: 52 },
      { query: 'TypeScript best practices', resultCount: 3, topScore: 0.87, latencyMs: 38 },
      { query: 'pgvector setup', resultCount: 2, topScore: 0.91, latencyMs: 41 },
      { query: 'semantic search tutorial', resultCount: 6, topScore: 0.85, latencyMs: 48 },
      { query: 'Docker containerization', resultCount: 3, topScore: 0.88, latencyMs: 43 },
      { query: 'OpenAI embeddings API', resultCount: 4, topScore: 0.93, latencyMs: 39 },
      { query: 'vector search performance', resultCount: 3, topScore: 0.86, latencyMs: 51 },
      { query: 'How to use vector databases', resultCount: 5, topScore: 0.91, latencyMs: 46 }, // Duplicate for popularity
      { query: 'RAG implementation guide', resultCount: 4, topScore: 0.90, latencyMs: 50 }, // Duplicate
    ];

    for (const search of searchQueries) {
      await analyticsService.recordSearch({
        query: search.query,
        resultCount: search.resultCount,
        topScore: search.topScore,
        latencyMs: search.latencyMs,
        storeName: 'pgvector',
        sessionId: `session-${Math.random().toString(36).substr(2, 9)}`,
      });
    }

    console.log(`   ✓ Created ${searchQueries.length} search history entries`);

    // ========================================================================
    // Summary
    // ========================================================================
    console.log('\n✅ Seeding completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`   • ${collections.length} collections`);
    console.log(`   • ${documents.length} documents`);
    console.log(`   • ${templates.length} RAG templates`);
    console.log(`   • ${searchQueries.length} search history entries`);

    console.log('\n🎯 Try these demo queries:');
    console.log('   • curl "http://localhost:3000/trpc/documents.search?input={\\"json\\":{\\"query\\":\\"RAG systems\\",\\"limit\\":3}}"');
    console.log('   • curl "http://localhost:3000/trpc/collections.list"');
    console.log('   • curl "http://localhost:3000/trpc/templates.list"');
    console.log('   • curl "http://localhost:3000/trpc/analytics.popularQueries"');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await closeDbPool();
  }
}

// Run if executed directly
if (require.main === module) {
  seedDatabase().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { seedDatabase };
