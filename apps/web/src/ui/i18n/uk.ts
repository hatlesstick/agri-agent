export const uk = {
  "app.name": "Агро-агент",
  "nav.today": "Сьогодні",
  "nav.fields": "Поля",
  "nav.approvals": "Підтвердження",
  "nav.chat": "Чат",
  "window.range": "{start}–{end}",
  "status.go": "Можна обприскувати",
  "status.caution": "Обережно",
  "status.stop": "Не обприскувати",
  "theme.label": "Тема",
  "locale.label": "Мова",
} as const;

export type MessageKey = keyof typeof uk;
