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

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'locate') cmdLocate();
else die('usage: vault.js init <path> | locate | resolve [repo-path] [--repo <name>]');
