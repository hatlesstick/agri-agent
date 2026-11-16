#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
pnpm db:check
log="$(mktemp)"
pnpm db:generate < /dev/null 2>&1 | tee "$log"
if grep -Eq "Error|TTY" "$log"; then
  echo "drizzle-kit could not generate migrations non-interactively (rename or ambiguous change?). Run pnpm db:generate locally and commit the result." >&2
  exit 1
fi
if [ -n "$(git status --porcelain drizzle)" ]; then
  echo "Schema changed without a committed migration:" >&2
  git status --porcelain drizzle >&2
  exit 1
fi
