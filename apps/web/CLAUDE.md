# apps/web — frontend rules

Next.js 16 (App Router), React 19, Tailwind 4, `@ai-sdk/react`. Deployed on Vercel (Root Directory `apps/web`). **UI only**: no route handlers, no business logic, no agent or backend imports. See `docs/architecture.md` and the root `CLAUDE.md`.

## Talking to the API
- The browser calls same-origin `/api/*`; `next.config.ts` rewrites `/api/:path*` to `API_ORIGIN` (the NestJS API). `useChat` keeps its default `/api/chat` endpoint.
- `src/proxy.ts` (Next 16 name for middleware), matcher `/api/:path*`: strips client-sent `x-proxy-auth` / `x-client-ip`, then sets `x-proxy-auth` from `PROXY_AUTH_SECRET` and `x-client-ip` from the platform client address. It contains no other logic.
- Request/response types, chat message and tool part types, limits (`CHAT_LIMITS`) and error codes come from `@agri/shared` contracts — never redefined in the UI.
- Error responses are RFC 9457 problem details; UI messages are chosen by the `code` field (`ui/helpers/chat-errors.ts`).
- Env: `API_ORIGIN`, `PROXY_AUTH_SECRET` (server-only, used by `proxy.ts` and `next.config.ts`); listed in `.env.example`, checked by a test.

## Structure
```
src/
  app/            App Router only: layout, pages, styles. Pages render @/ui/pages/*. No logic.
  proxy.ts        adds proxy headers for /api/*
  ui/
    atoms/ molecules/ organisms/ templates/ pages/   one folder per component
    hooks/        state, effects, data fetching (useAgentChat, useChatComposerForm, …)
    helpers/      pure UI logic and formatting (agent-activity, chat-errors, message-view, tool-parts)
    schemas/      zod schemas for forms
tests/
  unit/<same path as src>/…, unit/ui/<level>/<Component>.test.tsx, evals/ui/, support/
```

## Components and logic
- Atomic order: atoms ← molecules ← organisms ← templates ← pages; a level never imports a higher one; `hooks/`, `helpers/`, `schemas/` never import components.
- Components: `export const Name: React.FC<NameProps> = (…) => …` with `import type React from "react"`; named exports only (`page.tsx` / `layout.tsx` keep default exports); props in `<Name>.types.ts`; each folder has `index.ts`; relative imports inside a component folder, `@/…` across folders.
- **Components only render.** State, effects and side effects go into hooks; computations and formatting into helpers. A component calls at most one hook and passes data down.
- **Forms:** `react-hook-form` + `zod` via `@hookform/resolvers/zod`; schema in `ui/schemas/<name>.schema.ts` (exports schema and `z.infer` type); form logic in a `useXForm` hook; limits from `@agri/shared`.

## Where new code goes
- New screen → `ui/pages/<Name>` (+ template if the layout is new); new UI piece → the lowest atomic level that fits.
- New API call → a hook in `ui/hooks/` using `/api/<path>` and types from `@agri/shared`; the endpoint itself is built in `apps/api`.

## Lint-enforced boundaries
- `app/` → `@/ui/pages/*` only.
- `ui/` → its own folders and `@agri/shared`; never `apps/api`, never runtime agent / AI SDK server code (`ai` only through `@ai-sdk/react` hooks and type imports).
- No `src/server`, no `src/app/api`, no `instrumentation.ts` with backend work.

## Styling and UX
- Visual language, tokens and component rules: `docs/design-system.md`. Components use semantic token classes (`bg-surface`, `text-muted`, `bg-primary`, `text-status-go` …) defined once in `@theme`; never raw palette classes (`blue-600`, `zinc-500`) or hex values in components.
- Light and dark themes from day one; contrast at least WCAG AA, readable outdoors; touch targets ≥ 44 px.
- A status is never colour alone: icon + label (can spray / caution / cannot spray).
- Every agent answer card shows its source, update time and confidence (R3).
- UI text comes from the UA / EN message dictionaries, not inline strings (from the UI foundation stage).
- Tone of copy: short, specific, encouraging; empty states explain what will appear and how to add the first item.

## Testing
- Vitest projects: `unit` (Node, `*.test.ts`) and `components` (jsdom + Testing Library, `tests/unit/ui/**/*.test.tsx`, user interaction via `@testing-library/user-event`, accessible queries by role/label).
- `proxy.ts` has a unit test for header handling.
