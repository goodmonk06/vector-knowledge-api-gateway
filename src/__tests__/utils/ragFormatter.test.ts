import { describe, it, expect } from 'vitest';
import { RAGFormatter } from '../../utils/ragFormatter';
import { VectorSearchResult } from '../../core/types';

describe('RAGFormatter', () => {
  const mockResults: VectorSearchResult[] = [
    {
      id: '1',
      score: 0.95,
      content: 'This is the first test document about vector databases.',
      metadata: { source: 'test', category: 'tech' },
      storeName: 'pgvector',
    },
    {
      id: '2',
      score: 0.87,
      content: 'This is the second test document about AI and machine learning.',
      metadata: { source: 'test', category: 'ai' },
      storeName: 'qdrant',
    },
    {
      id: '3',
      score: 0.72,
      content: 'This is the third test document about TypeScript.',
      metadata: { source: 'test', category: 'programming' },
      storeName: 'pgvector',
    },
  ];

  describe('formatContext', () => {
    it('should format search results into context string', () => {
      const context = RAGFormatter.formatContext(mockResults);

      expect(context).toContain('[Source: pgvector]');
      expect(context).toContain('first test document');
      expect(context).toContain('[Source: qdrant]');
      expect(context).toContain('second test document');
    });

    it('should include scores when requested', () => {
      const context = RAGFormatter.formatContext(mockResults, {
        includeScores: true,
      });

      expect(context).toContain('[Score: 0.950]');
      expect(context).toContain('[Score: 0.870]');
    });

    it('should include metadata when requested', () => {
      const context = RAGFormatter.formatContext(mockResults, {
        includeMetadata: true,
      });

      expect(context).toContain('Metadata:');
      expect(context).toContain('"source":"test"');
    });

    it('should respect maxLength parameter', () => {
      const context = RAGFormatter.formatContext(mockResults, {
        maxLength: 100,
      });

      expect(context.length).toBeLessThanOrEqual(100);
    });
  });

  describe('formatPrompt', () => {
    it('should generate complete RAG prompt', () => {
      const prompt = RAGFormatter.formatPrompt(mockResults, {
        userQuery: 'What are vector databases?',
      });

      expect(prompt).toContain('Context');
      expect(prompt).toContain('User Question');
      expect(prompt).toContain('What are vector databases?');
      expect(prompt).toContain('first test document');
    });

    it('should use custom system prompt', () => {
      const customSystemPrompt = 'You are a technical expert.';
      const prompt = RAGFormatter.formatPrompt(mockResults, {
        userQuery: 'Test query',
        systemPrompt: customSystemPrompt,
      });

      expect(prompt).toContain(customSystemPrompt);
    });
  });

  describe('formatForTool', () => {
    it('should format results for tool consumption', () => {
      const toolFormat = RAGFormatter.formatForTool(mockResults);

      expect(toolFormat.results).toHaveLength(3);
      expect(toolFormat.summary.totalResults).toBe(3);
      expect(toolFormat.summary.sources).toContain('pgvector');
      expect(toolFormat.summary.sources).toContain('qdrant');
      expect(toolFormat.summary.avgScore).toBeCloseTo(0.85, 1);
    });

    it('should include all required fields', () => {
      const toolFormat = RAGFormatter.formatForTool(mockResults);
      const firstResult = toolFormat.results[0];

      expect(firstResult).toHaveProperty('id');
      expect(firstResult).toHaveProperty('content');
      expect(firstResult).toHaveProperty('score');
      expect(firstResult).toHaveProperty('source');
      expect(firstResult).toHaveProperty('metadata');
    });
  });

  describe('formatMarkdown', () => {
    it('should format results as markdown', () => {
      const markdown = RAGFormatter.formatMarkdown(mockResults);

      expect(markdown).toContain('# Search Results');
      expect(markdown).toContain('## Result 1');
      expect(markdown).toContain('**Source:**');
      expect(markdown).toContain('**Score:**');
      expect(markdown).toContain('**Content:**');
    });

    it('should include metadata in code blocks', () => {
      const markdown = RAGFormatter.formatMarkdown(mockResults);

      expect(markdown).toContain('**Metadata:**');
      expect(markdown).toContain('```json');
    });
  });
});
