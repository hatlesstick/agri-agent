# agri-agent — extension backlog E1–E7 (business requirements)

> As of 2026-11-16. Built after the core; see docs/product-scope.md. Each extension gets its own stage plan when it is scheduled. Triage against the current plan: see "Status against the current plan" at the end.

## Product goal
Turn agri-agent from a "chat about weather and spraying" into an **agronomist's assistant**: field map, work log, irrigation, agro models, satellite, farm team, proactive advice.

**Target users**
- **Farmer / owner** (small and medium farms, 50–2,000 ha): wants a short answer to "what to do today on which field" and wants to see the history of work.
- **Agronomist**: manages several fields or farms, reviews and confirms recommendations, is responsible for products and doses.
- **Worker / machine operator**: receives a task, marks it done from the phone, often with no internet in the field.

## Cross-cutting rules (for all extensions)
| # | Rule |
|---|---|
| R1 | **Code decides, model explains**: numeric decisions (windows, irrigation mm, GDD, risks, pre-harvest intervals (PHI)) are computed by deterministic code; the model only explains and phrases. |
| R2 | **No write without human confirmation**: any data change goes in as a proposal (`propose*` → `pending_actions` → approve / edit / reject) and lands in `audit_log`. |
| R3 | **Sources and confidence** in every piece of advice: where the data comes from (Open-Meteo, Sentinel-2, RAG document), update time, confidence level. On low confidence — "check with an agronomist" and into the review queue. |
| R4 | **Data per user / farm**: every query is scoped by `farm_id` / `user_id`, no leaks between farms. |
| R5 | **Product safety**: the agent does not invent products or doses; doses come only from the label / RAG source or are entered by a human; pre-harvest intervals (PHI) are respected. |
| R6 | **Cost**: every feature has a per-user daily model-call limit; expensive models only where evals show a gain. |
| R7 | **Evals before release**: every extension adds its own eval set (deterministic + LLM-judge) and passes CI. |
| R8 | UI and response languages: UA (primary), EN. |

---

## E1. Irrigation and temperature risks
**When:** together with step 4 (Inngest). **Estimate:** ~1 week. **Dependencies:** fields with coordinates (step 2), Inngest (2.6 / step 4).

**Problem.** The farmer irrigates by eye: sometimes over-irrigation (money spent on water and energy), sometimes under-irrigation in the heat. Frosts and heat hit the yield, and warnings arrive too late.

**User stories**
- As a farmer, I want to know **whether to irrigate the field today and how many mm**, so that I do not over-irrigate or let it dry out.
- As a farmer, I want to receive a **frost alert** 24–48 h ahead, so that I have time to protect the crop.
- As a farmer, I want to receive a **heat / heat stress alert** during the crop's critical phase.

**Functional requirements**
- Field water balance: ET0 (FAO-56 from Open-Meteo) × crop and phase Kc − effective precipitation − irrigation = deficit; result: "irrigate X mm / do not irrigate / in N days".
- Field settings: crop, soil type (available moisture reserve), irrigation type (yes / no, drip / sprinkler), sowing date.
- Alert thresholds (frost ≤ 0 °C / −2 °C, heat ≥ 32 °C, etc.) — defaults per crop + custom settings.
- Quiet hours and digest time; one alert per event (no spam).
- "Irrigation done, X mm" mark — through confirmation (R2), lands in the log (E3).

**Business rules**
- If the field has no irrigation, the recommendation is replaced with "drought risk: …".
- Precipitation forecast ≥ deficit in the next 48 h → "wait".
- Frost alert for phases in which the crop is vulnerable (per the crop → phases table).

**Acceptance criteria**
- On 20 reference scenarios (manual FAO-56 calculation), deficit error ≤ 10 %.
- Alerts: no duplicates for one event, deduplication verified by a test.
- The agent explains the recommendation with numbers (ET0, precipitation, deficit) and the source.

**Out of scope:** irrigation system control (starting pumps), soil moisture sensors (that is E7).
**Metrics:** share of "irrigate" recommendations confirmed by the farmer; number of alerts per field per week; 👍/👎.

---

## E2. Field map and dashboard
**When:** after step 2. **Estimate:** ~1.5 weeks. **Dependencies:** Postgres (step 2).

