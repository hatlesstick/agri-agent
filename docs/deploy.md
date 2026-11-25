# Deploying the API

Production runs on one VPS: `caddy` (HTTPS, the only published ports 80/443) → `api` (NestJS image from GHCR) → `db` (`pgvector/pgvector:pg17`, no published port). The web app stays on Vercel and reaches the API through its `/api/*` rewrite.

```
GitHub Actions (CI green on main)
  └─ Deploy workflow: build image → ghcr.io/<owner>/agri-api:sha-<7> → scp stack files → ssh deploy.sh sha-<7>
VPS /opt/agri-agent
  docker-compose.prod.yml  Caddyfile  deploy.sh   (uploaded on every deploy)
  .env                     Compose variables (POSTGRES_*, API_IMAGE, API_TAG, API_SITE_ADDRESS)
  api.env                  API environment (secrets)
  state/previous-tag       tag to roll back to
  backups/                 pre-deploy pg_dump snapshots (last 10, mode 600)
```

## 1. Server

Any Ubuntu 24.04 VPS with ≥ 2 GB RAM works. Current server: OVHcloud VPS-1 (2 vCore, 4 GB, 40 GB NVMe), Beauharnois.

1. Create the VPS with Ubuntu 24.04 and your **public** SSH key (on OVH: VPS → OS/Distribution → *Reinstall my VPS* → paste the key). Check: `ssh ubuntu@<ip> 'hostname'` works without a password.
2. Bootstrap it once (Docker, user `deploy` with the same key and no sudo, keys-only SSH without root, `ufw` 22/80/443, unattended security upgrades, `/opt/agri-agent`):
   ```bash
   ssh ubuntu@<ip> 'sudo bash -s' < infra/bootstrap.sh
   ssh deploy@<ip> 'docker version --format "{{.Server.Version}}"'
   ```
   `~deploy/.ssh/authorized_keys` is managed: every run copies `ubuntu`'s keys over it, so removing a key from `ubuntu` and re-running revokes it for `deploy` too. CI keys live in `~deploy/.ssh/authorized_keys_ci`, which the script never touches (sshd reads both files). The script is idempotent and is tested in CI on a clean Ubuntu 24.04 container (`infra/smoke/bootstrap-test.sh`). Docker publishes container ports past `ufw`; only Caddy publishes ports (80/443), so this matches the firewall.
3. A separate key for GitHub Actions (never your personal key):
   ```bash
   ssh-keygen -t ed25519 -N "" -C agri-deploy-ci -f ~/.ssh/agri-deploy-ci
   ssh deploy@<ip> 'cat >> ~/.ssh/authorized_keys_ci' < ~/.ssh/agri-deploy-ci.pub
   ssh-keyscan -t ed25519 <ip>          # value for DEPLOY_SSH_KNOWN_HOSTS
   ```

## 2. DNS

Create an `A` record `api.<domain>` → server IPv4 (and `AAAA` → IPv6). If DNS is on Cloudflare, keep the record **DNS only** (grey cloud): Caddy terminates TLS itself and a proxy in front could buffer the chat stream.

## 3. Server configuration

On the server as `deploy`, create the two env files from the examples (values never go to git):

```bash
cd /opt/agri-agent
nano .env       # from infra/server.env.example
nano api.env    # from infra/api.env.example
chmod 600 .env api.env
```

- `.env`: `API_IMAGE=ghcr.io/<owner>/agri-api`, `API_TAG=` (left empty; `deploy.sh` writes it), `API_SITE_ADDRESS=api.<domain>`, `POSTGRES_USER`, `POSTGRES_PASSWORD` (URL-safe, e.g. `openssl rand -hex 24`), `POSTGRES_DB`.
- `api.env`: `PROXY_AUTH_SECRET` (`openssl rand -hex 32`, the same value goes to Vercel), `AI_GATEWAY_API_KEY`, `OPEN_METEO_GEOCODING_URL`, `OPEN_METEO_FORECAST_URL`, optional Langfuse keys and rate limits. `NODE_ENV`, `PORT`, `TRUSTED_PROXY_HOPS=1` and `DATABASE_URL` are set by Compose.

## 4. GitHub

- Repository → Settings → Environments → `production` → **Deployment branches and tags: Selected → `main`** (the workflow also refuses manual runs from other refs). The `deploy` user is in the `docker` group, which is root-equivalent on the host: a leaked CI key or a deploy from an unreviewed branch means a host compromise.
- Same environment:
  - secrets `DEPLOY_HOST` (IP), `DEPLOY_USER` (`deploy`), `DEPLOY_SSH_KEY` (contents of `~/.ssh/agri-deploy-ci`), `DEPLOY_SSH_KNOWN_HOSTS` (the `ssh-keyscan` line);
  - variable `API_DOMAIN` (`api.<domain>`).
- After the first image push: GitHub → Packages → `agri-api` → Package settings → visibility **Public** (the server pulls without credentials; the image contains no secrets).

## 5. Vercel and spend limit

- Vercel project env: `API_ORIGIN=https://api.<domain>`, `PROXY_AUTH_SECRET` = the value in `api.env`. Redeploy the web app.
- Set a **hard spend limit** on the AI Gateway before the first deploy: the chat is public and anonymous from this point.

## Deploying

