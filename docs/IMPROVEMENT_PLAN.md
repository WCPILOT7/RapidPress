# План улучшений RapidPress

Документ систематизирует задачи по приоритетам. Формат: (P1 – критично, P2 – важно, P3 – желательно)

## 1. Security (P1)
| ID | Задача | Детали | Готовность |
|----|--------|--------|------------|
| SEC-1 | Harden cookies | `secure:true` в prod, `httpOnly:true`, `sameSite:lax`, `session.saveUninitialized:false` | 0% |
| SEC-2 | Ограниченный CORS | Белый список доменов через env, убрать `*` при credentials | 0% |
| SEC-3 | Helmet | `helmet()` + отключить/настроить CSP (этап 2) | 0% |
| SEC-4 | Rate limit | express-rate-limit: auth, generate, send-release | 0% |
| SEC-5 | CSRF защита / альтернатива JWT | Рассмотреть `csurf` или переход на JWT + `SameSite=strict` | 0% |
| SEC-6 | Валидация upload | Проверка MIME, лимит размера (CSV, images) | 0% |
| SEC-7 | Sanitize логов | Не логировать пароли/секреты/длинные тексты | 0% |

## 2. Data Integrity (P1/P2)
| ID | Задача | Детали | Pri |
|----|--------|--------|-----|
| DATA-1 | Добавить миграции | Сгенерировать `drizzle-kit generate` и закоммитить | P1 |
| DATA-2 | Внешние ключи | users→press_releases→advertisements, cascade delete | P1 |
| DATA-3 | Индексы | press_releases.user_id, advertisements.press_release_id, contacts.user_id | P1 |
| DATA-4 | Пагинация API | `GET /api/releases?cursor=` и т.п. | P2 |
| DATA-5 | Версионирование релизов | Отдельная таблица versions или history | P2 |
| DATA-6 | RLS политики (Supabase) | Политики select/insert/update/delete по user_id | P1 |
| DATA-7 | Supabase Storage схема | Buckets: `ads-images`, `uploads` с правилами | P2 |

## 3. Архитектура / Рефакторинг (P1/P2)
| ID | Задача | Детали | Pri |
|----|--------|--------|-----|
| ARCH-1 | Разбить routes | Модули: auth, press, ads, contacts, mail, health | P1 |
| ARCH-2 | Service layer | Логика вне Express handlers | P1 |
| ARCH-3 | AI адаптер | `ai/openaiClient.ts`, централизованный prompt builder | P1 |
| ARCH-4 | Error handling | Классы ошибок, middleware без `throw err` | P1 |
| ARCH-5 | Config management | `config/env.ts` + zod parse env | P2 |
| ARCH-6 | Очередь задач | BullMQ: email, heavy AI, image gen | P2 |
| ARCH-7 | Абстракция хранилища | Возможность переключения: локальный FS → Supabase Storage | P2 |
| ARCH-8 | Auth стратегия | Опционально миграция на Supabase Auth (JWT + RLS) | P2 |

## 4. Производительность / Надёжность (P2)
| ID | Задача | Детали |
|----|--------|--------|
| PERF-1 | Параллельная генерация | Headline + Body в одном prompt / 2 параллели |
| PERF-2 | Кэширование статичных ответов | ETag / Cache-Control для неизменяемых ресурсов |
| PERF-3 | Retry + timeout wrapper | для OpenAI и SMTP |
| PERF-4 | Bulk email через очередь | Избежать `Promise.all` блокировок |
| PERF-5 | Monitoring latency | Метрики AI, email, DB |
| PERF-6 | Supabase connection tuning | Пулы и настройки (если self-host) |

## 5. Observability (P2)
| ID | Задача | Детали |
|----|--------|--------|
| OBS-1 | Structured logging | pino + correlation id middleware |
| OBS-2 | Metrics | prom-client (requests_total, ai_latency, mail_sent) |
| OBS-3 | Health endpoint | `/api/health` (db, openai ping) |
| OBS-4 | Tracing (опционально) | OpenTelemetry SDK |

