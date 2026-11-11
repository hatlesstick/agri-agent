# CLAUDE.md — agro-agent

## Про мене і мету
- Я Full-Stack / React Native розробник (5+ років, TypeScript), зараз вчуся будувати AI-агентів.
- Цей проєкт **навчальний**: мені важливо **розуміти** кожне рішення, а не просто отримати робочий код.
- Пізніше він стане основою Telegram агро-бота (погода → вікно обприскування → RAG → пам'ять полів → фото-діагностика → multi-agent).

## Що будуємо
**Агро-агента** на Vercel AI SDK з веб-чатом як першим каналом. Агент:
1. стрімить відповіді в UI;
2. сам вирішує, які tools викликати, і будує ланцюжок кроків (погода → вікно обприскування → відповідь);
3. визначає, чи можна обприскувати поле, і пояснює чому;
4. через окремий ендпоінт повертає structured output `{ city, canSpray, bestWindow, reason }`.

**Готово, коли:** на запит «Чи можна завтра обприскувати в Луцьку?» модель сама викликає tools і повертає типізовану відповідь з поясненням.

## Ключовий принцип: код вирішує, модель пояснює
- `canSpray` і `bestWindow` обчислює **детермінована функція** за правилами нижче.
- Модель **не перераховує і не змінює** це рішення: вона обирає, які tools викликати, і формулює `reason` людською мовою.
- **Великі дані не йдуть через модель.** Модель передає в tools лише короткі параметри (`city`, `date`), а погодинні дані tools беруть самі з `lib/weather`.
- Якщо модель і правила розходяться — правий код.

## Архітектура
```
              ┌─────────── lib/agent.ts ───────────┐
 /api/chat ──▶│  модель, системний промпт,         │
 (стрім у UI) │  tools, stopWhen                   │
/api/spray- ─▶│                                    │
 check (JSON) └────────────────────────────────────┘
 (пізніше Telegram)          │
                             ▼
                 lib/weather/ — Open-Meteo + кеш у пам'яті
                 lib/spray/   — чисті правила
```
- **Агент** — один модуль `lib/agent.ts`: модель, промпт, tools, межі циклу. З етапу 5 — `ToolLoopAgent`.
- **Канали** (`app/api/*`, пізніше Telegram) лише передають повідомлення агенту й форматують відповідь. Логіки агента в них немає.
- **Доменна логіка** (`lib/weather`, `lib/spray`) не залежить від AI SDK і тестується окремо.

## Tools
### `getWeather`
- Вхід: `{ city: string }` (модель може передати «Луцьк» або «Lutsk» — обидва мають працювати).
- Geocoding → forecast на 3 дні → компактний результат: місто, координати, `timezone`, погодинні `temperature`, `windSpeed`, `precipitation`, `precipitationProbability`, `humidity`.
- Помилки повертає **даними**, а не exception: `{ error: "city_not_found" }`, `{ error: "weather_unavailable" }` — щоб модель могла пояснити користувачу.
- Навіщо агенту: загальні питання про погоду і пояснення, на чому ґрунтується висновок.

### `sprayWindow`
- Вхід: `{ city: string, date: string }` (`date` — `"YYYY-MM-DD"`, локальна дата міста).
- Сам бере погоду через `lib/weather` (кеш → без повторного запиту до Open-Meteo).
- Вихід: `{ canSpray, bestWindow: { from, to } | null, windows: [...], rejectedReasons }`.
- Правила — чиста функція в `lib/spray`, пороги — **параметри з дефолтами**:
  - вітер 1–4 м/с (нижня межа: у штиль ризик температурної інверсії та знесення);
  - без опадів за 3 год до і 3 год після;
  - температура 10–25 °C;
  - відносна вологість ≥ 50 % (опційно, можна увімкнути пізніше; далі — Delta T).

## Стек
- Node.js 22+ (AI SDK 7 вимагає Node 22+ і ESM)
- Next.js 16 (App Router), TypeScript (strict), Tailwind 4
- Vercel AI SDK 7: `ai`, `@ai-sdk/react`
- Моделі через **Vercel AI Gateway** (входить у `ai`): env `AI_GATEWAY_API_KEY`, модель задається рядком `"provider/model"` (без окремих provider-пакетів).
  - Модель для розробки: **`google/gemini-2.5-flash-lite`** ($0.10 / $0.40 за 1M токенів, tool-use + structured-output; доступна на Free Tier, tool calling перевірено 2026-11-11). Запасна: `openai/gpt-5.4-nano`.
  - `anthropic/claude-haiku-5.5` на Free Tier **недоступна** (потрібні платні кредити).
  - Назва моделі — одна константа в `lib/model.ts`.
- `zod` для схем tools і structured output
- `vitest` для тестів (додати на етапі 2)
- Open-Meteo API (без ключа):
  - geocoding: `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1&language=uk`
  - forecast: `https://api.open-meteo.com/v1/forecast` (hourly: `temperature_2m`, `precipitation`, `precipitation_probability`, `wind_speed_10m`, `relative_humidity_2m`; `wind_speed_unit=ms`; `timezone=auto`; `forecast_days=3`)
  - `forecast_days=3`, бо для «завтра» правилу «без опадів 3 год після» потрібні години післязавтра.

## Формат часу
- Усі часи — **локальний час міста** у форматі ISO без зміщення, як віддає Open-Meteo з `timezone=auto`: `"2026-11-12T08:00"`.
- У результат tool додаємо поле `timezone` (напр. `"Europe/Kyiv"`).
- Ніякого UTC у відповідях моделі.

## AI SDK 7 — перевірені API (ai@7.0.170)
Перевірено в `node_modules/ai/docs` і `dist/index.d.ts`. Якщо версія зміниться — перевір знову.
- Відповідь зі стрімом: `createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) })`. `result.toUIMessageStreamResponse()` — **deprecated**.
- UI → модель: `await convertToModelMessages(messages)` (`UIMessage[]` → `ModelMessage[]`).
- Tools: `tool({ description, inputSchema, execute })`.
- Ліміт кроків: `stopWhen: isStepCount(n)` (**не** `stepCountIs`).
- Structured output: `generateText({ output: Output.object({ schema }) })`, можна разом з `tools`. `generateObject` — **deprecated**.
- Агент: `ToolLoopAgent` (дефолтний ліміт `isStepCount(20)`) — див. `docs/03-agents`.
- Tool у UI: частини повідомлення `tool-<name>` зі станами `input-streaming` / `input-available` / `output-available` / `output-error`.

## Етапи (по одному, після кожного зупиняйся)
1. **Чат без tools:** `lib/model.ts`, `app/api/chat/route.ts` зі `streamText`, `app/page.tsx` з `useChat`. Поясни, як стрім іде від сервера до UI.
2. **Tool `getWeather`:** `lib/weather` (Open-Meteo + кеш) і обгортка tool. Тести з мокнутим `fetch`: успіх, місто не знайдено, 5xx, «Lutsk»/«Луцьк».
3. **Tool `sprayWindow`:** чиста функція в `lib/spray` + обгортка tool. Unit-тести на кожне правило і межові значення (рівно 4 м/с, рівно 10 °C, дощ рівно за 3 год).
4. **Structured output:** `/api/spray-check`, `generateText` з `tools` + `Output.object` + `stopWhen`; схема `{ city, canSpray, bestWindow: { from, to } | null, reason }` у `lib/schemas.ts`.
   - **Варіант A:** модель повертає весь об'єкт, а код **перезаписує** `canSpray` і `bestWindow` значеннями з результату `sprayWindow` (з `result.steps`). Якщо модель написала інше — `console.warn` з обома значеннями (вчимося помічати, коли модель «бреше»).
   - Якщо `sprayWindow` не викликався — помилка, а не відповідь моделі навмання.
5. **Агентна поведінка:** перенести логіку в `lib/agent.ts` (`ToolLoopAgent`), системний промпт (агроном, українською, не вигадує погоду), `stopWhen: isStepCount(5)`, картки викликів tools в UI (назва, аргументи, стан), README.
6. **Evals:** вимірюємо якість агента набором кейсів, а не «на око».
   - Кейси в `evals/cases.ts`: запит користувача + **фікстура погоди** (щоб правильна відповідь була відома наперед) + очікування.
   - Погода в evals — з фікстур через підміну `fetch`, модель — **справжня** через AI Gateway.
   - Перевірки кодом (детерміновані, спершу вони):
     - викликано потрібні tools (`sprayWindow` для питань про обприскування; `getWeather` не обов'язково);
     - аргументи tools правильні (`city`, `date` — «завтра» перетворено на правильну дату);
     - вихід `/spray-check` проходить zod-схему, `canSpray`/`bestWindow` збігаються з очікуваними;
     - модель не «перерішила» (немає `console.warn` з варіанту A);
     - `reason` українською і згадує причину відмови (вітер / опади / температура);
     - кількість кроків ≤ ліміту.
   - Набір кейсів: «можна» / «не можна через вітер / дощ / температуру», неіснуюче місто, «Lutsk» латиницею, питання не про обприскування (tools не потрібні), неоднозначна дата.
   - Кожен кейс запускається N разів (за замовчуванням 3) → **pass rate**, бо модель недетермінована.
   - LLM-as-judge — опційно, лише для якості `reason` (чи не вигадує цифр, яких немає в даних tool).
   - Звіт: таблиця кейсів з pass rate + порівняння двох моделей (основна vs запасна).
   - Запуск окремою командою `npm run eval` (окремий конфіг Vitest), **не** в `npx vitest`: evals повільні, коштують токени і недетерміновані.
7. **Маленький власний RAG (без векторної БД):** tool `searchDocs`.
   - Корпус: 5–10 коротких markdown-документів у `data/docs/` (правила обприскування, вплив погоди, загальні вимоги етикеток препаратів). Навчальний корпус, з джерелом у кожному файлі.
   - Індексація скриптом `npm run index`: чанкінг по заголовках → `embedMany` → `data/index.json` (текст чанка, `source`, вектор).
   - Embeddings: `google/gemini-embedding-001` (доступна на Free Tier, перевірено 2026-11-11; `openai/text-embedding-3-small` на Free Tier недоступна). Назва моделі — константа в `lib/model.ts`.
   - Пошук: `embed(query)` → `cosineSimilarity` по всіх чанках у пам'яті → top-k (k=3) з порогом схожості.
   - Tool `searchDocs({ query })` → `[{ text, source, score }]`; агент **цитує джерела** і каже «не знаю», якщо нічого релевантного не знайшлося.
   - Evals: retrieval recall@k на парах «питання → очікуване джерело» + кейси відповіді з цитуванням у наборі з етапу 6.
   - Чому без векторної БД: на десятках чанків повний перебір миттєвий, а так видно всю механіку RAG. Векторну БД додамо, коли корпус виросте.

## Майбутні tools (наступні проєкти, не зараз)
`getField` / `saveFieldNote` (пам'ять полів), `diagnosePhoto` (фото-діагностика), далі — субагенти.

## Правила роботи
- **Я вчуся:** коротко пояснюй кожне нове API AI SDK і чому саме так. Після етапу дай 2–3 питання для самоперевірки.
- **Один етап за раз.** Після етапу зупинись, щоб я запустив, перевірив і закомітив.
- **Не вигадуй API з пам'яті:** AI SDK змінюється між мажорними версіями. Перевіряй встановлену версію в `node_modules/ai` (`docs/` і типи).
- Мінімум залежностей; нічого не додавай без пояснення навіщо.
- Ключі тільки в `.env.local`, ніколи в коді й комітах. Шаблон — `.env.example`.
- Код, коміти й README англійською; пояснення мені — українською.
- Коміти маленькі, conventional commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

## Правила написання коду
- **Не додавай коментарі в код** — ні при створенні файлів, ні при змінах. Жодних `//`, `/* */`, JSDoc чи «поясню, що робить рядок».
- Зрозумілість — через назви змінних, функцій, типів і маленькі функції.
- Пояснення рішень пиши мені в чаті, а не в коді.
- Виняток — лише коли я прямо прошу коментар.

## Команди
- `npm run dev` — локальний запуск
- `npm run lint` — лінт
- `npx vitest` — тести (з етапу 2)
- `npm run eval` — evals з реальною моделлю (з етапу 6, коштує токени)
- `npm run index` — побудова RAG-індексу (з етапу 7)

## Структура (орієнтовно)
```
app/
  api/chat/route.ts          # канал: веб-чат (стрім)
  api/spray-check/route.ts   # канал: structured JSON
  page.tsx
lib/
  model.ts                   # назва моделі (одна константа)
  agent.ts                   # агент: модель, промпт, tools, stopWhen (етап 5)
  schemas.ts                 # zod-схеми
  weather/                   # Open-Meteo: geocoding, forecast, кеш + тести
  spray/                     # правила обприскування (чиста функція) + тести
  tools/                     # обгортки tool() над weather/, spray/, rag/
  rag/                       # чанкінг, embeddings, пошук (етап 7)
evals/                       # кейси, фікстури погоди, раннер (етап 6)
data/
  docs/                      # корпус для RAG (етап 7)
  index.json                 # згенерований індекс (етап 7)
scripts/
  build-index.ts             # npm run index (етап 7)
```
