# CLAUDE.md — agro-weather-chat

## Про мене і мету
- Я Full-Stack / React Native розробник (5+ років, TypeScript), зараз вчуся будувати AI-агентів.
- Цей проєкт **навчальний**: мені важливо **розуміти** кожне рішення, а не просто отримати робочий код.
- Пізніше він стане основою Telegram агро-бота (погода → вікно обприскування → RAG → пам'ять полів → фото-діагностика → multi-agent).

## Що будуємо
Next.js-чат на Vercel AI SDK, який:
1. стрімить відповіді моделі в UI;
2. сам викликає tool з погодою (Open-Meteo);
3. визначає, чи можна обприскувати поле, і пояснює чому;
4. повертає structured output `{ city, canSpray, bestWindow, reason }`.

**Готово, коли:** на запит «Чи можна завтра обприскувати в Луцьку?» модель сама викликає tools і повертає типізовану відповідь з поясненням.

## Ключовий принцип: код вирішує, модель пояснює
- `canSpray` і `bestWindow` обчислює **детермінована функція** `sprayWindow` за правилами нижче.
- Модель **не перераховує і не змінює** це рішення: вона лише обирає, які tools викликати, і формулює `reason` людською мовою на основі результату tool.
- Якщо модель і правила розходяться — правий код.

## Стек
- Node.js 22+ (AI SDK 7 вимагає Node 22+ і ESM)
- Next.js (App Router), TypeScript (strict), Tailwind
- Vercel AI SDK: `ai`, `@ai-sdk/react`
- Моделі через **Vercel AI Gateway**: env `AI_GATEWAY_API_KEY`, модель задається рядком `"provider/model"` (без окремих provider-пакетів).
  - Модель для розробки: **TBD** — обрати дешеву з каталогу AI Gateway і зафіксувати тут конкретну назву (одна константа в коді, напр. `lib/model.ts`).
- `zod` для схем tools і structured output
- Open-Meteo API (без ключа):
  - geocoding: `https://geocoding-api.open-meteo.com/v1/search?name=<city>&count=1&language=uk`
  - forecast: `https://api.open-meteo.com/v1/forecast` (hourly: `temperature_2m`, `precipitation`, `precipitation_probability`, `wind_speed_10m`, `relative_humidity_2m`; `wind_speed_unit=ms`; `timezone=auto`; `forecast_days=3`)
  - `forecast_days=3`, бо для «завтра» правилу «без опадів 3 год після» потрібні години післязавтра. Моделі віддаємо тільки потрібний період.

## Формат часу
- Усі часи — **локальний час міста** у форматі ISO без зміщення, як віддає Open-Meteo з `timezone=auto`: `"2026-11-12T08:00"`.
- У результат tool додаємо поле `timezone` (напр. `"Europe/Kyiv"`), щоб було зрозуміло, який це час.
- Ніякого UTC у відповідях моделі.

## Етапи (по одному, після кожного зупиняйся)
1. **Чат без tools:** `app/api/chat/route.ts` зі `streamText` через AI Gateway; `app/page.tsx` з `useChat`. Поясни, як стрім іде від сервера до UI.
2. **Tool `getWeather(city)`:** geocoding → forecast → компактний результат (не віддавати моделі сирий великий JSON). Обробка помилок: місто не знайдено, API недоступне. Тести з мокнутим `fetch` (місто не знайдено, 5xx, успіх).
3. **Tool `sprayWindow`:** чиста функція з правилами → список годинних вікон. Unit-тести на правила (Vitest).
   - Правила (пороги — **параметри з дефолтами**, не захардкоджені константи):
     - вітер 1–4 м/с (нижня межа: у штиль ризик температурної інверсії та знесення);
     - без опадів за 3 год до і 3 год після;
     - температура 10–25 °C;
     - відносна вологість ≥ 50 % (опційно, можна увімкнути пізніше; далі — Delta T).
4. **Structured output:** ендпоінт `/api/spray-check` зі схемою `{ city, canSpray, bestWindow: { from, to } | null, reason }`.
   - **Не вигадуй API:** у новіших версіях AI SDK `generateObject` deprecated на користь `generateText`/`streamText` з параметром `output` (`Output.object({ schema })`). Перевір актуальний спосіб у встановленій версії.
   - `canSpray`/`bestWindow` беремо з результату `sprayWindow`, модель заповнює лише `reason` (див. «Ключовий принцип»).
5. **Агентна поведінка:** стоп-умова (`stopWhen` / ліміт кроків), системний промпт, відображення викликів tools в UI (який tool, з якими аргументами), README.

## Правила роботи
- **Я вчуся:** коротко пояснюй кожне нове API AI SDK і чому саме так. Після етапу дай 2–3 питання для самоперевірки.
- **Один етап за раз.** Після етапу зупинись, щоб я запустив, перевірив і закомітив.
- **Не вигадуй API з пам'яті:** AI SDK змінюється між мажорними версіями (`maxSteps` → `stopWhen`, `parameters` → `inputSchema`, `generateObject` → `output` тощо). Перевіряй встановлену версію в `node_modules/ai` (там є `docs/`) і типи.
- Мінімум залежностей; нічого не додавай без пояснення навіщо.
- Ключі тільки в `.env.local`, ніколи в коді й комітах. Шаблон — `.env.example`.
- Код, коміти й README англійською; пояснення мені — українською.
- Коміти маленькі, conventional commits (`feat:`, `fix:`, `test:`, `docs:`).

## Команди
- `npm run dev` — локальний запуск
- `npm run lint` — лінт
- `npx vitest` — тести (додати на етапі 2–3)

## Структура (орієнтовно)
```
app/
  api/chat/route.ts
  api/spray-check/route.ts
  page.tsx
lib/
  model.ts               # назва моделі (одна константа)
  tools/weather.ts       # getWeather (Open-Meteo) + тести
  tools/spray-window.ts  # правила + тести
  schemas.ts             # zod-схеми
```
