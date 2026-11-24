# Tech debt

Known gaps that are deliberately deferred. Each item says where it is planned to be paid off; "any" means it fits into whichever stage touches that code next. Remove an item in the PR that fixes it.

## Product and functionality
| Item | What the user notices | Planned |
|---|---|---|
| Chat history is not saved | A page reload loses the conversation | 2.5 (conversation memory) |
| Fields exist only in the database layer, no UI and no agent tools | "My wheat field" cannot be saved or referenced | 2.5 |
| Spray rules are generic: one threshold set, no crop, growth stage, product type (herbicide / fungicide / insecticide) or product-specific rainfast time | The same verdict for every crop and product | E1 / E4 (crop and product profiles) |
| Rules use mean wind speed only: no gusts, no Delta T rule, no inversion detection (both only explained from RAG documents) | Calm-morning inversions and gusty hours can be shown as "can spray" | 2.4b |
| RAG corpus is six English documents; no Ukrainian guidance, no product labels or state register | Ukrainian answers are translated from English sources; no dose checks (R5) | 2.4 (corpus) + E3 (labels) |
| Ukrainian inflected place names ("у Луцьку") are normalised only in the Telegram plan | Geocoding can miss a city typed in the web chat | 2.7, check for web in 2.3c |
| UI is English-only text; agent replies in the user's language | Ukrainian users see an English interface | 2.3c (UA / EN dictionaries) |
| Identity: anonymous only; no sign-in, no account linking, no `/forget` | No access from a second device; no way to delete one's data | 2.3b, 2.7, 2.5 |
| Every cookie-less `GET /session` or `POST /chat` creates a user and a session; expired sessions and users that never came back are never deleted | Storage grows with anonymous visitors (bounded by the rate limits: 10 per IP and 60 globally per minute); the database has no cleanup | 2.6 (scheduled cleanup job), 2.8 (hardening) |
| Signing in with an identity owned by another user switches users instead of merging | Anonymous work stays with the old user | After 2.3b, if users ask |
| Sign-in does not work on Vercel preview deployments | Previews are anonymous-only | Accepted |
| No per-user token budget; only IP rate limits and the global AI Gateway cap | One user can use up the daily budget for everyone | 2.5 (`usage_daily`) |
| Conversation summary for long chats deferred (only the last N turns are kept) | Very long chats forget early context | 2.5 or later |
| Hybrid search (full text + vector), `docs/reindex` job and reminders deferred | Lower recall on keyword questions; manual re-indexing | 2.4, 2.6, 2.7 |
| `POST /spray-check` has no session or user context | Structured checks cannot use saved fields | 2.5 |
| Default mock data and examples use Lyon while the target users are Ukrainian farms | Demos feel foreign to the audience | 2.3c (examples), evals keep Lyon |

## Production and infrastructure
| Item | Risk if left | Planned |
|---|---|---|
| Rollback drill through the Deploy workflow not yet run (needed two tags in GHCR) | Untested rollback path | 2.3 go-live |
| No memory / CPU limits, `no-new-privileges` or `cap_drop` on the `api` container | A runaway process can starve Postgres and Caddy | 2.8 |
| No ACME contact email in the Caddyfile | No expiry warnings from Let's Encrypt | 2.8 |
| `pgvector/pgvector:pg17` tag is not pinned to a digest | A silent image change on the next pull | 2.4 (DB image moves to pgvector + PostGIS anyway) |
| Stack files are uploaded by `scp` outside the deploy lock | A manual deploy racing a workflow upload can mix file versions | 2.8 |
| No off-site backups (only pre-deploy snapshots on the same disk) and no tested restore drill | Losing the VPS loses the data | 2.8 (nightly `pg_dump` to Cloudflare R2) |
| No uptime monitor or spend alerts | Outages noticed by users first | 2.8 |
| API runs on the OVH host name, no own domain | Moving to a domain changes cookie host and OAuth callbacks | When a domain is bought |
| `check-production.sh --stream` checks incremental delivery only, not Vercel vs direct time to first byte; the smoke test cannot prove `flush_interval` (Caddy flushes SSE on its own) | A future buffering proxy could slip through | any |
| `deploy` user is in the `docker` group (root-equivalent); key files are owned by `deploy` | A stolen deploy key is a host compromise | Step 5 (restricted deploy command via sudo) |

## API
| Item | Risk if left | Planned |
|---|---|---|
| Anonymous users and sessions are never cleaned up | Table growth from bots and one-off visitors | 2.6 (Inngest cron) |
| Open-Meteo fetch ignores the request abort signal (only the 8 s timeout) | Wasted upstream calls after a client disconnects | any (weather) |
| A client disconnect is logged as a timeout in spray-check | Misleading logs | any (spray-check) |
| Module-level `Logger` in `database/connection.ts` | Bypasses DI-configured logging | any (database) |
| Dead or duplicate exports: `FALLBACK_CHAT_MODEL`, `withoutClientToolData` re-export | Noise in the public module surface | any |
| `/forget` must scrub audit payloads and decide `usage_daily` retention | Personal data kept after deletion | 2.5 |
| JSON RAG index and home-made chunker | Two RAG paths to maintain | 2.4 |
| `area_ha` rounded to 2 decimals | Precision loss for small plots | E2 (PostGIS area) |

## Web, CI and tooling
| Item | Risk if left | Planned |
|---|---|---|
| Unstyled UI (Tailwind defaults, raw palette classes, no dark theme, inline strings) | Weak first impression; i18n retrofit grows | 2.3c |
| CI uploads `apps/web/.evals/results`, which web evals no longer write | Empty artifact | any (CI) |
| Unused `vite` dev dependency in `packages/shared` | Extra install time | any |
| No LICENSE file | Unclear terms for a public repo | Developer decision |
