#!/usr/bin/env node
// Install every skill in this package into ~/.claude/skills/ so Claude Code loads them.
//
// Two modes, picked automatically:
//   - symlink: running from a git checkout (stable path) — same behaviour as install.sh
//   - copy:    running via npm/npx (package lives in a cache that may be pruned,
//              so a symlink would dangle; copied dirs get a marker file so
//              re-running can safely refresh them)
//
// Collision-safe: never touches a skill managed elsewhere (a real dir without our
// marker, or a symlink pointing outside this package). Idempotent — safe to re-run.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(os.homedir(), '.claude', 'skills');
const MARKER = '.installed-by-claude-skills';
const SKIP_DIRS = new Set(['.git', 'node_modules', 'bin', '.claude']);

const parts = ROOT.split(path.sep);
const copyMode = parts.includes('node_modules') || parts.includes('_npx');

function findSkillDirs(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
      const sub = path.join(dir, entry.name);
      if (fs.existsSync(path.join(sub, 'SKILL.md'))) out.push(sub);
      else findSkillDirs(sub, out);
    }
  }
  return out;
}

function installOne(skillDir) {
  const name = path.basename(skillDir);
  const dest = path.join(DEST, name);
  let stat = null;
  try { stat = fs.lstatSync(dest); } catch { /* not there */ }

  if (stat) {
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(dest);
      const abs = path.resolve(path.dirname(dest), target);
      if (!abs.startsWith(ROOT + path.sep) && abs !== skillDir) {
        console.log(`skip   ${name} (managed elsewhere: ${target})`);
        return;
      }
      fs.rmSync(dest, { recursive: true, force: true });
    } else if (stat.isDirectory()) {
      if (fs.existsSync(path.join(dest, MARKER))) {
        fs.rmSync(dest, { recursive: true, force: true }); // our previous copy — refresh
      } else {
        console.log(`skip   ${name} (real dir already at ${dest})`);
        return;
      }
    } else {
      console.log(`skip   ${name} (file already at ${dest})`);
      return;
    }
  }

  if (copyMode) {
    fs.cpSync(skillDir, dest, { recursive: true });
    fs.writeFileSync(path.join(dest, MARKER), '@mukurowz/claude-skills\n');
    console.log(`copied ${name} -> ${dest}`);
  } else {
    fs.symlinkSync(skillDir, dest, 'dir');
    console.log(`linked ${name} -> ${skillDir}`);
  }
}

fs.mkdirSync(DEST, { recursive: true });
const skills = findSkillDirs(ROOT);
if (skills.length === 0) {
  console.error('no SKILL.md found — nothing to install');
  process.exit(1);
}
for (const dir of skills.sort()) installOne(dir);
console.log(`\n${skills.length} skill(s) processed (${copyMode ? 'copy' : 'symlink'} mode) into ${DEST}`);