- Automatic: every green CI run on `main` triggers the **Deploy** workflow (build → push → `deploy.sh sha-<7>` → public readiness check). Deploys are serialized.
- Deploys and manual rollbacks share one concurrency slot; GitHub keeps only one queued run, so a queued rollback can be replaced by a newer automatic deploy (and vice versa) — re-run it after the running one finishes.
- The full log of the last run is `/opt/agri-agent/state/deploy.log`; the script ignores a dropped SSH session (it keeps going and still rolls back), so check that log when the workflow lost its connection.
- `deploy.sh <tag>`: refuses an unknown tag or an invalid changed `Caddyfile` before touching anything → snapshot (`pg_dump -Fc`) → one-off migration container from the new image (a failed migration leaves the running API untouched) → `up -d` → readiness check through the container → on success records the tag; on failure starts the previous tag again and exits non-zero.

## Document index (RAG)

The corpus in `apps/api/data/docs` lives in the `doc_chunks` table in the database. Deploys do not write it; run this by hand, once, and again only when the documents change.

Order for the first production index (the search code reads from the table, so an empty table answers without sources until the index exists):

1. Check what would change, using the image the server already runs:
   `docker compose -f docker-compose.prod.yml run --rm api node dist/scripts/index-docs.js --check`
   (if the built image does not ship the script yet, skip to step 2 with the new tag from step 2 of the deploy)
2. Index: `docker compose -f docker-compose.prod.yml run --rm api node dist/scripts/index-docs.js`
   Expect `added` 19 and `rejected` empty on the first run; a second run must report `added` 0.
3. Check a real question with `infra/check-production.sh` plus one streamed answer that cites a source.

Ingest calls the embeddings gateway, which allows 5 requests per minute. Each document is one request, so the six corpus files fit; a larger corpus needs pauses in the script first.

## Rollback

- GitHub → Actions → **Deploy** → *Run workflow* → `tag` = the previous tag (`cat /opt/agri-agent/state/previous-tag` on the server, or any `sha-<7>` from GHCR).
- Or on the server: `/opt/agri-agent/deploy.sh "$(cat /opt/agri-agent/state/previous-tag)"`.
- Migrations are forward-only; a rollback runs the old image against the new schema, which expand/contract migrations keep compatible. To undo data changes, restore the pre-deploy snapshot:
  ```bash
  docker compose -f docker-compose.prod.yml stop api
  docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/pre-deploy-<timestamp>-<tag>.dump
  docker compose -f docker-compose.prod.yml start api
  ```

## Sessions

- Browsers get a host-only `__Host-agri_session` cookie through the Vercel rewrite; the session row lives in the `sessions` table (`token_hash` only, 400-day sliding expiry).
- A database restore from a snapshot rolls sessions back too: browsers holding a cookie for a session created after the snapshot get a new anonymous user on their next visit. Nothing fails; their chat history from that window is gone with the rolled-back rows.
- The migration that adds `sessions` is additive, so the previous image keeps working against the new schema (rollback drill in Stage 2.3).

## Sign-in (GitHub and Google)

- Providers are enabled per deployment: a provider appears in `GET /auth/providers` only when both its keys and `PUBLIC_APP_ORIGIN` are set. Its routes answer 404 otherwise.
- Keys in `/opt/agri-agent/api.env`: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `PUBLIC_APP_ORIGIN=https://agri-agent-m.vercel.app`. Never commit them.
- Callback URLs to register with the providers: `https://agri-agent-m.vercel.app/api/auth/github/callback` (GitHub OAuth App) and `https://agri-agent-m.vercel.app/api/auth/google/callback` (Google OAuth client, type Web application). Use separate OAuth apps for local development on `http://localhost:3000/api/auth/<provider>/callback`.
- Google's consent screen is in "External, testing" until it is published; add the developer's accounts as test users.
- Sign-in keeps the anonymous history: the first sign-in attaches the provider to the current anonymous user. A provider account already linked to another user switches the session to that user and leaves the anonymous user's data alone.

## Swagger

Production serves Swagger UI at `/docs` and `/openapi.json` because `api.env` sets `SWAGGER_ENABLED=1` (developer decision: the same contract is already public in `apps/api/openapi.json`; browser routes still answer 403 without `X-Proxy-Auth`). Remove the line and redeploy to hide it.

## Checking production

```bash
infra/check-production.sh --api https://<api-host>                               # no model calls
infra/check-production.sh --api https://<api-host> --web https://<app>.vercel.app # + rewrite and proxy.ts (empty chat → 400, still no model call)
infra/check-production.sh --api https://<api-host> --web https://<app>.vercel.app --stream   # + one real streamed answer
```

It checks readiness, TLS (≥ 14 days left), HTTP→HTTPS, 403 on browser routes without a valid `X-Proxy-Auth` (including `/session`), security headers, closed 4000/5432/6379, and, with `--web`, that the Vercel rewrite and `proxy.ts` reach the API and that `/api/session` sets the host-only cookie and keeps the same user across two calls (this proves Vercel forwards `Set-Cookie`). The smoke test runs it against the local stack.

## Troubleshooting

- Compose commands need `API_TAG`, which `deploy.sh` writes into `.env` on the first successful deploy.
- Status and logs: `docker compose -f docker-compose.prod.yml ps`, `… logs --tail 100 api`, `… logs caddy` (access logs drop `X-Proxy-Auth`, cookies and client IPs).
- Readiness: `curl -fsS https://api.<domain>/health/ready` (`database: "down"` → check `db`).
- Stale deploy lock after a killed run: `rm -rf /opt/agri-agent/state/deploy.lock`.
- Local rehearsal of the whole stack: `infra/smoke/run.sh`, `infra/smoke/deploy-test.sh`.
