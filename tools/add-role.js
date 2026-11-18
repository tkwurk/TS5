#!/usr/bin/env node
/**
 * add-role.js — one-off dev helper. Adds role="button" tabindex="0" to clickable
 * <div>/<span> (onclick) that aren't already a button role, so they are keyboard-
 * and screen-reader-accessible. Pair with the global keydown handler in
 * ui_core.html that maps Enter/Space to click.
 *
 * Usage: node add-role.js [--apply]   (default dry-run)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const SRC = path.resolve(__dirname, '..', 'apps-script-source');

function processFile(file) {
  const p = path.join(SRC, file);
  const src = fs.readFileSync(p, 'utf8');
  let count = 0;
  const out = src.replace(/<(div|span)\b(?![^>]*\brole\s*=)([^>]*\bonclick\s*=)/gi, function (full, tag, rest) {
    count++;
    return '<' + tag + ' role="button" tabindex="0"' + rest;
  });
  if (count && APPLY) fs.writeFileSync(p, out, 'utf8');
  return count;
}

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.html'));
let total = 0;
files.forEach(function (f) {
  const c = processFile(f);
  if (c) { total += c; console.log((APPLY ? 'FIXED ' : 'would fix ') + c + ' in ' + f); }
});
console.log((APPLY ? 'Applied ' : 'Dry-run: ') + total + ' role="button"(s).');
