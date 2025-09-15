# Инструментация AI (Tracing & Метрики)

Этот модуль добавляет простое наблюдение за AI-цепочками LangChain без внешних сервисов. Решает три задачи:

1. Видимость: сколько времени занимает генерация (latency).
2. Отладка: быстрый отпечаток (hash) результата для сопоставления без хранения полного текста.
3. Расширяемость: точка для будущего подсчёта токенов, логирования и сохранения в БД.

## Где код
- `server/ai/instrumentation.ts` — ядро (SimpleTracingHandler, attachTracing, drainMetrics)
- Все существующие цепочки уже обёрнуты: 
  - `pressReleaseStructuredGenerator.ts`
  - `pressReleaseGenerator.ts`
  - `translationChain.ts`
  - `editChain.ts`
  - `socialPostGenerator.ts`
  - `adGeneratorChain.ts`

## Как это работает
Каждая LangChain runnable (chain) оборачивается функцией `attachTracing(chain)`, которая добавляет callback handler.
Handler фиксирует `start` при начале и `end` при завершении/ошибке и сохраняет запись в буфере.

```ts
import { attachTracing } from "./instrumentation";

const chain = attachTracing(prompt.pipe(model).pipe(parser));
```

## Формат метрики
```ts
interface MetricsRecord {
  runId: string;        // LangChain run id
  name?: string;        // Имя цепочки или модели
  start: number;        // timestamp (ms)
  end?: number;         // timestamp (ms)
  latencyMs?: number;   // end - start
  inputTokens?: number; // зарезервировано (сейчас не заполняется)
  outputTokens?: number;// зарезервировано
  hash?: string;        // короткий хеш JSON результата (FNV-1a)
  error?: string;       // текст ошибки (если была)
}
```

## Просмотр метрик (dev)
Эндпоинт: `GET /api/_internal/ai-metrics`

Условия:
- Требует аутентификации (как и остальные API)
- В `production` возвращает 403

Ответ:
```json
{
  "metrics": [
    {
      "runId": "...",
      "name": "ChatOpenAI",
      "start": 1737000000000,
      "end": 1737000000450,
      "latencyMs": 450,
      "hash": "3af91c2d"
    }
  ]
}
```

## Очистка / дренаж
`drainMetrics()` сейчас только считывает и очищает внутренний массив внутри кода — мы вызываем его один раз при запросе. Если нужно оставлять историю между запросами – уберите очистку, либо запишите в БД.

## Как добавить новую цепочку с трейсингом
```ts
import { attachTracing } from "./instrumentation";

// Создаём обычную LangChain цепочку
const chain = prompt.pipe(model).pipe(parser);

// Оборачиваем
const traced = attachTracing(chain);

export async function run(data: Input) {
  return traced.invoke(data);
}
```

## Добавление токенов (план)
1. Перейти на использование моделей / клиентов, которые возвращают usage (в OpenAI SDK: `response.usage.prompt_tokens`).
2. В handler добавить перехват события LLMEnd и извлечь `output.llmOutput?.tokenUsage` (или аналогично если появится в LangChain).
3. Заполнить `inputTokens` / `outputTokens`.

## Будущее расширение
| Идея | Описание | Сложность |
|------|----------|-----------|
| Персистенция | Запись метрик в таблицу `ai_metrics` | Низкая |
| Корреляция запросов | Проброс `requestId` (uuid) из middleware в chain.withConfig({ metadata }) | Низкая |
| Алерты | Пороговая задержка > X ms — логгер предупредит | Средняя |
| Экспорт | Prometheus endpoint для latency histogram | Средняя |
| UI | Вкладка в админке (история генераций) | Средняя |

## Причины простой реализации сейчас
- Быстрое покрытие всех цепочек единообразной метрикой
- Избежание зависимости от внутренних нестабильных путей LangChain
- Возможность безболезненно заменить на opentelemetry / внешний APM позднее

## FAQ
**Почему нет полного текста в метриках?**  
Чтобы не хранить потенциально чувствительные данные и не раздувать память. Используется только короткий хеш.

**Почему нет токенов?**  
Пока не извлекаем — добавим, когда стабилизируем модельный слой и решим вопрос биллинга.

**Чем отличается от встроенного LangSmith/Tracing?**  
Минимальная локальная альтернатива: ноль внешних сервисов, предельно простой код.

## Следующие шаги (рекомендуется)
1. Добавить `requestId` middleware и метаданные в attachTracing.
2. Сохранение метрик каждые N секунд (interval + batch insert).
3. Визуализация (гистограмма latency, top медленные цепочки).
4. Подсчёт токенов + лимиты на пользователя.

---
Готово. Файл можно расширять по мере роста требований.