## 6. Developer Experience (P2/P3)
| ID | Задача | Детали | Pri |
|----|--------|--------|-----|
| DX-1 | ESLint + Prettier | Стандартизировать формат | P2 |
| DX-2 | Husky pre-commit | Lint + typecheck | P2 |
| DX-3 | Vitest + Supertest | Unit + integration tests | P2 |
| DX-4 | Storybook (опц.) | Для UI компонентов | P3 |
| DX-5 | .env.example | Документация переменных | P2 |
| DX-6 | Typed API client | Генерация типов из описания | P3 |

## 7. Frontend Refactor (P2)
| ID | Задача | Детали |
|----|--------|--------|
| FE-1 | Декомпозиция `home.tsx` | Разбить на: Wizard, ReleaseHistory, TranslationPanel, NavigationBar |
| FE-2 | Декомпозиция `advertisements.tsx` | Слои: AdList, AdCreator, AdEditor, ImagePanel |
| FE-3 | Feature folders | `features/press`, `features/ads`, `features/contacts` |
| FE-4 | Suspense/loading states | Единообразные skeletonы |
| FE-5 | i18n каркас | Позже для UI переводов |

## 8. Функциональные Улучшения (P3)
| ID | Задача | Детали |
|----|--------|--------|
| FUNC-1 | Email preview | Перед отправкой визуальный просмотр |
| FUNC-2 | Ограничения AI использования | Лимит генераций в сутки |
| FUNC-3 | Billing / Plans | Многоуровневые тарифы |
| FUNC-4 | Audit log | История изменений релизов |
| FUNC-5 | Full-text поиск | По press_releases (tsvector) |
| FUNC-6 | A/B заголовки | Тестирование двух вариантов |

## 9. UX / Content (P3)
| ID | Задача | Детали |
|----|--------|--------|
| UX-1 | Динамическое имя пользователя | Взять реальное имя из authContext |
| UX-2 | Undo/History | Локальные draft версии перед сохранением |
| UX-3 | Toast/Spinner унификация | Единый hook стилей состояния |
| UX-4 | Drag & drop для CSV | Ускорение импорта |
| UX-5 | Медиабиблиотека | Повторное использование изображений |

## 10. Пример поэтапной реализации (Sprints)
### Sprint 1 (Hardening + базовый рефактор)
- SEC-1..4, ARCH-1, ARCH-4, DX-5, OBS-3, DATA-1, DATA-2

### Sprint 2 (Service/AI separation + тесты)
- ARCH-2, ARCH-3, DX-1, DX-2, DX-3, DATA-3, DATA-6, ARCH-7

### Sprint 3 (Очереди + производительность)
- ARCH-6, PERF-1, PERF-4, OBS-1, OBS-2, DATA-4

### Sprint 4 (Frontend decomposition)
- FE-1, FE-2, FE-3, UX-1, DATA-7

### Sprint 5 (Расширенные функции)
- FUNC-1, PERF-3, PERF-5, UX-2, ARCH-8

### Sprint 6 (Поиск, версии, аудит)
- DATA-5, FUNC-5, FUNC-4, OBS-4

## 11. Метрики успеха
| Направление | Метрика | Цель |
|-------------|---------|------|
| Security | Уязвимости линтера/сканера | 0 High |
| Performance | Среднее время генерации | -30% после оптимизации |
| DX | Время онбординга | <30 минут |
| Stability | Ошибки 5xx на 1k запросов | <2 |
| Observability | Покрытие логами ключевых операций | 100% |

## 12. Зависимости / Предпосылки
- Queue (Redis доступ) для ARCH-6
- Перенос конфигов в env до большинства security задач
- OpenAI ключ с корректными квотами

## 13. Риски при внедрении
| Риск | Митигирование |
|------|---------------|
| Ломающие миграции | Тестовая среда + backup |
| Рост задержек через очередь | Прогресс-индикаторы + polling |
| Over-engineering | Строгий scoping Sprints |

## 14. Следующие шаги прямо сейчас
1. Добавить `.env.example`
2. Ввести helmet + cors whitelist
3. Разнести `routes.ts` на 2–3 первых модуля (auth + press) для начала
4. ESLint/Prettier
5. Миграции/индексы

---
Готов адаптировать/пересобрать план под ваши бизнес-приоритеты. Пришлите список фич — интегрируем их в roadmap.
