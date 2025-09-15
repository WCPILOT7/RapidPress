# RapidPress Progress Log

Хронологический журнал ключевых изменений. Обновляется по мере выполнения этапов Roadmap.

## Формат записи
```
## YYYY-MM-DD
### Категория (AI / Backend / Frontend / Docs / Infra / Security / Monitoring / Monetization)
- [TYPE] Краткое описание (DETAILS)
```
TYPE: FEAT (функционал) | REFACTOR | FIX | DOCS | CHORE | PERF

---
## 2025-09-15 (Later)
### Security / Auth
- [FEAT] Автолинковка Supabase пользователя к локальному (`supabaseAuth` middleware: поиск по supabase_user_id -> email -> skeleton create).
- [FEAT] Метод `setSupabaseUserId` в storage + `getUserBySupabaseUserId` для быстрого пути.
- [FEAT] Идемпотентное связывание выполняется на каждом JWT запросе пока не заполнено поле.
- [DOCS] SUPABASE_AUTH_RLS.md дополнен секциями User Linking & Backfill + Refined Policies.
### Security / RLS
- [REFACTOR] Добавлена миграция `20250915_refine_rls_policies.sql` — разнесены политики по операциям (SELECT / INSERT / UPDATE / DELETE) для всех доменных таблиц.
- [CHORE] Убрана DELETE политика для `user_profiles` (защита квот).
- [CHORE] Политики теперь используют подзапрос EXISTS против таблицы users (единообразный шаблон + future extensibility).
### Infra / Security (Supabase)
- [REFACTOR] Перемещено расширение `vector` в схему `extensions`.
- [FEAT] Триггер `trg_ensure_user_profile` для автоматического создания записей в user_profiles.
- [FEAT] Флаг окружения `DISABLE_SESSIONS` + условное отключение legacy session middleware.
- [DOCS] SUPABASE_AUTH_RLS.md дополнен секциями авто-профиль и отключение сессий.
- [FEAT] Реализован рантайм байпас квот и rate limiting при `DISABLE_LIMITS=1` (ранний return в ensureProfileAndCheckQuota и rateLimit middleware).
### Monitoring / Limits
- [FEAT] Добавлен soft режим лимитов (`DISABLE_LIMITS=soft`): квоты и rate limit не блокируют, но отмечают превышения (`X-RateLimit-SoftExceeded=1`).
- [FEAT] Заголовки режимов: `X-Limits-Mode` (bypass|soft|enforced), `X-Limits-Bypass`.
- [FEAT] Метрики rate limiter: bypassRequests / softModeRequests / enforcedRequests / softExceeded / hardBlocked (`/api/_internal/ai-metrics`).
- [FEAT] Startup warning в production при активном bypass/soft.
- [DOCS] Обновлены `.env.example` и SUPABASE_AUTH_RLS.md (таблица режимов, заголовки, рекомендации).

## 2025-09-15
### AI
- [FEAT] LangChain интеграция базовых цепочек (генерация, соцпосты, ads, перевод, правка)
- [FEAT] Структурированный пресс-релиз (JSON schema + parser)
- [FEAT] Ad генератор (google_ads / facebook) с variants
- [FEAT] Social posts JSON с валидацией
- [FEAT] Translation chain (формат-сохранение)
- [FEAT] Edit chain (инструкционное редактирование)
- [DOCS] Обновлён README (AI раздел)
- [FEAT] AI error middleware (нормализация ошибок)
- [FEAT] Инструментация: tracing handler + метрики endpoint
- [DOCS] INSTRUMENTATION.md — документация по метрикам
- [FEAT] RAG scaffold (in-memory documents + naive retrieval)
- [FEAT] Headline specialized chain (quality flags)
 - [FEAT] Ingest: chunking + сохранение документов в ai_documents
 - [FEAT] Embeddings ingestion: JSON эмбеддинги для каждого чанка
 - [FEAT] Semantic search endpoint (`/api/rag/search?mode=semantic`) с cosine ranking
 - [DOCS] RAG README обновлён (embeddings, semantic mode, fallback поведение)
 - [FEAT] Dual-mode RAG стратегия (env `RAG_VECTOR_STRATEGY` + semanticSearchPg заглушка под pgvector)
 - [FEAT] Добавлена миграция `20250915_add_pgvector.sql` (extension + vector column + ivfflat index)
 - [DOCS] MIGRATION_pgvector.md — инструкция по backfill и тюнингу
 - [FEAT] Backfill script `server/scripts/backfillPgvector.ts` + npm script `db:backfill:pgvector`
 - [FEAT] Retrieval context агрегатор `retrieveContext.ts` (многоуровневый: pgvector > json embedding > keyword fallback, char budget)
 - [FEAT] RAG-augmented генерация: `/api/generate?mode=rag` — инжект top-K контекста в prompt, возврат `_rag` метаданных (used/chunks)
 - [REFACTOR] Унифицирован extraction mode в /api/generate (mode normal|rag, обратная совместимость)

