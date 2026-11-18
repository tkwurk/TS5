<#
.SYNOPSIS
  Runs the UI linter, then pushes the Apps Script code with clasp.

.DESCRIPTION
  Use this instead of calling "clasp push" directly so the rule-based UI check
  always runs first and refreshes UI_LINT_REPORT.md before each deploy.

.PARAMETER Strict
  Abort the push if the linter finds any error-severity issues.

.EXAMPLE
  .\tools\deploy.ps1            # lint (report only), then push
  .\tools\deploy.ps1 -Strict    # lint; push only if there are no errors
#>
param(
  [switch]$Strict
)

$ErrorActionPreference = 'Stop'
$toolsDir = $PSScriptRoot
$srcDir = Join-Path (Split-Path $toolsDir -Parent) 'apps-script-source'

Write-Host "==> Running UI lint before push..." -ForegroundColor Cyan
$lintArgs = @((Join-Path $toolsDir 'ui-lint.js'))
if ($Strict) { $lintArgs += '--strict' }
& node @lintArgs
$lintExit = $LASTEXITCODE

if ($Strict -and $lintExit -ne 0) {
  Write-Host "==> Lint found error-severity issues. Push aborted (see tools/UI_LINT_REPORT.md)." -ForegroundColor Red
  exit 1
}

Write-Host "==> Pushing to Apps Script..." -ForegroundColor Cyan
Push-Location $srcDir
try {
  clasp push --force
} finally {
  Pop-Location
}
Write-Host "==> Done. UI issues summarized in tools/UI_LINT_REPORT.md" -ForegroundColor Green
