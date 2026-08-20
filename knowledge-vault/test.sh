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

# --- resolve: namespace matching ---
fresh
t "resolve maps work repo"        0 '"namespace": "work"'      "$ROOT/work/repo-a" resolve
t "resolve maps client-a repo"    0 '"namespace": "client-a"'  "$ROOT/freelance/client-a/acme-api" resolve
t "resolve maps client-b repo"    0 '"namespace": "client-b"'  "$ROOT/freelance/client-b/beta-app" resolve
# unmatched repo: needs cache so locate works from outside the tree
( cd "$ROOT/work/repo-a" && HOME="$FAKEHOME" node "$VJS" locate >/dev/null )
t "resolve unmatched -> default"  0 '"namespace": "default"'   "$ROOT/elsewhere/stray-repo" resolve
# no default: remove it -> error
node -e "const f='$ROOT/work/vault/.vault.json',c=JSON.parse(require('fs').readFileSync(f)); delete c.namespaces.default; require('fs').writeFileSync(f, JSON.stringify(c))"
t "resolve unmatched no-default errors" 1 "add a roots entry" "$ROOT/elsewhere/stray-repo" resolve
# equal-length prefix tie -> error
fresh
node -e "const f='$ROOT/work/vault/.vault.json',c=JSON.parse(require('fs').readFileSync(f)); c.namespaces['work-dup']={roots:['$ROOT/work']}; require('fs').writeFileSync(f, JSON.stringify(c))"
t "resolve equal-prefix tie errors" 1 "ambiguous" "$ROOT/work/repo-a" resolve
# duplicate dir validation
fresh
node -e "const f='$ROOT/work/vault/.vault.json',c=JSON.parse(require('fs').readFileSync(f)); c.namespaces['work2']={dir:'.',roots:['$ROOT/nowhere']}; require('fs').writeFileSync(f, JSON.stringify(c))"
t "duplicate namespace dir errors" 1 "share dir" "$ROOT/work/repo-a" resolve
# two catch-alls -> error
fresh
node -e "const f='$ROOT/work/vault/.vault.json',c=JSON.parse(require('fs').readFileSync(f)); c.namespaces['default2']={roots:['**']}; require('fs').writeFileSync(f, JSON.stringify(c))"
t "two catch-all namespaces error" 1 "catch-all" "$ROOT/work/repo-a" resolve
# --repo path escape rejected
fresh
t "--repo path escape rejected" 1 "invalid --repo" "$ROOT/work/repo-a" resolve --repo ../client-b

# --- resolve: visibility (spec walkthrough cases) ---
fresh
# prime the locate cache: the vault is NOT an ancestor-level sibling of the freelance
# repos, so resolve from them depends on the cached pointer (same as real usage after
# one locate from anywhere near the vault).
( cd "$ROOT/work/repo-a" && HOME="$FAKEHOME" node "$VJS" locate >/dev/null )
# J: resolve, then strip spaces+newlines so exact JSON arrays match with a line-based grep -F
J() { ( cd "$1" && HOME="$FAKEHOME" node "$VJS" resolve "${@:2}" ) | tr -d ' \n'; }
chk() { # chk <name> <haystack> <fixed-needle>
  if echo "$2" | grep -qF "$3"; then PASS=$((PASS+1)); echo "ok   $1"
  else FAIL=$((FAIL+1)); echo "FAIL $1"; echo "     want: $3"; echo "     got:  $2"; fi
}
V="$ROOT/work/vault"
A="$(J "$ROOT/freelance/client-a/acme-api")"
chk "client-a writeRoot"          "$A" "\"writeRoot\":\"$V/client-a/\""
chk "client-a readRoots exact"    "$A" "\"readRoots\":[\"$V/client-a/\",\"$V/\"]"
chk "client-a excludeRoots exact" "$A" "\"excludeRoots\":[\"$V/client-b/\",\"$V/default/\"]"
B="$(J "$ROOT/freelance/client-b/beta-app")"
chk "client-b readRoots exact"    "$B" "\"readRoots\":[\"$V/client-b/\"]"
chk "client-b empty excludeRoots" "$B" "\"excludeRoots\":[]"
# regression (spec Testing #1): default keeps own dir readable despite dir:"." namespace
D="$(J "$ROOT/elsewhere/stray-repo")"
chk "default readRoots exact"     "$D" "\"readRoots\":[\"$V/default/\"]"
chk "default empty excludeRoots"  "$D" "\"excludeRoots\":[]"
W="$(J "$ROOT/work/repo-a" --repo myrepo)"
chk "--repo override"             "$W" "myrepo/<effort>/"

# --- init ---
# fresh tree WITHOUT the fixture vault: init must be tested against a clean slate
ROOT="$(cd "$(mktemp -d)" && pwd -P)"; FAKEHOME="$ROOT/home"; mkdir -p "$FAKEHOME/.claude" "$ROOT/somewhere"
t "init requires path"                 1 "usage"         "$ROOT/somewhere" init
t "init creates vault"                 0 "vault created" "$ROOT/somewhere" init "$ROOT/newvault"
[ -f "$ROOT/newvault/.vault.json" ]           && { PASS=$((PASS+1)); echo "ok   marker exists"; } || { FAIL=$((FAIL+1)); echo "FAIL marker"; }
[ -x "$ROOT/newvault/_tools/autocommit.sh" ]  && { PASS=$((PASS+1)); echo "ok   autocommit.sh executable"; } || { FAIL=$((FAIL+1)); echo "FAIL autocommit"; }
[ -d "$ROOT/newvault/.git" ]                  && { PASS=$((PASS+1)); echo "ok   git initialised"; } || { FAIL=$((FAIL+1)); echo "FAIL git"; }
t "init refuses existing vault"        1 "already"       "$ROOT/somewhere" init "$ROOT/newvault"
t "init refuses inside existing vault" 1 "already"       "$ROOT/somewhere" init "$ROOT/newvault/sub"
t "init sibling vault allowed"         0 "vault created" "$ROOT/somewhere" init "$ROOT/othervault"
t "init prints hook snippet"           0 "PostToolUse"   "$ROOT/somewhere" init "$ROOT/thirdvault"

echo; echo "$PASS passed, $FAIL failed"; [ "$FAIL" -eq 0 ]
