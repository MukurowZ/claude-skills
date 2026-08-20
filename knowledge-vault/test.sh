#!/usr/bin/env bash
# Fixture tests for knowledge-vault/vault.js. Zero deps beyond bash + node.
set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VJS="$HERE/vault.js"
PASS=0; FAIL=0

t() { # t <name> <expected-exit> <grep-pattern> <cwd> [args...]
  local name="$1" want_exit="$2" pattern="$3" cwd="$4"; shift 4
  local out exit_code
  out="$(cd "$cwd" && HOME="$FAKEHOME" node "$VJS" "$@" 2>&1)"; exit_code=$?
  if [ "$exit_code" -eq "$want_exit" ] && echo "$out" | grep -q "$pattern"; then
    PASS=$((PASS+1)); echo "ok   $name"
  else
    FAIL=$((FAIL+1)); echo "FAIL $name (exit=$exit_code want=$want_exit)"; echo "$out" | sed 's/^/     /'
  fi
}

fresh() { # rebuild fixture tree
  ROOT="$(cd "$(mktemp -d)" && pwd -P)"   # pwd -P: macOS mktemp returns /var/... which is a symlink to /private/var/...
  FAKEHOME="$ROOT/home"
  mkdir -p "$FAKEHOME/.claude"
  mkdir -p "$ROOT/work/repo-a" "$ROOT/freelance/client-a/acme-api" \
           "$ROOT/freelance/client-b/beta-app" "$ROOT/elsewhere/stray-repo" \
           "$ROOT/work/vault"
  cat > "$ROOT/work/vault/.vault.json" <<EOF
{
  "kind": "claude-vault",
  "namespaces": {
    "work":     { "dir": ".", "roots": ["$ROOT/work"] },
    "client-a": { "roots": ["$ROOT/freelance/client-a"], "related": ["work"] },
    "client-b": { "roots": ["$ROOT/freelance/client-b"] },
    "default":  { "roots": ["**"] }
  }
}
EOF
}

# --- locate ---
# ORDER MATTERS: the cache-miss case must run before any successful locate writes the cache.
fresh
t "locate cache-miss from unrelated repo fails"     1 "no vault found" "$ROOT/elsewhere/stray-repo" locate
t "locate finds sibling vault from work repo"       0 "$ROOT/work/vault" "$ROOT/work/repo-a" locate
# previous success wrote the cache pointer; unrelated repo now finds the vault through it
t "locate falls back to cached pointer"             0 "$ROOT/work/vault" "$ROOT/elsewhere/stray-repo" locate
# stale cache: delete vault, cache must be dropped
rm -rf "$ROOT/work/vault"
t "locate drops stale cache"                        1 "no vault found" "$ROOT/elsewhere/stray-repo" locate
# same-level tie
fresh
mkdir -p "$ROOT/work/vault2" && cp "$ROOT/work/vault/.vault.json" "$ROOT/work/vault2/.vault.json"
t "locate errors on same-level tie"                 1 "multiple vaults" "$ROOT/work/repo-a" locate

echo; echo "$PASS passed, $FAIL failed"; [ "$FAIL" -eq 0 ]
