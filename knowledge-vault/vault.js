#!/usr/bin/env node
// knowledge-vault helper. Zero dependencies. Commands: init <path> | locate | resolve [repo-path] [--repo <name>]
// See SKILL.md in this directory for how Claude uses it; .vault.json format per the skill docs.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const MARKER = '.vault.json';
const CACHE = path.join(os.homedir(), '.claude', 'vault-path');

function die(msg) { process.stderr.write(msg + '\n'); process.exit(1); }
function expandTilde(p) { return p.replace(/^~(?=\/|$)/, os.homedir()); }
// Canonicalize so prefix matching survives symlinked paths (macOS /var -> /private/var,
// symlinked repo checkouts). Fall back to resolve() for paths that don't exist yet.
function realpathIfExists(p) { try { return fs.realpathSync(p); } catch { return path.resolve(p); } }

function hasMarker(dir) {
  try { return fs.statSync(path.join(dir, MARKER)).isFile(); } catch { return false; }
}

// Walk up from start; at each level consider the dir itself and its immediate children.
// Nearest level wins; two markers at one level is an error (never a silent pick).
function searchMarker(start) {
  let dir = realpathIfExists(start);
  for (;;) {
    const hits = [];
    if (hasMarker(dir)) hits.push(dir);
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { /* unreadable */ }
    for (const e of entries) {
      if (e.isDirectory() && !e.name.startsWith('.') && hasMarker(path.join(dir, e.name))) {
        hits.push(path.join(dir, e.name));
      }
    }
    if (hits.length > 1) die('multiple vaults at the same level:\n  ' + hits.join('\n  '));
    if (hits.length === 1) return hits[0];
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function locate(start) {
  const found = searchMarker(start);
  if (found) {
    try { fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, found + '\n'); } catch { /* cache is best-effort */ }
    return found;
  }
  try {
    const cached = fs.readFileSync(CACHE, 'utf8').trim();
    if (cached && hasMarker(cached)) return cached;
    fs.rmSync(CACHE, { force: true });
  } catch { /* no cache */ }
  return null;
}

function cmdLocate() {
  const vault = locate(process.cwd());
  if (!vault) die('no vault found — run: vault.js init <path>');
  process.stdout.write(vault + '\n');
}

function nsDir(vault, name, ns) { return path.resolve(vault, ns.dir === undefined ? name : ns.dir); }

function loadConfig(vault) {
  let cfg;
  try { cfg = JSON.parse(fs.readFileSync(path.join(vault, MARKER), 'utf8')); }
  catch (e) { die(`cannot parse ${path.join(vault, MARKER)}: ${e.message}`); }
  if (cfg.kind !== 'claude-vault') die(`${MARKER} missing "kind": "claude-vault"`);
  const names = Object.keys(cfg.namespaces || {});
  if (names.length === 0) die('no namespaces configured in ' + MARKER);
  const seenDirs = new Map();
  for (const n of names) {
    const d = nsDir(vault, n, cfg.namespaces[n]);
    if (seenDirs.has(d)) die(`namespaces "${seenDirs.get(d)}" and "${n}" share dir ${d} — give each namespace its own dir`);
    seenDirs.set(d, n);
    for (const r of cfg.namespaces[n].related || []) {
      if (!cfg.namespaces[r]) die(`namespace "${n}" lists unknown related namespace "${r}"`);
    }
  }
  return cfg;
}

// Longest-prefix match; "**" is the only glob (catch-all, always least specific).
function matchNamespace(cfg, repoPath) {
  const rp = realpathIfExists(repoPath);
  let best = null, bestLen = -1, tieWith = null, catchall = null;
  for (const [name, ns] of Object.entries(cfg.namespaces)) {
    for (const r of ns.roots || []) {
      if (r === '**') { if (catchall === null) catchall = name; continue; }
      const root = realpathIfExists(expandTilde(r));
      if (rp === root || rp.startsWith(root + path.sep)) {
        if (root.length > bestLen) { best = name; bestLen = root.length; tieWith = null; }
        else if (root.length === bestLen && name !== best) tieWith = name;
      }
    }
  }
  if (tieWith) die(`ambiguous: namespaces "${best}" and "${tieWith}" both match ${rp} with equal-length roots`);
  if (best) return best;
  if (catchall) return catchall;
  die(`no namespace matches ${rp} — add a roots entry for ${rp} to ${MARKER}`);
}

function cmdResolve(args) {
  let repoName = null;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo') { repoName = args[++i] || die('--repo needs a value'); }
    else positional.push(args[i]);
  }
  const repoPath = path.resolve(positional[0] || process.cwd());
  const vault = locate(repoPath);
  if (!vault) die('no vault found — run: vault.js init <path>');
  const cfg = loadConfig(vault);
  const namespace = matchNamespace(cfg, repoPath);
  const withSep = (p) => p.endsWith(path.sep) ? p : p + path.sep;
  const cur = cfg.namespaces[namespace];
  const related = cur.related || [];
  const dirOf = (n) => withSep(nsDir(vault, n, cfg.namespaces[n]));
  const writeRoot = dirOf(namespace);
  const readRoots = [...new Set([writeRoot, ...related.map(dirOf)])];
  // excludeRoots: dirs of namespaces that are neither current nor related AND sit
  // strictly under some read root. Deepest-match rule: such a dir is a deeper match
  // than the read root above it, so its contents belong to the excluded namespace.
  const excludeRoots = Object.keys(cfg.namespaces)
    .filter((n) => n !== namespace && !related.includes(n))
    .map(dirOf)
    .filter((d) => readRoots.some((r) => d !== r && d.startsWith(r)))
    .sort();
  const repo = repoName || path.basename(repoPath);
  process.stdout.write(JSON.stringify({
    vault, namespace, repo,
    effortDirPattern: path.join(writeRoot, repo, '<effort>') + path.sep,
    writeRoot, readRoots, excludeRoots, related,
  }, null, 2) + '\n');
}

