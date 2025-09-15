# RapidPress

AI‑ассистированный сервис для создания, редактирования, перевода и дистрибуции пресс‑релизов, а также генерации рекламных и социальных материалов.

## Ключевые возможности
- Генерация пресс‑релиза (headline + тело) на базе OpenAI (gpt‑4o)
- Интерактивное AI-редактирование (инструкции / чат)
- Переводы на разные языки (создание связанной версии)
- Управление контактами (CSV импорт)
- Рассылка пресс‑релизов по email
- Генерация рекламных/соцмедиа материалов + image prompt + (опционально) изображение DALL·E 3
- История релизов, редактирование и сохранение

## Технический стек
| Слой | Технологии |
|------|------------|
| Frontend | React 18, Vite, Wouter, React Query, TailwindCSS, Radix UI (shadcn) |
| Backend | Node.js, Express, drizzle-orm (Supabase Postgres), express-session (пока) |
| AI | OpenAI Chat Completions (gpt-4o), DALL·E 3 Images |
| Auth | Cookie session + bcrypt (пароли) |
| Email | Nodemailer (Gmail SMTP) |
| Валидация | drizzle + zod (drizzle-zod) |

## Структура репозитория
```
shared/          # Схемы БД и типы (источник правды)
server/          # Backend: index, routes, storage, vite dev интеграция
client/          # Frontend приложение (React)
  src/
    pages/       # Страницы (нужна декомпозиция больших файлов)
    components/  # UI и доменные компоненты
    contexts/    # Контексты (auth)
    lib/         # Клиент для API, QueryClient
attached_assets/ # Дополнительные ассеты
```

## Установка и запуск
### Предварительно
- Node.js 18+
- Supabase проект (Postgres БД) — можно локально через Supabase CLI или в облаке
- OpenAI API Key
- SMTP (Gmail) учетные данные

> Пока используется cookie-сессия + собственные пользователи. В планах: переход (или гибрид) на Supabase Auth + RLS.

### Переменные окружения (.env)
```
# Подключение к Supabase Postgres (можно использовать стандартный DATABASE_URL из настроек проекта)
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/DATABASE

# (Опционально для интеграции с Supabase сервисами — если будете добавлять Auth/Storage/Realtime)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ... (frontend безопасно)
SUPABASE_SERVICE_ROLE_KEY=eyJ... (server only, НЕ коммитить)

OPENAI_API_KEY=sk-...
EMAIL_USER=you@gmail.com
EMAIL_PASS=app_password
SESSION_SECRET=change_me
PORT=5000
OPENAI_MODEL=gpt-4o # optional override
OPENAI_EMBEDDINGS_MODEL=text-embedding-3-small # optional override
RAG_VECTOR_STRATEGY=json # или pgvector (dual-mode переключатель)
```

Если перейдёте на Supabase Auth:
```
USE_SUPABASE_AUTH=true
```
и логика auth будет вынесена из локальных таблиц `users`.

### Локальный запуск (dev)
```bash
npm install
npm run dev
```
Запустится сервер Express + dev Vite middleware (frontend по тому же порту).

### Продакшн сборка
```bash
npm run build   # Соберет client в dist/public и server bundle в dist/
NODE_ENV=production npm start
```

## Модель данных (упрощённо)
- users(id, email*, password, name, created_at)
- press_releases(id, user_id, company, headline, copy, contact, contact_email, contact_phone, date, brand_tone?, quote?, competitors?, release, language, original_id?, created_at)
- contacts(id, user_id, name, email, publication, created_at)
- advertisements(id, user_id, press_release_id, title, content, platform, type, image_prompt?, image_url?, is_custom_image, created_at)

## Основные эндпоинты (кратко)
| Метод | Путь | Назначение |
|-------|------|------------|
| POST | /api/auth/register | Регистрация + сессия |
| POST | /api/auth/login | Логин |
| POST | /api/auth/logout | Выход |
| GET | /api/auth/me | Текущий пользователь |
| POST | /api/generate | Генерация пресс‑релиза |
| GET | /api/releases | Список релизов |
| POST | /api/releases/:id/edit | AI редактирование |
| POST | /api/releases/:id/translate | Перевод |
| POST | /api/contacts/upload | Импорт контактов CSV |
| POST | /api/send-release | Рассылка email |
| POST | /api/advertisements | Создание рекламного материала |
| POST | /api/advertisements/:id/generate-image | Генерация изображения |

(Полный список см. исходник `server/routes.ts` — планируется декомпозиция.)

## Ограничения текущей версии
- Монолитный файл маршрутов (~800+ строк)
- Отсутствие пагинации
- Слабая конфигурация безопасности (CORS, cookie, отсутствует CSRF)
- Нет очередей для массовой рассылки и AI задач
- Крупные React страницы (трудно поддерживать)
- Нет тестов
- Локальное хранение загружаемых изображений / CSV (план миграции в Supabase Storage)
- Нет RLS политик (users/ownership контролируется только в запросах)

## Roadmap (высокий уровень)
1. Security Hardening (cookies, CORS, helmet, rate limit, подготовка к RLS)
2. Рефактор маршрутов по модулям (auth, press, ads, contacts, mail)
3. Интеграция Supabase Storage для изображений и CSV
4. Опциональная миграция на Supabase Auth (замена локальных users + session → JWT + RLS)
5. RLS политики (ownership для press_releases/contacts/advertisements)
6. Пагинация и индексы в БД + внешние ключи
7. Очереди (BullMQ) для email и тяжелых AI задач
8. Логи (structured) + метрики + мониторинг запросов AI
9. Тесты (unit/integration) + ESLint + Prettier
10. Версионирование релизов и аудит изменений
11. Ограничение AI usage + тарифы (в будущем)
12. Full-text поиск (Postgres / Supabase) по контенту

