# vector-knowledge-api-gateway

社内の複数ベクトルDBをまとめて検索できるAPIゲートウェイ。検索・RAG・ツール呼び出し用の統一エンドポイントを提供。

## Tech Stack

- **Backend**: Node.js, TypeScript, Express
- **API**: tRPC (型安全なRPC)
- **Vector Stores**: pgvector (PostgreSQL), Qdrant, OpenAI Vector Store
- **Embeddings**: OpenAI Embeddings API

## Features

- ✅ 複数ベクトルストアの統一インターフェース
- ✅ 単一ストア検索 & マルチストア並列検索
- ✅ RAG用プロンプト自動生成
- ✅ ヘルスチェック & モニタリング
- ✅ 型安全なAPI (tRPC)

## Architecture

```
src/
├── core/           # ベクトルストアの抽象化層
│   ├── types.ts
│   ├── vectorStore.ts
│   ├── vectorStoreRegistry.ts
│   └── queryRouter.ts
├── stores/         # 各ベクトルストアの実装
│   ├── pgVectorStore.ts
│   ├── qdrantStore.ts
│   └── openaiStore.ts
├── api/            # tRPC APIルーター
│   ├── trpc.ts
│   └── routers/
│       ├── vectorRouter.ts
│       └── healthRouter.ts
├── config/         # 環境変数・設定
│   └── env.ts
├── utils/          # RAGフォーマッター等
│   ├── ragFormatter.ts
│   └── storeFactory.ts
└── server.ts       # メインエントリーポイント
```

## Getting Started

### 1. インストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成:

```bash
cp .env.example .env
```

`.env` を編集:

```bash
# サーバー設定
PORT=3000

# 有効にするストア (カンマ区切り)
ENABLED_STORES=pgvector,qdrant,openai

# OpenAI API Key (必須)
OPENAI_API_KEY=sk-your-key-here

# PostgreSQL (pgvector) 設定
PGVECTOR_HOST=localhost
PGVECTOR_PORT=5432
PGVECTOR_DATABASE=vectordb
PGVECTOR_USER=postgres
PGVECTOR_PASSWORD=postgres

# Qdrant 設定
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=

# デフォルト設定
DEFAULT_EMBEDDING_MODEL=text-embedding-3-small
DEFAULT_TOP_K=5
```

### 3. 起動

```bash
# 開発モード
npm run dev

# ビルド
npm run build

# 本番モード
npm start
```

サーバーが起動したら `http://localhost:3000` にアクセス。

## API Usage

### Health Check

```bash
curl http://localhost:3000/health
```

### tRPC Endpoints

#### 1. 単一ストア検索

```typescript
// tRPCクライアントから
const result = await trpc.vector.searchSingle.query({
  storeName: 'pgvector',
  query: 'TypeScriptの使い方',
  collection: 'documents',
  topK: 5
});
```

REST API経由:
```bash
curl -X POST http://localhost:3000/trpc/vector.searchSingle \
  -H "Content-Type: application/json" \
  -d '{
    "storeName": "pgvector",
    "query": "TypeScriptの使い方",
    "topK": 5
  }'
```

#### 2. マルチストア検索

全ストアから並列検索し、上位k件をマージ:

```typescript
const result = await trpc.vector.searchMulti.query({
  query: 'ベクトルDBの比較',
  topK: 10
});

// レスポンス
{
  results: [
    {
      id: "doc-123",
      score: 0.92,
      content: "...",
      storeName: "pgvector",
      metadata: {...}
    },
    ...
  ],
  count: 10,
  sources: ["pgvector", "qdrant", "openai"]
}
```

#### 3. RAG用コンテキスト取得

検索結果をプロンプト形式で整形:

```typescript
const result = await trpc.vector.getRagContext.query({
  query: 'RAGシステムの実装方法',
  topK: 5,
  maxContextLength: 4000,
  includeMetadata: true
});

// レスポンス
{
  context: "...",      // フォーマット済みコンテキスト
  prompt: "...",       // LLMに渡す完全なプロンプト
  results: [...],      // 元の検索結果
  metadata: {
    resultCount: 5,
    sources: ["pgvector", "qdrant"]
  }
}
```

#### 4. 特定ストアリストに検索

```typescript
const result = await trpc.vector.searchStores.query({
  storeNames: ['pgvector', 'qdrant'],  // openaiを除外
  query: '検索クエリ',
  topK: 5
});
```

### LLMからの呼び出し例

```python
import requests

# RAGコンテキストを取得
response = requests.post('http://localhost:3000/trpc/vector.getRagContext', json={
    'query': 'ユーザーからの質問',
    'topK': 5
})

data = response.json()
prompt = data['prompt']

# LLMに送信
llm_response = openai.chat.completions.create(
    model='gpt-4',
    messages=[
        {'role': 'user', 'content': prompt}
    ]
)
```

## RAG Formatter

検索結果のフォーマットユーティリティ:

```typescript
import { RAGFormatter } from './utils/ragFormatter';

// プロンプト生成
const prompt = RAGFormatter.formatPrompt(results, {
  userQuery: '質問文',
  maxContextLength: 4000,
  includeMetadata: true
});

// Markdown形式
const markdown = RAGFormatter.formatMarkdown(results);

// ツール呼び出し用JSON
const toolFormat = RAGFormatter.formatForTool(results);
```

## Adding New Vector Stores

新しいベクトルストアを追加するには:

1. `src/stores/` に新しいストアクラスを作成
2. `IVectorStore` インターフェースを実装
3. `src/utils/storeFactory.ts` にファクトリーロジックを追加
4. 環境変数に設定を追加

```typescript
import { VectorStore } from '../core/vectorStore';

export class MyCustomStore extends VectorStore {
  constructor(config: {...}) {
    super('my-custom-store');
  }

  async initialize(): Promise<void> {
    // 初期化処理
  }

  async search(query: VectorSearchQuery): Promise<VectorSearchResult[]> {
    // 検索実装
  }

  async healthCheck(): Promise<StoreHealth> {
    // ヘルスチェック
  }
}
```

## Monitoring

ヘルスチェックエンドポイントで各ストアの状態を確認:

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "stores": [
    {
      "storeName": "pgvector",
      "status": "healthy",
      "latency": 45
    },
    {
      "storeName": "qdrant",
      "status": "healthy",
      "latency": 23
    }
  ]
}
```

## License

MIT
