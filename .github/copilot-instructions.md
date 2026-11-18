# TS4 project instructions

**The authoritative architecture is [AGENTS.md](../AGENTS.md). Read and follow it
on every task. Do not rediscover or redesign the architecture — if code conflicts
with it, the code is wrong; flag it and ask rather than silently refactoring.**

Non-negotiable invariants (see AGENTS.md for the full rules and rationale):

- **One JSON API seam:** client ↔ backend only via `POST /exec` with
  `{ eventType, payload, ctx }` → `apiOk` / `apiFail`.
- **Logic stays server-side:** business rules, permissions, validation, and all
  data writes live in Apps Script — never in the client.
- **Data Access Layer seam:** all DB access goes through `Repo` / its adapter,
  never `SpreadsheetApp` directly in workers (keeps the DB swappable).
- **Execute as the owner (me)** so the script reaches the Sheet with the owner's
  access; users never get direct Sheet access. No Google Cloud / service account
  needed (free). Per-user concurrency later = switch to `SheetsAdapter` (Option B).
- **Do not** call the Google Sheets API from the client, reintroduce
  `google.script.run`/HTML UI, or put business logic in the Orchestrator.

Client: **installable PWA (Vite + React + TS)** — one codebase for iOS, Android,
and Web, $0 to distribute. The UI is isolated into reusable primitives in
`src/components/ui/` (Button, Panel, Notice, Badge); features live in
`src/features/*`. Expo native is a future option if App Store presence or native
hardware access is needed (same `src/services/api` client).