**Problem.** Right now a field is a name + a point. The farmer thinks in terms of a map: "that field behind the shelterbelt". There is no single screen for "what is going on today across all fields".

**User stories**
- As a farmer, I want to **draw the field boundary on a map** (or import it), so that the system knows the area and center.
- As a farmer, I want to see **all fields with a colored status for today** (can spray / cannot / risk).
- As a farmer, I want to open a **field card**: today + 7 days (spraying windows, irrigation, risks), work history.

**Functional requirements**
- Polygon drawing / editing (MapLibre + OSM), GeoJSON / KML import; automatic area (ha) and centroid (PostGIS).
- Validation: the polygon is valid, the area is within reasonable limits, a warning about intersection with other fields.
- Map with field statuses; filter by crop.
- Field card: 7-day timeline (spraying / irrigation / risks), weather charts, latest log entries.
- Creating / changing / deleting a field — only through confirmation (R2), including from chat ("add a wheat field 40 ha here").

**Business rules**
- Weather and calculations for a field are taken at the centroid (for large fields > 300 ha — at several points, in a later version).
- A field belongs to a farm; only farm members can see it (R4, roles in E6).

**Acceptance criteria**
- Area from PostGIS matches the reference (± 1 %).
- A dashboard with 20 fields opens in < 2 s (p95).
- The agent understands "my field near …" / a field name and picks the right field (evals).

**Out of scope:** cadastral data, exchange with the public cadastral map (maybe later).
**Metrics:** share of fields with a polygon; daily dashboard opens.

---

## E3. Work log and voice
**When:** after step 2. **Estimate:** ~1 week. **Dependencies:** `pending_actions`, Telegram (2.7).

**Problem.** The work log is kept in a notebook or not kept at all. It is needed for control, reporting and safety (pre-harvest intervals), but nobody wants to fill in forms in the field.

**User stories**
- As a machine operator, I want to **dictate a voice message in Telegram** ("sprayed the field by the pond, product X, 1 l/ha, this morning"), so that the entry appears without forms.
- As an agronomist, I want to **review and confirm** the structured entry before it is saved.
- As a farmer, I want to see a **pre-harvest interval (PHI) warning** before harvest.
- As a farmer, I want to **export the season log** to CSV / PDF.

**Functional requirements**
- Voice → transcription (AI SDK transcription) → structured output: field, work type, product / fertilizer, dose, area, date / time, performer.
- Ambiguities ("which field?") — ask for clarification, do not guess.
- The entry is created as a proposal with a confirmation card (approve / edit / reject) in web and Telegram.
- Check: dose within label limits (if the product is in the reference / RAG); PHI → the date from which harvest is allowed.
- Log filters (field, type, period), CSV export and a season PDF report.

**Business rules**
- A log entry without confirmation is impossible (R2); editing after confirmation creates a new version with an audit trail, no silent changes.
- Dose outside label limits → saving is blocked until the agronomist explicitly confirms with a comment.

**Acceptance criteria**
- On 30 recorded voice messages (UA, with noise), ≥ 90 % of fields are extracted correctly (evals).
- No entry appears without approve (eval + integration test).
- A season PDF report is generated for a field with 50+ entries.

**Out of scope:** official government reporting, product warehouse accounting.
**Metrics:** entries per week, share via voice, share edited before approve.

---

## E4. Agro models and planner
**When:** after step 3 (multi-agent). **Estimate:** ~1.5 weeks. **Dependencies:** E1 (per-field weather), E3 (work history), RAG.

**Problem.** The farmer reacts to diseases and pests too late. The week's work is planned in the head, without accounting for the weather across all fields at once.

**User stories**
- As an agronomist, I want to see the **crop development phase** on each field (by sum of active temperatures).
- As an agronomist, I want to receive a **disease / pest risk** (e.g. potato late blight, wheat septoria) with an explanation and a source.
- As a farmer, I want a **weekly work plan across fields** that I confirm or edit.

**Functional requirements**
- GDD (sum of effective temperatures, per-crop base) → phase estimate (BBCH groups).
- Rule-based disease risk models (temperature + humidity + leaf wetness duration), with a source reference (RAG).
- Planner agent in the multi-agent graph: collects spraying windows, irrigation, risks, phases → proposes a 7-day plan with priorities.
- The plan is a proposal: approve / edit / reject per item; confirmed items become tasks (E6) or reminders.

