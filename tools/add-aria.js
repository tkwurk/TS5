#!/usr/bin/env node
/**
 * add-aria.js — one-off dev helper to add aria-label to icon-only <button>s that
 * lack an accessible name. Label is derived from the onclick handler name (the
 * devs named them descriptively), falling back to the button class or the icon.
 *
 * Usage: node add-aria.js [--apply]   (default is dry-run)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const SRC = path.resolve(__dirname, '..', 'apps-script-source');

const ICON_LABEL = { '\u2715': 'Close', '\u2716': 'Close', '\u00d7': 'Close', 'x': 'Close',
  '+': 'Increase', '\u2013': 'Decrease', '\u2212': 'Decrease', '-': 'Decrease',
  '\u26a1': 'Smart picks', '\ud83d\uddd1': 'Delete', '\u270f': 'Edit' };

function humanize(name) {
  if (!name) return '';
  var s = String(name)
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function labelFor(attrs, inner) {
  var m = attrs.match(/on(?:click|change|mousedown)\s*=\s*["']?\s*(?:window\.)?([A-Za-z_$][\w$]*)\s*\(/);
  if (m) return humanize(m[1]);
  var cm = attrs.match(/class\s*=\s*"([^"]*?)([A-Za-z]+)-btn\b/);
  if (cm) return humanize(cm[2]);
  var icon = inner.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
  if (ICON_LABEL[icon]) return ICON_LABEL[icon];
  return '';
}

function processFile(file) {
  var p = path.join(SRC, file);
  var src = fs.readFileSync(p, 'utf8');
  var changes = [];
  var out = src.replace(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi, function (full, attrs, inner) {
    if (/\baria-label\s*=/i.test(attrs) || /\btitle\s*=/i.test(attrs)) return full;
    var text = inner.replace(/<[^>]*>/g, '').replace(/\s+/g, '');
    var onlyIcon = text.length > 0 && text.length <= 3 && !/[a-z0-9]/i.test(text);
    if (!onlyIcon) return full;
    var label = labelFor(attrs, inner);
    if (!label) return full;
    changes.push(label);
    return '<button aria-label="' + label + '"' + (attrs.startsWith(' ') ? '' : ' ') + attrs + '>' + inner + '</button>';
  });
  if (changes.length && APPLY) {
    fs.writeFileSync(p, out, 'utf8');
  }
  return changes;
}

var files = fs.readdirSync(SRC).filter(f => f.endsWith('.html'));
var total = 0;
files.forEach(function (f) {
  var c = processFile(f);
  if (c.length) {
    total += c.length;
    console.log((APPLY ? 'FIXED ' : 'would fix ') + c.length + ' in ' + f + ' -> ' + c.slice(0, 6).join(' | ') + (c.length > 6 ? ' …' : ''));
  }
});
console.log((APPLY ? 'Applied ' : 'Dry-run: ') + total + ' aria-label(s).');
