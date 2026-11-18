#!/usr/bin/env node
/**
 * ui-lint.js — dev-time, rule-based UI checker (NO AI, NOT deployed).
 *
 * Scans the Apps Script UI files (*.html, which contain the inline CSS/JS) for
 * responsive, semantic, accessibility (WCAG/ARIA), inline-style, and performance
 * issues, and writes a Markdown SUMMARY that an AI model (or a developer) can use
 * to apply fixes. It does not modify any source and never calls a model/network.
 *
 * Usage:
 *   node tools/ui-lint.js                 # scan ../apps-script-source, write report
 *   node tools/ui-lint.js --watch         # re-run automatically on file changes
 *   node tools/ui-lint.js --strict        # exit 1 if any error-severity issues
 *   node tools/ui-lint.js <dir>           # scan a custom directory
 *
 * Output: tools/UI_LINT_REPORT.md
 */

'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const WATCH = args.includes('--watch');
const STRICT = args.includes('--strict');
const customDir = args.find(a => !a.startsWith('--'));

const SCAN_DIR = customDir
  ? path.resolve(customDir)
  : path.resolve(__dirname, '..', 'apps-script-source');
const REPORT_PATH = path.resolve(__dirname, 'UI_LINT_REPORT.md');

const SEVERITY_ORDER = { error: 0, warn: 1, info: 2 };

/** Maps a character index to a 1-based line number. */
function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index && i < content.length; i++) {
    if (content[i] === '\n') line++;
  }
  return line;
}

/** True when the element at `idx` sits inside an open <label>…</label> wrapper. */
function isInsideLabel_(content, idx) {
  const openBefore = content.lastIndexOf('<label', idx);
  if (openBefore === -1) return false;
  const closeBefore = content.lastIndexOf('</label>', idx);
  return openBefore > closeBefore;
}

/** Each rule: { id, severity, suggestion, scan(content) -> [{index, snippet?}] }. */
const RULES = [
  {
    id: 'img-alt',
    severity: 'error',
    suggestion: 'Add descriptive alt text (alt="" for purely decorative images).',
    scan(c) {
      const out = [];
      const re = /<img\b[^>]*>/gi; let m;
      while ((m = re.exec(c))) { if (!/\balt\s*=/i.test(m[0])) out.push({ index: m.index, snippet: m[0] }); }
      return out;
    }
  },
  {
    id: 'icon-button-aria',
    severity: 'warn',
    suggestion: 'Add aria-label describing the action, e.g. aria-label="Close".',
    scan(c) {
      const out = [];
      const re = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi; let m;
      while ((m = re.exec(c))) {
        const labelled = /\baria-label\s*=/i.test(m[1]) || /\btitle\s*=/i.test(m[1]);
        const text = m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, '');
        const onlyIcon = text.length > 0 && text.length <= 3 && !/[a-z0-9]/i.test(text);
        if (onlyIcon && !labelled) out.push({ index: m.index, snippet: m[0].slice(0, 80) });
      }
      return out;
    }
  },
  {
    id: 'semantic-button',
    severity: 'warn',
    suggestion: 'Use <button type="button"> (keyboard + screen-reader accessible) for actions.',
    scan(c) {
      const out = [];
      const re = /<(div|span)\b[^>]*>/gi; let m;
      while ((m = re.exec(c))) {
        if (!/\bonclick\s*=/i.test(m[0])) continue;
        if (/\brole\s*=\s*["']button["']/i.test(m[0])) continue; // promoted to an accessible button
        out.push({ index: m.index, snippet: m[0].slice(0, 80) });
      }
      return out;
    }
  },
  {
    id: 'input-label',
    severity: 'warn',
    suggestion: 'Associate a <label for="id"> or add aria-label.',
    scan(c) {
      const out = [];
      const re = /<input\b[^>]*>/gi; let m;
      while ((m = re.exec(c))) {
        const t = m[0];
        if (/\btype\s*=\s*"(hidden|submit|button)"/i.test(t)) continue;
        if (isInsideLabel_(c, m.index)) continue; // wrapped in <label> = implicit label
        if (!/\baria-label\s*=/i.test(t) && !/\bid\s*=/i.test(t) && !/\bplaceholder\s*=/i.test(t)) {
          out.push({ index: m.index, snippet: t.slice(0, 80) });
        }
      }
      return out;
    }
  },
  {
    id: 'button-type',
    severity: 'info',
    suggestion: 'Add type="button" to avoid accidental form submits.',
    scan(c) {
      const out = [];
      const re = /<button\b(?![^>]*\btype\s*=)[^>]*>/gi; let m;
      while ((m = re.exec(c))) out.push({ index: m.index });
      return out;
    }
  },
  {
    id: 'img-lazy',
    severity: 'info',
    suggestion: 'Add loading="lazy" for below-the-fold images.',
    scan(c) {
      const out = [];
      const re = /<img\b[^>]*>/gi; let m;
      while ((m = re.exec(c))) { if (!/\bloading\s*=/i.test(m[0])) out.push({ index: m.index }); }
      return out;
    }
  },
  {
    id: 'responsive-width',
    severity: 'info',
    suggestion: 'Prefer %, max-width, or flex/grid so layouts adapt to laptop and mobile.',
    scan(c) {
      const out = [];
      const re = /style\s*=\s*"[^"]*\bwidth\s*:\s*(\d{3,})px/gi; let m;
      while ((m = re.exec(c))) out.push({ index: m.index, snippet: m[0].slice(0, 80) });
      return out;
    }
  },
  {
    id: 'contrast',
    severity: 'info',
    suggestion: 'Verify text contrast is at least 4.5:1 (WCAG AA).',
    scan(c) {
      const out = [];
      const re = /color\s*:\s*#(?:ccc|ddd|eee|fff|cccccc|dddddd|eeeeee)\b/gi; let m;
      while ((m = re.exec(c))) out.push({ index: m.index, snippet: m[0] });
      return out;
    }
  },
  {
    id: 'inline-style',
    severity: 'info',
    suggestion: 'Move repeated inline styles into a CSS class in a <style> block or stylesheet.',
    countOnly: true,
    scan(c) {
      const out = [];
      const re = /\sstyle\s*=\s*"/gi; let m;
      while ((m = re.exec(c))) out.push({ index: m.index });
      return out;
    }
  },
  {
    id: 'headings',
    severity: 'info',
    suggestion: 'Add an <h2>/<h3> so the structure is navigable by assistive tech.',
    fileLevel: true,
    scan(c) {
      if (/<section\b|<article\b/i.test(c) && !/<h[1-6]\b/i.test(c)) return [{ index: 0 }];
      return [];
    }
  }
];

