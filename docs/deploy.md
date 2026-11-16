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
   The script is idempotent and is tested in CI on a clean Ubuntu 24.04 container (`infra/smoke/bootstrap-test.sh`). Docker publishes container ports past `ufw`; only Caddy publishes ports (80/443), so this matches the firewall.
3. A separate key for GitHub Actions (never your personal key):
   ```bash
   ssh-keygen -t ed25519 -N "" -C agri-deploy-ci -f ~/.ssh/agri-deploy-ci
   ssh deploy@<ip> 'cat >> ~/.ssh/authorized_keys' < ~/.ssh/agri-deploy-ci.pub
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

- Repository → Settings → Environments → `production`:
  - secrets `DEPLOY_HOST` (IP), `DEPLOY_USER` (`deploy`), `DEPLOY_SSH_KEY` (contents of `~/.ssh/agri-deploy-ci`), `DEPLOY_SSH_KNOWN_HOSTS` (the `ssh-keyscan` line);
  - variable `API_DOMAIN` (`api.<domain>`).
- After the first image push: GitHub → Packages → `agri-api` → Package settings → visibility **Public** (the server pulls without credentials; the image contains no secrets).

## 5. Vercel and spend limit

- Vercel project env: `API_ORIGIN=https://api.<domain>`, `PROXY_AUTH_SECRET` = the value in `api.env`. Redeploy the web app.
- Set a **hard spend limit** on the AI Gateway before the first deploy: the chat is public and anonymous from this point.

## Deploying

- Automatic: every green CI run on `main` triggers the **Deploy** workflow (build → push → `deploy.sh sha-<7>` → public readiness check). Deploys are serialized.
- `deploy.sh <tag>`: refuses an unknown tag before touching anything → snapshot (`pg_dump -Fc`) → one-off migration container from the new image (a failed migration leaves the running API untouched) → `up -d` → readiness check through the container → on success records the tag; on failure starts the previous tag again and exits non-zero.

## Rollback

- GitHub → Actions → **Deploy** → *Run workflow* → `tag` = the previous tag (`cat /opt/agri-agent/state/previous-tag` on the server, or any `sha-<7>` from GHCR).
- Or on the server: `/opt/agri-agent/deploy.sh "$(cat /opt/agri-agent/state/previous-tag)"`.
- Migrations are forward-only; a rollback runs the old image against the new schema, which expand/contract migrations keep compatible. To undo data changes, restore the pre-deploy snapshot:
  ```bash
  docker compose -f docker-compose.prod.yml exec -T db sh -c 'pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < backups/pre-deploy-<timestamp>-<tag>.dump
  ```

## Checking production

```bash
infra/check-production.sh --api https://<api-host>                               # no model calls
infra/check-production.sh --api https://<api-host> --web https://<app>.vercel.app # + rewrite and proxy.ts (empty chat → 400, still no model call)
infra/check-production.sh --api https://<api-host> --web https://<app>.vercel.app --stream   # + one real streamed answer
```

It checks readiness, TLS (≥ 14 days left), HTTP→HTTPS, 403 on browser routes without a valid `X-Proxy-Auth`, security headers, closed 4000/5432/6379, and, with `--web`, that the Vercel rewrite and `proxy.ts` reach the API. The smoke test runs it against the local stack.

## Troubleshooting

- Status and logs: `docker compose -f docker-compose.prod.yml ps`, `… logs --tail 100 api`, `… logs caddy` (access logs drop `X-Proxy-Auth`, cookies and client IPs).
- Readiness: `curl -fsS https://api.<domain>/health/ready` (`database: "down"` → check `db`).
- Stale deploy lock after a killed run: `rm -rf /opt/agri-agent/state/deploy.lock`.
- Local rehearsal of the whole stack: `infra/smoke/run.sh`, `infra/smoke/deploy-test.sh`.
