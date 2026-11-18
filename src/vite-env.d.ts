/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OAuth 2.0 Web client ID from Google Cloud. */
  readonly VITE_GOOGLE_CLIENT_ID: string
  /** Space-separated OAuth scopes. Optional; sensible default applied. */
  readonly VITE_GOOGLE_SCOPES?: string
  /** ID of the Google Sheet that backs the app. */
  readonly VITE_GOOGLE_SPREADSHEET_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
