# План миграции в Supabase

Дата: 2025-09-15

## Цели
1. Перенести существующие таблицы и новые сервисные таблицы (usage_events, api_keys, rag_queries, embedding_cache, user_profiles)
2. Включить pgvector (если ещё не включён) и расширения pgcrypto
3. Заменить локальную аутентификацию на Supabase Auth
4. Настроить RLS политики по user_id
5. Подготовить базу к биллингу и аналитике токенов

## Этапы
### 1. Подготовка проекта
- Создать проект в Supabase (регион ближе к пользователям)
- Получить: Project URL, anon key, service role key
- В `.env` обновить переменные:
```
DATABASE_URL=postgres://...supabase.co:5432/postgres
SUPABASE_URL=https://<PROJECT>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
```

### 2. Расширения
В Supabase SQL Editor выполнить (если не через миграции):
```sql
create extension if not exists vector;
create extension if not exists pgcrypto;
```

### 3. Миграции
Локально:
```
npm run db:push   # или drizzle-kit push
```
Либо применить SQL из `/server/migrations/` вручную (включая `20250915_add_pgvector.sql` + `20250915_add_usage_and_api_keys.sql`).

### 4. Переезд пользователей
Варианты:
A) Сохранить текущих пользователей в `users`, позже привязать их к `auth.users` через email → создать `user_profiles` с сопоставлением.
B) Немедленно мигрировать: экспорт email/password_hash (если совместимы по алгоритму) → импорт в Supabase (обычно нельзя напрямую). Часто проще форсировать reset.

Рекомендуем A:
1. Включить Supabase Auth (Email/Password)
2. Добавить колонку `supabase_user_id uuid` (позже) или использовать отдельную таблицу маппинга
3. После успешной авторизации Supabase создавать/обновлять `user_profiles`.

### 5. RLS Политики (пример)
```
alter table press_releases enable row level security;
create policy "press_releases_select" on press_releases for select using (user_id = auth.uid());
create policy "press_releases_mod" on press_releases for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```
Повторить для:
- contacts
- advertisements
- ai_documents
- usage_events (только select своих записей, insert разрешён)
- api_keys (вставка + управление своими ключами)
- rag_queries
- embedding_cache

### 6. Генерация API ключей
Алгоритм:
1. Генерируем raw = base64url(random 32 bytes)
2. hash = sha256(raw)
3. Сохраняем hash → `api_keys.key_hash`
4. Raw показываем один раз пользователю

### 7. Логирование Usage
При каждой AI операции:
- Считаем tokens (если есть модельный счетчик / приблизительно)
- Пишем `usage_events`
- Агрегируем в `user_profiles.quota_monthly_tokens_used`
- Ресет по cron (пересчёт + обновление quota_monthly_resets_at)

### 8. Кэш Embeddings
Перед вычислением: hash(normalized_text + model). Если запись есть → reuse, иначе создаём.

### 9. RAG Queries Логика
При поиске / генерации в режиме RAG:
- Сохраняем строку запроса, стратегию, latency, количество результатов
- Если запрос использован в генерации (mode=rag) → `used_in_generation = true`

### 10. Мониторинг и Дашборды
- Создать представления (views) agg_usage_per_day, agg_tokens_per_user
- Опционально — материализованные view для скоростных графиков

### 11. Безопасность
- Все таблицы с user_id → строгая RLS
- api_keys: deny by default, policy на user_id = auth.uid()
- Ограничить brute-force: использовать rate limiting на edge / middleware

### 12. Постепенное выключение локальной auth
1. Добавить флаг `USE_SUPABASE_AUTH` в .env
2. Если true — проверять JWT от Supabase (header Authorization: Bearer ...)
3. Параллельно позволить старые сессии до истечения
4. После миграции — удалить старый session middleware

### 13. Очистка и Упрощение
- После перехода убрать из кода зависимости от `express-session`
- Вынести routes в модули
- Очистить временные TODO по embedding JSON колонке

## Roadmap Follow-up
- Добавить billing_invoices позже (когда появится Stripe интеграция)
- Добавить audit_log (унифицированное журналирование действий)

## Checkpoint Список
- [ ] Проект создан
- [ ] DATABASE_URL обновлён
- [ ] Расширения включены
- [ ] Основные таблицы мигрированы
- [ ] RLS включён и политики применены
- [ ] Auth интегрирован (JWT проверка)
- [ ] Usage events пишет данные
- [ ] API key creation endpoint реализован
- [ ] RAG queries логируются
- [ ] Embedding cache используется

---
Готово к итеративному уточнению. Дополнения приветствуются.