const MAX_OCCURRENCES_LISTED = 8;

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fileIssues = [];
  for (const rule of RULES) {
    const hits = rule.scan(content);
    if (!hits.length) continue;
    fileIssues.push({
      rule: rule.id,
      severity: rule.severity,
      suggestion: rule.suggestion,
      countOnly: !!rule.countOnly,
      fileLevel: !!rule.fileLevel,
      count: hits.length,
      lines: hits.slice(0, MAX_OCCURRENCES_LISTED).map(h => ({
        line: h.line || lineOf(content, h.index),
        snippet: h.snippet || ''
      }))
    });
  }
  return fileIssues;
}

function buildReport(results) {
  const now = new Date().toISOString();
  let md = `# UI Lint Report\n\n`;
  md += `_Generated ${now} by tools/ui-lint.js (rule-based, no AI). Fix the items below._\n\n`;

  let totals = { error: 0, warn: 0, info: 0 };
  results.forEach(r => r.issues.forEach(i => { totals[i.severity] += i.count; }));

  md += `## Summary\n\n`;
  md += `- Errors: **${totals.error}** | Warnings: **${totals.warn}** | Info: **${totals.info}**\n`;
  md += `- Files scanned: ${results.length}\n\n`;

  md += `| File | Errors | Warnings | Info |\n|---|---|---|---|\n`;
  results.forEach(r => {
    const e = r.issues.filter(i => i.severity === 'error').reduce((s, i) => s + i.count, 0);
    const w = r.issues.filter(i => i.severity === 'warn').reduce((s, i) => s + i.count, 0);
    const n = r.issues.filter(i => i.severity === 'info').reduce((s, i) => s + i.count, 0);
    if (e + w + n === 0) return;
    md += `| ${r.file} | ${e || ''} | ${w || ''} | ${n || ''} |\n`;
  });
  md += `\n`;

  results.forEach(r => {
    if (!r.issues.length) return;
    md += `## ${r.file}\n\n`;
    r.issues.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    r.issues.forEach(i => {
      md += `### [${i.severity.toUpperCase()}] ${i.rule} (${i.count})\n`;
      md += `${i.suggestion}\n\n`;
      if (i.fileLevel) {
        md += `- Applies to the whole file.\n`;
      } else if (i.countOnly) {
        md += `- ${i.count} occurrence(s). First lines: ${i.lines.map(l => l.line).join(', ')}` +
              (i.count > i.lines.length ? `, +${i.count - i.lines.length} more` : '') + `\n`;
      } else {
        i.lines.forEach(l => {
          md += `- line ${l.line}` + (l.snippet ? ` - \`${l.snippet.replace(/`/g, '')}\`` : '') + `\n`;
        });
        if (i.count > i.lines.length) md += `- ...+${i.count - i.lines.length} more\n`;
      }
      md += `\n`;
    });
  });

  if (!results.some(r => r.issues.length)) md += `No issues found.\n`;
  return { md, totals };
}

function run() {
  if (!fs.existsSync(SCAN_DIR)) {
    console.error('Scan directory not found: ' + SCAN_DIR);
    process.exit(2);
  }
  const files = fs.readdirSync(SCAN_DIR).filter(f => f.endsWith('.html')).sort();
  const results = files.map(f => ({ file: f, issues: scanFile(path.join(SCAN_DIR, f)) }));

  const { md, totals } = buildReport(results);
  fs.writeFileSync(REPORT_PATH, md, 'utf8');

  console.log(`UI lint: ${totals.error} errors, ${totals.warn} warnings, ${totals.info} info across ${files.length} files.`);
  console.log(`Report: ${REPORT_PATH}`);

  if (STRICT && totals.error > 0 && !WATCH) process.exit(1);
}

if (WATCH) {
  console.log('Watching ' + SCAN_DIR + ' for changes (Ctrl+C to stop)...');
  run();
  let timer = null;
  fs.watch(SCAN_DIR, { persistent: true }, (evt, filename) => {
    if (filename && !filename.endsWith('.html')) return;
    clearTimeout(timer);
    timer = setTimeout(() => { console.log('\nChange detected (' + filename + '), re-linting...'); run(); }, 250);
  });
} else {
  run();
}
