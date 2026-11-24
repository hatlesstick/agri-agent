export const ROOT_STATUS = { name: "agri-agent API", status: "ok", health: "/health/ready" } as const;

export function rootPage(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>agri-agent API</title>
<style>
:root { color-scheme: light dark; --bg: #f6f7f4; --fg: #1d2419; --muted: #5d6656; --card: #ffffff; --line: #d9ddd2; --ok: #2f7a3a; }
@media (prefers-color-scheme: dark) { :root { --bg: #161a14; --fg: #e8ece2; --muted: #9aa490; --card: #1f251c; --line: #323b2d; --ok: #7fd08d; } }
:root[data-theme="light"] { --bg: #f6f7f4; --fg: #1d2419; --muted: #5d6656; --card: #ffffff; --line: #d9ddd2; --ok: #2f7a3a; }
:root[data-theme="dark"] { --bg: #161a14; --fg: #e8ece2; --muted: #9aa490; --card: #1f251c; --line: #323b2d; --ok: #7fd08d; }
body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--bg); color: var(--fg); font: 16px/1.5 system-ui, sans-serif; padding: 16px; box-sizing: border-box; }
main { width: min(560px, 100%); background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 28px; }
h1 { margin: 0 0 4px; font-size: 22px; }
p.muted { margin: 0 0 20px; color: var(--muted); }
.row { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); }
.pill { font-weight: 600; color: var(--ok); }
a { color: inherit; }
nav { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
nav a { padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; text-decoration: none; min-height: 44px; display: inline-flex; align-items: center; }
</style>
</head>
<body>
<main>
<h1>agri-agent API</h1>
<p class="muted">Spraying conditions agent. Backend for the web chat.</p>
<div class="row"><span>API</span><span class="pill">running</span></div>
<div class="row"><span>Database</span><span id="db" class="muted">checking…</span></div>
<nav>
<a href="/health/live">Liveness</a>
<a href="/health/ready">Readiness</a>
</nav>
</main>
<script>
fetch("/health/ready").then((r) => r.json()).then((body) => {
  const cell = document.getElementById("db");
  cell.textContent = body.checks.database;
  cell.className = body.checks.database === "ok" ? "pill" : "muted";
}).catch(() => {
  document.getElementById("db").textContent = "unreachable";
});
</script>
</body>
</html>
`;
}
