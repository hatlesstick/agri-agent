# Design system: Ozymyna and Chernozem

The visual language of the agri-agent web app. Chosen 2026-11-16 from the style board (direction "Rapeseed and chernozem", accent "Ozymyna" — young winter wheat). Rules for code live in `apps/web/CLAUDE.md`; this document explains what the UI looks like and why.

## Idea
The product answers one question every morning: where and when can I work today. The UI is built around that answer, in the materials of the field: the fresh green of winter wheat in spring, the dark ink of chernozem soil, the pale light of an early morning.

- **One bold element per screen.** On the home screen it is the hour strip on the Ozymyna panel; everywhere else the UI stays quiet: paper background, ink text, thin rules.
- **Readable in the field.** High contrast, large numbers, touch targets of at least 44 px, works on a phone in sunlight and at 5 a.m. in the dark theme.
- **Status is never colour alone.** Every verdict has an icon and a word: ✓ Can spray, ! Caution, ✕ Do not spray.
- **Show the product, not marketing.** Real fragments (the strip, the field table, an approval card, a cited answer) instead of feature cards.
- **Answers carry their evidence.** Source, update time and confidence under every agent answer.

## Colour tokens
Defined once as CSS variables in the Tailwind v4 `@theme`; components use only the semantic names.

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#f3f4ee` | `#1b1611` | Page background |
| `surface` | `#fbfbf7` | `#241e18` | Panels, inputs, table areas |
| `ink` | `#241d16` | `#f0ebdf` | Text, primary action buttons, outlines of actions |
| `ink-soft` | `#5b5248` | `#b3a999` | Secondary text, labels |
| `rule` | `#d9d9cd` | `#3a3229` | Borders and dividers |
| `brand` (Ozymyna) | `#8fbf4d` | `#8fbf4d` | The one bold panel per screen, logo mark |
| `brand-ink` | `#1b2410` | `#1b2410` | Text on `brand` |
| `brand-wash` | `#e6f0d5` | `#283619` | Quiet highlight: approval card header, selected nav item |
| `go` | `#1d6b40` | `#5cc68a` | "Can spray" text and icons |
| `go-strong` | `#1d6b40` | `#1d6b40` | "Can spray" bars on the brand panel (both themes) |
| `warn` | `#c9701f` | `#eb9a4c` | "Caution" |
| `stop` | `#b8402e` | `#ec7b67` | "Do not spray" text and icons |
| `sky` | `#2f76b5` | `#7db3e6` | Precipitation, links, focus ring |

Hour bars on the brand panel use fixed values in both themes: `go-strong` with a white check, `surface` with a `warn` ring for caution, `ink` with a `brand` cross for stop. Contrast: body text and statuses meet WCAG AA on `paper` and `surface` in both themes.

## Type
- **Unbounded** (700–800) for the page title, section titles and big numbers such as a time window. Tight tracking (−0.02 em), balanced wrapping, never for body text.
- **Onest** (400–700) for everything else; tabular numerals wherever hours, rates or areas line up.
- Scale: 76 / 44 / 34 / 20 / 17 / 15 / 13 px (fluid `clamp` for the two largest). Body 16 px, line height 1.55, line length ≤ 65 characters.
- Sentence case everywhere; no all-caps labels.

## Shape and space
- Radii by role: 28 px for the brand panel, 16–20 px for panels and cards, 12 px for buttons and inputs, 999 px only for small chips. Not one radius for everything.
- Borders instead of shadows; no gradients.
- Spacing on a 4 px grid; sections separated by space, not by boxes.

## Components
| Component | Level | Notes |
|---|---|---|
| `Button` | atom | `primary` (ink fill), `secondary` (ink outline), `quiet` (text). Labels say exactly what happens: "Save record", not "Submit". |
| `StatusLabel` | atom | Icon + word for go / caution / stop; colour from the status tokens. |
| `Icon` | atom | lucide icons, 16–20 px, stroke 2. |
| `HourBar` | molecule | One hour: time, verdict bar with icon, wind (m/s), precipitation (mm); selectable, keyboard reachable. |
| `HourStrip` | organism | 05:00–21:00 strip on the brand panel, verdict headline, legend, selected-hour detail with source. Grows in once on first show (disabled with `prefers-reduced-motion`). |
| `FieldTable` | organism | Field, crop, area, today's status, mini strip. A table, not cards. |
| `ApprovalCard` | organism | Brand-wash header "waiting for your confirmation", definition list of values, actions Save / Edit / Cancel; confirmed state replaces the actions. |
| `AnswerCard` | organism | Answer text, then sources (document, weather update time) and a confidence meter. |
| `AppShell` | template | Desktop: sidebar (Today, Fields, Approvals, Chat) + main + chat panel. Mobile: bottom tabs, chat full screen. |

## Copy
- Ukrainian first, English second (message dictionaries); short, specific, encouraging: "Good morning! One field has a good window today, 06:00–10:00."
- Errors say what happened and what to do, without apologies.
- Empty states say what will appear and how to add the first item.
- Avoid: "smart", "revolutionary", "AI-powered", arrows in buttons, emoji as decoration.

## What we avoid
Tracked-out all-caps eyebrows, meta lines joined with middle dots, identical rounded cards with the same soft shadow, gradient washes, a single green as the only "agri" signal without the ink and paper around it, decorative motion on every element.

## Reference
Style board with live examples in both themes: the "Ozymyna and Chernozem" page published from the design session (ask the developer for the link).
