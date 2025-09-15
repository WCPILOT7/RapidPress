# Архитектура RapidPress

## 1. Общий обзор
RapidPress — сервис для жизненного цикла пресс‑релиза: генерация (AI), редактирование (manual/AI), перевод, хранение, рассылка и рекламное переиспользование контента.

Архитектура: моно‑репозиторий с общим типовым слоем (`shared/`). Фронтенд и бекенд связываются REST API (JSON + cookie‑сессии). В dev Vite встраивается как middleware в Express.

## 2. Слои
| Слой | Назначение | Реализация |
|------|------------|------------|
| Presentation (Client) | UI/UX, формы, чат-редактирование | React, Wouter, React Query, shadcn/ui |
| API Layer | HTTP маршруты, валидация входа | `server/routes.ts` (монолит сейчас) |
| Domain / Services | Встроено в маршруты (план выноса) | Будущий `server/modules/*` |
| Data Access | CRUD над схемами | `server/storage.ts` (drizzle) |
| Shared Types | Единая схема БД, типы и zod | `shared/schema.ts` |
| AI Orchestration | Промпты OpenAI (генерация headline/body, редактирование, перевод, ads, image prompt) | Внутри маршрутов (будет вынесено) |
| Infrastructure | Инициализация, dev server, статическая выдача | `server/index.ts`, `server/vite.ts` |

## 3. Потоки данных (Sequence Text)
### 3.1 Генерация пресс‑релиза
1. Пользователь (авторизован) → POST /api/generate с формой
2. Backend: validate (zod) → OpenAI(Headline) → OpenAI(Body) → persist → JSON ответ
3. Client: инвалидация query `/api/releases` → отображение в истории

### 3.2 Редактирование через AI
1. Пользователь формирует инструкцию → POST /api/releases/:id/edit
2. Backend: получает текущий текст, строит prompt → OpenAI → ответ → возвращает новый текст (без сохранения)
3. Пользователь сохраняет (PUT /api/releases/:id) → обновление в БД

### 3.3 Перевод
1. POST /api/releases/:id/translate { language }
2. Backend: достаёт оригинал → OpenAI prompt → создаёт новый press_release (original_id ссылкой)

### 3.4 Рассылка
1. POST /api/send-release { releaseId, recipientIds?, subject?, customMessage? }
2. Backend: получает релиз и контакты → nodemailer (массово Promise.all) → ответ

### 3.5 Реклама / соцмедиа
1. POST /api/advertisements { pressReleaseId, platform, type }
2. Backend: prompt на copy, при необходимости prompt на image prompt → сохраняет advertisement
3. POST /api/advertisements/:id/generate-image → DALL·E 3 → update image_url

## 4. Схема данных (позиционирование)
- Пользователь владеет сущностями (userId во всех таблицах)
- Переводы связаны через press_releases.original_id
- Реклама ссылается на press_release (отсутствует FOREIGN KEY)

## 5. AI Подсистема
Используются Chat Completions (gpt-4o). Промпты шаблонные, не parametrized как объекты → риск дублирования/дрейфа. Нет контроля токенов, бюджета, логирования запросов/ответов. Возможны задержки → нет очереди/трейсинга.

## 6. Безопасность (текущая)
| Data Access | CRUD над схемами | `server/storage.ts` (drizzle → Supabase Postgres) |
- CORS широкое (origin=* при credentials)
- Нет CSRF защиты
Client → REST (Fetch) → Express Routes → (zod validate) → Service (будет) → Storage(drizzle) → Supabase Postgres (SQL)
                              ↘ AI(OpenAI)
                              ↘ Nodemailer (SMTP) / (в будущем Supabase Functions?)
                              ↘ Supabase Storage (план) / локальный File System (текущее)
- Upload CSV / images без строгих ограничений
- Cookie session (параметры НЕ production‑safe)
- CORS широкое (origin=* при credentials)
- Нет CSRF защиты
- Нет rate limiting / abuse protection
- Пароли: bcrypt(12) OK (локальная таблица users) — опция переноса в Supabase Auth
- Upload CSV / images без строгих ограничений (план перенос в Supabase Storage + валидация)
- Нет RLS (в будущем: политики на press_releases/contacts/advertisements по user_id)

- Одноузловой Express
- Синхронные массовые операции (email, AI)
- Нет очередей или фоновых воркеров
- Нет пагинации списков
- Нет индексов кроме уникальности email
- Supabase даёт возможности: edge functions, realtime, PG row-level security (пока не использованы)
|--------|-------------|
1. Вынести AI в модуль `ai/engine.ts`
2. Ввести services (authService, pressService, adsService)
3. Модули маршрутов по директориям
4. Интеграция Supabase Storage (изображения, CSV исходники)
5. (Опционально) миграция аутентификации в Supabase Auth (JWT + RLS)
6. Добавление RLS политик для изоляции данных на уровне БД
7. Queue для email/AI изображений
8. Security middleware (helmet, rate limit, csrf/jwt) + hardening
9. Миграции + FK + индексы
10. Observability (pino + OpenTelemetry + prometheus-client)
11. Тесты (vitest + supertest)
12. Версионность пресс‑релизов
13. Billing / usage caps (позже)
3. Модули маршрутов по директориям
4. Queue для email/AI изображений
5. Security middleware (helmet, rate limit, csrf/jwt)
6. Миграции + FK + индексы
7. Observability (pino + OpenTelemetry + prometheus-client)
8. Тесты (vitest + supertest)
9. Версионность пресс‑релизов
10. Billing / usage caps (позже)