## Модульная маршрутизация (обновление)
Монолитный `server/routes.ts` разделён на доменные модули в `server/routes/*`:

| Модуль | Содержимое |
|--------|------------|
| auth.ts | /api/auth/* авторизация |
| pressReleases.ts | Генерация, CRUD, перевод, правки пресс-релизов |
| advertisements.ts | Создание/редактирование рекламных и соц материалов + изображение |
| contacts.ts | Импорт CSV, контакты, рассылка |
| rag.ts | Инжест документов и поиск |
| apiKeys.ts | Управление API ключами |
| usage.ts | Сводка использования и внутренние метрики |

Общие middleware:
- `lib/auth.ts` — стек: Supabase JWT -> (опц. session) -> API key
- `lib/limits.ts` — квоты/лимиты + soft / bypass режимы

## Режимы лимитов
`DISABLE_LIMITS` значения:
- `0` (или не задано) — строгие лимиты
- `soft` — не блокируем, но выставляем заголовок `X-RateLimit-SoftExceeded: 1`
- `1` — полный bypass (только для локалки)

## Frontend Auth / Dashboard (обновление)
Добавлено:
- Страницы `/login`, `/register`, `/dashboard`.
- `AuthContext` теперь подписан на глобальные 401 события: любое истечение сессии очищает пользователя и редиректит на `/login`.
- `ProtectedRoute` делает redirect → `/login` (ранее был root).
- Центральный fetch wrapper `apiRequest` + подписчики `onUnauthorized` в `queryClient.ts`.
- Простая страница `dashboard.tsx` с три дайджеста: количество релизов, реклам и JSON usage summary (`/api/usage/summary`).

План улучшений Dashboard:
- Визуализировать usage (progress bar / chart)
- Добавить список последних N релизов + быстрые действия (просмотр / редактирование)
- Добавить блок API ключей

## Auth Flow (актуальный)
1. Пользователь открывает `/login` или `/register` — если уже авторизован, моментальный redirect на `/dashboard`.
2. После успешного логина/регистрации — redirect `/dashboard`.
3. Любой 401 от API → глобальный listener → state reset → redirect `/login`.
4. Защищённые роуты (`/dashboard`, `/advertisements`, и т.п.) обёрнуты в `<ProtectedRoute>`.

## Быстрый старт разработки фронта
1. `npm install`
2. `npm run dev`
3. Открыть `http://localhost:5000` (Vite middleware проксирован через Express)

## Следующие шаги фронта
- Вынести громоздкий `home.tsx` (wizard) в независимые подкомпоненты.
- Унифицировать API слой (`api.ts` + новые helpers из `queryClient.ts`).
- Добавить optimistic updates для удаления/редактирования.
- Интегрировать soft-limit баннер.

## Лицензия
MIT

## Дополнительно
Подробная архитектура: `docs/ARCHITECTURE.md`
План улучшений: `docs/IMPROVEMENT_PLAN.md`
Миграция на Supabase: `docs/SUPABASE_MIGRATION.md`
Стратегический 360° Roadmap: `docs/360_ROADMAP.md`
 Журнал прогресса: `docs/PROGRESS_LOG.md`

### AI / LangChain архитектура
Используется LangChain для стандартизации промптов и парсинга вывода.

Файлы:
- `server/ai/core.ts` — инициализация моделей (ChatOpenAI, embeddings)
- `server/ai/pressReleaseGenerator.ts` — генерация пресс-релизов (PromptTemplate → Chain)
- `server/ai/socialPostGenerator.ts` — генерация постов для соцсетей с JSON валидацией (zod + JsonOutputParser)
 - `server/ai/pressReleaseStructuredGenerator.ts` — структурированный JSON пресс-релиз
 - `server/ai/adGeneratorChain.ts` — рекламные объявления (Google/Facebook)
 - `server/ai/translationChain.ts` — перевод
 - `server/ai/editChain.ts` — правки по инструкции
 - `server/ai/headlineChain.ts` — специализированный заголовок (качество/флаги)
 - `server/ai/rag/` — RAG scaffold: документы, сплиттер, наивный keyword поиск, embeddings ingestion, semantic search (`/api/rag/search?mode=semantic`)

#### Dual-mode стратегия (JSON vs pgvector)
Переменная `RAG_VECTOR_STRATEGY` управляет способом хранения и поиска:
- `json` (по умолчанию) — эмбеддинги хранятся строкой (JSON), ранжирование в приложении.
- `pgvector` — (после миграции) используется колонка типа `vector` и SQL `ORDER BY embedding_vector <-> $query`.
Fallback логика: если установлен `pgvector`, но колонка отсутствует или пуста — автоматически переключается на json.

Дополнительные опциональные переменные:
```
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDINGS_MODEL=text-embedding-3-small
```
Если не заданы — применяются значения по умолчанию.

### Инструментация (метрики AI)
Базовый трейсинг всех AI цепочек: время выполнения, хеш результата, ошибки.

Документ: `docs/INSTRUMENTATION.md`

Dev эндпоинт (только вне production): `GET /api/_internal/ai-metrics`

Планы расширения: токены, корреляция requestId, сохранение в БД, Prometheus.

### RAG / Semantic Search (MVP)
Инжест документов разбивает текст на чанки, для каждого генерирует embedding (пока хранится как JSON). Поиск поддерживает два режима:
1. Ключевой (по совпадениям термов)
2. Семантический (`mode=semantic`) — ранжирование по cosine similarity.

Следующие шаги: миграция на pgvector, интеграция retrieval контекста в генерацию (RAG-augmented prompts).
