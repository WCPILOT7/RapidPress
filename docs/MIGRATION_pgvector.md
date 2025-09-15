# Миграция на pgvector

## Цель
Перейти от JSON-сериализованных эмбеддингов к нативному векторному типу Postgres (pgvector) для эффективного семантического поиска.

## Шаги
1. Включить расширение:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```
2. Применить миграционный файл (создан): `server/migrations/20250915_add_pgvector.sql`.
3. Backfill существующих JSON эмбеддингов:
```sql
UPDATE ai_documents
SET embedding_vector = (
  string_to_array(trim(both '[]' from embedding), ',')::float4[]
)::vector
WHERE embedding IS NOT NULL AND embedding_vector IS NULL;
```
(Опционально сначала проверить длину первой записи.)
```sql
SELECT id, array_length(string_to_array(trim(both '[]' from embedding), ','),1) AS len
FROM ai_documents
WHERE embedding IS NOT NULL
LIMIT 5;
```
4. Анализ для оптимизатора:
```sql
ANALYZE ai_documents;
```
5. Настроить переменную окружения:
```
RAG_VECTOR_STRATEGY=pgvector
```
6. Проверить semantic search:
`GET /api/rag/search?q=текст&mode=semantic` — должен использовать SQL ранжирование.
7. (Опционально) Удалить старую колонку JSON после успешного периода:
```sql
ALTER TABLE ai_documents DROP COLUMN embedding;
```

### Backfill через скрипт (альтернатива SQL)
Можно выполнить постепенный перенос батчами через подготовленный скрипт:
```bash
npm run db:backfill:pgvector
```
Скрипт берёт до 5000 строк за запуск. Повторяйте до сообщения `nothing to convert`.

## Индекс и тюнинг
Создаётся `ivfflat` индекс (cosine) с `lists = 100`. Увеличить `lists` при росте данных для улучшения качества (стоимость: более долгий build + память).

Рекомендация первичного выбора lists:
```
lists ≈ 10 * sqrt(N)
```
где `N` — количество строк.

## Метрики для мониторинга
| Метрика | Цель | Способ измерения |
|---------|------|------------------|
| Время запроса top-k | < 150ms при N < 50k | Логирование latency | 
| Avg distance top-5 | Снижение после тюнинга | Сравнить до/после lists |
| Процент fallback на JSON | ~0% после миграции | Лог в semanticSearch.ts |

## Откат
1. Установить `RAG_VECTOR_STRATEGY=json`.
2. Приложение снова будет использовать JSON cosine ранжирование.
3. Индекс/колонку можно оставить — не мешают.

## Безопасность / Риски
| Риск | Смягчение |
|------|-----------|
| Dimension mismatch | Проверить длину перед backfill + выбор фиксированной модели |
| Повышенная задержка с маленьким lists | Увеличить lists и reindex |
| Рост размера БД | Удалить старую JSON колонку после стабилизации |

## TODO после миграции
- Кеширование query embedding (LRU)
- Ограничение суммарного размера контекста
- RAG-augmented генерация (`/api/generate?mode=rag`)

---
Документ обновлять при изменении модели embeddings или стратегии индексации.
