# Миграция на Supabase

Этот документ описывает шаги перехода проекта RapidPress на полноценное использование сервисов Supabase (Postgres, Auth, Storage, RLS, Edge Functions при необходимости).

## 1. Текущая ситуация
- Используется локальная таблица `users` + cookie sessions.
- Файлы (изображения, CSV) сохраняются локально (`/uploads`).
- Нет RLS; фильтрация по userId реализована только в application layer.
- OpenAI вызовы осуществляются напрямую из Express маршрутов.

## 2. Цели миграции
| Цель | Результат |
|------|-----------|
| Централизованная аутентификация | Supabase Auth (email/password, magic links, соц. логины) |
| Безопасность данных | RLS политики на уровне таблиц |
| Масштабируемое хранение файлов | Supabase Storage buckets |
| Упрощение DevOps | Меньше кастомной инфраструктуры |
| Прозрачный аудит | Использование Postgres row-level + журналирования |

## 3. Этапы
### Этап 1: Подготовка
1. Создать Supabase проект (если не создан).
2. Скопировать `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY` (в серверное окружение).
3. Настроить `DATABASE_URL` (можно использовать встроенный connection string).
4. Сгенерировать и зафиксировать миграции (drizzle-kit) для текущих схем.

### Этап 2: Введение Storage
1. Создать bucket `ads-images` (public read, private write) — для генерируемых/загруженных изображений.
2. Создать bucket `uploads` (private) — для исходных CSV.
3. Обновить логику загрузки:
   - Вместо multer → загрузка в Supabase Storage (`@supabase/storage-js`).
   - Сохранение только метаданных (имя файла, путь, public URL) при необходимости.
4. Отключить локальный каталог `/uploads` (или оставить для dev).

### Этап 3: Аутентификация (опционально, можно позже)
1. Включить email/password провайдер в Supabase Auth.
2. Добавить таблицу профиля (если нужны доп. поля — name и т.п.) или использовать `auth.users` + отдельную `profiles`.
3. Заменить локальную регистрацию/логин на:
   - Client: вызовы через Supabase JS `supabase.auth.signInWithPassword()`
   - Server: убрать `express-session` (или сохранить временно для переходного периода).
4. При полном переходе:
   - Удалить таблицу `users` (или мигрировать данные: email, name → profiles, password невозможен (bcrypt) → потребуется reset пароля пользователями).
   - Ввести middleware проверки JWT (supabase-auth-helpers или собственный verifier через JWKS endpoint).

### Этап 4: RLS Политики
Пример (SQL, концептуально):
```sql
alter table press_releases enable row level security;
create policy "Allow owner access" on press_releases
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```
Аналогично для `contacts`, `advertisements`.

Если остаётся локальный auth на время — RLS не применима; сперва нужно перейти на Supabase Auth.

### Этап 5: Рефактор доступа
1. Вынести слой репозиториев, чтобы в будущем можно было заменить часть логики на PostgREST / RPC (опционально).
2. (Опц.) Использовать Edge Functions для тяжёлых операций (например, рассылка email) — запуск из клиента с проверкой JWT.

### Этап 6: Observability & Limits
1. Включить логирование запросов к БД (Supabase Dashboard → Logs)
2. Мониторить использование Storage и RPS.
3. Добавить алертинг (если проект в проде).

## 4. Сравнение до/после
| Аспект | До | После |
|--------|----|-------|
| Users | Локальная таблица + session cookies | Supabase Auth + JWT + (RLS) |
| Files | Локальная ФС | Supabase Storage |
| Access Control | Приложение на уровне кода | RLS политики в Postgres + проверка JWT |
| Массовые задачи | Express handlers | Queue / Edge Functions (по мере развития) |

## 5. Риски
| Риск | Митигирование |
|------|---------------|
| Слом авторизации при миграции | Переходный режим: сначала Storage + RLS, потом Auth |
| Утечка service role ключа | Хранить только в серверном окружении, не в bundle |
| Ограничения Storage latency | Кэширование URL, CDN (встроено в Supabase) |
| Несовместимость паролей | Форс reset пароля пользователями |

## 6. Минимальный PoC перехода (Check-list)
- [ ] Добавлен `.env.example` с SUPABASE_*
- [ ] Созданы buckets
- [ ] Обновлён код загрузки изображений → Storage
- [ ] Добавлен supabase-js клиент (client + server)
- [ ] Фича-флаг `USE_SUPABASE_AUTH` внедрён
- [ ] Документированы RLS политики (в комментариях / SQL миграциях)

## 7. Следующие шаги
1. Реализовать Storage интеграцию (быстрый win)
2. Подготовить миграцию Auth (если нужно)
3. Добавить RLS после включения Supabase Auth
4. Перевести рассылку в очередь (BullMQ) – не зависит от Supabase, но разгружает сервер

---
При готовности могу подготовить конкретные SQL политики и адаптеры кода — просто сообщите, что внедряем первым.