## 11. Диаграмма зависимостей (словесно)
Client → REST (Fetch) → Express Routes → (zod validate) → Service (будет) → Storage(drizzle) → PostgreSQL
                              ↘ AI(OpenAI) ↘ Nodemailer (SMTP)
                              ↘ File System (uploads)

## 12. Риски
| Риск | Влияние | Митигировать |
|------|---------|--------------|
| Token/Cost спайки | $$$ | Лимиты, мониторинг, кеширование |
| Email rate limit | Блокировка почты | Очередь + throttle |
| Session hijack | Утечка доступа | Secure/HttpOnly/SameSite + CSRF |
| Неконсистентные ссылки | Логические ошибки | FK + on delete cascade |
| Большие компоненты | Замедляет развитие | Рефактор в feature slices |
| Длинные AI задержки | UX деградация | Async job + polling/progress |

## 13. Следующие шаги
Минимальный next sprint:
1. Добавить `helmet`, ограниченный CORS, secure cookie (env switch)
2. Ввести rate limiter (auth + generate + send-release)
3. Разбить `routes.ts` на модули (auth, press, contacts, ads, mail)
4. Вынести OpenAI вызовы в отдельный адаптер
5. ESLint + Prettier + базовые тесты (healthcheck + generate mock)
6. Пагинация `/api/releases` + индексы `userId`

---
Подробный чеклист см. `IMPROVEMENT_PLAN.md`.

---
## 14. AI Layer (обновлён)

### Текущая структура
```
server/ai/
    core.ts                      # Модель и embeddings (центральная конфигурация)
    pressReleaseStructuredGenerator.ts  # Структурированный JSON релиз
    pressReleaseGenerator.ts      # Полнотекстовая версия (простая)
    translationChain.ts           # Перевод
    editChain.ts                  # Инструкционное редактирование
    socialPostGenerator.ts        # Соцсети (LinkedIn/Twitter/Facebook)
    adGeneratorChain.ts           # Рекламные объявления
    headlineChain.ts              # Специализированный заголовок (качество/стиль)
    instrumentation.ts            # Tracing (latency/hash/error)
    rag/                          # Scaffold для Retrieval (documents, splitter, index, retrieval)
```

### Слои внутри AI
| Слой | Назначение | Файлы |
|------|------------|-------|
| Core | Конфигурация моделей и embeddings | `core.ts` |
| Chains (Generation) | Доменные цепочки (релизы, соцпосты, ads) | *Generator / *Chain файлы |
| Validation | Zod схемы для структурированных ответов | Внутри chain файлов |
| Instrumentation | Локальный tracing (latency, hash) | `instrumentation.ts` |
| Retrieval Scaffold | Подготовка к RAG | `rag/*` |

### Инструментация
- Каждая цепочка обёрнута `attachTracing()`.
- Метрики доступны: `/api/_internal/ai-metrics` (dev).
- Хеш результата (FNV-1a укороченный) → для корреляции без хранения текста.

### RAG Scaffold (MVP)
Пока: in-memory документы + простая подстроковая релевантность.
План: pgvector (Supabase) + embeddings (`OpenAIEmbeddings`) + фильтрация по метаданным (company_id, type).

### Headline Chain
Цель: повысить контроль качества заголовков.
Возвращает JSON: `headline`, `reasoning`, `quality.{length_ok, style_ok, avoids_hype}`.
Использование: может вызываться отдельно или как пост‑процесс после основного генератора.

### План эволюции AI слоя
| Фаза | Улучшение | Детали |
|------|-----------|--------|
| Short-term | Token usage capture | Расширить instrumentation (модельный вывод usage) |
| Short-term | RAG integration | Документы: company profile, прошлые релизы, загруженные источники |
| Mid-term | Guardrails | Проверка на запрещённые форматы/утечки, style lints |
| Mid-term | Prompt registry | Конфигурация в JSON/YAML с версиями |
| Long-term | Multi-provider fallback | OpenAI → Anthropic → Local LLM |
| Long-term | Cost optimization | Кэширование, reuse embeddings, partial update |

### Риски AI слоя
| Риск | Смягчение |
|------|-----------|
| Отсутствие мониторинга токенов | Добавить usage в метрики + лимиты |
| Hallucination фактов | RAG + строгие промпты ("не выдумывать") + post-validation |
| Дрейф промптов | Централизованный prompt registry + snapshot тесты |
| Локальные ошибки в цепочках | Единый error middleware + типизированные схемы |

### Следующие шаги (конкретика)
1. Подключить embeddings к RAG scaffold.
2. Добавить таблицу `documents_vectors` (id, user_id, source, content, embedding vector, meta_json, created_at).
3. Endpoint ingestion (upload + связка с company / release).
4. Retrieval chain: контекст (K фрагментов) + генерация с цитированием.
5. Token usage: расширение instrumentation.
6. Prompt registry: вынести шаблоны в JSON с версионностью.

