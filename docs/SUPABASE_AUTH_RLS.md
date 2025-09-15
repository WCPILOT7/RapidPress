# Supabase Auth & RLS Integration

Этот документ описывает стратегию перехода аутентификации и авторизации на Supabase (JWT + Row Level Security).

## Цели
- Унифицировать пользователей между Supabase Auth и локальной таблицей `users`.
- Обеспечить безопасность через RLS вместо ручной фильтрации userId.
- Подготовить основу для многоарендной (multi-tenant) модели и масштабирования.

## Компоненты
1. **JWT аутентификация**: клиент получает токен через Supabase Auth (email/password, OAuth и т.п.).
2. **Middleware `supabaseAuth`**: проверяет `Authorization: Bearer <JWT>`, валидирует и мапит на локального пользователя.
3. **Локальная таблица users**: добавлен столбец `supabase_user_id` (nullable пока не линкуется).
4. **RLS политики**: включены для доменных таблиц; политики разрешают операции только владельцу (`user_id = auth.uid()`).
5. **Смешанный режим**: пока поддерживаются cookie-сессии и API ключи. Постепенно можно отключить legacy auth.

## Поток Запроса
```
Client -> Authorization: Bearer <jwt>
  supabaseAuth middleware:
    supabase.auth.getUser(jwt)
      -> user.id (UUID)
    поиск local user по email or supabase_user_id
      -> если нет: create skeleton user
    req.user = { id, email, name }
  requireAuth -> ок
  RLS (на стороне БД) ограничит SELECT/UPDATE/DELETE по user_id
```

## Миграции
- `20250915_add_supabase_user_id.sql` — добавляет колонку.
- `20250915_enable_rls.sql` — включает RLS + политики.

## Политики (упрощённо)
Все политики используют `auth.uid()`:
- press_releases: ALL USING owner
- contacts: ALL USING owner
- advertisements: ALL USING owner
- ai_documents: ALL USING owner
- user_profiles: SELECT USING owner (вставка создаётся сервером)
- api_keys: ALL USING owner
- usage_events: SELECT USING owner (INSERT делает сервер)
- rag_queries: SELECT USING owner (INSERT делает сервер)
- embedding_cache: ALL USING owner

Для сервисных операций (бекграунд/ингест) используйте service role key (обходит RLS).

## Переходный План
1. Добавить Supabase Auth на фронте (получение JWT, хранение в memory + refresh).
2. Отправлять JWT в `Authorization` заголовке для защищённых API.
3. Постепенно отключить cookie-сессии: убрать express-session, `attachUser`.
4. Добавить update пользователей для заполнения `supabase_user_id` после привязки.
5. Вынести создание skeleton user за пределы hot path (pre-sync job).

## Риски / Ограничения
- In-memory rate limiting не учитывает Supabase user.id напрямую — использовать локальный numeric id.
- Двойные пользователи если email отсутствует/разный провайдер — решить стратегией canonical email.
- Политики сейчас минималистичны: нет разграничений по действиям (можно добавить отдельные для SELECT / INSERT / UPDATE / DELETE).

## Следующие Улучшения
- Добавить функцию `set_config('request.jwt.claim.sub', ...)` при админ-запросах если требуется имитировать пользователя.
- Ввести scopes / роли (plan -> расширенные лимиты) внутри RLS.
- Миграция токенового квотирования в материализованные представления для быстрой аналитики.

## Переменные окружения
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY

## Тестирование
1. Создать пользователя через Supabase Auth.
2. Выполнить запрос к `/api/generate` с JWT – должно пройти.
3. Попытаться обратиться к ресурсу другого пользователя (меняя user_id вручную) – должна быть ошибка (RLS/пустой результат).

---
Обновлено: 2025-09-15

## User Linking & Backfill

### Автоматическая привязка
Middleware `supabaseAuth` теперь выполняет такие шаги:
1. Получает JWT и извлекает `user.id` (UUID Supabase).
2. Пытается найти локального пользователя по `supabase_user_id` (быстрый путь).
3. Если не найден – ищет по email.
4. Если всё ещё не найден – создает skeleton пользователя (`password = '!'`).
5. Если у локального пользователя ещё нет `supabase_user_id`, выполняет `setSupabaseUserId` (идемпотентно).

Это гарантирует прогрессивный backfill без отдельного batch шага для новых запросов.

