/**
 * Auth data access — talks to the backend only through the Seam 1 API
 * (api.login / api.logout), which dispatches to the existing authenticateUserClean
 * / logoutUser functions. Never touches Sheets directly (see /AGENTS.md).
 */
import { api } from '@/services/api'
import type { ApiEnvelope, AuthContext } from '@/services/api'
import type { Session } from './types'

export function loginRequest(
  username: string,
  password: string,
  deviceId: string,
): Promise<ApiEnvelope<Session>> {
  return api.login<Session>({ username, password, deviceId })
}

export function logoutRequest(auth: AuthContext): Promise<ApiEnvelope<unknown>> {
  return api.logout<unknown>(auth)
}