**Business rules**
- Risk is a "probability / level", not a diagnosis; the agent recommends a field inspection, not immediate treatment.
- Products in the plan — only from the reference / RAG (R5).

**Acceptance criteria**
- GDD and phase match the manual calculation on 10 reference fields.
- Risk model: on historical data (weather + known outbreaks) — accuracy documented in `docs/`.
- Plan: evals on 15 scenarios (no "spray in the rain" conflicts, PHI respected).

**Out of scope:** yield forecast, economics (cost price).
**Metrics:** share of confirmed plan items; risks followed by an inspection.

---

## E5. Satellite monitoring (NDVI)
**When:** after E2. **Estimate:** ~1.5 weeks. **Dependencies:** field polygons (E2), Inngest.

**Problem.** Large fields are physically hard to walk; problems (lodging, disease, flooding) are noticed too late.

**User stories**
- As a farmer, I want to see **my field's NDVI** on the map and its dynamics over the season.
- As an agronomist, I want to receive an **alert when NDVI drops sharply in part of the field**, so that I can go and look exactly there.

**Functional requirements**
- Sentinel-2 L2A via Copernicus Data Space: NDVI over the field polygon, cloud mask; new images via a background Inngest job.
- NDVI layer on the E2 map, chart of mean NDVI over the season, comparison with the previous image.
- Drop zone detection (zone ≥ N % of the field, drop ≥ threshold) → alert with a mini-map and an inspection point.

**Business rules**
- An image with cloud cover over the field > threshold is not used; the user sees "no clear image since …".
- An alert is a reason for inspection, not a diagnosis; the agent can suggest photo diagnosis (step 5).

**Acceptance criteria**
- NDVI matches the reference (EO Browser) for 5 fields within ± 0.05.
- Cloudy images are filtered out; alert deduplication test.

**Out of scope:** paid high-resolution imagery, variable-rate application maps.
**Metrics:** NDVI alerts → problems confirmed after inspection.

---

## E6. Farm as a team + mobile
**When:** after step 5. **Estimate:** ~2 weeks. **Dependencies:** auth (step 5), E3, E4.

**Problem.** A farm has several people, but the system is so far for one user. The network is poor in the field, yet the log and photos are needed exactly there.

**User stories**
- As an owner, I want to **invite an agronomist and workers** with different permissions.
- As an agronomist, I want a **review queue**: all agent proposals and worker entries waiting for my decision.
- As a worker, I want to see **my tasks for today** and mark them done from the phone even **without internet**.
- As a farmer, I want to **walk the field boundary with GPS** on the phone to create a polygon.

**Functional requirements**
- Roles: owner (everything + billing), agronomist (fields, plans, confirmations), worker (own tasks, log entries pending confirmation), read-only.
- RBAC in NestJS, role checks both in agent tools and in MCP.
- Tasks: from the E4 plan or manual; assignment, status, Telegram reminders.
- Telegram Mini App: map, log, tasks.
- RN app (Expo): push, offline log with sync, photos for diagnosis, GPS field walk → polygon (E2).

**Business rules**
- A worker cannot confirm their own entries involving products — only the agronomist / owner can.
- Offline entries go through the same validation and approve on sync; conflicts are resolved explicitly, no silent overwrite.

**Acceptance criteria**
- RBAC tests: every role × every action (allow / deny), including via the agent and MCP.
- Offline: 20 entries without network → sync with no losses and no duplicates.

**Out of scope:** payroll, machinery and fuel accounting.
**Metrics:** active members per farm, time from entry to confirmation.

---

## E7. Sensors and integrations (optional)
**When:** on demand. **Dependencies:** E1, Inngest, MCP.

**Problem.** Modeled weather and ET0 are approximations; farms with their own stations have more accurate data. Prices and export to other systems are also useful.

**User stories**
- As a farmer with a weather station, I want to **connect my station / soil moisture sensor**, so that E1 calculations are more accurate.
- As a farmer, I want to see **grain prices** next to the sales plan.
- As an agronomist, I want to **export data** (fields, log) to other systems.

