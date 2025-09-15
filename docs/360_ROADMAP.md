# RapidPress 360° Roadmap

## Содержание
1. [Общая цель](#общая-цель)
2. [Обзор этапов](#обзор-этапов)
3. [Этап 1: Фундаментальные улучшения и безопасность (Core & Security)](#этап-1-фундаментальные-улучшения-и-безопасность-core--security)
4. [Этап 2: Расширение модуля «Создание» (Advanced Creation)](#этап-2-расширение-модуля-создание-advanced-creation)
5. [Этап 3: Развитие модуля «Дистрибуция» (Enhanced Distribution)](#этап-3-развитие-модуля-дистрибуция-enhanced-distribution)
6. [Этап 4: Внедрение модуля «Мониторинг» (Monitoring)](#этап-4-внедрение-модуля-мониторинг-monitoring)
7. [Этап 5: UX и подготовка к монетизации (UX & Monetization)](#этап-5-ux-и-подготовка-к-монетизации-ux--monetization)
8. [Этап 6: Углубленная персонализация и аналитика (Deep Personalization & Analytics)](#этап-6-углубленная-персонализация-и-аналитика-deep-personalization--analytics)
9. [Этап 7: Командная работа и управление клиентами (Collaboration & Client Management)](#этап-7-командная-работа-и-управление-клиентами-collaboration--client-management)
10. [Этап 8: Интеллектуализация и автоматизация (Intelligence & Workflow Automation)](#этап-8-интеллектуализация-и-автоматизация-intelligence--workflow-automation)
11. [Этап 9: Внедрение модели монетизации (Monetization Model Implementation)](#этап-9-внедрение-модели-монетизации-monetization-model-implementation)
12. [Этап 10: Зрелость платформы и экосистема (Platform Maturity & Ecosystem)](#этап-10-зрелость-платформы-и-экосистема-platform-maturity--ecosystem)
13. [Сводная матрица приоритетов](#сводная-матрица-приоритетов)
14. [Зависимости между этапами](#зависимости-между-этапами)
15. [Риски и смягчение](#риски-и-смягчение)
16. [Метрики успеха по фазам](#метрики-успеха-по-фазам)
17. [Предварительная дорожная сетка (Sprints Outline)](#предварительная-дорожная-сетка-sprints-outline)
18. [Глоссарий](#глоссарий)

---
## Общая цель
Создать 360° платформу для полного жизненного цикла работы с пресс‑релизами и смежным медиа-контентом: от идеи → генерации → редактирования → дистрибуции → мониторинга → аналитики и отчетности.

Фокус: автоматизация, масштабируемость, защищённость данных, поддержка командно-агентской модели использования.

---
## Обзор этапов
| Этап | Направление | Основной результат |
|------|-------------|--------------------|
| 1 | Core & Security | Надежный фундамент (security, архитектура, Supabase интеграция) |
| 2 | Creation | Расширенный интерактивный мастер + контекст компании |
| 3 | Distribution | Управление кампаниями, списками, соцсети, публикация |
| 4 | Monitoring | Отслеживание упоминаний и базовые медиа метрики |
| 5 | UX & Monetization Prep | Качество, поиск, учет AI использования |
| 6 | Deep Personalization | A/B тесты, персонализация питчей, кастом отчеты |
| 7 | Collaboration | Workspaces, роли, версия, approvals |
| 8 | Intelligence | Автоматизация workflows, умные подсказки |
| 9 | Monetization | Платежи, тарифы, лимиты |
| 10 | Ecosystem | Публичный API, интеграции, расширенная AI‑аналитика |

---
## Этап 1: Фундаментальные улучшения и безопасность (Core & Security)
### Подцели
- Защитить платформу (sec + data isolation)
- Улучшить структуру кода
- Подготовить инфраструктурные возможности (очереди, storage, auth)

### Задачи
1. Security Hardening
   - Cookies: Secure + HttpOnly + SameSite=Lax (prod) / Strict (при отказе от cross-site).
   - CORS whitelist.
   - Helmet (CSP позже, после стабилизации ассетов).
   - Rate limiting (auth, AI, email send, uploads).
   - CSRF защита (или полный переход на JWT + stateless).
2. Архитектура
   - Разбить `routes.ts` на модули: `auth`, `press`, `ads`, `contacts`, `distribution`, `health`.
   - Добавить слой services + error classes.
   - Вынести AI вызовы (`/server/ai/openaiClient.ts`, prompt builders).
3. Supabase Интеграция
   - Storage: изображения (`ads-images`), CSV (`uploads`).
   - Auth (флагово): подготовить dual-mode (legacy sessions / Supabase JWT).
   - Подготовить SQL для RLS (но включить после миграции auth).
4. Data Layer
   - FK + индексы.
   - Пагинация (cursor / keyset).
5. Queue/Async (базово)
   - BullMQ + Redis (email кампании & тяжелые AI генерации).
6. DX инфраструктура
   - ESLint + Prettier + Vitest + Supertest.
   - `.env.example` + zod env validation.
7. Observability (начальный)
   - Structured logging (pino) + request id.
   - Health endpoint.

### Критерии готовности
- Нет открытых high‑risk security гепов.
- Код модульный, тесты покрывают критический путь (auth → generate → edit → send).
- CI запускает lint + tests.

---
## Этап 2: Расширение модуля «Создание» (Advanced Creation)
### Цель
Сделать процесс создания контента контекстно‑осознанным и многоформатным.

### Новые сущности и функции
1. Company Profile
   - Таблица `companies`: name, boilerplate, brand_voice, industry, assets.
   - Связь user → companies (многие), press_release → company_id.
2. Улучшенный мастер
   - Поля: компания, событие, целевая аудитория, ключевые факты, спикер/цитата, конкуренты.
   - Загрузка источника (PDF/DOCX) → извлечение текста (pdf parsing + docx). AI использует summary.
3. Генерация расширенных материалов
   - FAQ документ.
   - Blog draft / internal email draft.
   - Brand-consistent tone enforcement.
4. AI Правки (Chat mode V2)
   - Context injection (brand voice + boilerplate + previous releases).

### Технические акценты
- Хранение загруженных документов → Supabase Storage.
- Extraction workers (queue job).

### Критерии готовности
- Company можно выбрать при создании релиза.
- Мастер поддерживает структурированный ввод.
- Генерация минимум 2 дополнительных типов контента.

---
## Этап 3: Развитие модуля «Дистрибуция» (Enhanced Distribution)
### Цель
Систематизировать рассылку и расширить охват.

### Функционал
1. Контакты и списки
   - Contact Lists (named groups) + импорт в список.
   - Curated master lists (read-only) по тематикам (будущая монетизация).
2. Email Кампании
   - Campaign entity: subject, template, audience (list refs), release ref.
   - Отправка через SendGrid / Postmark / Resend (DKIM/SPF docs).
   - Метрики: delivered, opened, clicked (веб-хуки провайдера).
3. Соцсети
   - Pre-fill share (Twitter/X, LinkedIn, Facebook). Deep linking.
   - Консистентная генерация изображений (prompt style tokens per company).
4. Публичная страница релиза
   - `/r/{slug}` — SEO‑friendly.
   - OpenGraph meta + canonical.
5. Экспорт PDF
   - Server-side render (React-pdf / Puppeteer) → branded PDF.

### Критерии готовности
- Кампания создаётся, отправляется и показывает базовые метрики.
- Публичная страница доступна по slug.

---
## Этап 4: Внедрение модуля «Мониторинг» (Monitoring)
### Цель
Предоставить обратную связь об эффективности.

### Источники данных
1. News / Media Mentions
   - Интеграция: Google News / NewsAPI (по ключевым словам, названию компании, теме релиза).
2. Социальные сети (MVP)
   - Twitter/X поиск по бренду / ключам (ограничения API — возможно через сторонние сервисы / data provider).
3. Аггрегация
   - Normalized table: source, title, url, published_at, sentiment (позже), release_id (optional link).
4. Dashboard
   - Timeline + список упоминаний.

### Критерии готовности
- Автоматическая периодическая агрегация (cron / queue job).
- Отображение списка упоминаний в UI.

---
## Этап 5: UX и подготовка к монетизации (UX & Monetization)
### Цель
Устранить трение в использовании + подготовить базу для тарификации.

### Функции
1. Full-text поиск по релизам/контенту (tsvector + index).
2. Usage Tracking
   - Таблица `usage_events` (user_id, type, tokens_used, cost_estimate, created_at).
3. Улучшения редактора
   - Версия интерфейса с autosave drafts.
4. Логирование и метрики
   - AI latency, generation errors, email throughput.
5. Тесты расширенные
   - >70% критического покрытия.

### Критерии готовности
- Поиск работает < 300ms на 10k записей.
- Usage dashboard показывает суммарные токены.

---
## Этап 6: Углубленная персонализация и аналитика (Deep Personalization & Analytics)
### Цель
Повысить конверсию email кампаний и качество контента.

### Функции
1. Персонализация питчей
   - AI предлагает custom intro, анализируя недавние статьи (в будущем: scraping/knowledge base). 
2. Dynamic Templates
   - Переменные в шаблонах: `{{journalist_name}}`, `{{publication}}`, `{{last_topic}}`.
3. A/B Тестирование
   - Сэмпл 10% аудитории → победитель по open rate.
4. Report Builder
   - Композиция: текст релиза + email метрики + упоминания + графики.
   - Export: PDF (branded) + share link.

### Критерии готовности
- A/B тест автоматически выбирает победителя.
- Report builder генерирует PDF ≤ 60 сек.

---
## Этап 7: Командная работа и управление клиентами (Collaboration & Client Management)
### Цель
Поддержать агентства и команды.

### Функции
1. Workspaces / Organizations
   - user ↔ org (many-to-many), org ↔ companies.
2. Roles & Permissions
   - admin / editor / viewer.
3. Approval Workflow
   - Статусы: draft → review → approved → published.
4. Versioning
   - Таблица `release_versions` (diff или full snapshot).
5. Inline Comments
   - Комментарии с упоминаниями (@user) и статусами (resolved / open).

### Критерии готовности
- Release не может быть отправлен без approved (если включён workflow).
- История версий просматривается и откатывается.

---
## Этап 8: Интеллектуализация и автоматизация (Intelligence & Workflow Automation)
### Цель
Упростить повторяющиеся сценарии и повысить проактивность.

### Функции
1. Smart Recommendations
   - Теги, возможные журналисты, улучшенные заголовки.
2. Workflows Builder (MVP)
   - Триггеры: on_approved, on_published.
   - Действия: generate_social_pack, schedule_email, start_monitoring.
3. Автозапуск мониторинга
   - После публикации релиза запускается job сбора упоминаний.

### Критерии готовности
- Можно создать workflow с ≥ 2 шагами.
- Система предлагает ≥ 3 типа рекомендаций.

---
## Этап 9: Внедрение модели монетизации (Monetization Model Implementation)
### Цель
Превратить продукт в устойчивый коммерческий сервис.

### Функции
1. Billing Integration (Stripe / Paddle)
   - Webhooks: invoice.paid, subscription.updated.
2. Tariff Plans
   - Free / Pro / Agency.
   - Лимиты: релизы, кампании, контакты, AI tokens.
3. Paywall Control Layer
   - Middleware, проверяющий лимиты.
4. Premium Features
   - Curated journalist lists, A/B testing, report builder, workflows.

### Критерии готовности
- Оплата проходит ➜ активация тарифа.
- Превышение лимита блокирует операцию с понятным message.

---
## Этап 10: Зрелость платформы и экосистема (Platform Maturity & Ecosystem)
### Цель
Расширяемость и интеграции в экосистему пользователя.

### Функции
1. Public API (token-based)
   - /api/v1/releases, /api/v1/campaigns.
2. Integrations
   - Slack (webhook notifications), Google Analytics (public page tracking), прямые соцсети.
3. Advanced AI Analytics
   - Sentiment analysis упоминаний.
   - Reach estimation (эвристика/ML на исторических данных).
4. Developer Portal (docs + keys management).

### Критерии готовности
- Минимум 2 интеграции активны.
- Публичный API документирован (OpenAPI + SDK draft).

---
## Сводная матрица приоритетов
| Направление | P1 | P2 | P3 |
|-------------|----|----|----|
| Security | Cookies, CORS, Rate limit | CSRF/JWT миграция | CSP hardening |
| Data | FK, индексы, пагинация | Версионирование | Analytics warehouse |
| AI | Stable prompts | Personalization | Predictive reach |
| Distribution | Email core | A/B тесты | Advanced deliverability ops |
| Monitoring | Mentions basics | Sentiment | Predictive modeling |
| Monetization | Billing core | Usage dashboards | Reseller / marketplace |

---
## Зависимости между этапами
- Этап 2 (Creation) зависит от компаний (добавляется после базовой миграции в Этапе 1).
- Этап 3 (Distribution) требует очередей (Этап 1) и кампаний (новые таблицы).
- Этап 4 (Monitoring) зависит от публичной публикации релизов.
- Этап 6 персонализация опирается на данные кампаний и мониторинга.
- Этап 7 (Collaboration) желательно после стабилизации базовой модели данных.
- Этап 8 (Automation) требует стабильных событий (audit trail / status transitions).
- Этап 9 (Billing) зависит от учета usage из Этапа 5.

---
## Риски и смягчение
| Риск | Проявление | Смягчение |
|------|------------|-----------|
| Scope creep | Расширение без завершения фундамента | Жёсткая фиксация целей этапов |
| Performance деградация | Рост AI вызовов | Rate limiting + batching + caching |
| Vendor lock-in | Глубокая привязка к одному AI | Абстракция AI слоя | 
| Compliance (GDPR) | Хранение персональных email | Удаление по запросу + политики retention |
| Email deliverability | Низкий open rate | Интеграция с проверенными SMTP провайдерами |
| Мониторинг новостей (quota) | Ограничения внешних API | Кеширование + fallback провайдер |

---
## Метрики успеха по фазам
| Фаза | KPI | Цель |
|------|-----|------|
| 1 | MTTR инцидентов infra | < 2h |
| 2 | Среднее время создания релиза | -40% от baseline |
| 3 | Delivery rate email кампаний | > 95% |
| 4 | Покрытие упоминаний (релевантных найденных) | > 70% целевых | 
| 5 | Retention (30 day) | +15% |
| 6 | Lift open rate (персонализация) | +10% |
| 7 | Кол-во активных workspace >1 user | 30% пользователей Pro |
| 8 | Workflow adoption | ≥ 25% активных Pro |
| 9 | Конверсия Free → Paid | > 8% |
| 10 | Кол-во интеграций на организацию | > 2 среднее |

---
## Предварительная дорожная сетка (Sprints Outline)
| Sprint | Основной фокус | Ключевые deliverables |
|--------|----------------|-----------------------|
| 1 | Security & Decomposition | Cookies, CORS, routes split, logging, tests smoke |
| 2 | Supabase Storage + Queue | Uploads, email queue, AI job queue |
| 3 | Companies + Creation v2 | Company entity, wizard 2.0, PDF/DOCX ingestion |
| 4 | Distribution Core | Campaigns, SendGrid integration, public release pages |
| 5 | Monitoring MVP | Mentions aggregation + dashboard |
| 6 | Usage & Search | Full-text search, usage tracking, metrics dashboard |
| 7 | Personalization & A/B | Dynamic templates, A/B engine, report builder |
| 8 | Collaboration | Workspaces, roles, approvals, versioning |
| 9 | Automation | Workflows builder, recommendations |
| 10 | Billing | Stripe, plans, paywall middleware |
| 11 | Advanced Monitoring & Analytics | Sentiment, reach estimation |
| 12 | Ecosystem | Public API, Slack/GA integrations |

> Реальная последовательность может адаптироваться по обратной связи и рыночным требованиям.

---
## Глоссарий
| Термин | Определение |
|--------|-------------|
| Press Release | Официальное сообщение для СМИ |
| Campaign | Email-кампания рассылки релиза/контента |
| Workspace | Логическая группа (организация) с пользователями и компаниями |
| RLS | Row-Level Security — политика ограничения строк в БД |
| A/B Test | Эксперимент с двумя вариантами для выбора лучшего |
| Workflow | Автоматизированная последовательность действий по событиям |
| Usage Event | Запись об использовании ресурса (AI токены, отправки) |
| Mentions | Упоминания бренда/релиза в новостях или соцсетях |

---
## Итог
Данный план переводит RapidPress из генератора текстов в стратегическую платформу PR-цикла. Он строится итеративно: сначала фундамент и безопасность, затем расширение ценности (создание → дистрибуция → мониторинг), далее аналитика, командность и коммерциализация. 

При готовности к реализации следующего этапа — выбрать Sprint из таблицы и сформировать Issue backlog.

---
## Текущий прогресс (Live Snapshot)
| Блок | Статус | Детали |
|------|--------|--------|
| AI базовая миграция на LangChain | DONE | Генерация, перевод, правка, соцпосты, Ads цепочки, структурированный пресс-релиз JSON |
| Структурированные выводы (zod) | DONE | PressReleaseSchema, AdSchema, SocialPosts JSON |
| AI Error Middleware | DONE | Единый перехват ошибок в server/index.ts |
| Инструментация цепочек | DONE | Tracing handler + /api/_internal/ai-metrics |
| Документация по инструментции | DONE | `docs/INSTRUMENTATION.md` + README раздел |
| RAG Scaffold (MVP) | DONE | In-memory docs + naive retrieval |
| Headline specialized chain | DONE | JSON c quality flags |
| Декомпозиция routes | TODO | Пока монолит `server/routes.ts` (~800 строк) |
| Security Hardening (prod cookies, CORS, helmet) | TODO | Не внедрено |
| Supabase Auth интеграция | TODO | Пока local sessions |
| Queue (BullMQ) | TODO | Не добавлено |
| Embeddings (ingest + semantic search mode) | DONE | Встроены JSON-эмбеддинги + `/api/rag/search?mode=semantic` |
| pgvector интеграция | TODO | Переход с JSON → vector, добавление ANN индексов |
| Usage tracking (tokens) | TODO | Ждёт расширения инструментции |
| Документ ARCHITECTURE обновление (AI слой) | TODO | Добавить раздел про embeddings + semantic search |

### NEXT (ближайшие 3 шага)
1. Интеграция pgvector: миграция схемы, backfill существующих JSON эмбеддингов.
2. RAG-augmented генерация: внедрение retrieval контекста в цепочку пресс-релиза.
3. Обновление `ARCHITECTURE.md` и `PROGRESS_LOG.md` (вставить секцию Semantic Retrieval + диаграмму потока).

### Принципы обновления этого блока
1. Каждый завершённый шаг переносится в таблицу со статусом DONE.
2. Если задача разделяется — фиксировать подзадачи в PROGRESS_LOG.
3. Не удалять прошлые статусы — только добавлять строки или менять статус.
