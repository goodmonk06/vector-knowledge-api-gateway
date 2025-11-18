import { VectorSearchResult } from '../core/types';

/**
 * RAG用のプロンプトフォーマット
 */
export interface RAGPromptOptions {
  systemPrompt?: string;
  userQuery: string;
  maxContextLength?: number;
  includeMetadata?: boolean;
}

/**
 * 検索結果をRAGプロンプト用に整形するユーティリティ
 */
export class RAGFormatter {
  /**
   * 検索結果を context として整形
   */
  static formatContext(
    results: VectorSearchResult[],
    options?: {
      maxLength?: number;
      includeMetadata?: boolean;
      includeScores?: boolean;
    }
  ): string {
    const maxLength = options?.maxLength || 4000;
    const includeMetadata = options?.includeMetadata ?? false;
    const includeScores = options?.includeScores ?? false;

    let context = '';

    for (const result of results) {
      let entry = '';

      if (includeScores) {
        entry += `[Score: ${result.score.toFixed(3)}] `;
      }

      entry += `[Source: ${result.storeName}]\n`;
      entry += result.content + '\n';

      if (includeMetadata && Object.keys(result.metadata).length > 0) {
        entry += `Metadata: ${JSON.stringify(result.metadata)}\n`;
      }

      entry += '\n---\n\n';

      // 最大長チェック
      if (context.length + entry.length > maxLength) {
        break;
      }

      context += entry;
    }

    return context.trim();
  }

  /**
   * 完全なRAGプロンプトを生成
   */
  static formatPrompt(
    results: VectorSearchResult[],
    options: RAGPromptOptions
  ): string {
    const systemPrompt = options.systemPrompt ||
      'You are a helpful assistant. Use the following context to answer the user\'s question.';

    const context = this.formatContext(results, {
      maxLength: options.maxContextLength,
      includeMetadata: options.includeMetadata,
    });

    return `${systemPrompt}

# Context
${context}

# User Question
${options.userQuery}

Please answer based on the context provided above.`;
  }

  /**
   * 検索結果をJSON形式で返す（LLMツール呼び出し用）
   */
  static formatForTool(results: VectorSearchResult[]): {
    results: Array<{
      id: string;
      content: string;
      score: number;
      source: string;
      metadata: Record<string, any>;
    }>;
    summary: {
      totalResults: number;
      sources: string[];
      avgScore: number;
    };
  } {
    return {
      results: results.map(r => ({
        id: r.id,
        content: r.content,
        score: r.score,
        source: r.storeName,
        metadata: r.metadata,
      })),
      summary: {
        totalResults: results.length,
        sources: [...new Set(results.map(r => r.storeName))],
        avgScore: results.length > 0
          ? results.reduce((sum, r) => sum + r.score, 0) / results.length
          : 0,
      },
    };
  }

  /**
   * マークダウン形式で整形
   */
  static formatMarkdown(results: VectorSearchResult[]): string {
    let markdown = '# Search Results\n\n';

    results.forEach((result, index) => {
      markdown += `## Result ${index + 1}\n\n`;
      markdown += `**Source:** ${result.storeName}\n\n`;
      markdown += `**Score:** ${result.score.toFixed(3)}\n\n`;
      markdown += `**Content:**\n\n${result.content}\n\n`;

      if (Object.keys(result.metadata).length > 0) {
        markdown += `**Metadata:**\n\`\`\`json\n${JSON.stringify(result.metadata, null, 2)}\n\`\`\`\n\n`;
      }

      markdown += '---\n\n';
    });

    return markdown;
  }
}
