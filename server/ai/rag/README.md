# RAG Scaffold (Draft)

Цель: Подготовить базовую структуру для Retrieval-Augmented Generation (RAG), не внедряя пока реальную загрузку и индексацию.

## Компоненты (план)
- `ingest.ts` - splits raw document into chunks and now generates embeddings (JSON serialized until pgvector migration)
- `documents.ts` - in-memory store abstraction (will be replaced with db-backed retrieval)
- `splitter.ts` - naive splitter (sentence boundary heuristic TBD)
- `vectorIndex.ts` - naive keyword scoring placeholder
- `retrieval.ts` - retrieval orchestrator (currently keyword only)
- `embeddings.ts` - wrapper to obtain embeddings (real provider if key present, pseudo-deterministic fallback otherwise)
- `semanticSearch.ts` - computes cosine similarity over stored chunk embeddings
 - `semanticSearchPg.ts` - (после включения pgvector) SQL top-k по `embedding_vector`

## Текущий статус
MVP: in-memory документы + простая фильтрация по подстроке + mock ранжирование.

## Следующие шаги
1. Store raw content + chunking in DB (DONE)
2. Add embeddings generation & store vector (JSON now, pgvector later) (DONE)
3. Add semantic search endpoint (mode=semantic) (DONE)
4. Integrate retrieval augmentation into generation prompts (DONE — /api/generate?mode=rag)
5. Hybrid ranking (BM25 + vector) (PENDING)

## Supabase / pgvector заметка
 Будущая миграция (пример):
```sql
 CREATE EXTENSION IF NOT EXISTS vector;

create table ai_documents (
	id serial primary key,
	user_id int not null,
	parent_id int,
	source text not null,
	title text,
	content text not null,
	metadata jsonb,
	embedding vector(1536), -- размер под выбранную модель embeddings
	created_at timestamptz default now()
);

create index ai_documents_user_id_idx on ai_documents(user_id);
create index ai_documents_source_idx on ai_documents(source);
create index ai_documents_embedding_idx on ai_documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

### Semantic Search Usage

`GET /api/rag/search?q=your+query&mode=semantic`

Response shape:
```
{
	"mode": "semantic",
	"results": [
		{ id, title, content, score, ... }
	]
}
```

If `mode` is omitted or not `semantic`, keyword scoring is used instead.

### Embedding Fallback Behavior

If no real embedding model key is configured, the system produces deterministic pseudo-vectors (hash-based) to keep ranking stable for development & tests. Replace with true embeddings before production relevance evaluation.

### Dual-Mode Vector Strategy
Переменная окружения `RAG_VECTOR_STRATEGY` управляет режимом:
| Значение | Поведение |
|----------|-----------|
| json | Используем колонку `embedding` (JSON текст) + ранжирование в Node (cosineSimilarity) |
| pgvector | Пытаемся выполнить SQL `ORDER BY embedding_vector <-> query`; при ошибке fallback → json |

Алгоритм поиска:
1. Проверяем `RAG_VECTOR_STRATEGY`.
2. Если `pgvector`: динамически импортируем `semanticSearchPg` и выполняем запрос.
3. Если модуль/колонка недоступны → тихий откат к `semanticSearch` на JSON.
4. Возвращаем список чанков с `score`.

Безопасность: убедитесь, что размерность вектора в миграции совпадает с моделью embeddings, иначе insert будет падать.


В коде: временно `embedding` хранится как text (null) до миграции.

### RAG-Augmented Generation

Endpoint: `POST /api/generate?mode=rag` (или `{"mode":"rag"}` в теле)

Пайплайн:
1. Формируем поисковый запрос из `company` + пользовательского `copy`.
2. `retrieveContext` выполняет многоуровневый поиск:
	 - (A) pgvector semantic (если активен `RAG_VECTOR_STRATEGY=pgvector`)
	 - (B) fallback JSON embeddings cosine
	 - (C) keyword fallback через storage.searchAIDocuments
3. Ограничение: `limit=6`, `maxChars=6000` суммарно.
4. Чанки упаковываются в блок с метаданными вида:
```
[[CHUNK 1 source=... score=0.84]]
<content>

[[CHUNK 2 source=... score=0.79]]
<content>
```
5. Prompt получает инструкцию не выдумывать факты вне контекста.
6. Ответ API дополняется `_rag`:
```
_rag: {
	used: true,
	chunks: [{ id, source, score }, ...]
}
```
Если нет результатов: `_rag: { used: false, reason: "no_chunks" }`.

Планируемые улучшения:
- Порог минимального score (env `RAG_MIN_SCORE`)
- Hybrid BM25 + vector rerank
- Дедупликация по parentId/source
- Кэширование embedding запросов
- Highlight релевантных фактов в UI

---
Этот каркас можно расширять постепенно без влияния на текущие цепочки.
