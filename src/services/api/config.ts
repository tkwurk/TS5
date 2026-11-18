/**
 * Configuration for the Apps Script JSON API (Seam 1), read from Vite env vars.
 * Copy `.env.example` to `.env.local` and set `VITE_APPS_SCRIPT_URL` to your
 * deployed Web App `/exec` URL.
 */
export interface ApiConfig {
  /** Deployed Apps Script Web App URL, e.g. https://script.google.com/macros/s/XXX/exec */
  appsScriptUrl: string
  /** Request timeout in milliseconds. */
  timeoutMs: number
}

export const apiConfig: ApiConfig = {
  appsScriptUrl: import.meta.env.VITE_APPS_SCRIPT_URL ?? '',
  timeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 45000),
}

export function assertApiConfig(config: ApiConfig = apiConfig): void {
  if (!config.appsScriptUrl) {
    throw new Error(
      'Missing API configuration: VITE_APPS_SCRIPT_URL. Copy .env.example to ' +
        '.env.local and set it to your deployed Apps Script Web App /exec URL.',
    )
  }
}
