# UI Lint (dev-time, no AI, not deployed)

Rule-based checker for the Apps Script POS UI files. It scans
`../apps-script-source/*.html` (which hold the inline CSS/JS) and writes a
summary of issues to [`UI_LINT_REPORT.md`](./UI_LINT_REPORT.md) that an AI model
(or a developer) can then act on. It **does not** call any AI/model or network,
and it is **not** part of the deployed Apps Script project (it lives outside
`apps-script-source`, so `clasp push` never uploads it).

## Run

```bash
cd tools
npm run lint          # one-shot: scan + write UI_LINT_REPORT.md
npm run lint:watch    # re-run automatically whenever a .html file changes
npm run lint:strict   # exit code 1 if any error-severity issues (for hooks/CI)
```

or directly: `node ui-lint.js [--watch] [--strict] [dir]`

## Deploy (lint runs before every push)

Use the wrapper instead of calling `clasp push` directly — it runs the UI lint
first (refreshing `UI_LINT_REPORT.md`), then pushes:

```powershell
.\tools\deploy.ps1            # lint (report only), then clasp push
.\tools\deploy.ps1 -Strict    # lint; abort the push if any error-severity issues
```

## Automatic triggering options

- **Before deploy (recommended)**: `tools\deploy.ps1` runs the linter ahead of
  `clasp push` on every release.
- **Watch mode**: `npm run lint:watch` keeps a terminal open and regenerates the
  report on every save.
- **Git pre-commit/pre-push hook**: call `node tools/ui-lint.js --strict` from the
  hook if this folder is placed under a git repo.

## Rules

| Rule | Severity | What it flags |
|---|---|---|
| `img-alt` | error | `<img>` without `alt` |
| `icon-button-aria` | warn | icon-only `<button>` without `aria-label`/`title` |
| `semantic-button` | warn | clickable `<div>`/`<span>` with `onclick` |
| `input-label` | warn | input with no label / `aria-label` / `placeholder` |
| `button-type` | info | `<button>` without explicit `type` |
| `img-lazy` | info | `<img>` without `loading="lazy"` |
| `responsive-width` | info | large fixed `width:###px` in inline styles |
| `contrast` | info | light-gray text colors (verify WCAG AA) |
| `inline-style` | info | inline `style="..."` (prefer modular CSS) |
| `headings` | info | `<section>/<article>` with no heading |

The report groups issues by file with line numbers, so the fixes can be applied
precisely.
