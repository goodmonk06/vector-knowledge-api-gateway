import { DocumentService } from '../src/services/documentService';
import { closeDbPool } from '../src/db/client';

const sampleDocuments = [
  {
    title: 'Introduction to Vector Databases',
    content: `Vector databases are specialized database systems designed to store and query high-dimensional vectors efficiently.
    They are essential for modern AI applications, particularly in semantic search, recommendation systems, and similarity matching.
    Unlike traditional databases that handle structured data, vector databases excel at finding similar items based on their vector embeddings.
    Popular vector databases include Pinecone, Weaviate, Qdrant, and pgvector for PostgreSQL.`,
    metadata: {
      category: 'technology',
      tags: ['vector-db', 'ai', 'database'],
      author: 'System',
    },
  },
  {
    title: 'Understanding RAG (Retrieval-Augmented Generation)',
    content: `RAG is a powerful technique that combines retrieval-based and generation-based approaches in AI.
    It works by first retrieving relevant documents from a knowledge base, then using those documents as context for a language model to generate responses.
    This approach significantly improves the accuracy and reliability of AI-generated content by grounding it in factual information.
    RAG is widely used in chatbots, question-answering systems, and content generation applications.`,
    metadata: {
      category: 'ai',
      tags: ['rag', 'llm', 'ai'],
      author: 'System',
    },
  },
  {
    title: 'TypeScript Best Practices',
    content: `TypeScript extends JavaScript by adding static type definitions, making code more robust and maintainable.
    Best practices include: using strict mode, avoiding 'any' type, leveraging type inference, using interfaces for object shapes,
    and utilizing generics for reusable components. TypeScript's type system helps catch errors at compile time rather than runtime,
    significantly improving code quality and developer experience.`,
    metadata: {
      category: 'programming',
      tags: ['typescript', 'javascript', 'best-practices'],
      author: 'System',
    },
  },
  {
    title: 'Building APIs with tRPC',
    content: `tRPC enables end-to-end type-safe APIs without code generation or runtime bloat.
    It leverages TypeScript's inference to provide automatic type safety from server to client.
    tRPC is particularly useful in full-stack TypeScript applications where you want type safety across the entire stack.
    It supports middleware, error handling, and works well with React Query for data fetching.`,
    metadata: {
      category: 'technology',
      tags: ['trpc', 'api', 'typescript'],
      author: 'System',
    },
  },
  {
    title: 'PostgreSQL pgvector Extension',
    content: `The pgvector extension adds vector similarity search capabilities to PostgreSQL.
    It supports exact and approximate nearest neighbor search, multiple distance functions (L2, inner product, cosine distance),
    and indexing methods like IVFFlat and HNSW. This makes PostgreSQL a viable option for vector search workloads
    without needing a separate vector database, simplifying architecture and reducing operational complexity.`,
    metadata: {
      category: 'database',
      tags: ['postgresql', 'pgvector', 'vector-search'],
      author: 'System',
    },
  },
  {
    title: 'Semantic Search Applications',
    content: `Semantic search goes beyond keyword matching to understand the intent and contextual meaning of search queries.
    It uses vector embeddings to represent text in high-dimensional space where semantically similar content clusters together.
    Applications include enterprise document search, e-commerce product discovery, customer support knowledge bases,
    and content recommendation systems. Semantic search significantly improves user experience by finding relevant results
    even when exact keywords don't match.`,
    metadata: {
      category: 'ai',
      tags: ['semantic-search', 'embeddings', 'nlp'],
      author: 'System',
    },
  },
  {
    title: 'Docker and Containerization',
    content: `Docker revolutionized software deployment by packaging applications and their dependencies into containers.
    Containers provide consistency across development, testing, and production environments. Docker Compose simplifies
    multi-container applications, allowing you to define and run complex applications with a single configuration file.
    This approach improves development velocity, reduces "works on my machine" issues, and simplifies scaling.`,
    metadata: {
      category: 'devops',
      tags: ['docker', 'containers', 'devops'],
      author: 'System',
    },
  },
  {
    title: 'OpenAI Embeddings API',
    content: `OpenAI's Embeddings API converts text into numerical vector representations that capture semantic meaning.
    The text-embedding-3-small and text-embedding-3-large models provide high-quality embeddings for various use cases.
    These embeddings can be used for semantic search, clustering, classification, and recommendation systems.
    The API is simple to use and integrates well with vector databases for building AI-powered applications.`,
    metadata: {
      category: 'ai',
      tags: ['openai', 'embeddings', 'api'],
      author: 'System',
    },
  },
];

async function seedDatabase() {
  console.log('🌱 Seeding database with sample documents...');

  const documentService = new DocumentService();

  try {
    let created = 0;

    for (const doc of sampleDocuments) {
      console.log(`   Creating: "${doc.title}"`);
      await documentService.createDocument(doc);
      created++;
    }

    console.log(`\n✅ Successfully seeded ${created} documents`);
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
