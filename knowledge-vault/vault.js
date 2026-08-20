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

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'locate') cmdLocate();
else if (cmd === 'resolve') cmdResolve(rest);
else die('usage: vault.js init <path> | locate | resolve [repo-path] [--repo <name>]');