const VAULT_TEMPLATE = { kind: 'claude-vault', namespaces: { default: { roots: ['**'] } } };

const AUTOCOMMIT = `#!/usr/bin/env bash
# Auto-commit every change in this vault. Intended as a Claude Code PostToolUse hook.
cd "$(dirname "$0")/.." || exit 0
git add -A >/dev/null 2>&1
git diff --cached --quiet || git commit -qm "auto: vault update"
`;

const README_STUB = `# knowledge vault
Central store for planning artifacts (specs, plans, maps, handovers) across repos.
Layout: <namespace>/<repo>/<effort>/ — namespaces and repo->namespace mapping live in .vault.json.
Edit .vault.json to add namespaces, e.g.:
  "client-a": { "roots": ["~/freelance/client-a"], "related": ["work"] }
Managed by the knowledge-vault Claude Code skill (vault.js resolve).
`;

// Ancestors-only marker walk (target itself, then parents). init uses this instead of
// searchMarker: the per-level CHILD scan in searchMarker would find sibling vaults and
// wrongly refuse a legitimate init next to an existing vault.
function searchMarkerUp(start) {
  let dir = realpathIfExists(start);
  for (;;) {
    if (hasMarker(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function cmdInit(args) {
  const target = args[0];
  if (!target) die('usage: vault.js init <path>');
  const abs = path.resolve(target);
  const existing = searchMarkerUp(abs);
  if (existing) die(`a vault already exists at ${existing} (${path.join(existing, MARKER)})`);
  fs.mkdirSync(path.join(abs, '_tools'), { recursive: true });
  fs.writeFileSync(path.join(abs, MARKER), JSON.stringify(VAULT_TEMPLATE, null, 2) + '\n');
  fs.writeFileSync(path.join(abs, '_tools', 'autocommit.sh'), AUTOCOMMIT, { mode: 0o755 });
  fs.writeFileSync(path.join(abs, 'README.md'), README_STUB);
  try { execFileSync('git', ['init', '-q'], { cwd: abs }); } catch { process.stderr.write('warning: git init failed — vault is not version-controlled\n'); }
  try { fs.mkdirSync(path.dirname(CACHE), { recursive: true }); fs.writeFileSync(CACHE, abs + '\n'); } catch { /* best effort */ }
  process.stdout.write(`vault created at ${abs}\n\nTo auto-commit vault writes, add this hook to your Claude settings.json:\n` +
    JSON.stringify({ hooks: { PostToolUse: [{ matcher: 'Write|Edit|Bash', hooks: [{ type: 'command', command: path.join(abs, '_tools', 'autocommit.sh') }] }] } }, null, 2) + '\n');
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'locate') cmdLocate();
else if (cmd === 'resolve') cmdResolve(rest);
else if (cmd === 'init') cmdInit(rest);
else die('usage: vault.js init <path> | locate | resolve [repo-path] [--repo <name>]');