### Исторический Backfill (опциональный)
Если существовали локальные пользователи до внедрения Supabase, можно массово привязать их:
```sql
-- Пример: сопоставление по email (требует выгрузку auth.users)
-- 1. Создайте временную таблицу:
CREATE TEMP TABLE tmp_supabase_map(email text primary key, supabase_user_id uuid);
-- 2. COPY / INSERT данных из Supabase (экспорт auth.users) с колонками email,id.
-- 3. Выполните обновление:
UPDATE users u
SET supabase_user_id = m.supabase_user_id
FROM tmp_supabase_map m
WHERE u.email = m.email AND u.supabase_user_id IS NULL;
```

### Проверка целостности
```sql
-- Пользователи без привязки
SELECT id, email FROM users WHERE supabase_user_id IS NULL LIMIT 50;
```

## Refined RLS Policies
Добавлена миграция `20250915_refine_rls_policies.sql`, которая заменяет универсальные `ALL USING` на операции с отдельными политиками SELECT / INSERT / UPDATE / DELETE для повышения прозрачности аудита и гибкой эволюции правил.

Ключевые отличия:
- Таблица `user_profiles` без DELETE политики (защита от устранения данных квот).
- Таблицы `usage_events`, `rag_queries`, `embedding_cache` только с необходимыми операциями (INSERT + SELECT или SELECT).
- Использование подзапроса `EXISTS (SELECT 1 FROM users u WHERE u.id = <table>.user_id AND u.supabase_user_id = current_setting('request.jwt.claim.sub', true))` для единообразия и будущего расширения (например, дополнительные условия плана).

### Планы на расширение
- Внедрить роль `pro` / `enterprise` через колонку `user_profiles.plan` и добавить дифференцированные политики (например, разрешение на больший лимит операций).
- Возможность сервисных задач через сервис-роль (обходит RLS) с явной фиксацией в журнале аудита.

## Временное отключение / ослабление лимитов
Поддерживаются три режима через `DISABLE_LIMITS`:

| Значение | Режим       | Поведение квоты | Поведение rate limit | Заголовки | Блокирующие 429 |
|----------|-------------|-----------------|----------------------|-----------|----------------|
| `0`/unset| enforced    | Строго блокирует| Возвращает 429       | `X-Limits-Mode: enforced` | Да |
| `1`      | bypass      | Полностью игнор.| Полностью игнор.     | `X-Limits-Mode: bypass`, `X-Limits-Bypass: 1` | Нет |
| `soft`   | soft        | Не блокирует    | Не 429, но помечает  | `X-Limits-Mode: soft`, при превыш. `X-RateLimit-SoftExceeded: 1` | Нет |

Примеры:
```
DISABLE_LIMITS=1     # Полный bypass
DISABLE_LIMITS=soft  # Мягкий режим
```

Реализация (основные места):
- `ensureProfileAndCheckQuota`: 
  - bypass → `{ allowed: true, bypass: true }`
  - soft → `{ allowed: true, soft: true, softExceeded: true|false }`
- `server/middleware/rateLimit.ts`: режим определяется один раз на запрос; soft добавляет заголовок `X-RateLimit-SoftExceeded=1` при превышении.
- Startup warning в `registerRoutes`: предупреждает если прод и включён bypass/soft.
- Метрики: `getRateLimitMetrics()` возвращает счётчики `{ bypassRequests, softModeRequests, enforcedRequests, softExceeded, hardBlocked }`, включены в `/api/_internal/ai-metrics`.

Побочные эффекты:
- Даже в bypass/soft инкремент токенов и usage логгирование выполняются (сохраняем статистику). 
- Soft режим позволяет собрать реалистическую нагрузку без прерываний, отмечая потенциальные места будущих 429.

Рекомендации:
1. Локально / ранний QA → `soft` (получаете сигналы, не ломая поток).
2. Перед релизом → переключить на enforced (`DISABLE_LIMITS=0`) минимум на 24 часа.
3. Никогда не оставлять `1` (bypass) в production: потеря раннего обнаружения runaway сценариев.

Быстрая проверка режима (curl):
```
curl -i http://localhost:3000/api/generate -H "Authorization: Bearer <token>" ...
# Смотрите на X-Limits-Mode
```

Смена режима требует рестарт процесса (перечитывание env).

## Авто-создание user_profiles
Добавлен триггер `trg_ensure_user_profile`:
```sql
CREATE OR REPLACE FUNCTION public.ensure_user_profile() RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_ensure_user_profile
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION public.ensure_user_profile();
```
Это гарантирует, что для каждого нового пользователя есть профиль квот.

## Отключение legacy сессий
Переменная окружения `DISABLE_SESSIONS=1` — убирает регистрацию `express-session` middleware и `attachUser`.
Стек аутентификации тогда: Supabase JWT -> API Key fallback.
Рекомендуется включить (1) после полной миграции фронтенда на JWT.
