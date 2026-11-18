# TS4

A modern rebuild of a Google Apps Script app as a **Vite + React + TypeScript**
web app, while keeping **Google Sheets as the backend** via the Google Sheets
REST API.

## Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- Google Identity Services (OAuth 2.0) for auth
- Google Sheets API v4 for data (the "database")

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

Open http://localhost:5173.

### Google Cloud setup

1. Create/select a project at https://console.cloud.google.com/.
2. Enable the **Google Sheets API**.
3. Configure the **OAuth consent screen**.
4. Create an **OAuth client ID** (type *Web application*) and add your dev
   origin `http://localhost:5173` to *Authorized JavaScript origins*.
5. Put the client ID and your spreadsheet ID in `.env.local`.

## Project structure

```
TS4/
├─ apps-script-source/      # Original Apps Script files (reference while porting)
├─ src/
│  ├─ components/           # Shared, reusable UI components
│  ├─ features/             # One folder per migrated module (orders, checkout, …)
│  ├─ hooks/                # Reusable React hooks (e.g. useGoogleAuth)
│  ├─ lib/                  # Framework-agnostic utilities
│  ├─ services/
│  │  └─ google/            # Google auth + Sheets data-access layer
│  │     ├─ config.ts       # Env-driven configuration
│  │     ├─ auth.ts         # OAuth token lifecycle (Google Identity Services)
│  │     ├─ sheets.ts       # Typed Sheets REST helpers (read/append/update/clear)
│  │     └─ index.ts
│  ├─ types/                # Shared / ambient types
│  ├─ App.tsx
│  └─ main.tsx
└─ .env.example
```

## Migrating from Apps Script

See [`src/features/README.md`](src/features/README.md) for the mapping from
Apps Script (`SpreadsheetApp`, `google.script.run`, HTML UI) to this project's
equivalents. Drop the source files into
[`apps-script-source/`](apps-script-source/README.md) first.

## Scripts

| Command           | Description                      |
| ----------------- | -------------------------------- |
| `npm run dev`     | Start the dev server (HMR)       |
| `npm run build`   | Type-check and build for prod    |
| `npm run preview` | Preview the production build     |
| `npm run lint`    | Lint with oxlint                 |