**Functional requirements**
- Webhook receiver with a per-device key; metric normalization; sensor data takes priority over the model, with the source marked.
- Detection of "sensor silent / odd values" → alert.
- Grain prices from open sources (daily job).
- Export: GeoJSON, CSV, MCP resources for external AI clients.

**Acceptance criteria:** E1 switches to sensor data and back without losing history; invalid payloads are rejected.

---

## Agent improvements (cross-cutting)
- **User memory:** machinery, favorite products, usual doses, preferred form of address — with confirmation before saving.
- **Proactivity:** the agent suggests (digest at 6:00, "good window today on field X"), the human confirms.
- **Confidence and sources** in every response (R3).
- **Cost-based model routing:** simple queries — a cheap model, complex ones — a stronger model, based on evals.
- **UA / EN** (R8).
- **Feedback:** 👍/👎 → Langfuse → new eval cases.

## Client UI (summary)
- **Web:** field map with colored status; field card (today + 7 days); chat panel with tool-call cards and sources; confirmation inbox; work log; charts (weather, ET0, GDD, NDVI); threshold and notification time settings.
- **Telegram:** daily digest at 6:00, inline approve / reject buttons, location, voice, Mini App for map and log.
- **RN app (E6):** push, offline log, photos for diagnosis, GPS field walk.

## Order and priority
| Priority | Extension | Why |
|---|---|---|
| 1 | E2 map + E3 log | data foundation for everything else; an immediately visible product |
| 2 | E1 irrigation and risks | the simplest "daily" value, overlaps with step 4 |
| 3 | E4 agro models and planner | shows multi-agent on a real task |
| 4 | E5 NDVI | a "wow" feature for demo and CV |
| 5 | E6 team + mobile | your strong side (RN), but needs auth from step 5 |
| 6 | E7 sensors | only if there are real users with stations |

## Definition of done for each extension
- Business rules covered by unit tests, R1–R8 respected.
- Own eval set in CI (mock) + a manual run on a real model.
- Traces in Langfuse tagged with the extension; cost per user is visible.
- README: what the feature does, screenshot / GIF, decisions (ADR, if there was a choice).
- Short report `docs/reports/E*.md`: what was done, deviations, open questions.

---

## Status against the current plan
Triage as of 2026-11-16. Scope rule (docs/product-scope.md): backlog items are built after the core; the core only keeps them possible.

**Decide during Step 2 (cheap now, a migration later)**
| Item | Backlog source | Proposal |
|---|---|---|
| Farm as the owner of data | R4, E6 | Not built in the core; repositories keep user scoping in one place so a farm scope can be added later. |
| Real accounts | E6 | Anonymous session (2.3) plus optional GitHub / Google sign-in (2.3b) that upgrades the anonymous user; roles and invites in Step 5. |
| PostGIS | E2 | DB image with pgvector and PostGIS available (Stage 2.4); the extension is enabled only when E2 starts. |
| UA / EN UI | R8 | Message dictionaries introduced together with the UI foundation stage. |
| Sources, freshness, confidence | R3 | Part of the answer-card design in the UI foundation stage. |
| App shell, not only chat | E2, E3, UI summary | UI foundation stage before 2.5: design tokens, light / dark themes, navigation shell, restyled chat. |
| Per-user daily limits | R6 | `usage_daily` in 2.5; lower limits for anonymous users (a cleared cookie resets their identity). |

**Already covered by Step 2:** R1 and R2 (2.5 propose → approve → execute, audit log), Telegram approvals (2.7), feedback to Langfuse (2.10).

**After Step 2, not critical:** E1 irrigation (needs Inngest, Step 4), E3 voice and PDF export, cost-based model routing.

**Future:** E4 (after Step 3), E5 NDVI, E6 team and mobile (after Step 5 auth), E7 sensors, offline sync.

**Gaps to close before real users**
- R5 needs a product / label data source (e.g. the Ukrainian state pesticide register) and a check of its terms of use.
- Legal: advice disclaimer, privacy notice and consent, terms of use.
- Product analytics for the metrics above (no tool chosen yet).
- User time zone for the 06:00 digest and quiet hours.
- Business model (per hectare or per farm) recorded, even if not built.