### Monitoring / Monetization
- [FEAT] Supabase Auth интеграция (middleware supabaseAuth, supabase clients)
- [FEAT] Добавлена колонка users.supabase_user_id + миграция
- [FEAT] Включены RLS политики (скелет) для основных таблиц
- [DOCS] SUPABASE_AUTH_RLS.md — стратегия Auth/RLS
- [FEAT] Таблицы usage_events, rag_queries, api_keys, embedding_cache, user_profiles добавлены (schema + migration)
- [FEAT] Helper usage.ts (estimateTokens, logUsage, hashApiKey, generateApiKeyRaw)
- [FEAT] Логирование использования: /api/generate, /api/rag/search, /api/rag/documents, /api/advertisements (create/edit/image gen)
- [FEAT] API Key endpoints: POST /api/api-keys, GET /api/api-keys, POST /api/api-keys/:id/revoke
- [CHORE] Добавлены latencyMs и meta payload в ответы (_usage)
- [DOCS] PROGRESS_LOG обновлён для фиксации usage & API keys этапа
- [FEAT] Header-based аутентификация через `x-api-key` (attachApiKeyUser + requireAuth поддерживает ключ или сессию)
- [DOCS] Добавлен файл API_KEYS.md (инструкция по ключам)
- [FEAT] In-memory rate limiting middleware (env: RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_CALLS)
- [FEAT] Квотирование токенов (FREE_PLAN_MONTHLY_TOKENS, поле quotaMonthlyTokensUsed)
- [FEAT] Инкремент счётчика токенов в /api/generate, /api/advertisements (create/edit), /api/rag/documents
- [FEAT] Endpoint /api/usage/summary (день/месяц агрегаты)

### Docs (дополнение)
- [DOCS] ARCHITECTURE.md обновлён (AI Layer секция, RAG scaffold, headline chain)

### Backend
- [REFACTOR] /api/generate возвращает структурированный релиз (_structured)
- [CHORE] Подготовка к будущей декомпозиции маршрутов (ещё не выполнено) — пометка в roadmap

### Docs
- [FEAT] 360_ROADMAP.md добавлен блок Current Progress Snapshot
- [CHORE] Создан PROGRESS_LOG.md (этот файл)

---
## Pending / Next (после добавления RAG-augmented generation)
- Тонкая настройка ранжирования (score threshold, hybrid BM25 + vector)
- Декомпозиция `routes.ts` на модули (auth, releases, ads, rag)
- Security hardening (helmet, строгий CORS, secure cookies prod)
- Token usage / cost tracking + агрегированные метрики
- Usage dashboard (per-user, daily aggregates)
- Rate limiting & abuse prevention
- Тесты (unit: retrieveContext, semanticSearchPg, интеграционный /api/generate?mode=rag)

## Процесс обновления
1. Вносим изменения в код → добавляем запись в соответствующий раздел по дате.
2. Если изменение крупное — указываем детали в скобках.
3. В конце дня (или PR merge) переносим выполненные элементы из планов в лог.
4. Snapshot в `360_ROADMAP.md` синхронизируем только для агрегированного статуса (DONE/TODO/NEXT).

## Быстрые теги
- FEAT: новый функционал
- FIX: исправление ошибки
- REFACTOR: структурное изменение без новой функции
- DOCS: документация
- CHORE: эксплуатационные / поддерживающие задачи
- PERF: производительность

---
Готово к дальнейшему расширению. При увеличении размера — можно архивировать по кварталам (PROGRESS_2025_Q4.md и т.п.).
